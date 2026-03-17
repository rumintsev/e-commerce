-- docker/init.sql

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  role TEXT
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT,
  description TEXT,
  price NUMERIC,
  discount_percent INT,
	quantity INT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  user_id INT,
  guest_id TEXT,
  product_id INT,
  quantity INT
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT,
  total_price NUMERIC,
  status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT,
  product_id INT,
  quantity INT,
  price NUMERIC
);

-- TEST DATA
INSERT INTO users (name, email, password, role) VALUES
('Admin', 'admin@test.com', 'password', 'admin'),
('User', 'user@test.com', 'password', 'user');

INSERT INTO products (name, description, price, discount_percent, quantity, image_url) VALUES
('Apples', 'Juicy apples', 2.35, 10, 5, 'img1.jpg'),
('Bananas', 'Juicy bananas', 1.25, 5, 2, 'img2.jpg'),
('Grapes', 'Juicy grapes', 3.75, 0, 1, 'img3.jpg');

INSERT INTO cart_items (user_id, product_id, quantity) VALUES
(1, 1, 1),
(1, 3, 2),
(2, 2, 1),
(2, 3, 1);

INSERT INTO orders (user_id, total_price, status) VALUES
(1, 1200, 'created'),
(2, 2500, 'created'),
(2, 1100, 'created');

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 1, 1, 900),
(1, 3, 2, 200),
(2, 2, 1, 2375),
(2, 3, 1, 200),
(3, 1, 1, 900),
(3, 3, 1, 200);