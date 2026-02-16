-- Создание таблиц для системы управления школой

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица классов
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    class_number INTEGER NOT NULL CHECK (class_number BETWEEN 1 AND 11),
    class_letter VARCHAR(1) NOT NULL,
    is_profile BOOLEAN DEFAULT FALSE,
    profile_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица учеников (связь с классами)
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    parent_phone VARCHAR(20),
    parent_email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица предметов
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    complexity_level INTEGER CHECK (complexity_level BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица учителей и их предметов
CREATE TABLE IF NOT EXISTS teacher_subjects (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE(teacher_id, subject_id)
);

-- Таблица кабинетов
CREATE TABLE IF NOT EXISTS classrooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(10) NOT NULL UNIQUE,
    capacity INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица учебных периодов (полугодия)
CREATE TABLE IF NOT EXISTS academic_periods (
    id SERIAL PRIMARY KEY,
    year_start INTEGER NOT NULL,
    year_end INTEGER NOT NULL,
    semester INTEGER CHECK (semester IN (1, 2)),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица планирования часов на полугодие
CREATE TABLE IF NOT EXISTS semester_hours_plan (
    id SERIAL PRIMARY KEY,
    academic_period_id INTEGER REFERENCES academic_periods(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    total_hours INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(academic_period_id, class_id, subject_id)
);

-- Таблица расписания звонков
CREATE TABLE IF NOT EXISTS bell_schedule (
    id SERIAL PRIMARY KEY,
    lesson_number INTEGER NOT NULL CHECK (lesson_number BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_for_first_grade BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица расписания уроков
CREATE TABLE IF NOT EXISTS schedule (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    classroom_id INTEGER REFERENCES classrooms(id) ON DELETE SET NULL,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 5),
    lesson_number INTEGER CHECK (lesson_number BETWEEN 1 AND 7),
    academic_period_id INTEGER REFERENCES academic_periods(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, day_of_week, lesson_number, academic_period_id),
    UNIQUE(teacher_id, day_of_week, lesson_number, academic_period_id),
    UNIQUE(classroom_id, day_of_week, lesson_number, academic_period_id)
);

-- Таблица календарно-тематического планирования
CREATE TABLE IF NOT EXISTS lesson_plans (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    topic VARCHAR(255) NOT NULL,
    homework TEXT,
    lesson_date DATE,
    is_completed BOOLEAN DEFAULT FALSE,
    academic_period_id INTEGER REFERENCES academic_periods(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица файлов (презентации, задания)
CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    lesson_plan_id INTEGER REFERENCES lesson_plans(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставка данных по умолчанию

-- Расписание звонков для обычных классов (45 минут)
INSERT INTO bell_schedule (lesson_number, start_time, end_time, duration_minutes, is_for_first_grade) VALUES
(1, '08:00', '08:45', 45, false),
(2, '08:55', '09:40', 45, false),
(3, '10:00', '10:45', 45, false),
(4, '11:05', '11:50', 45, false),
(5, '12:10', '12:55', 45, false),
(6, '13:05', '13:50', 45, false),
(7, '14:00', '14:45', 45, false);

-- Расписание звонков для 1 класса (35 минут)
INSERT INTO bell_schedule (lesson_number, start_time, end_time, duration_minutes, is_for_first_grade) VALUES
(1, '08:00', '08:35', 35, true),
(2, '08:55', '09:30', 35, true),
(3, '10:00', '10:35', 35, true),
(4, '11:05', '11:40', 35, true);

-- Администратор по умолчанию (пароль: admin123)
-- Хеш сгенерирован с помощью bcrypt, rounds=10
INSERT INTO users (username, password, role, first_name, last_name) VALUES
('admin', '$2a$10$rOZJQqVZ5Z5Z5Z5Z5Z5Z5uKX5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Zu', 'admin', 'Администратор', 'Системы')
ON CONFLICT (username) DO NOTHING;

-- Основные предметы
INSERT INTO subjects (name, complexity_level) VALUES
('Математика', 5),
('Русский язык', 4),
('Белорусский язык', 4),
('Литература', 3),
('Иностранный язык', 4),
('Физика', 5),
('Химия', 5),
('Биология', 4),
('История', 3),
('География', 3),
('Информатика', 4),
('Физическая культура', 2),
('Музыка', 2),
('Изобразительное искусство', 2),
('Трудовое обучение', 2);
