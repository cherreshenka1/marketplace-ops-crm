export const seedSql = `
CREATE TABLE sellers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  segment TEXT NOT NULL,
  city TEXT NOT NULL,
  rating REAL NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  seller_id INTEGER NOT NULL,
  sku TEXT NOT NULL,
  title TEXT NOT NULL,
  stock INTEGER NOT NULL,
  price INTEGER NOT NULL,
  FOREIGN KEY (seller_id) REFERENCES sellers(id)
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  order_code TEXT NOT NULL,
  seller_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  total INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (seller_id) REFERENCES sellers(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  channel TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT INTO sellers VALUES
(1, 'North Market', 'Электроника', 'Казань', 4.9),
(2, 'Daily Home', 'Дом и уют', 'Москва', 4.7),
(3, 'Urban Sport', 'Спорт', 'Санкт-Петербург', 4.8);

INSERT INTO products VALUES
(1, 1, 'NM-4410', 'Noise Control Headphones', 42, 18990),
(2, 1, 'NM-1108', 'Smart Watch Ultra', 18, 24990),
(3, 2, 'DH-9081', 'Aroma Air Diffuser', 64, 6990),
(4, 3, 'US-7742', 'Running Performance Set', 27, 11500);

INSERT INTO orders VALUES
(1, 'ORD-91421', 1, 2, 'Новый', 24990, '2026-04-03'),
(2, 'ORD-91402', 2, 3, 'В обработке', 13980, '2026-04-02'),
(3, 'ORD-91377', 3, 4, 'Доставлен', 11500, '2026-04-02'),
(4, 'ORD-91320', 1, 1, 'В обработке', 18990, '2026-04-01'),
(5, 'ORD-91290', 2, 3, 'Доставлен', 6990, '2026-03-31');

INSERT INTO events VALUES
(1, 'Telegram Bot', 'Новый заказ ORD-91421 от продавца North Market', '2 минуты назад'),
(2, 'Webhook', 'Обновлен остаток по SKU NM-1108: осталось 18 единиц', '11 минут назад'),
(3, 'Price Parser', 'У конкурента снизилась цена на категорию "Электроника"', '27 минут назад');
`

export const queryPresets = [
  {
    title: 'Заказы с продавцами и товарами',
    sql: `SELECT o.order_code, s.name AS seller, p.title AS product, o.status, o.total, o.created_at
FROM orders o
JOIN sellers s ON s.id = o.seller_id
JOIN products p ON p.id = o.product_id
ORDER BY o.created_at DESC;`,
  },
  {
    title: 'Выручка по продавцам',
    sql: `SELECT s.name AS seller, COUNT(o.id) AS orders_count, SUM(o.total) AS revenue
FROM orders o
JOIN sellers s ON s.id = o.seller_id
GROUP BY s.name
ORDER BY revenue DESC;`,
  },
  {
    title: 'Товары с низким остатком',
    sql: `SELECT p.sku, p.title, s.name AS seller, p.stock, p.price
FROM products p
JOIN sellers s ON s.id = p.seller_id
WHERE p.stock < 30
ORDER BY p.stock ASC;`,
  },
]
