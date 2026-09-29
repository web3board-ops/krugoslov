# WordFlow Backend

Бэкенд для приложения интервального повторения иностранных слов в контексте.

## Стек

- **Python 3.11+**
- **FastAPI** - веб-фреймворк
- **SQLAlchemy 2.0** - ORM с async поддержкой
- **Alembic** - миграции БД
- **PostgreSQL 14+** - база данных
- **GigaChat** - LLM для генерации предложений и оценки переводов

## Установка

1. Создайте виртуальное окружение:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows
```

2. Установите зависимости:
```bash
pip install -r requirements.txt
```

3. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

4. Заполните переменные окружения в `.env`:
- `DATABASE_URL` - строка подключения к PostgreSQL
- `JWT_SECRET` - секретный ключ для JWT
- `GIGACHAT_AUTH_KEY` - ключ авторизации GigaChat
- и другие параметры

5. Создайте базу данных PostgreSQL:
```sql
CREATE DATABASE wordflow;
```

6. Примените миграции:
```bash
alembic upgrade head
```

7. Заполните базу данных начальными словами:
```bash
python -m scripts.seed
```

## Запуск

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API будет доступно по адресу: http://localhost:8000

Документация Swagger: http://localhost:8000/docs

## Структура проекта

```
backend/
├── app/
│   ├── api/              # API endpoints
│   │   ├── auth.py       # Авторизация
│   │   ├── onboarding.py # Онбординг
│   │   ├── dashboard.py  # Главный экран
│   │   ├── lesson.py     # Уроки
│   │   ├── vocabulary.py # Словарь
│   │   ├── profile.py    # Профиль
│   │   ├── settings.py   # Настройки
│   │   └── admin.py      # Админка
│   ├── core/             # Базовые утилиты
│   │   ├── security.py   # JWT, хеширование
│   │   └── deps.py       # Зависимости
│   ├── services/         # Бизнес-логика
│   │   ├── srs.py        # Алгоритм интервального повторения
│   │   ├── streak.py     # Подсчёт стрика
│   │   ├── gigachat.py   # Клиент GigaChat
│   │   └── lesson.py     # Логика уроков
│   ├── prompts/          # Промпты для LLM
│   │   └── templates.py
│   ├── models.py         # SQLAlchemy модели
│   ├── schemas.py        # Pydantic схемы
│   ├── config.py         # Конфигурация
│   ├── database.py       # Подключение к БД
│   └── main.py           # FastAPI приложение
├── alembic/              # Миграции
│   └── versions/
├── requirements.txt
└── .env.example
```

## Основные API endpoints

### Авторизация
- `POST /auth/register` - регистрация
- `POST /auth/login` - вход
- `POST /auth/refresh` - обновление токена
- `POST /auth/logout` - выход
- `GET /auth/me` - текущий пользователь

### Онбординг
- `POST /onboarding/complete` - завершение онбординга

### Dashboard
- `GET /dashboard/summary` - сводка для главного экрана

### Уроки
- `POST /lesson/preview` - предпросмотр урока
- `POST /lesson/new-word/decline` - отказаться от нового слова
- `POST /lesson/start` - начать урок
- `POST /lesson/evaluate` - проверить упражнение
- `GET /lesson/{id}/current` - текущее упражнение
- `GET /lesson/{id}/summary` - итоги урока
- `POST /lesson/{id}/abandon` - прервать урок
- `POST /lesson/exercises/{id}/suggestions/{word_id}` - обработать подсказку

### Словарь
- `GET /vocabulary/list` - список слов
- `GET /vocabulary/word/{id}` - карточка слова
- `PATCH /vocabulary/word/{id}/status` - изменить статус слова

### Профиль
- `GET /profile/stats` - статистика

### Настройки
- `PATCH /settings/timezone` - сменить часовой пояс
- `GET /learning-profile` - получить профиль обучения
- `PATCH /learning-profile` - обновить профиль
- `GET /dictionaries` - список словарей

### Админка
- `POST /admin/dictionaries/import` - импорт словаря
- `GET /admin/reports` - список жалоб
- `PATCH /admin/reports/{id}` - обработать жалобу
- `GET /admin/users` - список пользователей
- `POST /admin/users/{id}/reset-password` - сбросить пароль

## Алгоритмы

### SRS (интервальное повторение)
Интервалы: [1, 2, 3, 7, 11, 30] уроков
Стадии: 0-6
При успехе: stage + 1, при stage=6 → mastered
При ошибке: stage - 1 (минимум 0)

### Подбор слов
1. Due-слова (stage > 0, due_lesson_number <= текущий)
2. Новые слова из активного словаря по уровню
3. Детерминированное ранжирование через SHA256

### Стрик
Считается по датам завершения уроков в часовом поясе пользователя
Текущий стрик - непрерывная цепочка дней
Рекорд - максимальная цепочка за всё время

## Интеграция с GigaChat

### Настройка GigaChat

#### 1. Получить ключ авторизации

1. Зарегистрироваться на https://developers.sber.ru/
2. Создать проект GigaChat API
3. Получить Authorization key (Base64 от Client ID:Client Secret)

**Важно:** Ключ авторизации — это строка Base64, которая уже закодирована в личном кабинете. Не нужно кодировать её самостоятельно.

#### 2. Указать в `.env`

```env
# Ключ авторизации из личного кабинета
GIGACHAT_AUTH_KEY=your_base64_encoded_credentials

# Scope зависит от типа доступа:
# - GIGACHAT_API_PERS - физические лица (бесплатно)
# - GIGACHAT_API_B2B - ИП и юрлица (пакеты токенов)
# - GIGACHAT_API_CORP - ИП и юрлица (pay-as-you-go)
GIGACHAT_SCOPE=GIGACHAT_API_PERS

# Модель для генерации
# Доступные: GigaChat, GigaChat-2-Pro, GigaChat-2-Max, GigaChat-3-Ultra
GIGACHAT_MODEL=GigaChat

# Путь к сертификату (см. ниже)
GIGACHAT_CA_CERT_PATH=

# Максимум параллельных запросов
GIGACHAT_MAX_CONCURRENCY=5
```

#### 3. SSL сертификат

**Для разработки:**
- Оставьте `GIGACHAT_CA_CERT_PATH` пустым
- SSL проверка отключена автоматически

**Для production:**
```bash
# Скачать корневой сертификат НУЦ Минцифры
python scripts/download_cert.py

# Или вручную:
wget https://gu-st.ru/content/lending/russian_trusted_root_ca.cer -O certs/russian_trusted_root_ca.cer

# Указать путь в .env
GIGACHAT_CA_CERT_PATH=/path/to/russian_trusted_root_ca.cer
```

**Альтернатива:** Установить сертификат в системное хранилище ОС.

### API Endpoints

GigaChat API использует два разных URL:

| Назначение | URL |
|------------|-----|
| Получение токена | `https://ngw.devices.sberbank.ru:9443/api/v2/oauth` |
| Все остальные запросы | `https://api.giga.chat/v1` |

**Важно:** Не используйте старый URL `https://gigachat.devices.sberbank.ru/api/v1` — он устарел.

### Промпты

Промпты для LLM находятся в `backend/app/prompts/templates.py`:
- `build_generation_prompt()` - генерация предложений
- `build_evaluation_prompt()` - оценка переводов

### Обработка ошибок

Код обрабатывает следующие ошибки:
- `401` - токен истёк, автоматическое обновление
- `429` - rate limit, повтор с backoff
- `402` - квота исчерпана
- `5xx` - серверная ошибка, повтор

Все вызовы логируются в таблицу `llm_calls` для анализа и отладки.

### Тарифы и лимиты

- Токен доступа живёт 30 минут
- Получать токен можно не чаще 10 раз в секунду
- Тарифы: https://developers.sber.ru/docs/ru/gigachat/api/tariffs

### Полезные ссылки

- Документация: https://developers.sber.ru/docs/ru/gigachat/api/main
- Получение токена: https://developers.sber.ru/docs/ru/gigachat/api/reference/rest/post-token
- Генерация ответа: https://developers.sber.ru/docs/ru/gigachat/api/reference/rest/post-chat
- Ошибки: https://developers.sber.ru/docs/ru/gigachat/api/errors-description
- SDK: https://developers.sber.ru/docs/ru/gigachat/guides/using-sdks

### Генерация предложений (Prompt 1)
- Batch-запрос для всех групп слов
- Валидация: surface_form в предложении, нет кириллицы, длина ≤15 слов
- Повторы при невалидном ответе (до 2 раз)

### Оценка перевода (Prompt 2)
- Scoped evaluation - только целевые слова
- Результаты: correct, typo, incorrect
- Подсказки новых слов (до 3)
- Защита от prompt-injection через разделители

## Лицензия

MIT
