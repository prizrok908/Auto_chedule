const { getPool, sql } = require('../config/database');

/**
 * Генератор расписания на полугодие (20 недель)
 */
class SemesterScheduleGenerator {
  
  /**
   * Генерирует расписание на полугодие
   * @param {Object} params
   * @param {number} params.class_id - ID класса
   * @param {number} params.academic_period_id - ID учебного периода
   * @param {Array} params.subjects - Массив предметов с количеством уроков в неделю
   * @param {Date} params.start_date - Дата начала полугодия
   * @param {number} params.weeks_count - Количество недель (по умолчанию 20)
   */
  async generateSemester(params) {
    const { class_id, academic_period_id, subjects, start_date, weeks_count = 20 } = params;
    const errors = [];
    const warnings = [];
    const schedule = [];
    
    try {
      const pool = await getPool();
      
      // 1. Получаем информацию о классе и учебном периоде
      const classInfo = await pool.request()
        .input('class_id', sql.Int, class_id)
        .query('SELECT class_number, class_letter, class_teacher_id, home_classroom_id FROM classes WHERE id = @class_id');
      
      if (classInfo.recordset.length === 0) {
        return { success: false, errors: ['Класс не найден'], warnings: [], schedule: [] };
      }
      
      const classNumber = classInfo.recordset[0].class_number;
      const classTeacherId = classInfo.recordset[0].class_teacher_id;
      const homeClassroomId = classInfo.recordset[0].home_classroom_id;
      
      // Получаем информацию о полугодии
      const periodInfo = await pool.request()
        .input('academic_period_id', sql.Int, academic_period_id)
        .query('SELECT semester FROM academic_periods WHERE id = @academic_period_id');
      
      const semester = periodInfo.recordset.length > 0 ? periodInfo.recordset[0].semester : 2;
      
      console.log(`Генерация для ${classNumber} класса, ${semester} полугодие`);
      
      // 2. Определяем максимальное количество уроков в день
      let maxLessonsPerDay = 5;
      if (classNumber === 1) maxLessonsPerDay = 5; // Для 1 класса 5 уроков (включая физкультуру/музыку)
      if (classNumber >= 2 && classNumber <= 4) maxLessonsPerDay = 5;
      if (classNumber >= 5 && classNumber <= 9) maxLessonsPerDay = 6;
      if (classNumber >= 10) maxLessonsPerDay = 7;
      
      // 3. Создаем базовое недельное расписание
      const weeklySchedule = await this.createWeeklySchedule({
        class_id,
        classNumber,
        classTeacherId,
        homeClassroomId,
        subjects,
        maxLessonsPerDay,
        academic_period_id
      });
      
      if (!weeklySchedule.success) {
        return weeklySchedule;
      }
      
      // 4. Получаем каникулы и праздники
      const vacations = await pool.request()
        .input('academic_period_id', sql.Int, academic_period_id)
        .query('SELECT start_date, end_date, class_numbers FROM vacations WHERE academic_period_id = @academic_period_id');
      
      const holidays = await pool.request()
        .query('SELECT start_date, end_date, is_working_day, transferred_from_date, working_saturday_date FROM holidays');
      
      const holidayDates = new Set();
      const workingSaturdays = new Set();
      const transferredDates = new Set(); // Даты, которые переносятся (становятся выходными)
      
      holidays.recordset.forEach(h => {
        const startDate = new Date(h.start_date);
        const endDate = new Date(h.end_date || h.start_date);
        
        // Добавляем все дни между start_date и end_date
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          
          if (h.is_working_day) {
            // Это рабочая суббота
            workingSaturdays.add(dateStr);
          } else {
            // Это выходной/праздник
            holidayDates.add(dateStr);
          }
        }
        
        // Если указана дата переноса, добавляем её в выходные
        if (h.transferred_from_date) {
          const transferredDateStr = new Date(h.transferred_from_date).toISOString().split('T')[0];
          transferredDates.add(transferredDateStr);
        }
      });
      
      // Функция проверки каникул
      const isVacation = (date, classNum) => {
        for (const vacation of vacations.recordset) {
          const start = new Date(vacation.start_date);
          const end = new Date(vacation.end_date);
          
          if (date >= start && date <= end) {
            // Проверяем, для каких классов каникулы
            if (!vacation.class_numbers) return true; // Для всех
            
            const classes = vacation.class_numbers.split(',').map(n => parseInt(n.trim()));
            if (classes.includes(classNum)) return true;
          }
        }
        return false;
      };
      
      // 5. Копируем недельное расписание на все недели полугодия
      const startDate = new Date(start_date);
      
      for (let week = 1; week <= weeks_count; week++) {
        for (const lesson of weeklySchedule.schedule) {
          // Вычисляем дату урока
          const weekOffset = (week - 1) * 7;
          const dayOffset = lesson.day_of_week - 1; // 1=понедельник -> 0
          const lessonDate = new Date(startDate);
          lessonDate.setDate(lessonDate.getDate() + weekOffset + dayOffset);
          
          const dateStr = lessonDate.toISOString().split('T')[0];
          const dayOfWeek = lessonDate.getDay();
          
          // Пропускаем выходные (кроме рабочих суббот)
          if (dayOfWeek === 0) continue; // Воскресенье всегда выходной
          if (dayOfWeek === 6 && !workingSaturdays.has(dateStr)) continue; // Суббота (если не рабочая)
          
          // Пропускаем праздники
          if (holidayDates.has(dateStr)) continue;
          
          // Пропускаем перенесённые дни (которые стали выходными)
          if (transferredDates.has(dateStr)) continue;
          
          // Пропускаем каникулы
          if (isVacation(lessonDate, classNumber)) continue;
          
          // Сохраняем урок в базу
          const result = await pool.request()
            .input('class_id', sql.Int, class_id)
            .input('subject_id', sql.Int, lesson.subject_id)
            .input('teacher_id', sql.Int, lesson.teacher_id)
            .input('classroom_id', sql.Int, lesson.classroom_id || null)
            .input('day_of_week', sql.Int, lesson.day_of_week)
            .input('lesson_number', sql.Int, lesson.lesson_number)
            .input('week_number', sql.Int, week)
            .input('lesson_date', sql.Date, lessonDate)
            .input('academic_period_id', sql.Int, academic_period_id)
            .query(`
              INSERT INTO schedule (class_id, subject_id, teacher_id, classroom_id, day_of_week, lesson_number, week_number, lesson_date, academic_period_id)
              OUTPUT INSERTED.id
              VALUES (@class_id, @subject_id, @teacher_id, @classroom_id, @day_of_week, @lesson_number, @week_number, @lesson_date, @academic_period_id)
            `);
          
          schedule.push({
            id: result.recordset[0].id,
            week_number: week,
            lesson_date: lessonDate.toISOString().split('T')[0],
            day_of_week: lesson.day_of_week,
            lesson_number: lesson.lesson_number,
            subject_name: lesson.subject_name,
            teacher_name: lesson.teacher_name,
            classroom: lesson.classroom
          });
        }
      }
      
      return {
        success: true,
        schedule,
        errors,
        warnings: weeklySchedule.warnings,
        total_lessons: schedule.length,
        weeks_generated: weeks_count
      };
      
    } catch (error) {
      console.error('Ошибка генерации расписания на полугодие:', error);
      return {
        success: false,
        errors: ['Ошибка генерации: ' + error.message],
        warnings,
        schedule: []
      };
    }
  }
  
  /**
   * Создает базовое недельное расписание
   */
  async createWeeklySchedule(params) {
    const { class_id, classNumber, classTeacherId, homeClassroomId, subjects, maxLessonsPerDay, academic_period_id } = params;
    const errors = [];
    const warnings = [];
    const schedule = [];
    
    try {
      const pool = await getPool();
      
      // Получаем сложность всех предметов
      const complexityMap = {};
      const teacherNames = {};
      
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
        
        // Получаем имя учителя
        const teacher = await pool.request()
          .input('teacher_id', sql.Int, subj.teacher_id)
          .query('SELECT first_name + \' \' + last_name as name FROM users WHERE id = @teacher_id');
        
        if (teacher.recordset.length > 0) {
          teacherNames[subj.teacher_id] = teacher.recordset[0].name;
        }
      }
      
      // Создаем список всех уроков для распределения
      const lessonsToSchedule = [];
      subjects.forEach(subj => {
        for (let i = 0; i < subj.hours_per_week; i++) {
          lessonsToSchedule.push({
            subject_id: subj.subject_id,
            teacher_id: subj.teacher_id,
            classroom_id: subj.classroom_id,
            complexity: complexityMap[subj.subject_id]?.score || 5,
            subject_name: complexityMap[subj.subject_id]?.name || 'Предмет',
            teacher_name: teacherNames[subj.teacher_id] || 'Учитель'
          });
        }
      });
      
      // Группируем уроки по предметам для равномерного распределения
      const lessonsBySubject = {};
      lessonsToSchedule.forEach(lesson => {
        if (!lessonsBySubject[lesson.subject_id]) {
          lessonsBySubject[lesson.subject_id] = [];
        }
        lessonsBySubject[lesson.subject_id].push(lesson);
      });
      
      // Создаем сетку расписания (5 дней × maxLessonsPerDay уроков)
      const grid = [];
      for (let day = 1; day <= 5; day++) {
        grid[day] = [];
        for (let lesson = 1; lesson <= maxLessonsPerDay; lesson++) {
          grid[day][lesson] = null;
        }
      }
      
      // Распределяем уроки по дням, стараясь не ставить один предмет несколько раз в день
      for (const subjectId in lessonsBySubject) {
        const lessons = lessonsBySubject[subjectId];
        const complexity = lessons[0].complexity;
        
        // Определяем оптимальные номера уроков для этой сложности
        let preferredLessons = [];
        if (complexity >= 10) {
          preferredLessons = [2, 3, 4]; // Сложные предметы на 2-4 уроки
        } else if (complexity >= 7) {
          preferredLessons = [2, 3, 4, 5];
        } else if (complexity <= 3) {
          preferredLessons = [1, 5, 6, 7]; // Легкие предметы на 1, 5-7 уроки
        } else {
          preferredLessons = [1, 2, 3, 4, 5, 6, 7];
        }
        
        preferredLessons = preferredLessons.filter(n => n <= maxLessonsPerDay);
        
        // Распределяем уроки этого предмета по разным дням
        for (let i = 0; i < lessons.length; i++) {
          const lesson = lessons[i];
          let placed = false;
          
          // Пытаемся разместить на оптимальное время в разные дни
          for (const lessonNum of preferredLessons) {
            if (placed) break;
            
            for (let day = 1; day <= 5; day++) {
              if (placed) break;
              
              // Проверяем, нет ли уже этого предмета в этот день
              const hasSubjectToday = Object.values(grid[day]).some(l => l && l.subject_id === lesson.subject_id);
              
              if (!hasSubjectToday && !grid[day][lessonNum]) {
                // Проверяем конфликт учителя
                const hasTeacherConflict = this.checkTeacherConflict(grid, day, lessonNum, lesson);
                
                if (!hasTeacherConflict) {
                  grid[day][lessonNum] = lesson;
                  placed = true;
                }
              }
            }
          }
          
          // Если не удалось разместить без повторов в день, размещаем на любое свободное место
          if (!placed) {
            for (let day = 1; day <= 5; day++) {
              if (placed) break;
              
              for (let lessonNum = 1; lessonNum <= maxLessonsPerDay; lessonNum++) {
                if (placed) break;
                
                if (!grid[day][lessonNum]) {
                  const hasTeacherConflict = this.checkTeacherConflict(grid, day, lessonNum, lesson);
                  
                  if (!hasTeacherConflict) {
                    grid[day][lessonNum] = lesson;
                    placed = true;
                    
                    // Предупреждение о повторе предмета в день
                    const hasSubjectToday = Object.values(grid[day]).filter(l => l && l.subject_id === lesson.subject_id).length > 1;
                    if (hasSubjectToday) {
                      warnings.push(`${lesson.subject_name} встречается несколько раз в один день`);
                    }
                  }
                }
              }
            }
          }
          
          if (!placed) {
            errors.push(`Не удалось разместить урок: ${lesson.subject_name}`);
            console.error(`Не удалось разместить: ${lesson.subject_name}, сложность: ${lesson.complexity}`);
          }
        }
      }
      
      // Формируем расписание из сетки
      for (let day = 1; day <= 5; day++) {
        for (let lessonNum = 1; lessonNum <= maxLessonsPerDay; lessonNum++) {
          const lesson = grid[day][lessonNum];
          if (lesson) {
            schedule.push({
              day_of_week: day,
              lesson_number: lessonNum,
              subject_id: lesson.subject_id,
              teacher_id: lesson.teacher_id,
              classroom_id: lesson.classroom_id,
              subject_name: lesson.subject_name,
              teacher_name: lesson.teacher_name,
              classroom: lesson.classroom_id ? `Каб. ${lesson.classroom_id}` : null
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
      console.error('Ошибка создания недельного расписания:', error);
      return {
        success: false,
        errors: ['Ошибка: ' + error.message],
        warnings,
        schedule: []
      };
    }
  }
  
  /**
   * Проверяет конфликт учителя в сетке расписания
   */
  checkTeacherConflict(grid, day, lessonNum, newLesson) {
    // Для недельного расписания конфликтов учителя быть не может
    return false;
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

module.exports = new SemesterScheduleGenerator();
