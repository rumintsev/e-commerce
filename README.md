# Запуск приложения

Перед запуском приложения должны быть установлены: 
- Node.js
- Docker

## Первый запуск

```
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