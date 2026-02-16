const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const { getPool, sql } = require('../config/database');

const router = express.Router();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/files';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    // Разрешенные типы файлов
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
      'application/vnd.ms-powerpoint', // ppt
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/msword', // doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Недопустимый тип файла'));
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

// Получить файлы для плана урока
router.get('/lesson/:lesson_plan_id', auth, async (req, res) => {
  try {
    const { lesson_plan_id } = req.params;
    const pool = await getPool();
    
    const result = await pool.request()
      .input('lesson_plan_id', sql.Int, lesson_plan_id)
      .query(`
        SELECT 
          f.id,
          f.file_name,
          f.file_type,
          f.file_size,
          f.created_at,
          u.first_name + ' ' + u.last_name as uploaded_by_name
        FROM files f
        LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE f.lesson_plan_id = @lesson_plan_id
        ORDER BY f.created_at DESC
      `);
    
    res.json(result.recordset);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Загрузить файл к плану урока
router.post('/upload', auth, checkRole('teacher', 'admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не загружен' });
    }
    
    const { lesson_plan_id } = req.body;
    const pool = await getPool();
    
    const result = await pool.request()
      .input('lesson_plan_id', sql.Int, lesson_plan_id)
      .input('file_name', sql.NVarChar, req.file.originalname)
      .input('file_path', sql.NVarChar, req.file.path)
      .input('file_type', sql.NVarChar, req.file.mimetype)
      .input('file_size', sql.Int, req.file.size)
      .input('uploaded_by', sql.Int, req.user.id)
      .query(`
        INSERT INTO files (lesson_plan_id, file_name, file_path, file_type, file_size, uploaded_by)
        OUTPUT INSERTED.id
        VALUES (@lesson_plan_id, @file_name, @file_path, @file_type, @file_size, @uploaded_by)
      `);
    
    res.json({ 
      message: 'Файл загружен',
      id: result.recordset[0].id,
      file_name: req.file.originalname
    });
    
  } catch (error) {
    console.error(error);
    // Удаляем файл если произошла ошибка
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Ошибка загрузки файла' });
  }
});

// Скачать файл
router.get('/download/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT file_name, file_path FROM files WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Файл не найден' });
    }
    
    const file = result.recordset[0];
    
    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ message: 'Файл не найден на сервере' });
    }
    
    res.download(file.file_path, file.file_name);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка скачивания файла' });
  }
});

// Удалить файл
router.delete('/:id', auth, checkRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    
    // Получаем путь к файлу
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT file_path FROM files WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Файл не найден' });
    }
    
    const filePath = result.recordset[0].file_path;
    
    // Удаляем из базы
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM files WHERE id = @id');
    
    // Удаляем файл с диска
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({ message: 'Файл удален' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка удаления файла' });
  }
});

// Получить все файлы для класса (для учеников)
router.get('/class/:class_id', auth, async (req, res) => {
  try {
    const { class_id } = req.params;
    const pool = await getPool();
    
    const result = await pool.request()
      .input('class_id', sql.Int, class_id)
      .query(`
        SELECT 
          f.id,
          f.file_name,
          f.file_type,
          f.file_size,
          f.created_at,
          lp.topic as lesson_topic,
          s.name as subject_name,
          u.first_name + ' ' + u.last_name as teacher_name
        FROM files f
        JOIN lesson_plans lp ON f.lesson_plan_id = lp.id
        JOIN subjects s ON lp.subject_id = s.id
        JOIN users u ON lp.teacher_id = u.id
        WHERE lp.class_id = @class_id
        ORDER BY f.created_at DESC
      `);
    
    res.json(result.recordset);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
