const express = require('express');
const { auth } = require('../middleware/auth');
const { getPool, sql } = require('../config/database');

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

// Получить все классы
router.get('/', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        c.id,
        c.class_number,
        c.class_letter,
        c.is_profile,
        CAST(c.profile_type as NVARCHAR(100)) as profile_type,
        c.class_teacher_id,
        c.home_classroom_id,
        u.first_name + ' ' + u.last_name as class_teacher_name,
        cr.room_number as home_classroom,
        COUNT(s.id) as student_count
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id
      LEFT JOIN users u ON c.class_teacher_id = u.id
      LEFT JOIN classrooms cr ON c.home_classroom_id = cr.id
      GROUP BY c.id, c.class_number, c.class_letter, c.is_profile, c.profile_type, 
               c.class_teacher_id, c.home_classroom_id, u.first_name, u.last_name, cr.room_number
      ORDER BY c.class_number, c.class_letter
    `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить класс по ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          c.id,
          c.class_number,
          c.class_letter,
          c.is_profile,
          CAST(c.profile_type as NVARCHAR(100)) as profile_type
        FROM classes c
        WHERE c.id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Класс не найден' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Создать класс
router.post('/', auth, checkRole('admin'), async (req, res) => {
  try {
    const { class_number, class_letter, is_profile, profile_type, class_teacher_id, home_classroom_id } = req.body;
    
    const pool = await getPool();
    
    // Проверяем, существует ли класс
    const check = await pool.request()
      .input('number', sql.Int, class_number)
      .input('letter', sql.NVarChar, class_letter)
      .query('SELECT id FROM classes WHERE class_number = @number AND class_letter = @letter');
    
    if (check.recordset.length > 0) {
      return res.status(400).json({ message: 'Такой класс уже существует' });
    }
    
    // ВАЛИДАЦИЯ 1: Проверяем, что кабинет не занят другим классом
    if (home_classroom_id) {
      const classroomCheck = await pool.request()
        .input('classroom_id', sql.Int, home_classroom_id)
        .query('SELECT id FROM classes WHERE home_classroom_id = @classroom_id');
      
      if (classroomCheck.recordset.length > 0) {
        return res.status(400).json({ message: 'Этот кабинет уже назначен другому классу' });
      }
    }
    
    // ВАЛИДАЦИЯ 2 и 3: Для младших классов (1-4) проверяем классного руководителя
    if (class_number >= 1 && class_number <= 4 && class_teacher_id) {
      // Проверяем, что учитель является учителем начальных классов
      const teacherCheck = await pool.request()
        .input('teacher_id', sql.Int, class_teacher_id)
        .query('SELECT is_primary_teacher FROM users WHERE id = @teacher_id');
      
      if (teacherCheck.recordset.length === 0) {
        return res.status(400).json({ message: 'Учитель не найден' });
      }
      
      if (!teacherCheck.recordset[0].is_primary_teacher) {
        return res.status(400).json({ 
          message: 'Для младших классов (1-4) классным руководителем может быть только учитель начальных классов' 
        });
      }
      
      // Проверяем, что учитель не является классным руководителем другого младшего класса
      const classCheck = await pool.request()
        .input('teacher_id', sql.Int, class_teacher_id)
        .query(`
          SELECT id, class_number, class_letter 
          FROM classes 
          WHERE class_teacher_id = @teacher_id 
          AND class_number BETWEEN 1 AND 4
        `);
      
      if (classCheck.recordset.length > 0) {
        const existingClass = classCheck.recordset[0];
        return res.status(400).json({ 
          message: `Этот учитель уже является классным руководителем ${existingClass.class_number}${existingClass.class_letter} класса. Один учитель не может быть классным руководителем двух младших классов.` 
        });
      }
    }
    
    // Создаем класс
    const result = await pool.request()
      .input('number', sql.Int, class_number)
      .input('letter', sql.NVarChar, class_letter)
      .input('is_profile', sql.Bit, is_profile || 0)
      .input('profile_type', sql.NVarChar, profile_type || null)
      .input('class_teacher_id', sql.Int, class_teacher_id || null)
      .input('home_classroom_id', sql.Int, home_classroom_id || null)
      .query(`
        INSERT INTO classes (class_number, class_letter, is_profile, profile_type, class_teacher_id, home_classroom_id)
        OUTPUT INSERTED.id
        VALUES (@number, @letter, @is_profile, @profile_type, @class_teacher_id, @home_classroom_id)
      `);
    
    res.json({ 
      message: 'Класс создан',
      id: result.recordset[0].id
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Обновить класс
router.put('/:id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { class_number, class_letter, is_profile, profile_type, class_teacher_id, home_classroom_id } = req.body;
    
    const pool = await getPool();
    
    // ВАЛИДАЦИЯ 1: Проверяем, что кабинет не занят другим классом
    if (home_classroom_id) {
      const classroomCheck = await pool.request()
        .input('classroom_id', sql.Int, home_classroom_id)
        .input('class_id', sql.Int, id)
        .query('SELECT id FROM classes WHERE home_classroom_id = @classroom_id AND id != @class_id');
      
      if (classroomCheck.recordset.length > 0) {
        return res.status(400).json({ message: 'Этот кабинет уже назначен другому классу' });
      }
    }
    
    // ВАЛИДАЦИЯ 2 и 3: Для младших классов (1-4) проверяем классного руководителя
    if (class_number >= 1 && class_number <= 4 && class_teacher_id) {
      // Проверяем, что учитель является учителем начальных классов
      const teacherCheck = await pool.request()
        .input('teacher_id', sql.Int, class_teacher_id)
        .query('SELECT is_primary_teacher FROM users WHERE id = @teacher_id');
      
      if (teacherCheck.recordset.length === 0) {
        return res.status(400).json({ message: 'Учитель не найден' });
      }
      
      if (!teacherCheck.recordset[0].is_primary_teacher) {
        return res.status(400).json({ 
          message: 'Для младших классов (1-4) классным руководителем может быть только учитель начальных классов' 
        });
      }
      
      // Проверяем, что учитель не является классным руководителем другого младшего класса
      const classCheck = await pool.request()
        .input('teacher_id', sql.Int, class_teacher_id)
        .input('class_id', sql.Int, id)
        .query(`
          SELECT id, class_number, class_letter 
          FROM classes 
          WHERE class_teacher_id = @teacher_id 
          AND class_number BETWEEN 1 AND 4
          AND id != @class_id
        `);
      
      if (classCheck.recordset.length > 0) {
        const existingClass = classCheck.recordset[0];
        return res.status(400).json({ 
          message: `Этот учитель уже является классным руководителем ${existingClass.class_number}${existingClass.class_letter} класса. Один учитель не может быть классным руководителем двух младших классов.` 
        });
      }
    }
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('number', sql.Int, class_number)
      .input('letter', sql.NVarChar, class_letter)
      .input('is_profile', sql.Bit, is_profile || 0)
      .input('profile_type', sql.NVarChar, profile_type || null)
      .input('class_teacher_id', sql.Int, class_teacher_id || null)
      .input('home_classroom_id', sql.Int, home_classroom_id || null)
      .query(`
        UPDATE classes 
        SET class_number = @number,
            class_letter = @letter,
            is_profile = @is_profile,
            profile_type = @profile_type,
            class_teacher_id = @class_teacher_id,
            home_classroom_id = @home_classroom_id
        WHERE id = @id
      `);
    
    res.json({ message: 'Класс обновлен' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удалить класс
router.delete('/:id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM classes WHERE id = @id');
    
    res.json({ message: 'Класс удален' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;

// Получить учеников класса
router.get('/:id/students', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    
    const result = await pool.request()
      .input('class_id', sql.Int, id)
      .query(`
        SELECT u.id, u.first_name, u.last_name, u.middle_name, u.birth_date
        FROM users u
        INNER JOIN students s ON u.id = s.user_id
        WHERE s.class_id = @class_id AND u.role = 'student'
        ORDER BY u.last_name, u.first_name
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Добавить ученика в класс
router.post('/:id/students', auth, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { student_id } = req.body;
    const pool = await getPool();
    
    // Проверяем, не добавлен ли уже ученик в другой класс
    const check = await pool.request()
      .input('user_id', sql.Int, student_id)
      .query('SELECT class_id FROM students WHERE user_id = @user_id');
    
    if (check.recordset.length > 0) {
      // Обновляем класс
      await pool.request()
        .input('user_id', sql.Int, student_id)
        .input('class_id', sql.Int, id)
        .query('UPDATE students SET class_id = @class_id WHERE user_id = @user_id');
    } else {
      // Добавляем нового
      await pool.request()
        .input('user_id', sql.Int, student_id)
        .input('class_id', sql.Int, id)
        .query('INSERT INTO students (user_id, class_id) VALUES (@user_id, @class_id)');
    }
    
    res.json({ message: 'Ученик добавлен в класс' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удалить ученика из класса
router.delete('/:id/students/:student_id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { student_id } = req.params;
    const pool = await getPool();
    
    await pool.request()
      .input('user_id', sql.Int, student_id)
      .query('DELETE FROM students WHERE user_id = @user_id');
    
    res.json({ message: 'Ученик удален из класса' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});
