-- Миграция 002: Добавление колонки words_per_lesson
-- Выполните этот скрипт на вашем PostgreSQL сервере

ALTER TABLE learning_profiles 
ADD COLUMN IF NOT EXISTS words_per_lesson INTEGER NOT NULL DEFAULT 5;
