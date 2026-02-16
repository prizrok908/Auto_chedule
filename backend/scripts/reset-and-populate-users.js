const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/database');

async function resetAndPopulateUsers() {
  try {
    const pool = await getPool();
    
    console.log('Удаление всех пользователей...');
    
    // Удаляем все связи в правильном порядке
    await pool.request().query('DELETE FROM schedule');
    await pool.request().query('DELETE FROM teacher_subjects');
    await pool.request().query('DELETE FROM students');
    await pool.request().query('UPDATE classes SET class_teacher_id = NULL, home_classroom_id = NULL');
    
    // Удаляем всех пользователей
    await pool.request().query('DELETE FROM users');
    
    console.log('✓ Все пользователи удалены\n');
    
    // Администраторы
    const admins = [
      { username: 'admin', password: 'admin123', first_name: 'Системы', last_name: 'Администратор', middle_name: '' },
      { username: 'director', password: 'director2024', first_name: 'Иван', last_name: 'Петров', middle_name: 'Сергеевич' }
    ];
    
    // Учителя
    const teachers = [
      { username: 'ivanov', password: 'ivanov2024', first_name: 'Иван', last_name: 'Иванов', middle_name: 'Петрович' },
      { username: 'petrova', password: 'petrova2024', first_name: 'Елена', last_name: 'Петрова', middle_name: 'Ивановна' },
      { username: 'sidorov', password: 'sidorov2024', first_name: 'Алексей', last_name: 'Сидоров', middle_name: 'Николаевич' },
      { username: 'volkova', password: 'volkova2024', first_name: 'Елена', last_name: 'Волкова', middle_name: 'Александровна' },
      { username: 'smirnov', password: 'smirnov2024', first_name: 'Дмитрий', last_name: 'Смирнов', middle_name: 'Викторович' },
      { username: 'kuznetsova', password: 'kuznetsova2024', first_name: 'Ольга', last_name: 'Кузнецова', middle_name: 'Сергеевна' },
      { username: 'popov', password: 'popov2024', first_name: 'Михаил', last_name: 'Попов', middle_name: 'Андреевич' },
      { username: 'novikova', password: 'novikova2024', first_name: 'Анна', last_name: 'Новикова', middle_name: 'Владимировна' }
    ];
    
    // Ученики с датами рождения
    const students = [
      // 1А класс (2017 год рождения)
      { first_name: 'Иван', last_name: 'Белов', middle_name: 'Глебович', birth_date: '2017-03-15' },
      { first_name: 'Мария', last_name: 'Соколова', middle_name: 'Дмитриевна', birth_date: '2017-05-22' },
      { first_name: 'Артем', last_name: 'Морозов', middle_name: 'Александрович', birth_date: '2017-07-10' },
      { first_name: 'София', last_name: 'Лебедева', middle_name: 'Игоревна', birth_date: '2017-09-05' },
      { first_name: 'Максим', last_name: 'Козлов', middle_name: 'Сергеевич', birth_date: '2017-11-18' },
      
      // 1Б класс (2017 год рождения)
      { first_name: 'Анна', last_name: 'Павлова', middle_name: 'Викторовна', birth_date: '2017-02-28' },
      { first_name: 'Даниил', last_name: 'Федоров', middle_name: 'Андреевич', birth_date: '2017-04-12' },
      { first_name: 'Елизавета', last_name: 'Михайлова', middle_name: 'Олеговна', birth_date: '2017-06-20' },
      { first_name: 'Кирилл', last_name: 'Николаев', middle_name: 'Павлович', birth_date: '2017-08-15' },
      { first_name: 'Полина', last_name: 'Романова', middle_name: 'Максимовна', birth_date: '2017-10-03' },
      
      // 5А класс (2013 год рождения)
      { first_name: 'Дмитрий', last_name: 'Борисов', middle_name: 'Дмитриевич', birth_date: '2013-01-20' },
      { first_name: 'Анастасия', last_name: 'Григорьева', middle_name: 'Владимировна', birth_date: '2013-03-14' },
      { first_name: 'Егор', last_name: 'Васильев', middle_name: 'Игоревич', birth_date: '2013-05-08' },
      { first_name: 'Виктория', last_name: 'Захарова', middle_name: 'Алексеевна', birth_date: '2013-07-25' },
      { first_name: 'Александр', last_name: 'Тимофеев', middle_name: 'Ильич', birth_date: '2013-09-12' },
      { first_name: 'Ксения', last_name: 'Орлова', middle_name: 'Андреевна', birth_date: '2013-11-30' },
      { first_name: 'Никита', last_name: 'Воробьев', middle_name: 'Тимофеевич', birth_date: '2013-02-17' },
      { first_name: 'Дарья', last_name: 'Соловьева', middle_name: 'Сергеевна', birth_date: '2013-04-22' },
      
      // 5Б класс (2013 год рождения)
      { first_name: 'Роман', last_name: 'Виноградов', middle_name: 'Романович', birth_date: '2013-06-05' },
      { first_name: 'Алина', last_name: 'Голубева', middle_name: 'Павловна', birth_date: '2013-08-19' },
      { first_name: 'Тимур', last_name: 'Богданов', middle_name: 'Максимович', birth_date: '2013-10-27' },
      { first_name: 'Ульяна', last_name: 'Медведева', middle_name: 'Дмитриевна', birth_date: '2013-12-14' },
      { first_name: 'Павел', last_name: 'Зайцев', middle_name: 'Викторович', birth_date: '2013-01-09' },
      { first_name: 'Вероника', last_name: 'Давыдова', middle_name: 'Игоревна', birth_date: '2013-03-23' },
      
      // 6А класс (2012 год рождения)
      { first_name: 'Артем', last_name: 'Ковалев', middle_name: 'Александрович', birth_date: '2012-05-11' },
      { first_name: 'Екатерина', last_name: 'Семенова', middle_name: 'Олеговна', birth_date: '2012-07-18' },
      { first_name: 'Владислав', last_name: 'Макаров', middle_name: 'Андреевич', birth_date: '2012-09-22' },
      
      // 9А класс (2009 год рождения)
      { first_name: 'Глеб', last_name: 'Беляев', middle_name: 'Сергеевич', birth_date: '2009-07-15' },
      { first_name: 'Валерия', last_name: 'Комарова', middle_name: 'Дмитриевна', birth_date: '2009-09-22' },
      { first_name: 'Артем', last_name: 'Крылов', middle_name: 'Павлович', birth_date: '2009-11-08' },
      { first_name: 'Екатерина', last_name: 'Лазарева', middle_name: 'Викторовна', birth_date: '2009-02-14' },
      { first_name: 'Илья', last_name: 'Фролов', middle_name: 'Александрович', birth_date: '2009-04-30' },
      { first_name: 'Ольга', last_name: 'Королева', middle_name: 'Игоревна', birth_date: '2009-06-17' },
      { first_name: 'Павел', last_name: 'Гусев', middle_name: 'Максимович', birth_date: '2009-08-25' },
      
      // 11А класс (2007 год рождения)
      { first_name: 'Павел', last_name: 'Киселев', middle_name: 'Андреевич', birth_date: '2007-01-12' },
      { first_name: 'Ульяна', last_name: 'Белова', middle_name: 'Сергеевна', birth_date: '2007-03-28' },
      { first_name: 'Андрей', last_name: 'Степанов', middle_name: 'Дмитриевич', birth_date: '2007-05-19' },
      { first_name: 'Елена', last_name: 'Егорова', middle_name: 'Владимировна', birth_date: '2007-07-07' },
      { first_name: 'Артем', last_name: 'Соболев', middle_name: 'Олегович', birth_date: '2007-09-23' },
      { first_name: 'Ксения', last_name: 'Филиппова', middle_name: 'Игоревна', birth_date: '2007-11-15' }
    ];
    
    // Добавляем администраторов
    console.log('Добавление администраторов...');
    for (const admin of admins) {
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      
      await pool.request()
        .input('username', sql.NVarChar, admin.username)
        .input('password', sql.NVarChar, hashedPassword)
        .input('plain_password', sql.NVarChar, admin.password)
        .input('role', sql.NVarChar, 'admin')
        .input('first_name', sql.NVarChar, admin.first_name)
        .input('last_name', sql.NVarChar, admin.last_name)
        .input('middle_name', sql.NVarChar, admin.middle_name)
        .query(`
          INSERT INTO users (username, password, plain_password, role, first_name, last_name, middle_name)
          VALUES (@username, @password, @plain_password, @role, @first_name, @last_name, @middle_name)
        `);
      console.log(`✓ ${admin.username} | пароль: ${admin.password} | ${admin.last_name} ${admin.first_name}`);
    }
    
    // Добавляем учителей
    console.log('\nДобавление учителей...');
    for (const teacher of teachers) {
      const hashedPassword = await bcrypt.hash(teacher.password, 10);
      
      await pool.request()
        .input('username', sql.NVarChar, teacher.username)
        .input('password', sql.NVarChar, hashedPassword)
        .input('plain_password', sql.NVarChar, teacher.password)
        .input('role', sql.NVarChar, 'teacher')
        .input('first_name', sql.NVarChar, teacher.first_name)
        .input('last_name', sql.NVarChar, teacher.last_name)
        .input('middle_name', sql.NVarChar, teacher.middle_name)
        .query(`
          INSERT INTO users (username, password, plain_password, role, first_name, last_name, middle_name)
          VALUES (@username, @password, @plain_password, @role, @first_name, @last_name, @middle_name)
        `);
      console.log(`✓ ${teacher.username} | пароль: ${teacher.password} | ${teacher.last_name} ${teacher.first_name}`);
    }
    
    // Добавляем учеников
    console.log('\nДобавление учеников...');
    for (const student of students) {
      const username = `student_${student.last_name.toLowerCase()}_${student.birth_date.replace(/-/g, '')}`;
      
      await pool.request()
        .input('username', sql.NVarChar, username)
        .input('password', sql.NVarChar, '')
        .input('role', sql.NVarChar, 'student')
        .input('first_name', sql.NVarChar, student.first_name)
        .input('last_name', sql.NVarChar, student.last_name)
        .input('middle_name', sql.NVarChar, student.middle_name)
        .input('birth_date', sql.Date, student.birth_date)
        .query(`
          INSERT INTO users (username, password, role, first_name, last_name, middle_name, birth_date)
          VALUES (@username, @password, @role, @first_name, @last_name, @middle_name, @birth_date)
        `);
      console.log(`✓ ${student.last_name} ${student.first_name} | ДР: ${student.birth_date}`);
    }
    
    console.log('\n✅ Все пользователи успешно добавлены!');
    console.log(`\nВсего:`);
    console.log(`- Администраторов: ${admins.length}`);
    console.log(`- Учителей: ${teachers.length}`);
    console.log(`- Учеников: ${students.length}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    process.exit();
  }
}

resetAndPopulateUsers();
