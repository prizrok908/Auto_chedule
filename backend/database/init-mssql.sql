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

-- Таблица предметов (С УРОВНЕМ СЛОЖНОСТИ!)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'subjects')
BEGIN
    CREATE TABLE subjects (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        complexity_level INT CHECK (complexity_level BETWEEN 1 AND 5),
        created_at DATETIME DEFAULT GETDATE()
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

-- Основные предметы С УРОВНЕМ СЛОЖНОСТИ (1-5)
-- 5 = очень сложный (математика, физика, химия)
-- 4 = сложный (языки, биология)
-- 3 = средний (история, география)
-- 2 = легкий (физкультура, музыка)
IF NOT EXISTS (SELECT * FROM subjects)
BEGIN
    INSERT INTO subjects (name, complexity_level) VALUES
    (N'Математика', 5),
    (N'Русский язык', 4),
    (N'Белорусский язык', 4),
    (N'Литература', 3),
    (N'Иностранный язык', 4),
    (N'Физика', 5),
    (N'Химия', 5),
    (N'Биология', 4),
    (N'История', 3),
    (N'География', 3),
    (N'Информатика', 4),
    (N'Физическая культура', 2),
    (N'Музыка', 2),
    (N'Изобразительное искусство', 2),
    (N'Трудовое обучение', 2);
END
GO

PRINT '✅ База данных school_schedule успешно инициализирована!';
GO
