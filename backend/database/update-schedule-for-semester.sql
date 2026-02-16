-- Обновление таблицы расписания для работы с полугодием

USE school_management_system;
GO

-- Добавляем поле week_number (номер недели в полугодии 1-20)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('schedule') AND name = 'week_number')
BEGIN
    ALTER TABLE schedule ADD week_number INT NULL CHECK (week_number BETWEEN 1 AND 20);
END
GO

-- Добавляем поле lesson_date (конкретная дата урока)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('schedule') AND name = 'lesson_date')
BEGIN
    ALTER TABLE schedule ADD lesson_date DATE NULL;
END
GO

-- Удаляем старые уникальные индексы
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_schedule_class' AND object_id = OBJECT_ID('schedule'))
BEGIN
    DROP INDEX idx_schedule_class ON schedule;
END
GO

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_schedule_teacher' AND object_id = OBJECT_ID('schedule'))
BEGIN
    DROP INDEX idx_schedule_teacher ON schedule;
END
GO

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_schedule_classroom' AND object_id = OBJECT_ID('schedule'))
BEGIN
    DROP INDEX idx_schedule_classroom ON schedule;
END
GO

-- Создаем новые индексы с учетом даты
CREATE UNIQUE INDEX idx_schedule_class_date ON schedule(class_id, lesson_date, lesson_number, academic_period_id) WHERE lesson_date IS NOT NULL;
GO

CREATE UNIQUE INDEX idx_schedule_teacher_date ON schedule(teacher_id, lesson_date, lesson_number, academic_period_id) WHERE lesson_date IS NOT NULL;
GO

CREATE UNIQUE INDEX idx_schedule_classroom_date ON schedule(classroom_id, lesson_date, lesson_number, academic_period_id) WHERE classroom_id IS NOT NULL AND lesson_date IS NOT NULL;
GO

-- Таблица замен учителей
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'teacher_substitutions')
BEGIN
    CREATE TABLE teacher_substitutions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        schedule_id INT FOREIGN KEY REFERENCES schedule(id) ON DELETE CASCADE,
        original_teacher_id INT FOREIGN KEY REFERENCES users(id),
        substitute_teacher_id INT FOREIGN KEY REFERENCES users(id),
        reason NVARCHAR(255),
        created_by INT FOREIGN KEY REFERENCES users(id),
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

PRINT '✅ Таблица расписания обновлена для работы с полугодием';
PRINT '✅ Добавлены поля: week_number, lesson_date';
PRINT '✅ Создана таблица teacher_substitutions для замен';
