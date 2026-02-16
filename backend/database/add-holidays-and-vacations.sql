-- Таблица для каникул и праздников

USE school_management_system;
GO

-- Таблица каникул
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vacations')
BEGIN
    CREATE TABLE vacations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        class_numbers NVARCHAR(50), -- NULL = все классы, или "1,2,3,4" для конкретных
        academic_period_id INT FOREIGN KEY REFERENCES academic_periods(id) ON DELETE CASCADE,
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Таблица праздничных дней и переносов
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'holidays')
BEGIN
    CREATE TABLE holidays (
        id INT IDENTITY(1,1) PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        name NVARCHAR(100) NOT NULL,
        is_working_day BIT DEFAULT 0, -- 1 = рабочая суббота (перенос)
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Добавляем примеры каникул для Беларуси 2025-2026
INSERT INTO vacations (name, start_date, end_date, class_numbers, academic_period_id)
VALUES 
    ('Осенние каникулы', '2025-10-28', '2025-11-03', NULL, 1),
    ('Зимние каникулы', '2025-12-26', '2026-01-08', NULL, 1),
    ('Дополнительные каникулы для 1 класса', '2026-02-16', '2026-02-22', '1', 1),
    ('Весенние каникулы', '2026-03-30', '2026-04-05', NULL, 1),
    ('Летние каникулы', '2026-06-01', '2026-08-31', NULL, 1);
GO

-- Добавляем праздничные дни для Беларуси 2026
INSERT INTO holidays (date, name, is_working_day)
VALUES 
    ('2026-01-01', 'Новый год', 0),
    ('2026-01-02', 'Новый год', 0),
    ('2026-01-07', 'Рождество', 0),
    ('2026-03-08', 'Международный женский день', 0),
    ('2026-03-09', 'Перенос с 03.08', 0),
    ('2026-05-01', 'Праздник труда', 0),
    ('2026-05-09', 'День Победы', 0),
    ('2026-07-03', 'День Независимости', 0),
    ('2026-11-07', 'День Октябрьской революции', 0);
GO

-- Примеры рабочих суббот (переносы)
-- INSERT INTO holidays (date, name, is_working_day)
-- VALUES ('2026-03-14', 'Рабочая суббота (перенос с 09.03)', 1);

PRINT '✅ Таблицы каникул и праздников созданы';
PRINT '✅ Добавлены каникулы для Беларуси 2025-2026';
PRINT '✅ Добавлены праздничные дни';
