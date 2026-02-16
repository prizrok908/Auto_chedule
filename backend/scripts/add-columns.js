const { getPool, sql } = require('../config/database');

async function addColumns() {
  try {
    const pool = await getPool();
    
    console.log('Добавление колонок birth_date и plain_password...');
    
    // Добавляем birth_date
    try {
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'users') AND name = 'birth_date')
        BEGIN
          ALTER TABLE users ADD birth_date DATE NULL;
          PRINT 'Колонка birth_date добавлена';
        END
        ELSE
        BEGIN
          PRINT 'Колонка birth_date уже существует';
        END
      `);
      console.log('✓ birth_date проверена/добавлена');
    } catch (e) {
      console.log('birth_date:', e.message);
    }
    
    // Добавляем plain_password
    try {
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'users') AND name = 'plain_password')
        BEGIN
          ALTER TABLE users ADD plain_password NVARCHAR(100) NULL;
          PRINT 'Колонка plain_password добавлена';
        END
        ELSE
        BEGIN
          PRINT 'Колонка plain_password уже существует';
        END
      `);
      console.log('✓ plain_password проверена/добавлена');
    } catch (e) {
      console.log('plain_password:', e.message);
    }
    
    console.log('\n✅ Готово!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    process.exit();
  }
}

addColumns();
