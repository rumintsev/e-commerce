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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP 
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

INSERT INTO products(name, description, price, old_price, quantity, visibility, image_url) VALUES
('Ananas', 'Sweet tropical pineapple, freshly harvested', 2.12, NULL, 5, TRUE, 'Ananas.jpg'),
('Butternut', 'Tender butternut squash, perfect for soups', 1.25, 1.35, 2, TRUE, 'Butternut.jpg'),
('Custard apple', 'Creamy custard apple with a delicate vanilla flavour', 3.75, 3.95, 1, TRUE, 'Custard_apple.jpg'),
('Dragon fruit', 'Vibrant dragon fruit, rich in antioxidants', 3.20, 3.90, 3, TRUE, 'Dragon_fruit.jpg'),
('Orange', 'Sun-ripened juicy oranges, full of vitamin C', 1.49, 1.75, 8, TRUE, 'Orange.jpg'),
('Passion fruit', 'Intensely aromatic passion fruit from the tropics', 2.99, 3.90, 2, TRUE, 'Passion_fruit.jpg'),
('Peache', 'Ripe, fragrant peaches with silky smooth skin', 1.89, 2.49, 4, TRUE, 'Peache.jpg'),
('Pear', 'Crisp and sweet conference pears, locally grown', 1.59, 1.90, 6, TRUE, 'Pear.jpg'),
('Pepper', 'Bright and crunchy bell peppers, mix of colours', 2.10, 2.90, 3, TRUE, 'Pepper.jpg'),
('Puriri', 'Rare New Zealand puriri berries, limited stock', 3.10, 4.20, 2, TRUE, 'Puriri.jpg'),
('Rambutan', 'Exotic rambutan — sweet, juicy and freshly imported', 2.79, 3.90, 1, TRUE, 'Rambutan.jpg'),
('Strawberry', 'Hand-picked garden strawberries, bursting with flavour', 2.49, 3.90, 5, TRUE, 'Strawberry.jpg');

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