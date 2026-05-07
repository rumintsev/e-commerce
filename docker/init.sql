-- docker/init.sql

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  role TEXT
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT DEFAULT 'Название',
  description TEXT DEFAULT 'Описание',
  price NUMERIC DEFAULT 0,
  discount_percent INT DEFAULT 0,
	quantity INT DEFAULT 0,
	visibility BOOLEAN DEFAULT TRUE,
  image_url TEXT DEFAULT 'default.png',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  user_id INT,
  product_id INT,
  quantity INT
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  total_price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price NUMERIC NOT NULL,
  discount_percent NUMERIC NOT NULL DEFAULT 0
);

-- TEST DATA
INSERT INTO users (name, email, password, role) VALUES
('Admin', 'admin@test.com', '$2b$10$fVvjhi7okak2Gh7AO8usHeFn3MDJw3hiF9QcKHchdC/LfjmceiNJK', 'admin'),
('User', 'user@test.com', '$2b$10$fVvjhi7okak2Gh7AO8usHeFn3MDJw3hiF9QcKHchdC/LfjmceiNJK', 'user');

INSERT INTO products (name, description, price, discount_percent, quantity, visibility, image_url) VALUES
('Apples', 'Juicy apples', 2.35, 10, 5, TRUE,'img1.jpg'),
('Bananas', 'Juicy bananas', 1.25, 5, 2, TRUE, 'img2.jpg'),
('Grapes', 'Juicy grapes', 3.75, 0, 1, TRUE, 'img3.jpg'),
('Grapefruit', 'Juicy Grapefruits', 3.75, 0, 1, FALSE, 'img4.jpg');

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