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

## Заверщение работы контейнера с бд

```
docker compose down -v
```

## Отчистить бд (инициализация бд)

```
docker compose down -v
docker compose up -d
```