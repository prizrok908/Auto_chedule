-- Обновление расписания звонков для учета полугодий

USE school_management_system;
GO

-- Добавляем поле semester (1 или 2 полугодие)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('bell_schedule') AND name = 'semester')
BEGIN
    ALTER TABLE bell_schedule ADD semester INT NULL CHECK (semester IN (1, 2));
END
GO

-- Очищаем старые данные
DELETE FROM bell_schedule;
GO

-- Расписание звонков для 1 класса, ПЕРВОЕ полугодие (35 минут)
INSERT INTO bell_schedule (lesson_number, start_time, end_time, duration_minutes, is_for_first_grade, semester)
VALUES 
    (1, '08:30', '09:05', 35, 1, 1),
    (2, '09:15', '09:50', 35, 1, 1),
    (3, '10:10', '10:45', 35, 1, 1),
    (4, '11:05', '11:40', 35, 1, 1);
GO

-- Расписание звонков для 1 класса, ВТОРОЕ полугодие (45 минут)
INSERT INTO bell_schedule (lesson_number, start_time, end_time, duration_minutes, is_for_first_grade, semester)
VALUES 
    (1, '08:30', '09:15', 45, 1, 2),
    (2, '09:25', '10:10', 45, 1, 2),
    (3, '10:30', '11:15', 45, 1, 2),
    (4, '11:35', '12:20', 45, 1, 2);
GO

-- Расписание звонков для 2-11 классов (45 минут, для обоих полугодий)
INSERT INTO bell_schedule (lesson_number, start_time, end_time, duration_minutes, is_for_first_grade, semester)
VALUES 
    (1, '08:30', '09:15', 45, 0, NULL),
    (2, '09:25', '10:10', 45, 0, NULL),
    (3, '10:30', '11:15', 45, 0, NULL),
    (4, '11:35', '12:20', 45, 0, NULL),
    (5, '12:40', '13:25', 45, 0, NULL),
    (6, '13:35', '14:20', 45, 0, NULL),
    (7, '14:30', '15:15', 45, 0, NULL);
GO

PRINT '✅ Расписание звонков обновлено';
PRINT '✅ Добавлено поле semester';
PRINT '✅ Для 1 класса: 35 минут (1 полугодие), 45 минут (2 полугодие)';
PRINT '✅ Для 2-11 классов: 45 минут';
