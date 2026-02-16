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

// Получить все праздники
router.get('/', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        id, 
        start_date,
        end_date,
        CAST(name as NVARCHAR(100)) as name, 
        is_working_day,
        transferred_from_date,
        working_saturday_date,
        created_at
      FROM holidays
      ORDER BY start_date
    `);
    
    // Форматируем даты в JavaScript
    const holidays = result.recordset.map(h => ({
      ...h,
      start_date: h.start_date ? h.start_date.toISOString().split('T')[0] : null,
      end_date: h.end_date ? h.end_date.toISOString().split('T')[0] : null,
      transferred_from_date: h.transferred_from_date ? h.transferred_from_date.toISOString().split('T')[0] : null,
      working_saturday_date: h.working_saturday_date ? h.working_saturday_date.toISOString().split('T')[0] : null
    }));
    
    res.json(holidays);
  } catch (error) {
    console.error('Ошибка в GET /api/holidays:', error);
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Добавить праздник
router.post('/', auth, checkRole('admin'), async (req, res) => {
  try {
    const { start_date, end_date, name, is_working_day, transferred_from_date, working_saturday_date } = req.body;
    
    if (!start_date || !name) {
      return res.status(400).json({ message: 'Дата начала и название обязательны' });
    }
    
    const pool = await getPool();
    
    await pool.request()
      .input('start_date', sql.Date, start_date)
      .input('end_date', sql.Date, end_date || start_date)
      .input('name', sql.NVarChar, name)
      .input('is_working_day', sql.Bit, is_working_day || false)
      .input('transferred_from_date', sql.Date, transferred_from_date || null)
      .input('working_saturday_date', sql.Date, working_saturday_date || null)
      .query(`
        INSERT INTO holidays (start_date, end_date, name, is_working_day, transferred_from_date, working_saturday_date)
        VALUES (@start_date, @end_date, @name, @is_working_day, @transferred_from_date, @working_saturday_date)
      `);
    
    res.json({ message: 'Праздник добавлен' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удалить праздник
router.delete('/:id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM holidays WHERE id = @id');
    
    res.json({ message: 'Праздник удален' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Обновить праздник
router.put('/:id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, name } = req.body;
    
    if (!start_date || !name) {
      return res.status(400).json({ message: 'Дата начала и название обязательны' });
    }
    
    const pool = await getPool();
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('start_date', sql.Date, start_date)
      .input('end_date', sql.Date, end_date || start_date)
      .input('name', sql.NVarChar, name)
      .query(`
        UPDATE holidays 
        SET start_date = @start_date,
            end_date = @end_date,
            name = @name
        WHERE id = @id
      `);
    
    res.json({ message: 'Праздник обновлен' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
