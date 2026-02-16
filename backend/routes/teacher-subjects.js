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

// Получить предметы учителя
router.get('/:teacher_id/subjects', auth, checkRole('admin'), async (req, res) => {
  try {
    const { teacher_id } = req.params;
    const pool = await getPool();
    
    const result = await pool.request()
      .input('teacher_id', sql.Int, teacher_id)
      .query(`
        SELECT s.id, CAST(s.name as NVARCHAR(100)) as name
        FROM subjects s
        JOIN teacher_subjects ts ON s.id = ts.subject_id
        WHERE ts.teacher_id = @teacher_id
        ORDER BY s.name
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Добавить предмет учителю
router.post('/:teacher_id/subjects', auth, checkRole('admin'), async (req, res) => {
  try {
    const { teacher_id } = req.params;
    const { subject_id } = req.body;
    const pool = await getPool();
    
    // Проверяем, нет ли уже такой связи
    const check = await pool.request()
      .input('teacher_id', sql.Int, teacher_id)
      .input('subject_id', sql.Int, subject_id)
      .query('SELECT id FROM teacher_subjects WHERE teacher_id = @teacher_id AND subject_id = @subject_id');
    
    if (check.recordset.length > 0) {
      return res.status(400).json({ message: 'Этот предмет уже назначен учителю' });
    }
    
    await pool.request()
      .input('teacher_id', sql.Int, teacher_id)
      .input('subject_id', sql.Int, subject_id)
      .query('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (@teacher_id, @subject_id)');
    
    res.json({ message: 'Предмет добавлен учителю' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удалить предмет у учителя
router.delete('/:teacher_id/subjects/:subject_id', auth, checkRole('admin'), async (req, res) => {
  try {
    const { teacher_id, subject_id } = req.params;
    const pool = await getPool();
    
    await pool.request()
      .input('teacher_id', sql.Int, teacher_id)
      .input('subject_id', sql.Int, subject_id)
      .query('DELETE FROM teacher_subjects WHERE teacher_id = @teacher_id AND subject_id = @subject_id');
    
    res.json({ message: 'Предмет удален у учителя' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
