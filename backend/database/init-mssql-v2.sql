-- Создание базы данных (выполнить отдельно если БД не существует)
-- CREATE DATABASE school_schedule;
-- GO

USE school_schedule;
GO

-- Таблица пользователей
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(50) UNIQUE NOT NULL,
        password NVARCHAR(255) NOT NULL,
        role NVARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
        first_name NVARCHAR(100) NOT NULL,
        last_name NVARCHAR(100) NOT NULL,
        middle_name NVARCHAR(100),
        email NVARCHAR(100),
        phone NVARCHAR(20),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Таблица классов
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'classes')
BEGIN
    CREATE TABLE classes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        class_number INT NOT NULL CHECK (class_number BETWEEN 1 AND 11),
        class_letter NVARCHAR(1) NOT NULL,
        is_profile BIT DEFAULT 0,
        profile_type NVARCHAR(50),
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Таблица учеников
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'students')
BEGIN
    CREATE TABLE students (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
        class_id INT FOREIGN KEY REFERENCES classes(id) ON DELETE SET NULL,
        parent_phone NVARCHAR(20),
        parent_email NVARCHAR(100),
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Таблица предметов (БЕЗ complexity_level - он теперь в subject_complexity!)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'subjects')
BEGIN
    CREATE TABLE subjects (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- НОВАЯ ТАБЛИЦА: Сложность предмета для каждого класса
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'subject_complexity')
BEGIN
    CREATE TABLE subject_complexity (
        id INT IDENTITY(1,1) PRIMARY KEY,
        subject_id INT FOREIGN KEY REFERENCES subjects(id) ON DELETE CASCADE,
        class_number INT NOT NULL CHECK (class_number BETWEEN 1 AND 11),
        complexity_score INT NOT NULL CHECK (complexity_score BETWEEN 1 AND 12),
        created_at DATETIME DEFAULT GETDATE(),
        UNIQUE(subject_id, class_number)
    );
END
GO

-- Таблица учителей и их предметов
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'teacher_subjects')
BEGIN
    CREATE TABLE teacher_subjects (
        id INT IDENTITY(1,1) PRIMARY KEY,
        teacher_id INT FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
        subject_id INT FOREIGN KEY REFERENCES subjects(id) ON DELETE CASCADE,
        UNIQUE(teacher_id, subject_id)
    );
END
GO

-- Таблица кабинетов
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'classrooms')
BEGIN
    CREATE TABLE classrooms (
        id INT IDENTITY(1,1) PRIMARY KEY,
        room_number NVARCHAR(10) NOT NULL UNIQUE,
        capacity INT,
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Таблица учебных периодов
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'academic_periods')
BEGIN
    CREATE TABLE academic_periods (
        id INT IDENTITY(1,1) PRIMARY KEY,
        year_start INT NOT NULL,
        year_end INT NOT NULL,
        semester INT CHECK (semester IN (1, 2)),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Таблица планирования часов на полугодие
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'semester_hours_plan')
BEGIN
    CREATE TABLE semester_hours_plan (
        id INT IDENTITY(1,1) PRIMARY KEY,
        academic_period_id INT FOREIGN KEY REFERENCES academic_periods(id) ON DELETE CASCADE,
        class_id INT FOREIGN KEY REFERENCES classes(id) ON DELETE CASCADE,
        subject_id INT FOREIGN KEY REFERENCES subjects(id) ON DELETE CASCADE,
        total_hours INT NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        UNIQUE(academic_period_id, class_id, subject_id)
    );
END
GO

-- Таблица расписания звонков
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bell_schedule')
BEGIN
    CREATE TABLE bell_schedule (
        id INT IDENTITY(1,1) PRIMARY KEY,
        lesson_number INT NOT NULL CHECK (lesson_number BETWEEN 1 AND 7),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        duration_minutes INT NOT NULL,
        is_for_first_grade BIT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Таблица расписания уроков
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'schedule')
BEGIN
    CREATE TABLE schedule (
        id INT IDENTITY(1,1) PRIMARY KEY,
        class_id INT FOREIGN KEY REFERENCES classes(id) ON DELETE CASCADE,
        subject_id INT FOREIGN KEY REFERENCES subjects(id) ON DELETE CASCADE,
        teacher_id INT FOREIGN KEY REFERENCES users(id),
        classroom_id INT FOREIGN KEY REFERENCES classrooms(id) ON DELETE SET NULL,
        day_of_week INT CHECK (day_of_week BETWEEN 1 AND 5),
        lesson_number INT CHECK (lesson_number BETWEEN 1 AND 7),
        academic_period_id INT FOREIGN KEY REFERENCES academic_periods(id) ON DELETE CASCADE,
        created_at DATETIME DEFAULT GETDATE()
    );
    
    -- Индексы для проверки конфликтов
    CREATE UNIQUE INDEX idx_schedule_class ON schedule(class_id, day_of_week, lesson_number, academic_period_id);
    CREATE UNIQUE INDEX idx_schedule_teacher ON schedule(teacher_id, day_of_week, lesson_number, academic_period_id);
    CREATE UNIQUE INDEX idx_schedule_classroom ON schedule(classroom_id, day_of_week, lesson_number, academic_period_id) WHERE classroom_id IS NOT NULL;
END
GO

-- Таблица календарно-тематического планирования
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lesson_plans')
BEGIN
    CREATE TABLE lesson_plans (
        id INT IDENTITY(1,1) PRIMARY KEY,
        teacher_id INT FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
        class_id INT FOREIGN KEY REFERENCES classes(id) ON DELETE CASCADE,
        subject_id INT FOREIGN KEY REFERENCES subjects(id) ON DELETE CASCADE,
        lesson_number INT NOT NULL,
        topic NVARCHAR(255) NOT NULL,
        homework NVARCHAR(MAX),
        lesson_date DATE,
        is_completed BIT DEFAULT 0,
        academic_period_id INT FOREIGN KEY REFERENCES academic_periods(id) ON DELETE CASCADE,
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Таблица файлов
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'files')
BEGIN
    CREATE TABLE files (
        id INT IDENTITY(1,1) PRIMARY KEY,
        lesson_plan_id INT FOREIGN KEY REFERENCES lesson_plans(id) ON DELETE CASCADE,
        file_name NVARCHAR(255) NOT NULL,
        file_path NVARCHAR(500) NOT NULL,
        file_type NVARCHAR(50),
        file_size INT,
        uploaded_by INT FOREIGN KEY REFERENCES users(id) ON DELETE SET NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Вставка данных по умолчанию

-- Расписание звонков для обычных классов (45 минут)
IF NOT EXISTS (SELECT * FROM bell_schedule WHERE is_for_first_grade = 0)
BEGIN
    INSERT INTO bell_schedule (lesson_number, start_time, end_time, duration_minutes, is_for_first_grade) VALUES
    (1, '08:00', '08:45', 45, 0),
    (2, '08:55', '09:40', 45, 0),
    (3, '10:00', '10:45', 45, 0),
    (4, '11:05', '11:50', 45, 0),
    (5, '12:10', '12:55', 45, 0),
    (6, '13:05', '13:50', 45, 0),
    (7, '14:00', '14:45', 45, 0);
END
GO

-- Расписание звонков для 1 класса (35 минут)
IF NOT EXISTS (SELECT * FROM bell_schedule WHERE is_for_first_grade = 1)
BEGIN
    INSERT INTO bell_schedule (lesson_number, start_time, end_time, duration_minutes, is_for_first_grade) VALUES
    (1, '08:00', '08:35', 35, 1),
    (2, '08:55', '09:30', 35, 1),
    (3, '10:00', '10:35', 35, 1),
    (4, '11:05', '11:40', 35, 1);
END
GO

-- Администратор по умолчанию (пароль: admin123)
IF NOT EXISTS (SELECT * FROM users WHERE username = 'admin')
BEGIN
    INSERT INTO users (username, password, role, first_name, last_name) VALUES
    ('admin', '$2a$10$rOZJQqVZ5Z5Z5Z5Z5Z5Z5uKX5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Zu', 'admin', N'Администратор', N'Системы');
END
GO

-- Основные предметы (БЕЗ сложности - она теперь в subject_complexity!)
IF NOT EXISTS (SELECT * FROM subjects)
BEGIN
    INSERT INTO subjects (name) VALUES
    (N'Математика'),
    (N'Русский язык'),
    (N'Белорусский язык'),
    (N'Литература'),
    (N'Литературное чтение'),
    (N'Иностранный язык'),
    (N'Физика'),
    (N'Химия'),
    (N'Биология'),
    (N'История'),
    (N'Всемирная история'),
    (N'История Беларуси'),
    (N'Обществоведение'),
    (N'География'),
    (N'Информатика'),
    (N'Астрономия'),
    (N'Человек и мир'),
    (N'Основы безопасности жизнедеятельности'),
    (N'Физическая культура'),
    (N'Музыка'),
    (N'Изобразительное искусство'),
    (N'Искусство'),
    (N'Трудовое обучение'),
    (N'Черчение');
END
GO

-- СЛОЖНОСТЬ ПРЕДМЕТОВ ПО КЛАССАМ (из таблиц СанПиН)
-- Таблица 1: 1 класс
IF NOT EXISTS (SELECT * FROM subject_complexity WHERE class_number = 1)
BEGIN
    DECLARE @math_id INT = (SELECT id FROM subjects WHERE name = N'Математика');
    DECLARE @bel_rus_id INT = (SELECT id FROM subjects WHERE name = N'Белорусский язык');
    DECLARE @rus_id INT = (SELECT id FROM subjects WHERE name = N'Русский язык');
    DECLARE @lit_id INT = (SELECT id FROM subjects WHERE name = N'Литературное чтение');
    DECLARE @world_id INT = (SELECT id FROM subjects WHERE name = N'Человек и мир');
    DECLARE @pe_id INT = (SELECT id FROM subjects WHERE name = N'Физическая культура');
    DECLARE @labor_id INT = (SELECT id FROM subjects WHERE name = N'Трудовое обучение');
    DECLARE @art_id INT = (SELECT id FROM subjects WHERE name = N'Изобразительное искусство');
    DECLARE @music_id INT = (SELECT id FROM subjects WHERE name = N'Музыка');

    INSERT INTO subject_complexity (subject_id, class_number, complexity_score) VALUES
    (@math_id, 1, 10),
    (@bel_rus_id, 1, 9),
    (@rus_id, 1, 8),
    (@lit_id, 1, 7),
    (@world_id, 1, 5),
    (@pe_id, 1, 2),
    (@labor_id, 1, 2),
    (@art_id, 1, 2),
    (@music_id, 1, 2);
END
GO

-- Таблица 2: 2-4 классы
IF NOT EXISTS (SELECT * FROM subject_complexity WHERE class_number = 2)
BEGIN
    DECLARE @math_id INT = (SELECT id FROM subjects WHERE name = N'Математика');
    DECLARE @bel_rus_id INT = (SELECT id FROM subjects WHERE name = N'Белорусский язык');
    DECLARE @foreign_id INT = (SELECT id FROM subjects WHERE name = N'Иностранный язык');
    DECLARE @rus_id INT = (SELECT id FROM subjects WHERE name = N'Русский язык');
    DECLARE @lit_bel_id INT = (SELECT id FROM subjects WHERE name = N'Литературное чтение');
    DECLARE @world_id INT = (SELECT id FROM subjects WHERE name = N'Человек и мир');
    DECLARE @pe_id INT = (SELECT id FROM subjects WHERE name = N'Физическая культура');
    DECLARE @labor_id INT = (SELECT id FROM subjects WHERE name = N'Трудовое обучение');
    DECLARE @art_id INT = (SELECT id FROM subjects WHERE name = N'Изобразительное искусство');
    DECLARE @music_id INT = (SELECT id FROM subjects WHERE name = N'Музыка');
    DECLARE @safety_id INT = (SELECT id FROM subjects WHERE name = N'Основы безопасности жизнедеятельности');

    -- Для 2, 3, 4 классов (одинаковая сложность)
    INSERT INTO subject_complexity (subject_id, class_number, complexity_score) VALUES
    (@math_id, 2, 11), (@math_id, 3, 11), (@math_id, 4, 11),
    (@bel_rus_id, 2, 10), (@bel_rus_id, 3, 10), (@bel_rus_id, 4, 10),
    (@foreign_id, 2, 9), (@foreign_id, 3, 9), (@foreign_id, 4, 9),
    (@rus_id, 2, 9), (@rus_id, 3, 9), (@rus_id, 4, 9),
    (@lit_bel_id, 2, 7), (@lit_bel_id, 3, 7), (@lit_bel_id, 4, 7),
    (@world_id, 2, 5), (@world_id, 3, 5), (@world_id, 4, 5),
    (@pe_id, 2, 2), (@pe_id, 3, 2), (@pe_id, 4, 2),
    (@labor_id, 2, 2), (@labor_id, 3, 2), (@labor_id, 4, 2),
    (@art_id, 2, 2), (@art_id, 3, 2), (@art_id, 4, 2),
    (@music_id, 2, 2), (@music_id, 3, 2), (@music_id, 4, 2),
    (@safety_id, 2, 4), (@safety_id, 3, 4), (@safety_id, 4, 4);
END
GO

-- Таблица 3: 5-11 классы
IF NOT EXISTS (SELECT * FROM subject_complexity WHERE class_number = 5)
BEGIN
    DECLARE @math_id INT = (SELECT id FROM subjects WHERE name = N'Математика');
    DECLARE @foreign_id INT = (SELECT id FROM subjects WHERE name = N'Иностранный язык');
    DECLARE @bel_rus_id INT = (SELECT id FROM subjects WHERE name = N'Белорусский язык');
    DECLARE @rus_id INT = (SELECT id FROM subjects WHERE name = N'Русский язык');
    DECLARE @physics_id INT = (SELECT id FROM subjects WHERE name = N'Физика');
    DECLARE @chem_id INT = (SELECT id FROM subjects WHERE name = N'Химия');
    DECLARE @info_id INT = (SELECT id FROM subjects WHERE name = N'Информатика');
    DECLARE @astro_id INT = (SELECT id FROM subjects WHERE name = N'Астрономия');
    DECLARE @bio_id INT = (SELECT id FROM subjects WHERE name = N'Биология');
    DECLARE @history_id INT = (SELECT id FROM subjects WHERE name = N'Всемирная история');
    DECLARE @hist_bel_id INT = (SELECT id FROM subjects WHERE name = N'История Беларуси');
    DECLARE @social_id INT = (SELECT id FROM subjects WHERE name = N'Обществоведение');
    DECLARE @lit_id INT = (SELECT id FROM subjects WHERE name = N'Литература');
    DECLARE @geo_id INT = (SELECT id FROM subjects WHERE name = N'География');
    DECLARE @world_id INT = (SELECT id FROM subjects WHERE name = N'Человек и мир');
    DECLARE @art_id INT = (SELECT id FROM subjects WHERE name = N'Искусство');
    DECLARE @safety_id INT = (SELECT id FROM subjects WHERE name = N'Основы безопасности жизнедеятельности');
    DECLARE @labor_id INT = (SELECT id FROM subjects WHERE name = N'Трудовое обучение');
    DECLARE @drawing_id INT = (SELECT id FROM subjects WHERE name = N'Черчение');
    DECLARE @pe_id INT = (SELECT id FROM subjects WHERE name = N'Физическая культура');

    -- Для 5-11 классов
    DECLARE @class INT = 5;
    WHILE @class <= 11
    BEGIN
        INSERT INTO subject_complexity (subject_id, class_number, complexity_score) VALUES
        (@math_id, @class, 12),
        (@foreign_id, @class, 11),
        (@bel_rus_id, @class, 10),
        (@rus_id, @class, 10),
        (@physics_id, @class, 9),
        (@chem_id, @class, 9),
        (@info_id, @class, 8),
        (@astro_id, @class, 8),
        (@bio_id, @class, 8),
        (@history_id, @class, 7),
        (@hist_bel_id, @class, 7),
        (@social_id, @class, 7),
        (@lit_id, @class, 6),
        (@geo_id, @class, 6),
        (@world_id, @class, 5),
        (@art_id, @class, 4),
        (@safety_id, @class, 4),
        (@labor_id, @class, 4),
        (@drawing_id, @class, 4),
        (@pe_id, @class, 3);
        
        SET @class = @class + 1;
    END
END
GO

PRINT '✅ База данных school_schedule успешно инициализирована!';
PRINT '✅ Сложность предметов настроена для каждого класса отдельно!';
GO
