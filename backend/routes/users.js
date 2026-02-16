const express = require('express');
const bcrypt = require('bcryptjs');
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

// Получить всех пользователей
router.get('/', auth, checkRole('admin'), async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        u.id,
        u.username,
        u.role,
        u.first_name,
        u.last_name,
        u.middle_name,
        u.birth_date,
        u.plain_password,
        u.is_primary_teacher,
        u.created_at,
        s.class_id
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      ORDER BY u.role, u.last_name, u.first_name
    `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить учителей с их предметами
router.get('/teachers', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.middle_name,
        u.is_primary_teacher,
        STRING_AGG(CAST(s.name as NVARCHAR(MAX)), ', ') as subjects
      FROM users u
      LEFT JOIN teacher_subjects ts ON u.id = ts.teacher_id
      LEFT JOIN subjects s ON ts.subject_id = s.id
      WHERE u.role = 'teacher'
      GROUP BY u.id, u.username, u.first_name, u.last_name, u.middle_name, u.is_primary_teacher
      ORDER BY u.last_name, u.first_name
    `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить учеников по классу
router.get('/students/:class_id', auth, async (req, res) => {
  try {
    const { class_id } = req.params;
    const pool = await getPool();
    
    const result = await pool.request()
      .input('class_id', sql.Int, class_id)
      .query(`
        SELECT 
          u.id,
          u.username,
          u.first_name,
          u.last_name,
          u.middle_name,
          c.class_number,
          c.class_letter
        FROM users u
        JOIN students st ON u.id = st.user_id
        JOIN classes c ON st.class_id = c.id
        WHERE st.class_id = @class_id
        ORDER BY u.last_name, u.first_name
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Создать пользователя
router.post('/', auth, checkRole('admin'), async (req, res) => {
  try {
    const { username, password, role, first_name, last_name, middle_name, birth_date, is_primary_teacher } = req.body;
    
    const pool = await getPool();
    
    // Для учеников генерируем username автоматически
    let finalUsername = username;
    if (role === 'student') {
      finalUsername = `student_${last_name.toLowerCase()}_${birth_date.replace(/-/g, '')}`;
    }
    
    // Проверяем, существует ли пользователь
    const check = await pool.request()
      .input('username', sql.NVarChar, finalUsername)
      .query('SELECT id FROM users WHERE username = @username');
    
    if (check.recordset.length > 0) {
      return res.status(400).json({ message: 'Пользователь с таким логином уже существует' });
    }
    
    // Хешируем пароль (для учеников пароль пустой)
    const plainPassword = role === 'student' ? '' : password;
    const hashedPassword = plainPassword ? await bcrypt.hash(plainPassword, 10) : '';
    
    // Создаем пользователя
    const result = await pool.request()
      .input('username', sql.NVarChar, finalUsername)
      .input('password', sql.NVarChar, hashedPassword)
      .input('plain_password', sql.NVarChar, plainPassword)
      .input('role', sql.NVarChar, role)
      .input('first_name', sql.NVarChar, first_name)
      .input('last_name', sql.NVarChar, last_name)
      .input('middle_name', sql.NVarChar, middle_name || null)
      .input('birth_date', sql.Date, birth_date || null)
      .input('is_primary_teacher', sql.Bit, role === 'teacher' && is_primary_teacher ? 1 : 0)
      .query(`
        INSERT INTO users (username, password, plain_password, role, first_name, last_name, middle_name, birth_date, is_primary_teacher)
        OUTPUT INSERTED.id
        VALUES (@username, @password, @plain_password, @role, @first_name, @last_name, @middle_name, @birth_date, @is_primary_teacher)
      `);
    
    res.json({ 
      message: 'Пользователь создан',
      id: result.recordset[0].id
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Обновить пользователя
router.put('/:id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role, first_name, last_name, middle_name, email, phone } = req.body;
    
    const pool = await getPool();
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('username', sql.NVarChar, username)
      .input('role', sql.NVarChar, role)
      .input('first_name', sql.NVarChar, first_name)
      .input('last_name', sql.NVarChar, last_name)
      .input('middle_name', sql.NVarChar, middle_name || null)
      .input('email', sql.NVarChar, email || null)
      .input('phone', sql.NVarChar, phone || null)
      .query(`
        UPDATE users 
        SET username = @username,
            role = @role,
            first_name = @first_name,
            last_name = @last_name,
            middle_name = @middle_name,
            email = @email,
            phone = @phone
        WHERE id = @id
      `);
    
    res.json({ message: 'Пользователь обновлен' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удалить пользователя
router.delete('/:id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM users WHERE id = @id');
    
    res.json({ message: 'Пользователь удален' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
