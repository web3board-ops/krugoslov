# WordFlow — Инструкция по локальному запуску

Приложение для интервального повторения иностранных слов в контексте.

## Архитектура

- **Frontend**: React + Vite + TypeScript + Tailwind CSS (порт 5173)
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL (порт 8000)
- **LLM**: GigaChat (API Сбера)

---

## 1. Требования

- **Node.js** 18+ и npm
- **Python** 3.11+
- **PostgreSQL** 14+ (может быть на удалённом сервере)
- **Ключ GigaChat** (получить на https://developers.sber.ru/)

---

## 2. Настройка PostgreSQL на удалённом сервере

### 2.1. Подключение к серверу

```bash
ssh user@your-server-ip
```

### 2.2. Создание пользователя и базы данных

```bash
# Войти в psql под суперпользователем
sudo -u postgres psql

# В консоли PostgreSQL выполнить:
CREATE USER wordflow_user WITH PASSWORD 'your_secure_password_here';
CREATE DATABASE wordflow OWNER wordflow_user;

# Дать необходимые права
GRANT ALL PRIVILEGES ON DATABASE wordflow TO wordflow_user;

# Выйти
\q
```

### 2.3. Разрешить удалённое подключение (если ещё не настроено)

Отредактировать `/etc/postgresql/14/main/postgresql.conf`:
```ini
listen_addresses = '*'
```

Отредактировать `/etc/postgresql/14/main/pg_hba.conf`, добавить в конец:
```
host    wordflow        wordflow_user   your_local_ip/32    scram-sha-256
```

Перезапустить PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 2.4. Открыть порт в firewall (если нужно)

```bash
sudo ufw allow 5432/tcp
# или
sudo firewall-cmd --add-port=5432/tcp --permanent
sudo firewall-cmd --reload
```

---

## 3. Клонирование и настройка проекта

```bash
# Клонировать репозиторий (или скопировать файлы)
git clone <your-repo-url> wordflow
cd wordflow
```

---

## 4. Настройка Backend

### 4.1. Установка зависимостей

```bash
cd backend

# Создать виртуальное окружение
python -m venv venv

# Активировать
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Установить зависимости
pip install -r requirements.txt
```

### 4.2. Создание .env файла

```bash
cp .env.example .env
```

Отредактировать `backend/.env`:

```env
# === PostgreSQL (удалённый сервер) ===
DATABASE_URL=postgresql+asyncpg://wordflow_user:your_secure_password_here@your-server-ip:5432/wordflow

# === JWT ===
JWT_SECRET=придумайте_длинный_случайный_ключ_минимум_32_символа
ACCESS_TOKEN_TTL_MIN=30
REFRESH_TOKEN_TTL_DAYS=30

# === Уроки ===
WORDS_PER_LESSON=5
DAILY_LESSON_LIMIT_DEFAULT=3
DAILY_LESSON_LIMIT_MAX=5

# === GigaChat (получить на developers.sber.ru) ===
GIGACHAT_AUTH_KEY=ваш_ключ_авторизации
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_MODEL=GigaChat
GIGACHAT_CA_CERT_PATH=/путь/к/сертификату/root.crt  # если требуется
GIGACHAT_MAX_CONCURRENCY=5

# === LLM ===
GEN_TEMPERATURE=0.7
EVAL_TEMPERATURE=0.2
LLM_LOG_RETENTION_DAYS=90

# === CORS (адрес фронтенда) ===
CORS_ORIGINS=http://localhost:5173
```

### 4.3. Получение сертификата GigaChat (если требуется)

```bash
# Скачать корневой сертификат Минцифры
wget https://gu-st.ru/content/lending/russian_trusted_root_ca.cer -O gigachat_cert.cer
```

Обновить в `.env`:
```env
GIGACHAT_CA_CERT_PATH=/полный/путь/к/gigachat_cert.cer
```

### 4.4. Создание таблиц в базе данных

```bash
# Убедиться, что активировано виртуальное окружение
cd backend

# Применить миграции
alembic upgrade head
```

Если миграции не работают, можно создать таблицы напрямую:

```bash
# Запустить Python-скрипт для создания таблиц
python -c "
import asyncio
from app.database import engine, Base
from app.models import *

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('Tables created successfully')

asyncio.run(create_tables())
"
```

### 4.5. Заполнение базы начальными данными

```bash
# Запустить seed-скрипт для создания общего словаря
python -m scripts.seed
```

### 4.6. Запуск backend

```bash
cd backend

# Режим разработки (с автоперезагрузкой)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Или production-режим
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Проверить работу: http://localhost:8000/docs (Swagger UI)

---

## 5. Настройка Frontend

### 5.1. Установка зависимостей

```bash
# В корне проекта
cd ..
npm install
```

### 5.2. Создание .env файла

```bash
# Создать файл .env в корне проекта
cat > .env << EOF
VITE_API_URL=http://localhost:8000
EOF
```

Или создать вручную файл `.env` в корне:
```
VITE_API_URL=http://localhost:8000
```

### 5.3. Запуск frontend

```bash
# Режим разработки
npm run dev

# Или production-сборка
npm run build
npm run preview
```

Открыть в браузере: http://localhost:5173

---

## 6. Запуск в VSCode

### 6.1. Рекомендуемые расширения

- **Python** (ms-python.python)
- **Pylance** (ms-python.vscode-pylance)
- **ESLint** (dbaeumer.vscode-eslint)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **PostgreSQL** (ckolkman.vscode-postgres) — для подключения к БД

### 6.2. Настройка workspace

Создать `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/backend/venv/bin/python",
  "python.analysis.extraPaths": ["${workspaceFolder}/backend"],
  "python.envFile": "${workspaceFolder}/backend/.env",
  "[python]": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": "explicit"
    }
  },
  "[typescript]": {
    "editor.formatOnSave": true
  },
  "[typescriptreact]": {
    "editor.formatOnSave": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### 6.3. Настройка launch.json для отладки

Создать `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "app.main:app",
        "--reload",
        "--host", "0.0.0.0",
        "--port", "8000"
      ],
      "cwd": "${workspaceFolder}/backend",
      "envFile": "${workspaceFolder}/backend/.env",
      "jinja": true
    },
    {
      "name": "Frontend: Chrome",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

### 6.4. Запуск из VSCode

1. Открыть проект в VSCode
2. Выбрать Python-интерпретер: `Ctrl+Shift+P` → "Python: Select Interpreter" → выбрать `backend/venv/bin/python`
3. Открыть терминал (`Ctrl+~`)
4. В одном терминале запустить backend:
   ```bash
   cd backend
   source venv/bin/activate  # Linux/Mac
   uvicorn app.main:app --reload --port 8000
   ```
5. В другом терминале запустить frontend:
   ```bash
   npm run dev
   ```

Или использовать **Run and Debug** (`F5`) с настроенным `launch.json`.

---

## 7. Проверка работы

### 7.1. Проверка подключения к БД

```bash
cd backend
python -c "
import asyncio
from sqlalchemy import text
from app.database import engine

async def check():
    async with engine.connect() as conn:
        result = await conn.execute(text('SELECT version()'))
        print(result.scalar())

asyncio.run(check())
"
```

### 7.2. Регистрация первого пользователя

1. Открыть http://localhost:5173
2. Нажать "Регистрация"
3. Ввести email и пароль (минимум 8 символов)
4. Пройти онбординг (выбрать часовой пояс и уровень)
5. Начать первый урок!

### 7.3. Создание администратора

```bash
cd backend
python -c "
import asyncio
from sqlalchemy import select, update
from app.database import async_session
from app.models import User

async def make_admin():
    async with async_session() as session:
        email = input('Email администратора: ')
        result = await session.execute(
            update(User).where(User.email == email).values(is_admin=True)
        )
        await session.commit()
        print(f'Updated {result.rowcount} row(s)')

asyncio.run(make_admin())
"
```

После этого в настройках появится пункт "Админ-панель".

---

## 8. Решение проблем

### Ошибка подключения к PostgreSQL

```
could not connect to server: Connection refused
```

**Решения:**
- Проверить, что PostgreSQL запущен на сервере: `sudo systemctl status postgresql`
- Проверить firewall: `sudo ufw status`
- Проверить `pg_hba.conf` — разрешён ли ваш IP
- Проверить `postgresql.conf` — `listen_addresses = '*'`
- Попробовать подключиться напрямую: `psql -h your-server-ip -U wordflow_user -d wordflow`

### Ошибка миграций Alembic

```
Target database is not up to date
```

**Решение:**
```bash
cd backend
alembic stamp head  # Пометить текущее состояние
alembic upgrade head  # Применить миграции
```

### Ошибка GigaChat

```
Failed to get GigaChat token: 401
```

**Решения:**
- Проверить `GIGACHAT_AUTH_KEY` в `.env`
- Убедиться, что ключ активен в личном кабинете Сбера
- Проверить сертификат: `GIGACHAT_CA_CERT_PATH` указывает на правильный файл

### Ошибка CORS

```
Access to fetch has been blocked by CORS policy
```

**Решение:**
- Проверить `CORS_ORIGINS` в `backend/.env` — должен содержать адрес фронтенда
- Перезапустить backend после изменения

### Frontend не видит backend

**Решение:**
- Проверить `VITE_API_URL` в `.env` фронтенда
- Перезапустить `npm run dev` после изменения `.env`
- Проверить, что backend запущен: http://localhost:8000/health

---

## 9. Структура проекта

```
wordflow/
├── backend/
│   ├── app/
│   │   ├── api/           # API endpoints
│   │   ├── core/          # Безопасность, зависимости
│   │   ├── services/      # Бизнес-логика (SRS, GigaChat)
│   │   ├── prompts/       # Промпты для LLM
│   │   ├── models.py      # SQLAlchemy модели
│   │   ├── schemas.py     # Pydantic схемы
│   │   ├── config.py      # Конфигурация
│   │   ├── database.py    # Подключение к БД
│   │   └── main.py        # FastAPI приложение
│   ├── alembic/           # Миграции БД
│   ├── scripts/           # Скрипты (seed)
│   ├── requirements.txt
│   └── .env               # Переменные окружения
├── src/
│   ├── api/               # API клиент
│   ├── pages/             # Страницы React
│   ├── store/             # Zustand store
│   ├── types/             # TypeScript типы
│   ├── components/        # Компоненты
│   ├── App.tsx            # Главный компонент
│   └── main.tsx           # Точка входа
├── .env                   # Переменные фронтенда
├── package.json
└── README.md
```

---

## 10. Полезные команды

### Backend

```bash
# Запуск
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Миграции
alembic upgrade head          # Применить все миграции
alembic downgrade -1          # Откатить последнюю миграцию
alembic revision --autogenerate -m "description"  # Создать новую миграцию

# Seed
python -m scripts.seed        # Заполнить БД начальными данными

# Проверка БД
python -c "from app.database import engine; import asyncio; asyncio.run(engine.dispose())"
```

### Frontend

```bash
# Разработка
npm run dev                   # Запуск dev-сервера

# Сборка
npm run build                 # Production-сборка
npm run preview               # Предпросмотр сборки

# Проверка типов
npm run typecheck
```

---

## 11. Дополнительные настройки

### 11.1. HTTPS для production

Если нужен HTTPS, использовать nginx как reverse proxy:

```nginx
server {
    listen 443 ssl;
    server_name wordflow.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 11.2. Docker (опционально)

Для упрощения развёртывания можно использовать Docker Compose:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - backend/.env
    depends_on:
      - db

  frontend:
    build: ./
    ports:
      - "5173:80"
    depends_on:
      - backend

  db:
    image: postgres:14
    environment:
      POSTGRES_USER: wordflow_user
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: wordflow
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 12. Поддержка

При возникновении проблем:
1. Проверить логи backend в терминале
2. Открыть DevTools в браузере (F12) → вкладка Network
3. Проверить логи PostgreSQL: `sudo tail -f /var/log/postgresql/postgresql-14-main.log`
4. Убедиться, что все переменные окружения заполнены корректно

---

**Готово!** Теперь приложение должно работать локально с удалённой базой данных PostgreSQL.
