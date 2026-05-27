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
  old_price NUMERIC,
  quantity INT DEFAULT 0,
  visibility BOOLEAN DEFAULT TRUE,
  image_url TEXT DEFAULT 'default.png',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  user_id INT,
  product_id INT,
  quantity INT,
	UNIQUE (user_id, product_id)
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
	-- created, confirmed, shipped, delivered, cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price NUMERIC NOT NULL
);

-- TEST DATA
INSERT INTO users (name, email, password, role) VALUES
('Admin', 'admin@test.com', '$2b$10$fVvjhi7okak2Gh7AO8usHeFn3MDJw3hiF9QcKHchdC/LfjmceiNJK', 'admin'),
('User', 'user@test.com', '$2b$10$fVvjhi7okak2Gh7AO8usHeFn3MDJw3hiF9QcKHchdC/LfjmceiNJK', 'user');

INSERT INTO products (name, description, price, old_price, quantity, visibility, image_url) VALUES
('Apples', 'Juicy apples', 2.12, 2.35, 5, TRUE, 'img1.jpg'),
('Bananas', 'Juicy bananas', 1.25, 1.35, 2, TRUE, 'img2.jpg'),
('Grapes', 'Juicy grapes', 3.75, 3.95, 1, TRUE, 'img3.jpg'),
('Grapefruit', 'Juicy Grapefruits', 3.75, 3.90, 1, FALSE, 'img4.jpg');

INSERT INTO cart_items (user_id, product_id, quantity) VALUES
(1, 1, 1),
(1, 3, 2),
(2, 2, 1),
(2, 3, 1);

INSERT INTO orders (user_id, status) VALUES
(1, 'created'),
(2, 'created'),
(2, 'created');

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 1, 1, 2.35),
(1, 3, 2, 3.75),
(2, 2, 1, 1.25),
(2, 3, 1, 3.75),
(3, 1, 1, 2.35),
(3, 3, 1, 3.75);