const { getPool, sql } = require('../config/database');

async function addHolidays() {
  try {
    const pool = await getPool();
    
    console.log('Удаляем старые праздники...');
    await pool.request().query('DELETE FROM holidays');
    
    console.log('Добавляем праздники на 2026 год...');
    
    const holidays = [
      { start: '2026-01-01', end: '2026-01-08', name: 'Новогодние каникулы' },
      { start: '2026-02-23', end: '2026-02-23', name: 'День защитника Отечества' },
      { start: '2026-03-08', end: '2026-03-08', name: 'Международный женский день' },
      { start: '2026-05-01', end: '2026-05-01', name: 'Праздник Весны и Труда' },
      { start: '2026-05-09', end: '2026-05-09', name: 'День Победы' },
      { start: '2026-06-12', end: '2026-06-12', name: 'День России' },
      { start: '2026-11-04', end: '2026-11-04', name: 'День народного единства' }
    ];
    
    for (const holiday of holidays) {
      await pool.request()
        .input('start_date', sql.Date, holiday.start)
        .input('end_date', sql.Date, holiday.end)
        .input('name', sql.NVarChar, holiday.name)
        .input('is_working_day', sql.Bit, false)
        .query(`
          INSERT INTO holidays (start_date, end_date, name, is_working_day)
          VALUES (@start_date, @end_date, @name, @is_working_day)
        `);
      console.log(`✅ Добавлен: ${holiday.name}`);
    }
    
    console.log('\n📋 Все праздники:');
    const result = await pool.request().query(`
      SELECT 
        CONVERT(VARCHAR(10), start_date, 23) as start_date,
        CONVERT(VARCHAR(10), end_date, 23) as end_date,
        CAST(name as NVARCHAR(100)) as name
      FROM holidays
      ORDER BY start_date
    `);
    
    result.recordset.forEach(h => {
      console.log(`${h.start_date} - ${h.end_date}: ${h.name}`);
    });
    
    console.log('\n✅ Готово!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

addHolidays();
