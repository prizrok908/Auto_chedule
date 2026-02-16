-- Тестовые данные для системы

-- Создание классов
INSERT INTO classes (class_number, class_letter, is_profile, profile_type) VALUES
(1, 'А', false, NULL),
(1, 'Б', false, NULL),
(5, 'А', false, NULL),
(5, 'Б', false, NULL),
(9, 'А', false, NULL),
(10, 'А', true, 'Математический'),
(11, 'А', true, 'Гуманитарный');

-- Создание кабинетов
INSERT INTO classrooms (room_number, capacity) VALUES
('101', 30),
('102', 30),
('201', 25),
('202', 25),
('Спортзал', 40),
('Актовый зал', 100);

-- Создание учебного периода
INSERT INTO academic_periods (year_start, year_end, semester, start_date, end_date) VALUES
(2024, 2025, 1, '2024-09-01', '2024-12-31'),
(2024, 2025, 2, '2025-01-10', '2025-05-31');

-- Примеры учителей (пароль для всех: teacher123)
INSERT INTO users (username, password, role, first_name, last_name, middle_name, email, phone) VALUES
('ivanov', '$2a$10$rOZJQqVZ5Z5Z5Z5Z5Z5Z5uKX5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Zu', 'teacher', 'Иван', 'Иванов', 'Петрович', 'ivanov@school.by', '+375291234567'),
('petrova', '$2a$10$rOZJQqVZ5Z5Z5Z5Z5Z5Z5uKX5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Zu', 'teacher', 'Мария', 'Петрова', 'Сергеевна', 'petrova@school.by', '+375291234568'),
('sidorov', '$2a$10$rOZJQqVZ5Z5Z5Z5Z5Z5Z5uKX5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Zu', 'teacher', 'Петр', 'Сидоров', 'Иванович', 'sidorov@school.by', '+375291234569');

-- Примеры учеников (пароль для всех: student123)
INSERT INTO users (username, password, role, first_name, last_name, middle_name, email, phone) VALUES
('student1', '$2a$10$rOZJQqVZ5Z5Z5Z5Z5Z5Z5uKX5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Zu', 'student', 'Алексей', 'Смирнов', 'Дмитриевич', 'student1@school.by', '+375291234570'),
('student2', '$2a$10$rOZJQqVZ5Z5Z5Z5Z5Z5Z5uKX5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Zu', 'student', 'Анна', 'Козлова', 'Александровна', 'student2@school.by', '+375291234571');

-- Привязка учеников к классам
INSERT INTO students (user_id, class_id, parent_phone, parent_email) VALUES
((SELECT id FROM users WHERE username = 'student1'), (SELECT id FROM classes WHERE class_number = 5 AND class_letter = 'А'), '+375291111111', 'parent1@mail.by'),
((SELECT id FROM users WHERE username = 'student2'), (SELECT id FROM classes WHERE class_number = 5 AND class_letter = 'А'), '+375292222222', 'parent2@mail.by');

-- Привязка учителей к предметам
INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES
((SELECT id FROM users WHERE username = 'ivanov'), (SELECT id FROM subjects WHERE name = 'Математика')),
((SELECT id FROM users WHERE username = 'petrova'), (SELECT id FROM subjects WHERE name = 'Русский язык')),
((SELECT id FROM users WHERE username = 'sidorov'), (SELECT id FROM subjects WHERE name = 'Физика'));

-- Пример планирования часов на полугодие
INSERT INTO semester_hours_plan (academic_period_id, class_id, subject_id, total_hours) VALUES
(1, (SELECT id FROM classes WHERE class_number = 5 AND class_letter = 'А'), (SELECT id FROM subjects WHERE name = 'Математика'), 68),
(1, (SELECT id FROM classes WHERE class_number = 5 AND class_letter = 'А'), (SELECT id FROM subjects WHERE name = 'Русский язык'), 68);

-- Пример расписания для 5А класса (понедельник)
INSERT INTO schedule (class_id, subject_id, teacher_id, classroom_id, day_of_week, lesson_number, academic_period_id) VALUES
(
  (SELECT id FROM classes WHERE class_number = 5 AND class_letter = 'А'),
  (SELECT id FROM subjects WHERE name = 'Математика'),
  (SELECT id FROM users WHERE username = 'ivanov'),
  (SELECT id FROM classrooms WHERE room_number = '201'),
  1, -- Понедельник
  2, -- 2 урок
  1  -- Первое полугодие
),
(
  (SELECT id FROM classes WHERE class_number = 5 AND class_letter = 'А'),
  (SELECT id FROM subjects WHERE name = 'Русский язык'),
  (SELECT id FROM users WHERE username = 'petrova'),
  (SELECT id FROM classrooms WHERE room_number = '202'),
  1, -- Понедельник
  3, -- 3 урок
  1  -- Первое полугодие
);

-- Пример календарно-тематического плана
INSERT INTO lesson_plans (teacher_id, class_id, subject_id, lesson_number, topic, homework, academic_period_id) VALUES
(
  (SELECT id FROM users WHERE username = 'ivanov'),
  (SELECT id FROM classes WHERE class_number = 5 AND class_letter = 'А'),
  (SELECT id FROM subjects WHERE name = 'Математика'),
  1,
  'Натуральные числа и нуль',
  'Учебник стр. 5-10, упр. 1-5',
  1
),
(
  (SELECT id FROM users WHERE username = 'ivanov'),
  (SELECT id FROM classes WHERE class_number = 5 AND class_letter = 'А'),
  (SELECT id FROM subjects WHERE name = 'Математика'),
  2,
  'Сложение натуральных чисел',
  'Учебник стр. 15-20, упр. 10-15',
  1
);
