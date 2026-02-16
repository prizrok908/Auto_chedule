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

// Получить все кабинеты
router.get('/', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        id, 
        room_number, 
        capacity, 
        floor, 
        CAST(building as NVARCHAR(100)) as building, 
        room_type, 
        created_at
      FROM classrooms
      ORDER BY 
        CASE 
          WHEN ISNUMERIC(room_number) = 1 THEN CAST(room_number AS INT)
          ELSE 9999
        END,
        room_number
    `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Создать кабинет
router.post('/', auth, checkRole('admin'), async (req, res) => {
  try {
    const { room_number, capacity, floor, building, room_type } = req.body;
    
    if (!room_number) {
      return res.status(400).json({ message: 'Номер кабинета обязателен' });
    }
    
    const pool = await getPool();
    
    // Проверяем, нет ли уже такого кабинета
    const existing = await pool.request()
      .input('room_number', sql.NVarChar, room_number)
      .query('SELECT id FROM classrooms WHERE room_number = @room_number');
    
    if (existing.recordset.length > 0) {
      return res.status(400).json({ message: 'Кабинет с таким номером уже существует' });
    }
    
    const result = await pool.request()
      .input('room_number', sql.NVarChar, room_number)
      .input('capacity', sql.Int, capacity || null)
      .input('floor', sql.Int, floor || null)
      .input('building', sql.NVarChar, building || null)
      .input('room_type', sql.NVarChar, room_type || null)
      .query(`
        INSERT INTO classrooms (room_number, capacity, floor, building, room_type)
        OUTPUT INSERTED.id
        VALUES (@room_number, @capacity, @floor, @building, @room_type)
      `);
    
    res.json({ 
      message: 'Кабинет создан',
      id: result.recordset[0].id
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Обновить кабинет
router.put('/:id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { room_number, capacity, floor, building, room_type } = req.body;
    
    if (!room_number) {
      return res.status(400).json({ message: 'Номер кабинета обязателен' });
    }
    
    const pool = await getPool();
    
    // Проверяем, нет ли другого кабинета с таким номером
    const existing = await pool.request()
      .input('room_number', sql.NVarChar, room_number)
      .input('id', sql.Int, id)
      .query('SELECT id FROM classrooms WHERE room_number = @room_number AND id != @id');
    
    if (existing.recordset.length > 0) {
      return res.status(400).json({ message: 'Кабинет с таким номером уже существует' });
    }
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('room_number', sql.NVarChar, room_number)
      .input('capacity', sql.Int, capacity || null)
      .input('floor', sql.Int, floor || null)
      .input('building', sql.NVarChar, building || null)
      .input('room_type', sql.NVarChar, room_type || null)
      .query(`
        UPDATE classrooms 
        SET room_number = @room_number,
            capacity = @capacity,
            floor = @floor,
            building = @building,
            room_type = @room_type
        WHERE id = @id
      `);
    
    res.json({ message: 'Кабинет обновлен' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удалить кабинет
router.delete('/:id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    
    // Проверяем, не используется ли кабинет
    const inUse = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT COUNT(*) as count FROM (
          SELECT classroom_id FROM schedule WHERE classroom_id = @id
          UNION ALL
          SELECT home_classroom_id FROM classes WHERE home_classroom_id = @id
        ) as usage
      `);
    
    if (inUse.recordset[0].count > 0) {
      return res.status(400).json({ 
        message: 'Кабинет используется в расписании или назначен классу. Удаление невозможно.' 
      });
    }
    
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM classrooms WHERE id = @id');
    
    res.json({ message: 'Кабинет удален' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
