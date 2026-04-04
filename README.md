# Marketplace Ops CRM

CRM для операций маркетплейса с SQL-запросами, заказами, продавцами, товарами,
webhook/Telegram-событиями и аналитикой.

## Живая версия

[https://cherreshenka1.github.io/marketplace-ops-crm/](https://cherreshenka1.github.io/marketplace-ops-crm/)

## Особенность

SQL здесь работает прямо в браузере через SQLite/WebAssembly (`sql.js`), поэтому проект
можно открыть на GitHub Pages и при этом показывать реальные SQL-запросы.

## Что есть

- KPI по заказам, выручке и активным продавцам
- Таблица заказов с обновлением статуса
- Карточки продавцов и товаров
- Лента webhook / Telegram событий
- SQL-консоль с готовыми запросами и выводом результата
- CRUD-like обновление статусов заказов через SQL `UPDATE`

## Запуск

```bash
npm install
npm run dev
```

## Деплой

```bash
npm run deploy
```
