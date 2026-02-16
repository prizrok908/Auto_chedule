const { getPool } = require('../config/database');

async function checkTable() {
  try {
    const pool = await getPool();
    
    console.log('Проверка структуры таблицы holidays...\n');
    
    const columns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'holidays'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Колонки таблицы:');
    columns.recordset.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\nПопытка выполнить SELECT...');
    const result = await pool.request().query(`
      SELECT TOP 5
        id, 
        start_date,
        end_date,
        name, 
        is_working_day,
        transferred_from_date,
        working_saturday_date
      FROM holidays
      ORDER BY start_date
    `);
    
    console.log(`\nНайдено записей: ${result.recordset.length}`);
    result.recordset.forEach(h => {
      console.log(`  ${h.start_date} - ${h.name}`);
    });
    
    console.log('\n✅ Таблица работает нормально');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkTable();
