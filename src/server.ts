import express from "express"
import cors from "cors"
import { Pool } from "pg"

const app = express()

app.use(cors())
app.use(express.json())

const PORT = process.env.PORT ?? 3000

// подключение к postgres
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "mydb",
  password: "postgres",
  port: 5432
})

app.get("/", (req, res) => {
  res.send("API works")
})

app.get("/api/products", async (req, res) => {
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10

  const offset = (page - 1) * limit

  const result = await pool.query(
    "SELECT * FROM products ORDER BY id LIMIT $1 OFFSET $2",
    [limit, offset]
  )

  res.json(result.rows)
})

app.get("/api/products/:id", async (req, res) => {
  const { id } = req.params

  const result = await pool.query(
    "SELECT * FROM products WHERE id = $1",
    [id]
  )

  res.json(result.rows[0])
})

app.get("/api/products/discount", async (req, res) => {
  const min = Number(req.query.min) || 1

  const result = await pool.query(
    "SELECT * FROM products WHERE discount_percent >= $1",
    [min]
  )

  res.json(result.rows)
})

app.get("/api/products/search", async (req, res) => {
  const query = req.query.query

  const result = await pool.query(
    "SELECT * FROM products WHERE name ILIKE $1",
    [`%${query}%`]
  )

  res.json(result.rows)
})

app.get("/api/cart/:user_id", async (req, res) => {
  const { user_id } = req.params

  const result = await pool.query(
    `
    SELECT cart_items.*, products.name, products.price
    FROM cart_items
    JOIN products ON products.id = cart_items.product_id
    WHERE cart_items.user_id = $1
    `,
    [user_id]
  )

  res.json(result.rows)
})

app.get("/api/orders/user/:user_id", async (req, res) => {
  const { user_id } = req.params

  const result = await pool.query(
    "SELECT * FROM orders WHERE user_id = $1",
    [user_id]
  )

  res.json(result.rows)
})

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body

  const result = await pool.query(
    `
    INSERT INTO users(name,email,password)
    VALUES ($1,$2,$3)
    RETURNING *
    `,
    [name, email, password]
  )

  res.json(result.rows[0])
})

app.post("/api/admin/products", async (req, res) => {
  const { name, description, price, discount_percent, image_url } = req.body

  const result = await pool.query(
    `
    INSERT INTO products(name,description,price,discount_percent,image_url)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *
    `,
    [name, description, price, discount_percent, image_url]
  )

  res.json(result.rows[0])
})

app.put("/api/admin/products/:id", async (req, res) => {
  const { id } = req.params
  const { name, description, price, discount_percent } = req.body

  const result = await pool.query(
    `
    UPDATE products
    SET name=$1, description=$2, price=$3, discount_percent=$4
    WHERE id=$5
    RETURNING *
    `,
    [name, description, price, discount_percent, id]
  )

  res.json(result.rows[0])
})

app.delete("/api/admin/products/:id", async (req, res) => {
  const { id } = req.params

  await pool.query(
    "DELETE FROM products WHERE id=$1",
    [id]
  )

  res.json({ message: "product deleted" })
})

app.post("/api/cart/add", async (req, res) => {
  const { user_id, product_id, quantity } = req.body

  const result = await pool.query(
    `
    INSERT INTO cart_items(user_id,product_id,quantity)
    VALUES ($1,$2,$3)
    RETURNING *
    `,
    [user_id, product_id, quantity]
  )

  res.json(result.rows[0])
})

app.post("/api/orders", async (req, res) => {
  const { user_id, total_price } = req.body

  const result = await pool.query(
    `
    INSERT INTO orders(user_id,total_price,status)
    VALUES ($1,$2,'pending')
    RETURNING *
    `,
    [user_id, total_price]
  )

  res.json(result.rows[0])
})

app.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}`)
})