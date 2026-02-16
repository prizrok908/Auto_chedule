require('dotenv').config();
const { getPool, sql } = require('../config/database');

async function addPrimaryTeacherFlag() {
  try {
    const pool = await getPool();
    
    console.log('=== ДОБАВЛЕНИЕ ПОЛЯ is_primary_teacher ===');
    
    // Проверяем существует ли поле
    const checkColumn = await pool.request().query(`
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID(N'users') AND name = 'is_primary_teacher'
    `);
    
    if (checkColumn.recordset.length === 0) {
      console.log('Добавляем поле is_primary_teacher...');
      await pool.request().query(`
        ALTER TABLE users ADD is_primary_teacher BIT DEFAULT 0
      `);
      console.log('✓ Поле добавлено');
    } else {
      console.log('✓ Поле is_primary_teacher уже существует');
    }
    
    // Устанавливаем флаг для учителей начальных классов
    console.log('\nУстанавливаем флаг для учителей начальных классов...');
    const result = await pool.request().query(`
      UPDATE users 
      SET is_primary_teacher = 1 
      WHERE role = 'teacher' AND last_name IN (N'Волкова', N'Петрова')
    `);
    
    console.log(`✓ Обновлено учителей: ${result.rowsAffected[0]}`);
    
    // Показываем учителей начальных классов
    const primaryTeachers = await pool.request().query(`
      SELECT id, first_name, last_name, is_primary_teacher
      FROM users 
      WHERE role = 'teacher' AND is_primary_teacher = 1
    `);
    
    console.log('\nУчителя начальных классов:');
    primaryTeachers.recordset.forEach(t => {
      console.log(`  - ${t.last_name} ${t.first_name} (ID: ${t.id})`);
    });
    
    console.log('\n✅ ГОТОВО!');
    
  } catch (error) {
    console.error('❌ ОШИБКА:', error);
  } finally {
    process.exit();
  }
}

addPrimaryTeacherFlag();
