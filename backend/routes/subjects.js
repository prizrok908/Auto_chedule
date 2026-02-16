const express = require('express');
const { getPool, sql } = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Получить все предметы
router.get('/', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        id,
        CAST(name as NVARCHAR(100)) as name
      FROM subjects 
      ORDER BY name
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
