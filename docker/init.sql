CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT,
  description TEXT,
  price NUMERIC,
  discount_percent INT,
  image_url TEXT
);

CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  user_id INT,
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