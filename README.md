# Запуск приложения

Перед запуском приложения должны быть установлены: 
- Node.js
- Docker

## Backend

```bash
cd docker && docker compose up -d
cd ../backend
npm install
npm run build
npm run start
```

API: http://localhost:3000

## Frontend (Next.js)

```bash
cd frontend
cp .env.example .env.local   # при необходимости
npm install
npm run dev
```

Приложение: http://localhost:3001

## Первый запуск (legacy, корень репозитория)

```
docker compose up -d
docker compose down -v
docker compose up -d
npm install
npm run build
npm run start
```

При инициализации есть 2 пользователя: user@test.com, admin@test.com, 
у обоих пароль -- password, если const SECRET = "secret", 
при замене на process.env.JWT_SECRET пароли в базе нужно поменять

## Заверщение работы контейнера с бд

```
docker compose down -v
```

## Отчистить бд (инициализация бд)

```
docker compose down -v
docker compose up -d
```