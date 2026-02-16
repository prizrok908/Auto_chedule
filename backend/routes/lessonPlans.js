const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { auth } = require('../middleware/auth');
const { getPool, sql } = require('../config/database');

const router = express.Router();

// Настройка multer для загрузки файлов
const upload = multer({ 
  dest: 'uploads/temp/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Только Excel файлы разрешены'));
    }
  }
});

// Проверка роли
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }
    next();
  };
};

// Получить планы уроков учителя
router.get('/', auth, checkRole('teacher', 'admin'), async (req, res) => {
  try {
    const { teacher_id, class_id, subject_id, academic_period_id } = req.query;
    const pool = await getPool();
    
    let query = `
      SELECT 
        lp.id,
        lp.lesson_number,
        lp.topic,
        lp.homework,
        lp.lesson_date,
        lp.is_completed,
        c.class_number,
        c.class_letter,
        s.name as subject_name,
        u.first_name + ' ' + u.last_name as teacher_name
      FROM lesson_plans lp
      JOIN classes c ON lp.class_id = c.id
      JOIN subjects s ON lp.subject_id = s.id
      JOIN users u ON lp.teacher_id = u.id
      WHERE 1=1
    `;
    
    const request = pool.request();
    
    // Если учитель - показываем только его планы
    if (req.user.role === 'teacher') {
      query += ' AND lp.teacher_id = @teacher_id';
      request.input('teacher_id', sql.Int, req.user.id);
    } else if (teacher_id) {
      query += ' AND lp.teacher_id = @teacher_id';
      request.input('teacher_id', sql.Int, parseInt(teacher_id));
    }
    
    if (class_id) {
      query += ' AND lp.class_id = @class_id';
      request.input('class_id', sql.Int, parseInt(class_id));
    }
    
    if (subject_id) {
      query += ' AND lp.subject_id = @subject_id';
      request.input('subject_id', sql.Int, parseInt(subject_id));
    }
    
    if (academic_period_id) {
      query += ' AND lp.academic_period_id = @academic_period_id';
      request.input('academic_period_id', sql.Int, parseInt(academic_period_id));
    }
    
    query += ' ORDER BY lp.lesson_date, lp.lesson_number';
    
    const result = await request.query(query);
    res.json(result.recordset);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить план урока по ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          lp.*,
          c.class_number,
          c.class_letter,
          s.name as subject_name
        FROM lesson_plans lp
        JOIN classes c ON lp.class_id = c.id
        JOIN subjects s ON lp.subject_id = s.id
        WHERE lp.id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'План урока не найден' });
    }
    
    res.json(result.recordset[0]);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Создать план урока
router.post('/', auth, checkRole('teacher', 'admin'), async (req, res) => {
  try {
    const { class_id, subject_id, lesson_number, topic, homework, lesson_date, academic_period_id } = req.body;
    const teacher_id = req.user.role === 'teacher' ? req.user.id : req.body.teacher_id;
    
    const pool = await getPool();
    
    const result = await pool.request()
      .input('teacher_id', sql.Int, teacher_id)
      .input('class_id', sql.Int, class_id)
      .input('subject_id', sql.Int, subject_id)
      .input('lesson_number', sql.Int, lesson_number)
      .input('topic', sql.NVarChar, topic)
      .input('homework', sql.NVarChar, homework || null)
      .input('lesson_date', sql.Date, lesson_date || null)
      .input('academic_period_id', sql.Int, academic_period_id)
      .query(`
        INSERT INTO lesson_plans (teacher_id, class_id, subject_id, lesson_number, topic, homework, lesson_date, academic_period_id)
        OUTPUT INSERTED.id
        VALUES (@teacher_id, @class_id, @subject_id, @lesson_number, @topic, @homework, @lesson_date, @academic_period_id)
      `);
    
    res.json({ 
      message: 'План урока создан',
      id: result.recordset[0].id
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Загрузить планы уроков из Excel
router.post('/upload-excel', auth, checkRole('teacher', 'admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не загружен' });
    }
    
    const { class_id, subject_id, academic_period_id } = req.body;
    const teacher_id = req.user.role === 'teacher' ? req.user.id : req.body.teacher_id;
    
    // Читаем Excel файл
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    const pool = await getPool();
    const created = [];
    
    // Ожидаемые колонки: "Номер урока", "Тема", "Домашнее задание"
    for (const row of data) {
      const lessonNumber = row['Номер урока'] || row['Номер'] || row['№'];
      const topic = row['Тема'] || row['Тема урока'];
      const homework = row['Домашнее задание'] || row['ДЗ'] || row['Домашка'];
      
      if (lessonNumber && topic) {
        const result = await pool.request()
          .input('teacher_id', sql.Int, teacher_id)
          .input('class_id', sql.Int, class_id)
          .input('subject_id', sql.Int, subject_id)
          .input('lesson_number', sql.Int, lessonNumber)
          .input('topic', sql.NVarChar, topic)
          .input('homework', sql.NVarChar, homework || null)
          .input('academic_period_id', sql.Int, academic_period_id)
          .query(`
            INSERT INTO lesson_plans (teacher_id, class_id, subject_id, lesson_number, topic, homework, academic_period_id)
            OUTPUT INSERTED.id
            VALUES (@teacher_id, @class_id, @subject_id, @lesson_number, @topic, @homework, @academic_period_id)
          `);
        
        created.push(result.recordset[0].id);
      }
    }
    
    // Удаляем временный файл
    const fs = require('fs');
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      message: `Загружено ${created.length} планов уроков`,
      created_ids: created
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка загрузки файла' });
  }
});

// Обновить план урока
router.put('/:id', auth, checkRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { lesson_number, topic, homework, lesson_date, is_completed } = req.body;
    
    const pool = await getPool();
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('lesson_number', sql.Int, lesson_number)
      .input('topic', sql.NVarChar, topic)
      .input('homework', sql.NVarChar, homework || null)
      .input('lesson_date', sql.Date, lesson_date || null)
      .input('is_completed', sql.Bit, is_completed || 0)
      .query(`
        UPDATE lesson_plans 
        SET lesson_number = @lesson_number,
            topic = @topic,
            homework = @homework,
            lesson_date = @lesson_date,
            is_completed = @is_completed
        WHERE id = @id
      `);
    
    res.json({ message: 'План урока обновлен' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удалить план урока
router.delete('/:id', auth, checkRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM lesson_plans WHERE id = @id');
    
    res.json({ message: 'План урока удален' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить домашние задания для ученика
router.get('/homework/student/:student_id', auth, async (req, res) => {
  try {
    const { student_id } = req.params;
    const pool = await getPool();
    
    // Находим класс ученика
    const studentClass = await pool.request()
      .input('user_id', sql.Int, student_id)
      .query('SELECT class_id FROM students WHERE user_id = @user_id');
    
    if (studentClass.recordset.length === 0) {
      return res.status(404).json({ message: 'Ученик не найден' });
    }
    
    const class_id = studentClass.recordset[0].class_id;
    
    // Получаем домашние задания для класса
    const result = await pool.request()
      .input('class_id', sql.Int, class_id)
      .query(`
        SELECT 
          lp.id,
          lp.lesson_number,
          lp.topic,
          lp.homework,
          lp.lesson_date,
          s.name as subject_name,
          u.first_name + ' ' + u.last_name as teacher_name
        FROM lesson_plans lp
        JOIN subjects s ON lp.subject_id = s.id
        JOIN users u ON lp.teacher_id = u.id
        WHERE lp.class_id = @class_id 
        AND lp.homework IS NOT NULL
        AND lp.is_completed = 0
        ORDER BY lp.lesson_date DESC, lp.lesson_number
      `);
    
    res.json(result.recordset);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
