-- Добавляем поле class_teacher_id в таблицу classes
-- Это учитель начальных классов для 1-4 классов

ALTER TABLE classes ADD class_teacher_id INT NULL;
ALTER TABLE classes ADD CONSTRAINT FK_classes_teacher FOREIGN KEY (class_teacher_id) REFERENCES users(id);

-- Добавляем поле home_classroom_id - закрепленный кабинет
ALTER TABLE classes ADD home_classroom_id INT NULL;
ALTER TABLE classes ADD CONSTRAINT FK_classes_classroom FOREIGN KEY (home_classroom_id) REFERENCES classrooms(id);
