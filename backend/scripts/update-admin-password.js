const { getPool, sql } = require('../config/database');

async function updateAdminPassword() {
  try {
    const pool = await getPool();
    
    console.log('Обновление plain_password для admin...');
    
    await pool.request()
      .input('username', sql.NVarChar, 'admin')
      .input('plain_password', sql.NVarChar, 'admin123')
      .query(`
        UPDATE users 
        SET plain_password = @plain_password
        WHERE username = @username
      `);
    
    console.log('✅ Пароль admin обновлен: admin123');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    process.exit();
  }
}

updateAdminPassword();
