-- Добавляем поле is_primary_teacher для учителей начальных классов
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'users') AND name = 'is_primary_teacher')
BEGIN
    ALTER TABLE users ADD is_primary_teacher BIT DEFAULT 0;
    PRINT 'Добавлено поле is_primary_teacher';
END
ELSE
BEGIN
    PRINT 'Поле is_primary_teacher уже существует';
END
GO

-- Устанавливаем флаг для существующих учителей начальных классов
-- Предположим, что Волкова Елена - учитель начальных классов
UPDATE users 
SET is_primary_teacher = 1 
WHERE role = 'teacher' AND last_name IN ('Волкова', 'Петрова');

PRINT 'Флаг is_primary_teacher установлен для учителей начальных классов';
GO
