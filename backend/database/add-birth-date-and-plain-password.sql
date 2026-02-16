-- Добавление колонок birth_date и plain_password в таблицу users

-- Проверяем и добавляем колонку birth_date
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'users') AND name = 'birth_date')
BEGIN
    ALTER TABLE users ADD birth_date DATE NULL;
END
GO

-- Проверяем и добавляем колонку plain_password (для хранения открытого пароля)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'users') AND name = 'plain_password')
BEGIN
    ALTER TABLE users ADD plain_password NVARCHAR(100) NULL;
END
GO

-- Удаляем колонки email и phone если они есть
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'users') AND name = 'email')
BEGIN
    ALTER TABLE users DROP COLUMN email;
END
GO

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'users') AND name = 'phone')
BEGIN
    ALTER TABLE users DROP COLUMN phone;
END
GO

PRINT 'Колонки успешно добавлены/удалены';
