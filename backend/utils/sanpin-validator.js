const { getPool, sql } = require('../config/database');

/**
 * Валидатор расписания по нормам СанПиН Беларуси
 */
class SanPinValidator {
  
  /**
   * Проверяет расписание на соответствие всем нормам СанПиН
   * @param {Object} scheduleItem - Элемент расписания
   * @param {number} scheduleItem.class_id - ID класса
   * @param {number} scheduleItem.subject_id - ID предмета
   * @param {number} scheduleItem.teacher_id - ID учителя
   * @param {number} scheduleItem.classroom_id - ID кабинета
   * @param {number} scheduleItem.day_of_week - День недели (1-5)
   * @param {number} scheduleItem.lesson_number - Номер урока (1-7)
   * @param {number} scheduleItem.academic_period_id - ID учебного периода
   * @param {number} scheduleItem.id - ID записи (для обновления, опционально)
   * @returns {Object} { valid: boolean, errors: [], warnings: [] }
   */
  async validate(scheduleItem) {
    const errors = [];
    const warnings = [];
    
    try {
      const pool = await getPool();
      
      // 1. Получаем информацию о классе
      const classInfo = await pool.request()
        .input('class_id', sql.Int, scheduleItem.class_id)
        .query('SELECT class_number, class_letter FROM classes WHERE id = @class_id');
      
      if (classInfo.recordset.length === 0) {
        errors.push('Класс не найден');
        return { valid: false, errors, warnings };
      }
      
      const classNumber = classInfo.recordset[0].class_number;
      
      // 2. Получаем сложность предмета для этого класса
      const complexityInfo = await pool.request()
        .input('subject_id', sql.Int, scheduleItem.subject_id)
        .input('class_number', sql.Int, classNumber)
        .query(`
          SELECT sc.complexity_score, s.name as subject_name
          FROM subject_complexity sc
          JOIN subjects s ON sc.subject_id = s.id
          WHERE sc.subject_id = @subject_id AND sc.class_number = @class_number
        `);
      
      if (complexityInfo.recordset.length === 0) {
        warnings.push('Сложность предмета не определена для этого класса');
      }
      
      const complexity = complexityInfo.recordset[0]?.complexity_score || 5;
      const subjectName = complexityInfo.recordset[0]?.subject_name || 'Неизвестный предмет';
      
      // 3. Проверка оптимального времени для сложных предметов
      this.checkComplexityPlacement(complexity, subjectName, scheduleItem.lesson_number, warnings);
      
      // 4. Проверка конфликтов: класс не может иметь 2 урока одновременно
      const classConflict = await this.checkClassConflict(pool, scheduleItem);
      if (classConflict) {
        errors.push(`Класс уже занят на ${scheduleItem.lesson_number} уроке в ${this.getDayName(scheduleItem.day_of_week)}`);
      }
      
      // 5. Проверка конфликтов: учитель не может вести 2 урока одновременно
      const teacherConflict = await this.checkTeacherConflict(pool, scheduleItem);
      if (teacherConflict) {
        errors.push(`Учитель уже занят на ${scheduleItem.lesson_number} уроке в ${this.getDayName(scheduleItem.day_of_week)}`);
      }
      
      // 6. Проверка конфликтов: кабинет не может быть занят 2 классами одновременно
      if (scheduleItem.classroom_id) {
        const classroomConflict = await this.checkClassroomConflict(pool, scheduleItem);
        if (classroomConflict) {
          errors.push(`Кабинет уже занят на ${scheduleItem.lesson_number} уроке в ${this.getDayName(scheduleItem.day_of_week)}`);
        }
      }
      
      // 7. Проверка индекса сложности дня
      await this.checkDailyComplexity(pool, scheduleItem, classNumber, warnings);
      
      // 8. Проверка количества уроков в день
      await this.checkLessonsPerDay(pool, scheduleItem, classNumber, warnings);
      
      // 9. Проверка для 1 класса (особые правила)
      if (classNumber === 1) {
        this.checkFirstGradeRules(scheduleItem, warnings);
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
      
    } catch (error) {
      console.error('Ошибка валидации:', error);
      return {
        valid: false,
        errors: ['Ошибка при проверке расписания: ' + error.message],
        warnings
      };
    }
  }
  
  /**
   * Проверяет оптимальность размещения предмета по сложности
   */
  checkComplexityPlacement(complexity, subjectName, lessonNumber, warnings) {
    // Очень сложные предметы (10-12 баллов) - на 2-4 уроки
    if (complexity >= 10) {
      if (lessonNumber < 2 || lessonNumber > 4) {
        warnings.push(
          `⚠️ Очень сложный предмет "${subjectName}" (${complexity} баллов) рекомендуется ставить на 2-4 уроки (пик работоспособности)`
        );
      }
    }
    
    // Сложные предметы (7-9 баллов) - на 2-5 уроки
    if (complexity >= 7 && complexity < 10) {
      if (lessonNumber < 2 || lessonNumber > 5) {
        warnings.push(
          `⚠️ Сложный предмет "${subjectName}" (${complexity} баллов) лучше ставить на 2-5 уроки`
        );
      }
    }
    
    // Легкие предметы (1-3 балла) - не на пиковое время
    if (complexity <= 3) {
      if (lessonNumber >= 2 && lessonNumber <= 4) {
        warnings.push(
          `⚠️ Легкий предмет "${subjectName}" (${complexity} балла) лучше перенести на 1, 5-7 уроки, освободив пиковое время для сложных предметов`
        );
      }
    }
  }
  
  /**
   * Проверяет конфликт класса
   */
  async checkClassConflict(pool, scheduleItem) {
    const query = scheduleItem.id 
      ? `SELECT id FROM schedule 
         WHERE class_id = @class_id 
         AND day_of_week = @day_of_week 
         AND lesson_number = @lesson_number 
         AND academic_period_id = @academic_period_id
         AND id != @id`
      : `SELECT id FROM schedule 
         WHERE class_id = @class_id 
         AND day_of_week = @day_of_week 
         AND lesson_number = @lesson_number 
         AND academic_period_id = @academic_period_id`;
    
    const request = pool.request()
      .input('class_id', sql.Int, scheduleItem.class_id)
      .input('day_of_week', sql.Int, scheduleItem.day_of_week)
      .input('lesson_number', sql.Int, scheduleItem.lesson_number)
      .input('academic_period_id', sql.Int, scheduleItem.academic_period_id);
    
    if (scheduleItem.id) {
      request.input('id', sql.Int, scheduleItem.id);
    }
    
    const result = await request.query(query);
    return result.recordset.length > 0;
  }
  
  /**
   * Проверяет конфликт учителя
   */
  async checkTeacherConflict(pool, scheduleItem) {
    const query = scheduleItem.id
      ? `SELECT id FROM schedule 
         WHERE teacher_id = @teacher_id 
         AND day_of_week = @day_of_week 
         AND lesson_number = @lesson_number 
         AND academic_period_id = @academic_period_id
         AND id != @id`
      : `SELECT id FROM schedule 
         WHERE teacher_id = @teacher_id 
         AND day_of_week = @day_of_week 
         AND lesson_number = @lesson_number 
         AND academic_period_id = @academic_period_id`;
    
    const request = pool.request()
      .input('teacher_id', sql.Int, scheduleItem.teacher_id)
      .input('day_of_week', sql.Int, scheduleItem.day_of_week)
      .input('lesson_number', sql.Int, scheduleItem.lesson_number)
      .input('academic_period_id', sql.Int, scheduleItem.academic_period_id);
    
    if (scheduleItem.id) {
      request.input('id', sql.Int, scheduleItem.id);
    }
    
    const result = await request.query(query);
    return result.recordset.length > 0;
  }
  
  /**
   * Проверяет конфликт кабинета
   */
  async checkClassroomConflict(pool, scheduleItem) {
    const query = scheduleItem.id
      ? `SELECT id FROM schedule 
         WHERE classroom_id = @classroom_id 
         AND day_of_week = @day_of_week 
         AND lesson_number = @lesson_number 
         AND academic_period_id = @academic_period_id
         AND id != @id`
      : `SELECT id FROM schedule 
         WHERE classroom_id = @classroom_id 
         AND day_of_week = @day_of_week 
         AND lesson_number = @lesson_number 
         AND academic_period_id = @academic_period_id`;
    
    const request = pool.request()
      .input('classroom_id', sql.Int, scheduleItem.classroom_id)
      .input('day_of_week', sql.Int, scheduleItem.day_of_week)
      .input('lesson_number', sql.Int, scheduleItem.lesson_number)
      .input('academic_period_id', sql.Int, scheduleItem.academic_period_id);
    
    if (scheduleItem.id) {
      request.input('id', sql.Int, scheduleItem.id);
    }
    
    const result = await request.query(query);
    return result.recordset.length > 0;
  }
  
  /**
   * Проверяет индекс сложности дня
   */
  async checkDailyComplexity(pool, scheduleItem, classNumber, warnings) {
    // Получаем все уроки этого класса в этот день
    const query = scheduleItem.id
      ? `SELECT sc.complexity_score
         FROM schedule s
         JOIN subject_complexity sc ON s.subject_id = sc.subject_id AND sc.class_number = @class_number
         WHERE s.class_id = @class_id 
         AND s.day_of_week = @day_of_week 
         AND s.academic_period_id = @academic_period_id
         AND s.id != @id`
      : `SELECT sc.complexity_score
         FROM schedule s
         JOIN subject_complexity sc ON s.subject_id = sc.subject_id AND sc.class_number = @class_number
         WHERE s.class_id = @class_id 
         AND s.day_of_week = @day_of_week 
         AND s.academic_period_id = @academic_period_id`;
    
    const request = pool.request()
      .input('class_id', sql.Int, scheduleItem.class_id)
      .input('day_of_week', sql.Int, scheduleItem.day_of_week)
      .input('academic_period_id', sql.Int, scheduleItem.academic_period_id)
      .input('class_number', sql.Int, classNumber);
    
    if (scheduleItem.id) {
      request.input('id', sql.Int, scheduleItem.id);
    }
    
    const result = await request.query(query);
    
    // Получаем сложность добавляемого предмета
    const newComplexity = await pool.request()
      .input('subject_id', sql.Int, scheduleItem.subject_id)
      .input('class_number', sql.Int, classNumber)
      .query('SELECT complexity_score FROM subject_complexity WHERE subject_id = @subject_id AND class_number = @class_number');
    
    const currentComplexity = newComplexity.recordset[0]?.complexity_score || 5;
    
    // Считаем общую сложность дня
    let totalComplexity = currentComplexity;
    result.recordset.forEach(row => {
      totalComplexity += row.complexity_score;
    });
    
    // Рекомендации по индексу сложности
    // Для младших классов (1-4): не более 50-60 баллов в день
    // Для средних классов (5-9): не более 60-70 баллов в день
    // Для старших классов (10-11): не более 70-80 баллов в день
    
    let maxComplexity = 60;
    if (classNumber >= 5 && classNumber <= 9) maxComplexity = 70;
    if (classNumber >= 10) maxComplexity = 80;
    
    if (totalComplexity > maxComplexity) {
      warnings.push(
        `⚠️ Индекс сложности дня (${totalComplexity} баллов) превышает рекомендуемый (${maxComplexity} баллов). Рекомендуется перераспределить нагрузку`
      );
    }
  }
  
  /**
   * Проверяет количество уроков в день
   */
  async checkLessonsPerDay(pool, scheduleItem, classNumber, warnings) {
    const query = scheduleItem.id
      ? `SELECT COUNT(*) as cnt FROM schedule 
         WHERE class_id = @class_id 
         AND day_of_week = @day_of_week 
         AND academic_period_id = @academic_period_id
         AND id != @id`
      : `SELECT COUNT(*) as cnt FROM schedule 
         WHERE class_id = @class_id 
         AND day_of_week = @day_of_week 
         AND academic_period_id = @academic_period_id`;
    
    const request = pool.request()
      .input('class_id', sql.Int, scheduleItem.class_id)
      .input('day_of_week', sql.Int, scheduleItem.day_of_week)
      .input('academic_period_id', sql.Int, scheduleItem.academic_period_id);
    
    if (scheduleItem.id) {
      request.input('id', sql.Int, scheduleItem.id);
    }
    
    const result = await request.query(query);
    const currentLessons = result.recordset[0].cnt + 1; // +1 для добавляемого урока
    
    // Рекомендации по количеству уроков
    // 1 класс: не более 4 уроков
    // 2-4 классы: не более 5 уроков
    // 5-9 классы: не более 6 уроков
    // 10-11 классы: не более 7 уроков
    
    let maxLessons = 5;
    if (classNumber === 1) maxLessons = 4;
    if (classNumber >= 5 && classNumber <= 9) maxLessons = 6;
    if (classNumber >= 10) maxLessons = 7;
    
    if (currentLessons > maxLessons) {
      warnings.push(
        `⚠️ Количество уроков в день (${currentLessons}) превышает рекомендуемое (${maxLessons}) для ${classNumber} класса`
      );
    }
  }
  
  /**
   * Проверяет особые правила для 1 класса
   */
  checkFirstGradeRules(scheduleItem, warnings) {
    // 1 класс: не более 4 уроков в день
    if (scheduleItem.lesson_number > 4) {
      warnings.push('⚠️ Для 1 класса рекомендуется не более 4 уроков в день');
    }
    
    // Уроки по 35 минут в первом полугодии
    warnings.push('ℹ️ Не забудь: для 1 класса уроки по 35 минут (первое полугодие) или 45 минут (второе полугодие)');
  }
  
  /**
   * Получает название дня недели
   */
  getDayName(dayNumber) {
    const days = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
    return days[dayNumber] || 'Неизвестный день';
  }
}

module.exports = new SanPinValidator();
