const { getPool, sql } = require('../config/database');
const sanpinValidator = require('./sanpin-validator');

/**
 * Генератор расписания с учетом норм СанПиН
 */
class ScheduleGenerator {
  
  /**
   * Генерирует расписание для класса на неделю
   * @param {Object} params
   * @param {number} params.class_id - ID класса
   * @param {number} params.academic_period_id - ID учебного периода
   * @param {Array} params.subjects - Массив предметов с количеством уроков в неделю
   *   [{subject_id: 1, teacher_id: 2, hours_per_week: 5, classroom_id: 3}]
   * @returns {Object} { success: boolean, schedule: [], errors: [], warnings: [] }
   */
  async generate(params) {
    const { class_id, academic_period_id, subjects } = params;
    const errors = [];
    const warnings = [];
    const schedule = [];
    
    try {
      const pool = await getPool();
      
      // 1. Получаем информацию о классе
      const classInfo = await pool.request()
        .input('class_id', sql.Int, class_id)
        .query('SELECT class_number, class_letter FROM classes WHERE id = @class_id');
      
      if (classInfo.recordset.length === 0) {
        return { success: false, errors: ['Класс не найден'], warnings: [], schedule: [] };
      }
      
      const classNumber = classInfo.recordset[0].class_number;
      
      // 2. Получаем сложность всех предметов для этого класса
      const complexityMap = {};
      for (const subj of subjects) {
        const complexity = await pool.request()
          .input('subject_id', sql.Int, subj.subject_id)
          .input('class_number', sql.Int, classNumber)
          .query(`
            SELECT sc.complexity_score, s.name
            FROM subject_complexity sc
            JOIN subjects s ON sc.subject_id = s.id
            WHERE sc.subject_id = @subject_id AND sc.class_number = @class_number
          `);
        
        if (complexity.recordset.length > 0) {
          complexityMap[subj.subject_id] = {
            score: complexity.recordset[0].complexity_score,
            name: complexity.recordset[0].name
          };
        }
      }
      
      // 3. Определяем максимальное количество уроков в день
      let maxLessonsPerDay = 5;
      if (classNumber === 1) maxLessonsPerDay = 4;
      if (classNumber >= 5 && classNumber <= 9) maxLessonsPerDay = 6;
      if (classNumber >= 10) maxLessonsPerDay = 7;
      
      // 4. Создаем список всех уроков для распределения
      const lessonsToSchedule = [];
      subjects.forEach(subj => {
        for (let i = 0; i < subj.hours_per_week; i++) {
          lessonsToSchedule.push({
            subject_id: subj.subject_id,
            teacher_id: subj.teacher_id,
            classroom_id: subj.classroom_id,
            complexity: complexityMap[subj.subject_id]?.score || 5,
            name: complexityMap[subj.subject_id]?.name || 'Предмет'
          });
        }
      });
      
      // 5. Сортируем уроки по сложности (сначала сложные)
      lessonsToSchedule.sort((a, b) => b.complexity - a.complexity);
      
      // 6. Создаем сетку расписания (5 дней × maxLessonsPerDay уроков)
      const grid = [];
      for (let day = 1; day <= 5; day++) {
        grid[day] = [];
        for (let lesson = 1; lesson <= maxLessonsPerDay; lesson++) {
          grid[day][lesson] = null;
        }
      }
      
      // 7. Распределяем уроки по сетке
      for (const lesson of lessonsToSchedule) {
        let placed = false;
        
        // Определяем оптимальные уроки для этой сложности
        let preferredLessons = [2, 3, 4]; // По умолчанию
        if (lesson.complexity >= 10) {
          preferredLessons = [2, 3, 4]; // Очень сложные - только пик
        } else if (lesson.complexity >= 7) {
          preferredLessons = [2, 3, 4, 5]; // Сложные
        } else if (lesson.complexity <= 3) {
          preferredLessons = [1, 5, 6, 7]; // Легкие - не на пик
        } else {
          preferredLessons = [1, 2, 3, 4, 5, 6, 7]; // Средние - любое время
        }
        
        // Пытаемся разместить на оптимальное время
        for (const lessonNum of preferredLessons) {
          if (placed) break;
          
          for (let day = 1; day <= 5; day++) {
            if (placed) break;
            
            if (lessonNum <= maxLessonsPerDay && !grid[day][lessonNum]) {
              // Проверяем, можно ли разместить здесь
              const canPlace = await this.canPlaceLesson(pool, {
                class_id,
                subject_id: lesson.subject_id,
                teacher_id: lesson.teacher_id,
                classroom_id: lesson.classroom_id,
                day_of_week: day,
                lesson_number: lessonNum,
                academic_period_id
              });
              
              if (canPlace) {
                grid[day][lessonNum] = lesson;
                placed = true;
              }
            }
          }
        }
        
        // Если не удалось разместить на оптимальное время, пытаемся на любое
        if (!placed) {
          for (let day = 1; day <= 5; day++) {
            if (placed) break;
            
            for (let lessonNum = 1; lessonNum <= maxLessonsPerDay; lessonNum++) {
              if (placed) break;
              
              if (!grid[day][lessonNum]) {
                const canPlace = await this.canPlaceLesson(pool, {
                  class_id,
                  subject_id: lesson.subject_id,
                  teacher_id: lesson.teacher_id,
                  classroom_id: lesson.classroom_id,
                  day_of_week: day,
                  lesson_number: lessonNum,
                  academic_period_id
                });
                
                if (canPlace) {
                  grid[day][lessonNum] = lesson;
                  placed = true;
                  
                  // Добавляем предупреждение о неоптимальном размещении
                  if (lesson.complexity >= 10 && (lessonNum < 2 || lessonNum > 4)) {
                    warnings.push(
                      `${lesson.name} (${lesson.complexity} баллов) размещен на ${lessonNum} урок - рекомендуется 2-4 уроки`
                    );
                  }
                }
              }
            }
          }
        }
        
        if (!placed) {
          errors.push(`Не удалось разместить урок: ${lesson.name}`);
        }
      }
      
      // 8. Сохраняем расписание в базу
      for (let day = 1; day <= 5; day++) {
        for (let lessonNum = 1; lessonNum <= maxLessonsPerDay; lessonNum++) {
          const lesson = grid[day][lessonNum];
          if (lesson) {
            const result = await pool.request()
              .input('class_id', sql.Int, class_id)
              .input('subject_id', sql.Int, lesson.subject_id)
              .input('teacher_id', sql.Int, lesson.teacher_id)
              .input('classroom_id', sql.Int, lesson.classroom_id || null)
              .input('day_of_week', sql.Int, day)
              .input('lesson_number', sql.Int, lessonNum)
              .input('academic_period_id', sql.Int, academic_period_id)
              .query(`
                INSERT INTO schedule (class_id, subject_id, teacher_id, classroom_id, day_of_week, lesson_number, academic_period_id)
                OUTPUT INSERTED.id
                VALUES (@class_id, @subject_id, @teacher_id, @classroom_id, @day_of_week, @lesson_number, @academic_period_id)
              `);
            
            schedule.push({
              id: result.recordset[0].id,
              day_of_week: day,
              lesson_number: lessonNum,
              subject_name: lesson.name,
              complexity: lesson.complexity
            });
          }
        }
      }
      
      return {
        success: errors.length === 0,
        schedule,
        errors,
        warnings
      };
      
    } catch (error) {
      console.error('Ошибка генерации расписания:', error);
      return {
        success: false,
        errors: ['Ошибка генерации: ' + error.message],
        warnings,
        schedule: []
      };
    }
  }
  
  /**
   * Проверяет, можно ли разместить урок в указанное время
   */
  async canPlaceLesson(pool, lesson) {
    try {
      // Проверяем конфликт класса
      const classConflict = await pool.request()
        .input('class_id', sql.Int, lesson.class_id)
        .input('day_of_week', sql.Int, lesson.day_of_week)
        .input('lesson_number', sql.Int, lesson.lesson_number)
        .input('academic_period_id', sql.Int, lesson.academic_period_id)
        .query(`
          SELECT id FROM schedule 
          WHERE class_id = @class_id 
          AND day_of_week = @day_of_week 
          AND lesson_number = @lesson_number 
          AND academic_period_id = @academic_period_id
        `);
      
      if (classConflict.recordset.length > 0) return false;
      
      // Проверяем конфликт учителя
      const teacherConflict = await pool.request()
        .input('teacher_id', sql.Int, lesson.teacher_id)
        .input('day_of_week', sql.Int, lesson.day_of_week)
        .input('lesson_number', sql.Int, lesson.lesson_number)
        .input('academic_period_id', sql.Int, lesson.academic_period_id)
        .query(`
          SELECT id FROM schedule 
          WHERE teacher_id = @teacher_id 
          AND day_of_week = @day_of_week 
          AND lesson_number = @lesson_number 
          AND academic_period_id = @academic_period_id
        `);
      
      if (teacherConflict.recordset.length > 0) return false;
      
      // Проверяем конфликт кабинета (если указан)
      if (lesson.classroom_id) {
        const classroomConflict = await pool.request()
          .input('classroom_id', sql.Int, lesson.classroom_id)
          .input('day_of_week', sql.Int, lesson.day_of_week)
          .input('lesson_number', sql.Int, lesson.lesson_number)
          .input('academic_period_id', sql.Int, lesson.academic_period_id)
          .query(`
            SELECT id FROM schedule 
            WHERE classroom_id = @classroom_id 
            AND day_of_week = @day_of_week 
            AND lesson_number = @lesson_number 
            AND academic_period_id = @academic_period_id
          `);
        
        if (classroomConflict.recordset.length > 0) return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('Ошибка проверки размещения:', error);
      return false;
    }
  }
  
  /**
   * Удаляет существующее расписание для класса
   */
  async clearSchedule(class_id, academic_period_id) {
    try {
      const pool = await getPool();
      
      await pool.request()
        .input('class_id', sql.Int, class_id)
        .input('academic_period_id', sql.Int, academic_period_id)
        .query(`
          DELETE FROM schedule 
          WHERE class_id = @class_id 
          AND academic_period_id = @academic_period_id
        `);
      
      return { success: true };
      
    } catch (error) {
      console.error('Ошибка очистки расписания:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ScheduleGenerator();
