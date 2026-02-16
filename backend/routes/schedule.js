const express = require('express');
const { auth } = require('../middleware/auth');
const { getPool, sql } = require('../config/database');
const sanpinValidator = require('../utils/sanpin-validator');
const scheduleGenerator = require('../utils/schedule-generator');
const semesterScheduleGenerator = require('../utils/semester-schedule-generator');

const router = express.Router();

// Проверка роли
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }
    next();
  };
};

// Получить расписание
router.get('/', auth, async (req, res) => {
  try {
    const { class_id, teacher_id, academic_period_id } = req.query;
    const pool = await getPool();
    
    let query = `
      SELECT 
        s.id,
        s.day_of_week,
        s.lesson_number,
        c.class_number,
        c.class_letter,
        CAST(subj.name as NVARCHAR(100)) as subject_name,
        u.first_name + ' ' + u.last_name as teacher_name,
        cr.room_number as classroom
      FROM schedule s
      JOIN classes c ON s.class_id = c.id
      JOIN subjects subj ON s.subject_id = subj.id
      JOIN users u ON s.teacher_id = u.id
      LEFT JOIN classrooms cr ON s.classroom_id = cr.id
      WHERE 1=1
    `;
    
    const request = pool.request();
    
    if (class_id) {
      query += ' AND s.class_id = @class_id';
      request.input('class_id', sql.Int, parseInt(class_id));
    }
    
    if (teacher_id) {
      query += ' AND s.teacher_id = @teacher_id';
      request.input('teacher_id', sql.Int, parseInt(teacher_id));
    }
    
    if (academic_period_id) {
      query += ' AND s.academic_period_id = @academic_period_id';
      request.input('academic_period_id', sql.Int, parseInt(academic_period_id));
    }
    
    query += ' ORDER BY s.day_of_week, s.lesson_number';
    
    const result = await request.query(query);
    res.json(result.recordset);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Валидация расписания (проверка перед добавлением/изменением)
router.post('/validate', auth, checkRole('admin'), async (req, res) => {
  try {
    const validation = await sanpinValidator.validate(req.body);
    res.json(validation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка валидации' });
  }
});

// Добавить урок в расписание
router.post('/', auth, checkRole('admin'), async (req, res) => {
  try {
    const { class_id, subject_id, teacher_id, classroom_id, day_of_week, lesson_number, academic_period_id } = req.body;
    
    // Валидация по СанПиН
    const validation = await sanpinValidator.validate(req.body);
    
    if (!validation.valid) {
      return res.status(400).json({ 
        message: 'Расписание не соответствует нормам СанПиН',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }
    
    const pool = await getPool();
    
    const result = await pool.request()
      .input('class_id', sql.Int, class_id)
      .input('subject_id', sql.Int, subject_id)
      .input('teacher_id', sql.Int, teacher_id)
      .input('classroom_id', sql.Int, classroom_id || null)
      .input('day_of_week', sql.Int, day_of_week)
      .input('lesson_number', sql.Int, lesson_number)
      .input('academic_period_id', sql.Int, academic_period_id)
      .query(`
        INSERT INTO schedule (class_id, subject_id, teacher_id, classroom_id, day_of_week, lesson_number, academic_period_id)
        OUTPUT INSERTED.id
        VALUES (@class_id, @subject_id, @teacher_id, @classroom_id, @day_of_week, @lesson_number, @academic_period_id)
      `);
    
    res.json({ 
      message: 'Урок добавлен в расписание',
      id: result.recordset[0].id,
      warnings: validation.warnings
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Обновить урок в расписании
router.put('/:id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { class_id, subject_id, teacher_id, classroom_id, day_of_week, lesson_number, academic_period_id } = req.body;
    
    // Валидация по СанПиН (с учетом ID для исключения самого себя из проверки конфликтов)
    const validation = await sanpinValidator.validate({ ...req.body, id: parseInt(id) });
    
    if (!validation.valid) {
      return res.status(400).json({ 
        message: 'Изменения не соответствуют нормам СанПиН',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }
    
    const pool = await getPool();
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('class_id', sql.Int, class_id)
      .input('subject_id', sql.Int, subject_id)
      .input('teacher_id', sql.Int, teacher_id)
      .input('classroom_id', sql.Int, classroom_id || null)
      .input('day_of_week', sql.Int, day_of_week)
      .input('lesson_number', sql.Int, lesson_number)
      .input('academic_period_id', sql.Int, academic_period_id)
      .query(`
        UPDATE schedule 
        SET class_id = @class_id,
            subject_id = @subject_id,
            teacher_id = @teacher_id,
            classroom_id = @classroom_id,
            day_of_week = @day_of_week,
            lesson_number = @lesson_number,
            academic_period_id = @academic_period_id
        WHERE id = @id
      `);
    
    res.json({ 
      message: 'Расписание обновлено',
      warnings: validation.warnings
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удалить урок из расписания
router.delete('/:id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM schedule WHERE id = @id');
    
    res.json({ message: 'Урок удален из расписания' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить стандартную программу для класса
router.get('/standard-curriculum/:class_number', auth, checkRole('admin'), async (req, res) => {
  try {
    const { class_number } = req.params;
    const { class_id } = req.query; // Получаем class_id из query параметров
    const { getStandardCurriculum } = require('../utils/standard-curriculum');
    const pool = await getPool();
    
    const curriculum = getStandardCurriculum(parseInt(class_number));
    
    // Для 1-4 классов получаем классного руководителя
    let classTeacherId = null;
    if (class_id && class_number >= 1 && class_number <= 4) {
      const classInfo = await pool.request()
        .input('class_id', sql.Int, parseInt(class_id))
        .query('SELECT class_teacher_id FROM classes WHERE id = @class_id');
      
      if (classInfo.recordset.length > 0) {
        classTeacherId = classInfo.recordset[0].class_teacher_id;
      }
    }
    
    // Получаем ID предметов и учителей
    const enrichedCurriculum = [];
    
    for (const item of curriculum) {
      // Находим предмет
      const subjectRes = await pool.request()
        .input('name', sql.NVarChar, item.name)
        .query('SELECT id FROM subjects WHERE name = @name');
      
      if (subjectRes.recordset.length > 0) {
        const subject_id = subjectRes.recordset[0].id;
        let teacher_id = null;
        let teacher_name = '';
        
        // Для 1-4 классов: используем классного руководителя для основных предметов
        if (class_number >= 1 && class_number <= 4 && classTeacherId && !item.needs_specialist) {
          teacher_id = classTeacherId;
          
          // Получаем имя классного руководителя
          const teacherInfo = await pool.request()
            .input('teacher_id', sql.Int, classTeacherId)
            .query('SELECT first_name, last_name FROM users WHERE id = @teacher_id');
          
          if (teacherInfo.recordset.length > 0) {
            teacher_name = `${teacherInfo.recordset[0].first_name} ${teacherInfo.recordset[0].last_name}`;
          }
        } else {
          // Для специальных предметов или 5-11 классов: ищем учителя-предметника
          const teacherRes = await pool.request()
            .input('subject_id', sql.Int, subject_id)
            .query(`
              SELECT TOP 1 u.id, u.first_name, u.last_name
              FROM users u
              JOIN teacher_subjects ts ON u.id = ts.teacher_id
              WHERE ts.subject_id = @subject_id
              ORDER BY u.id
            `);
          
          if (teacherRes.recordset.length > 0) {
            teacher_id = teacherRes.recordset[0].id;
            teacher_name = `${teacherRes.recordset[0].first_name} ${teacherRes.recordset[0].last_name}`;
          }
        }
        
        if (teacher_id) {
          enrichedCurriculum.push({
            subject_id,
            subject_name: item.name,
            teacher_id,
            teacher_name,
            hours_per_week: item.hours_per_week,
            classroom_id: null
          });
        }
      }
    }
    
    res.json(enrichedCurriculum);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Генерация расписания для класса (автоматически)
router.post('/generate-auto', auth, checkRole('admin'), async (req, res) => {
  try {
    const { class_id, academic_period_id } = req.body;
    const pool = await getPool();
    
    // Получаем информацию о классе
    const classInfo = await pool.request()
      .input('class_id', sql.Int, class_id)
      .query('SELECT class_number, class_teacher_id, home_classroom_id FROM classes WHERE id = @class_id');
    
    if (classInfo.recordset.length === 0) {
      return res.status(404).json({ message: 'Класс не найден' });
    }
    
    const classNumber = classInfo.recordset[0].class_number;
    const classTeacherId = classInfo.recordset[0].class_teacher_id;
    const homeClassroomId = classInfo.recordset[0].home_classroom_id;
    
    // Для 1-4 классов проверяем наличие классного руководителя
    if (classNumber >= 1 && classNumber <= 4 && !classTeacherId) {
      return res.status(400).json({ 
        message: 'Для начальных классов (1-4) необходимо назначить классного руководителя' 
      });
    }
    
    // Получаем стандартную программу
    const { getStandardCurriculum } = require('../utils/standard-curriculum');
    const curriculum = getStandardCurriculum(classNumber);
    
    // Подготавливаем предметы с учителями
    const subjects = [];
    
    for (const item of curriculum) {
      const subjectRes = await pool.request()
        .input('name', sql.NVarChar, item.name)
        .query('SELECT id FROM subjects WHERE name = @name');
      
      if (subjectRes.recordset.length > 0) {
        const subject_id = subjectRes.recordset[0].id;
        let teacher_id = null;
        let classroom_id = homeClassroomId; // По умолчанию домашний кабинет
        
        // Для 1-4 классов: используем классного руководителя для основных предметов
        if (classNumber >= 1 && classNumber <= 4) {
          if (item.needs_specialist) {
            // Для специальных предметов ищем учителя-предметника
            const teacherRes = await pool.request()
              .input('subject_id', sql.Int, subject_id)
              .query(`
                SELECT TOP 1 u.id
                FROM users u
                JOIN teacher_subjects ts ON u.id = ts.teacher_id
                WHERE ts.subject_id = @subject_id
                ORDER BY u.id
              `);
            
            if (teacherRes.recordset.length > 0) {
              teacher_id = teacherRes.recordset[0].id;
            }
          } else {
            // Для основных предметов используем классного руководителя
            teacher_id = classTeacherId;
          }
        } else {
          // Для 5-11 классов: ищем учителя-предметника
          const teacherRes = await pool.request()
            .input('subject_id', sql.Int, subject_id)
            .query(`
              SELECT TOP 1 u.id
              FROM users u
              JOIN teacher_subjects ts ON u.id = ts.teacher_id
              WHERE ts.subject_id = @subject_id
              ORDER BY u.id
            `);
          
          if (teacherRes.recordset.length > 0) {
            teacher_id = teacherRes.recordset[0].id;
          }
        }
        
        if (teacher_id) {
          subjects.push({
            subject_id,
            teacher_id,
            classroom_id,
            hours_per_week: item.hours_per_week
          });
        }
      }
    }
    
    // Очищаем существующее расписание
    await scheduleGenerator.clearSchedule(class_id, academic_period_id);
    
    // Генерируем расписание
    const result = await scheduleGenerator.generate({
      class_id,
      academic_period_id,
      subjects
    });
    
    if (result.success) {
      res.json({
        message: 'Расписание успешно сгенерировано',
        schedule: result.schedule,
        warnings: result.warnings
      });
    } else {
      res.status(400).json({
        message: 'Не удалось сгенерировать расписание',
        errors: result.errors,
        warnings: result.warnings
      });
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Генерация расписания для класса (с настройками)
router.post('/generate', auth, checkRole('admin'), async (req, res) => {
  try {
    const { class_id, academic_period_id, subjects, clear_existing } = req.body;
    
    // Если нужно, очищаем существующее расписание
    if (clear_existing) {
      await scheduleGenerator.clearSchedule(class_id, academic_period_id);
    }
    
    // Генерируем новое расписание
    const result = await scheduleGenerator.generate({
      class_id,
      academic_period_id,
      subjects
    });
    
    if (result.success) {
      res.json({
        message: 'Расписание успешно сгенерировано',
        schedule: result.schedule,
        warnings: result.warnings
      });
    } else {
      res.status(400).json({
        message: 'Не удалось сгенерировать расписание',
        errors: result.errors,
        warnings: result.warnings
      });
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить расписание для ученика (по его ID)
router.get('/student/:student_id', auth, async (req, res) => {
  try {
    const { student_id } = req.params;
    const pool = await getPool();
    
    // Находим класс ученика
    const studentClass = await pool.request()
      .input('user_id', sql.Int, student_id)
      .query(`
        SELECT st.class_id 
        FROM students st 
        WHERE st.user_id = @user_id
      `);
    
    if (studentClass.recordset.length === 0) {
      return res.status(404).json({ message: 'Ученик не найден' });
    }
    
    const class_id = studentClass.recordset[0].class_id;
    
    // Получаем расписание класса
    const result = await pool.request()
      .input('class_id', sql.Int, class_id)
      .query(`
        SELECT 
          s.id,
          s.day_of_week,
          s.lesson_number,
          CAST(subj.name as NVARCHAR(100)) as subject_name,
          u.first_name + ' ' + u.last_name as teacher_name,
          cr.room_number as classroom,
          bs.start_time,
          bs.end_time
        FROM schedule s
        JOIN subjects subj ON s.subject_id = subj.id
        JOIN users u ON s.teacher_id = u.id
        LEFT JOIN classrooms cr ON s.classroom_id = cr.id
        LEFT JOIN bell_schedule bs ON s.lesson_number = bs.lesson_number AND bs.is_for_first_grade = 0
        WHERE s.class_id = @class_id
        ORDER BY s.day_of_week, s.lesson_number
      `);
    
    res.json(result.recordset);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить расписание для учителя (по его ID)
router.get('/teacher/:teacher_id', auth, async (req, res) => {
  try {
    const { teacher_id } = req.params;
    const pool = await getPool();
    
    const result = await pool.request()
      .input('teacher_id', sql.Int, teacher_id)
      .query(`
        SELECT 
          s.id,
          s.day_of_week,
          s.lesson_number,
          c.class_number,
          c.class_letter,
          CAST(subj.name as NVARCHAR(100)) as subject_name,
          cr.room_number as classroom,
          bs.start_time,
          bs.end_time
        FROM schedule s
        JOIN classes c ON s.class_id = c.id
        JOIN subjects subj ON s.subject_id = subj.id
        LEFT JOIN classrooms cr ON s.classroom_id = cr.id
        LEFT JOIN bell_schedule bs ON s.lesson_number = bs.lesson_number AND bs.is_for_first_grade = 0
        WHERE s.teacher_id = @teacher_id
        ORDER BY s.day_of_week, s.lesson_number
      `);
    
    res.json(result.recordset);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;


// Генерация расписания на полугодие
router.post('/generate-semester', auth, checkRole('admin'), async (req, res) => {
  try {
    console.log('=== ЗАПРОС НА ГЕНЕРАЦИЮ РАСПИСАНИЯ ===');
    console.log('Body:', req.body);
    
    const { class_id, academic_period_id, start_date, weeks_count, custom_curriculum } = req.body;
    const pool = await getPool();
    
    console.log(`Генерация для класса ${class_id}, период ${academic_period_id}, недель: ${weeks_count || 20}`);
    
    // Получаем информацию о классе
    const classInfo = await pool.request()
      .input('class_id', sql.Int, class_id)
      .query('SELECT class_number, class_teacher_id, home_classroom_id FROM classes WHERE id = @class_id');
    
    if (classInfo.recordset.length === 0) {
      console.log('Класс не найден!');
      return res.status(404).json({ message: 'Класс не найден' });
    }
    
    const classNumber = classInfo.recordset[0].class_number;
    const classTeacherId = classInfo.recordset[0].class_teacher_id;
    const homeClassroomId = classInfo.recordset[0].home_classroom_id;
    
    console.log(`Класс ${classNumber}, учитель: ${classTeacherId}, кабинет: ${homeClassroomId}`);
    
    let subjects = [];
    
    // Если передана пользовательская программа, используем её
    if (custom_curriculum && custom_curriculum.length > 0) {
      console.log('Используется пользовательская программа');
      subjects = custom_curriculum.map(item => ({
        subject_id: parseInt(item.subject_id),
        teacher_id: parseInt(item.teacher_id),
        classroom_id: homeClassroomId,
        hours_per_week: parseInt(item.hours_per_week)
      }));
    } else {
      // Иначе используем стандартную программу
      console.log('Используется стандартная программа');
      
      // Для 1-4 классов проверяем наличие классного руководителя
      if (classNumber >= 1 && classNumber <= 4 && !classTeacherId) {
        return res.status(400).json({ 
          message: 'Для начальных классов (1-4) необходимо назначить классного руководителя' 
        });
      }
      
      // Получаем стандартную программу
      const { getStandardCurriculum } = require('../utils/standard-curriculum');
      const curriculum = getStandardCurriculum(classNumber);
      
      // Подготавливаем предметы с учителями
      for (const item of curriculum) {
        const subjectRes = await pool.request()
          .input('name', sql.NVarChar, item.name)
          .query('SELECT id FROM subjects WHERE name = @name');
        
        if (subjectRes.recordset.length > 0) {
          const subject_id = subjectRes.recordset[0].id;
          let teacher_id = null;
          let classroom_id = homeClassroomId;
          
          // Для 1-4 классов: используем классного руководителя для основных предметов
          if (classNumber >= 1 && classNumber <= 4) {
            if (item.needs_specialist) {
              const teacherRes = await pool.request()
                .input('subject_id', sql.Int, subject_id)
                .query(`
                  SELECT TOP 1 u.id
                  FROM users u
                  JOIN teacher_subjects ts ON u.id = ts.teacher_id
                  WHERE ts.subject_id = @subject_id
                  ORDER BY u.id
                `);
              
              if (teacherRes.recordset.length > 0) {
                teacher_id = teacherRes.recordset[0].id;
              }
            } else {
              teacher_id = classTeacherId;
            }
          } else {
            const teacherRes = await pool.request()
              .input('subject_id', sql.Int, subject_id)
              .query(`
                SELECT TOP 1 u.id
                FROM users u
                JOIN teacher_subjects ts ON u.id = ts.teacher_id
                WHERE ts.subject_id = @subject_id
                ORDER BY u.id
              `);
            
            if (teacherRes.recordset.length > 0) {
              teacher_id = teacherRes.recordset[0].id;
            }
          }
          
          if (teacher_id) {
            subjects.push({
              subject_id,
              teacher_id,
              classroom_id,
              hours_per_week: item.hours_per_week
            });
          }
        }
      }
    }
    
    console.log(`Предметов для генерации: ${subjects.length}`);
    
    // Очищаем существующее расписание
    console.log('Очистка старого расписания...');
    await semesterScheduleGenerator.clearSchedule(class_id, academic_period_id);
    console.log('Старое расписание удалено');
    
    // Генерируем расписание на полугодие
    console.log('Начинаем генерацию нового расписания...');
    const result = await semesterScheduleGenerator.generateSemester({
      class_id,
      academic_period_id,
      subjects,
      start_date: start_date || new Date(),
      weeks_count: weeks_count || 20
    });
    
    console.log('Результат генерации:', result.success ? 'УСПЕХ' : 'ОШИБКА');
    console.log('Уроков создано:', result.total_lessons);
    
    if (result.success) {
      res.json({
        message: 'Расписание на полугодие успешно сгенерировано',
        total_lessons: result.total_lessons,
        weeks_generated: result.weeks_generated,
        warnings: result.warnings
      });
    } else {
      console.log('Ошибки:', result.errors);
      res.status(400).json({
        message: 'Не удалось сгенерировать расписание',
        errors: result.errors,
        warnings: result.warnings
      });
    }
    
  } catch (error) {
    console.error('КРИТИЧЕСКАЯ ОШИБКА:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить расписание на полугодие (с фильтрами)
router.get('/semester', auth, async (req, res) => {
  try {
    const { class_id, week_number, start_date, end_date, academic_period_id } = req.query;
    const pool = await getPool();
    
    let query = `
      SELECT 
        s.id,
        s.week_number,
        s.lesson_date,
        s.day_of_week,
        s.lesson_number,
        c.class_number,
        c.class_letter,
        CAST(subj.name as NVARCHAR(100)) as subject_name,
        u.first_name + ' ' + u.last_name as teacher_name,
        u.id as teacher_id,
        cr.room_number as classroom,
        ts.substitute_teacher_id,
        u2.first_name + ' ' + u2.last_name as substitute_teacher_name,
        ap.semester,
        bs.start_time,
        bs.end_time,
        bs.duration_minutes
      FROM schedule s
      JOIN classes c ON s.class_id = c.id
      JOIN subjects subj ON s.subject_id = subj.id
      JOIN users u ON s.teacher_id = u.id
      LEFT JOIN classrooms cr ON s.classroom_id = cr.id
      LEFT JOIN teacher_substitutions ts ON s.id = ts.schedule_id
      LEFT JOIN users u2 ON ts.substitute_teacher_id = u2.id
      LEFT JOIN academic_periods ap ON s.academic_period_id = ap.id
      LEFT JOIN bell_schedule bs ON s.lesson_number = bs.lesson_number 
        AND (
          (c.class_number = 1 AND bs.is_for_first_grade = 1 AND (bs.semester = ap.semester OR bs.semester IS NULL))
          OR (c.class_number > 1 AND bs.is_for_first_grade = 0)
        )
      WHERE 1=1
    `;
    
    const request = pool.request();
    
    if (class_id) {
      query += ' AND s.class_id = @class_id';
      request.input('class_id', sql.Int, parseInt(class_id));
    }
    
    if (week_number) {
      query += ' AND s.week_number = @week_number';
      request.input('week_number', sql.Int, parseInt(week_number));
    }
    
    if (start_date) {
      query += ' AND s.lesson_date >= @start_date';
      request.input('start_date', sql.Date, start_date);
    }
    
    if (end_date) {
      query += ' AND s.lesson_date <= @end_date';
      request.input('end_date', sql.Date, end_date);
    }
    
    if (academic_period_id) {
      query += ' AND s.academic_period_id = @academic_period_id';
      request.input('academic_period_id', sql.Int, parseInt(academic_period_id));
    }
    
    query += ' ORDER BY s.lesson_date, s.lesson_number';
    
    const result = await request.query(query);
    res.json(result.recordset);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Создать замену учителя
router.post('/substitution', auth, checkRole('admin'), async (req, res) => {
  try {
    const { schedule_id, substitute_teacher_id, reason } = req.body;
    const pool = await getPool();
    
    // Получаем информацию об уроке
    const scheduleInfo = await pool.request()
      .input('schedule_id', sql.Int, schedule_id)
      .query('SELECT teacher_id, lesson_date FROM schedule WHERE id = @schedule_id');
    
    if (scheduleInfo.recordset.length === 0) {
      return res.status(404).json({ message: 'Урок не найден' });
    }
    
    const original_teacher_id = scheduleInfo.recordset[0].teacher_id;
    
    // Проверяем, нет ли уже замены
    const existing = await pool.request()
      .input('schedule_id', sql.Int, schedule_id)
      .query('SELECT id FROM teacher_substitutions WHERE schedule_id = @schedule_id');
    
    if (existing.recordset.length > 0) {
      // Обновляем существующую замену
      await pool.request()
        .input('schedule_id', sql.Int, schedule_id)
        .input('substitute_teacher_id', sql.Int, substitute_teacher_id)
        .input('reason', sql.NVarChar, reason || null)
        .query(`
          UPDATE teacher_substitutions 
          SET substitute_teacher_id = @substitute_teacher_id,
              reason = @reason
          WHERE schedule_id = @schedule_id
        `);
      
      res.json({ message: 'Замена обновлена' });
    } else {
      // Создаем новую замену
      await pool.request()
        .input('schedule_id', sql.Int, schedule_id)
        .input('original_teacher_id', sql.Int, original_teacher_id)
        .input('substitute_teacher_id', sql.Int, substitute_teacher_id)
        .input('reason', sql.NVarChar, reason || null)
        .input('created_by', sql.Int, req.user.id)
        .query(`
          INSERT INTO teacher_substitutions (schedule_id, original_teacher_id, substitute_teacher_id, reason, created_by)
          VALUES (@schedule_id, @original_teacher_id, @substitute_teacher_id, @reason, @created_by)
        `);
      
      res.json({ message: 'Замена создана' });
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удалить замену учителя
router.delete('/substitution/:schedule_id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { schedule_id } = req.params;
    const pool = await getPool();
    
    await pool.request()
      .input('schedule_id', sql.Int, schedule_id)
      .query('DELETE FROM teacher_substitutions WHERE schedule_id = @schedule_id');
    
    res.json({ message: 'Замена удалена' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Обновить конкретный урок в расписании
router.put('/lesson/:id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_id, teacher_id, classroom_id } = req.body;
    const pool = await getPool();
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('subject_id', sql.Int, subject_id)
      .input('teacher_id', sql.Int, teacher_id)
      .input('classroom_id', sql.Int, classroom_id || null)
      .query(`
        UPDATE schedule 
        SET subject_id = @subject_id,
            teacher_id = @teacher_id,
            classroom_id = @classroom_id
        WHERE id = @id
      `);
    
    res.json({ message: 'Урок обновлен' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
