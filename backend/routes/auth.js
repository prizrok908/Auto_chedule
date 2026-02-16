const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Вход
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const pool = await getPool();
    
    // Проверяем, является ли пароль датой в формате ДД.ММ.ГГГГ
    const datePattern = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    const dateMatch = password.match(datePattern);
    
    if (dateMatch) {
      // Это ученик - ищем по фамилии и дате рождения
      const [, day, month, year] = dateMatch;
      const birthDate = `${year}-${month}-${day}`; // Конвертируем в формат YYYY-MM-DD
      
      const result = await pool.request()
        .input('last_name', sql.NVarChar, username)
        .input('birth_date', sql.Date, birthDate)
        .query('SELECT * FROM users WHERE last_name = @last_name AND birth_date = @birth_date AND role = \'student\'');

      if (result.recordset.length === 0) {
        return res.status(401).json({ message: 'Неверная фамилия или дата рождения' });
      }

      const user = result.recordset[0];
      
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name
        }
      });
    }
    
    // Это сотрудник - обычный вход по логину и паролю
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM users WHERE username = @username');

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение текущего пользователя
router.get('/me', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query('SELECT id, username, role, first_name, last_name, middle_name, email, phone FROM users WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
