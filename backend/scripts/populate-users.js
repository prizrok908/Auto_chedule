const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/database');

async function populateUsers() {
  try {
    const pool = await getPool();
    
    console.log('Начинаем заполнение пользователей...');
    
    // НЕ очищаем таблицу, просто добавляем новых пользователей
    
    // Администраторы
    const admins = [
      { username: 'admin', password: 'admin123', first_name: 'Системы', last_name: 'Администратор', middle_name: '' },
      { username: 'director', password: 'director123', first_name: 'Иван', last_name: 'Петров', middle_name: 'Сергеевич' }
    ];
    
    // Учителя
    const teachers = [
      { username: 'ivanov_teacher', password: 'teacher123', first_name: 'Иван', last_name: 'Иванов', middle_name: 'Петрович' },
      { username: 'petrova_teacher', password: 'teacher123', first_name: 'Елена', last_name: 'Петрова', middle_name: 'Ивановна' },
      { username: 'sidorov_teacher', password: 'teacher123', first_name: 'Алексей', last_name: 'Сидоров', middle_name: 'Николаевич' },
      { username: 'volkova_teacher', password: 'teacher123', first_name: 'Елена', last_name: 'Волкова', middle_name: 'Александровна' },
      { username: 'smirnov_teacher', password: 'teacher123', first_name: 'Дмитрий', last_name: 'Смирнов', middle_name: 'Викторович' },
      { username: 'kuznetsova_teacher', password: 'teacher123', first_name: 'Ольга', last_name: 'Кузнецова', middle_name: 'Сергеевна' },
      { username: 'popov_teacher', password: 'teacher123', first_name: 'Михаил', last_name: 'Попов', middle_name: 'Андреевич' },
      { username: 'novikova_teacher', password: 'teacher123', first_name: 'Анна', last_name: 'Новикова', middle_name: 'Владимировна' }
    ];
    
    // Ученики с датами рождения
    const students = [
      // 1А класс
      { first_name: 'Иван', last_name: 'Белов', middle_name: 'Глебович', birth_date: '2017-03-15' },
      { first_name: 'Мария', last_name: 'Соколова', middle_name: 'Дмитриевна', birth_date: '2017-05-22' },
      { first_name: 'Артем', last_name: 'Морозов', middle_name: 'Александрович', birth_date: '2017-07-10' },
      { first_name: 'София', last_name: 'Лебедева', middle_name: 'Игоревна', birth_date: '2017-09-05' },
      { first_name: 'Максим', last_name: 'Козлов', middle_name: 'Сергеевич', birth_date: '2017-11-18' },
      
      // 1Б класс
      { first_name: 'Анна', last_name: 'Павлова', middle_name: 'Викторовна', birth_date: '2017-02-28' },
      { first_name: 'Даниил', last_name: 'Федоров', middle_name: 'Андреевич', birth_date: '2017-04-12' },
      { first_name: 'Елизавета', last_name: 'Михайлова', middle_name: 'Олеговна', birth_date: '2017-06-20' },
      { first_name: 'Кирилл', last_name: 'Николаев', middle_name: 'Павлович', birth_date: '2017-08-15' },
      { first_name: 'Полина', last_name: 'Романова', middle_name: 'Максимовна', birth_date: '2017-10-03' },
      
      // 5А класс
      { first_name: 'Дмитрий', last_name: 'Борисов', middle_name: 'Дмитриевич', birth_date: '2013-01-20' },
      { first_name: 'Анастасия', last_name: 'Григорьева', middle_name: 'Анастасиевна', birth_date: '2013-03-14' },
      { first_name: 'Егор', last_name: 'Васильев', middle_name: 'Егорович', birth_date: '2013-05-08' },
      { first_name: 'Виктория', last_name: 'Захарова', middle_name: 'Екатериновна', birth_date: '2013-07-25' },
      { first_name: 'Александр', last_name: 'Тимофеев', middle_name: 'Ильич', birth_date: '2013-09-12' },
      { first_name: 'Ксения', last_name: 'Волкова', middle_name: 'Ульяна', birth_date: '2013-11-30' },
      { first_name: 'Никита', last_name: 'Воробьев', middle_name: 'Тимофеевич', birth_date: '2013-02-17' },
      { first_name: 'Елена', last_name: 'Волкова', middle_name: '', birth_date: '2013-04-22' },
      
      // 5Б класс
      { first_name: 'Роман', last_name: 'Виноградов', middle_name: 'Романович', birth_date: '2013-06-05' },
      { first_name: 'Алина', last_name: 'Голубева', middle_name: 'Алина', birth_date: '2013-08-19' },
      { first_name: 'Тимур', last_name: 'Богданов', middle_name: 'Ксения', birth_date: '2013-10-27' },
      { first_name: 'Ульяна', last_name: 'Волкова', middle_name: 'Ульяна', birth_date: '2013-12-14' },
      { first_name: 'Павел', last_name: 'Зайцев', middle_name: 'Павел', birth_date: '2013-01-09' },
      { first_name: 'Вероника', last_name: 'Давыдова', middle_name: 'Валерия', birth_date: '2013-03-23' },
      
      // 6А класс
      { first_name: 'Артем', last_name: 'Иванов', middle_name: 'Артем', birth_date: '2012-05-11' },
      
      // 9А класс
      { first_name: 'Глеб', last_name: 'Белов', middle_name: '', birth_date: '2009-07-15' },
      { first_name: 'Валерия', last_name: 'Давыдова', middle_name: 'Валерия', birth_date: '2009-09-22' },
      { first_name: 'Артем', last_name: 'Иванов', middle_name: 'Артем', birth_date: '2009-11-08' },
      { first_name: 'Екатерина', last_name: 'Захарова', middle_name: 'Екатерина', birth_date: '2009-02-14' },
      { first_name: 'Илья', last_name: 'Козлов', middle_name: 'Илья', birth_date: '2009-04-30' },
      { first_name: 'Ольга', last_name: 'Морозова', middle_name: 'Ольга', birth_date: '2009-06-17' },
      { first_name: 'Павел', last_name: 'Новиков', middle_name: 'Павел', birth_date: '2009-08-25' },
      
      // 11А класс
      { first_name: 'Павел', last_name: 'Зайцев', middle_name: 'Павел', birth_date: '2007-01-12' },
      { first_name: 'Ульяна', last_name: 'Волкова', middle_name: 'Ульяна', birth_date: '2007-03-28' },
      { first_name: 'Андрей', last_name: 'Козлов', middle_name: 'Андрей', birth_date: '2007-05-19' },
      { first_name: 'Елена', last_name: 'Волкова', middle_name: '', birth_date: '2007-07-07' },
      { first_name: 'Артем', last_name: 'Иванов', middle_name: 'Артем', birth_date: '2007-09-23' },
      { first_name: 'Ксения', last_name: 'Богданова', middle_name: 'Ксения', birth_date: '2007-11-15' }
    ];
    
    // Добавляем администраторов
    console.log('Добавление администраторов...');
    for (const admin of admins) {
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      
      // Проверяем существует ли уже
      const existing = await pool.request()
        .input('username', sql.NVarChar, admin.username)
        .query('SELECT id FROM users WHERE username = @username');
      
      if (existing.recordset.length === 0) {
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
        console.log(`✓ Администратор: ${admin.username} (пароль: ${admin.password})`);
      }
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
      console.log(`✓ Учитель: ${teacher.username} (пароль: ${teacher.password}) - ${teacher.last_name} ${teacher.first_name}`);
    }
    
    // Добавляем учеников
    console.log('\nДобавление учеников...');
    for (const student of students) {
      // Для учеников username не нужен, они входят по фамилии и дате рождения
      const username = `student_${student.last_name.toLowerCase()}_${student.birth_date.replace(/-/g, '')}`;
      
      await pool.request()
        .input('username', sql.NVarChar, username)
        .input('password', sql.NVarChar, '') // Пустой пароль для учеников
        .input('role', sql.NVarChar, 'student')
        .input('first_name', sql.NVarChar, student.first_name)
        .input('last_name', sql.NVarChar, student.last_name)
        .input('middle_name', sql.NVarChar, student.middle_name)
        .input('birth_date', sql.Date, student.birth_date)
        .query(`
          INSERT INTO users (username, password, role, first_name, last_name, middle_name, birth_date)
          VALUES (@username, @password, @role, @first_name, @last_name, @middle_name, @birth_date)
        `);
      console.log(`✓ Ученик: ${student.last_name} ${student.first_name} (ДР: ${student.birth_date})`);
    }
    
    console.log('\n✅ Все пользователи успешно добавлены!');
    console.log(`\nВсего добавлено:`);
    console.log(`- Администраторов: ${admins.length}`);
    console.log(`- Учителей: ${teachers.length}`);
    console.log(`- Учеников: ${students.length}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    process.exit();
  }
}

populateUsers();
