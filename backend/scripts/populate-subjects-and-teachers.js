require('dotenv').config();
const { getPool, sql } = require('../config/database');

async function populateSubjectsAndTeachers() {
  try {
    const pool = await getPool();
    
    console.log('=== ЗАПОЛНЕНИЕ ПРЕДМЕТОВ И УЧИТЕЛЕЙ ===');
    
    // Список всех предметов
    const subjects = [
      'Математика',
      'Белорусский язык',
      'Русский язык',
      'Литературное чтение',
      'Литература',
      'Иностранный язык',
      'Человек и мир',
      'Всемирная история',
      'История Беларуси',
      'Обществоведение',
      'География',
      'Биология',
      'Физика',
      'Химия',
      'Информатика',
      'Физическая культура',
      'Музыка',
      'Изобразительное искусство',
      'Искусство',
      'Трудовое обучение',
      'Черчение',
      'Астрономия',
      'Основы безопасности жизнедеятельности'
    ];
    
    console.log('Шаг 1: Добавляем предметы в базу...');
    
    // Добавляем предметы если их нет
    for (const subjectName of subjects) {
      const existing = await pool.request()
        .input('name', sql.NVarChar, subjectName)
        .query('SELECT id FROM subjects WHERE name = @name');
      
      if (existing.recordset.length === 0) {
        await pool.request()
          .input('name', sql.NVarChar, subjectName)
          .query('INSERT INTO subjects (name) VALUES (@name)');
        console.log(`  ✓ Добавлен предмет: ${subjectName}`);
      } else {
        console.log(`  - Предмет уже есть: ${subjectName}`);
      }
    }
    
    console.log('\nШаг 2: Получаем ID предметов...');
    const subjectIds = {};
    for (const subjectName of subjects) {
      const result = await pool.request()
        .input('name', sql.NVarChar, subjectName)
        .query('SELECT id FROM subjects WHERE name = @name');
      if (result.recordset.length > 0) {
        subjectIds[subjectName] = result.recordset[0].id;
      }
    }
    console.log(`  ✓ Получено ${Object.keys(subjectIds).length} предметов`);
    
    console.log('\nШаг 3: Получаем учителей...');
    const teachers = await pool.request()
      .query("SELECT id, first_name, last_name FROM users WHERE role = 'teacher'");
    
    console.log(`  ✓ Найдено ${teachers.recordset.length} учителей`);
    
    if (teachers.recordset.length === 0) {
      console.log('  ⚠ ОШИБКА: Нет учителей в базе! Сначала запустите populate-users.js');
      return;
    }
    
    console.log('\nШаг 4: Очищаем старые связи учитель-предмет...');
    await pool.request().query('DELETE FROM teacher_subjects');
    console.log('  ✓ Старые связи удалены');
    
    console.log('\nШаг 5: Назначаем учителей на предметы...');
    
    // Распределяем предметы между учителями
    const teacherAssignments = [
      { teacher: 0, subjects: ['Математика', 'Информатика'] },
      { teacher: 1, subjects: ['Белорусский язык', 'Литературное чтение', 'Литература'] },
      { teacher: 2, subjects: ['Русский язык', 'Литературное чтение', 'Литература'] },
      { teacher: 3, subjects: ['Иностранный язык'] },
      { teacher: 4, subjects: ['Всемирная история', 'История Беларуси', 'Обществоведение'] },
      { teacher: 5, subjects: ['География', 'Человек и мир'] },
      { teacher: 6, subjects: ['Биология', 'Химия'] },
      { teacher: 7, subjects: ['Физика', 'Астрономия'] },
      { teacher: 0, subjects: ['Физическая культура'] },
      { teacher: 1, subjects: ['Музыка', 'Искусство'] },
      { teacher: 2, subjects: ['Изобразительное искусство'] },
      { teacher: 3, subjects: ['Трудовое обучение', 'Черчение'] },
      { teacher: 4, subjects: ['Основы безопасности жизнедеятельности'] }
    ];
    
    let assignmentCount = 0;
    for (const assignment of teacherAssignments) {
      const teacherIndex = assignment.teacher % teachers.recordset.length;
      const teacher = teachers.recordset[teacherIndex];
      
      for (const subjectName of assignment.subjects) {
        if (subjectIds[subjectName]) {
          // Проверяем, нет ли уже такой связи
          const existing = await pool.request()
            .input('teacher_id', sql.Int, teacher.id)
            .input('subject_id', sql.Int, subjectIds[subjectName])
            .query('SELECT id FROM teacher_subjects WHERE teacher_id = @teacher_id AND subject_id = @subject_id');
          
          if (existing.recordset.length === 0) {
            await pool.request()
              .input('teacher_id', sql.Int, teacher.id)
              .input('subject_id', sql.Int, subjectIds[subjectName])
              .query('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (@teacher_id, @subject_id)');
            
            console.log(`  ✓ ${teacher.last_name} ${teacher.first_name} → ${subjectName}`);
            assignmentCount++;
          }
        }
      }
    }
    
    console.log(`\n✅ ГОТОВО! Создано ${assignmentCount} связей учитель-предмет`);
    console.log('\nТеперь стандартная программа должна работать!');
    
  } catch (error) {
    console.error('❌ ОШИБКА:', error);
  } finally {
    process.exit();
  }
}

populateSubjectsAndTeachers();
