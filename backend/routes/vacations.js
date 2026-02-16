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

// Получить все каникулы
router.get('/', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        id, 
        start_date,
        end_date,
        CAST(name as NVARCHAR(100)) as name, 
        class_numbers, 
        academic_period_id, 
        created_at
      FROM vacations
      ORDER BY start_date
    `);
    
    // Форматируем даты в JavaScript
    const vacations = result.recordset.map(v => ({
      ...v,
      start_date: v.start_date ? v.start_date.toISOString().split('T')[0] : null,
      end_date: v.end_date ? v.end_date.toISOString().split('T')[0] : null
    }));
    
    res.json(vacations);
  } catch (error) {
    console.error('Ошибка в GET /api/vacations:', error);
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Добавить каникулы
router.post('/', auth, checkRole('admin'), async (req, res) => {
  try {
    const { name, start_date, end_date, class_numbers } = req.body;
    
    if (!name || !start_date || !end_date) {
      return res.status(400).json({ message: 'Название и даты обязательны' });
    }
    
    const pool = await getPool();
    
    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('start_date', sql.Date, start_date)
      .input('end_date', sql.Date, end_date)
      .input('class_numbers', sql.NVarChar, class_numbers || null)
      .input('academic_period_id', sql.Int, 1) // По умолчанию 1
      .query(`
        INSERT INTO vacations (name, start_date, end_date, class_numbers, academic_period_id)
        VALUES (@name, @start_date, @end_date, @class_numbers, @academic_period_id)
      `);
    
    res.json({ message: 'Каникулы добавлены' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удалить каникулы
router.delete('/:id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM vacations WHERE id = @id');
    
    res.json({ message: 'Каникулы удалены' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Обновить каникулы
router.put('/:id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date, class_numbers } = req.body;
    
    if (!name || !start_date || !end_date) {
      return res.status(400).json({ message: 'Название и даты обязательны' });
    }
    
    const pool = await getPool();
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, name)
      .input('start_date', sql.Date, start_date)
      .input('end_date', sql.Date, end_date)
      .input('class_numbers', sql.NVarChar, class_numbers || null)
      .query(`
        UPDATE vacations 
        SET name = @name,
            start_date = @start_date,
            end_date = @end_date,
            class_numbers = @class_numbers
        WHERE id = @id
      `);
    
    res.json({ message: 'Каникулы обновлены' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
