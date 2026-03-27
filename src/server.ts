import express from "express"
import cors from "cors"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { Pool } from "pg"
import type { Request, Response, NextFunction } from "express"

const app = express()

app.use(cors())
app.use(express.json())
// для x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }))

const PORT = process.env.PORT ?? 3000

// подключение к postgreSQL
const pool = new Pool({
	user: "postgres",
	host: "localhost",
	database: "ecommerce_db",
	password: "postgres",
	port: 5432
})

// проверка подключения к postgreSQL
async function start() {
	try {
		await pool.query("SELECT 1");
		console.log("db connected");
	} catch (e) {
		console.error("db connection failed");
		process.exit(1);
	}
}

start();

// секрет, котоырй шифрует пароли, если он будет известен, 
// и будет слив бд, пароли будут расшифрованы в том виде, 
// в котором их вводили пользователи
const SECRET = process.env.JWT_SECRET || "secret"

const auth = (req: Request, res: Response, next: NextFunction) => {

	const header = req.headers.authorization
	if (!header || !header.startsWith("Bearer ")) {
		return res.status(401).json({ message: "unauthorized" })
	}

	const token = header.split(" ")[1]
	if (!token) {
		return res.status(401).json({ message: "unauthorized" })
	}

	try {
		const payload = jwt.verify(token, SECRET)

		if (
			typeof payload !== "object" ||
			payload === null ||
			!("userId" in payload) ||
			!("role" in payload)
		) {
			return res.status(401).json({ message: "invalid token payload" })
		}

		res.locals.user = payload

		next()
	} catch (e) {
		return res.status(401).json({ message: "invalid token" })
	}
}

const adminOnly = (req: Request, res: Response, next: NextFunction) => {
	if (res.locals.user.role !== "admin") {
		return res.status(403).json({ message: "forbidden" })
	}
	next()
}

const authOptional = (req: Request, res: Response, next: NextFunction) => {
	const header = req.headers.authorization
	if (!header || !header.startsWith("Bearer ")) {
		return next()
	}

	const token = header.split(" ")[1]
	if (!token) return next()

	try {
		const payload = jwt.verify(token, SECRET)
		if (typeof payload === "object" && payload && "userId" in payload && "role" in payload) {
			res.locals.user = payload
		}
	} catch (e) {
	}

	next()
}

app.get("/", (req, res) => {
	res.send("API works")
})

app.post("/auth/register", async (req, res) => {
	const { name, email, password } = req.body || {}

	if (!name || !email || !password ||
		typeof email !== "string" || !email.includes("@") ||
		typeof password !== "string" || password.length < 8) {
		return res.status(400).json({
			message: "incorrect data"
		})
	}

	try {
		const hashedPassword = await bcrypt.hash(password, 10)
		const result = await pool.query(
			"INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email",
			[name, email, hashedPassword, "user"]
		)

		const user = result.rows[0]

		const token = jwt.sign(
			{ userId: user.id },
			SECRET,
			{ expiresIn: "1h" }
		)

		res.json({
			token,
			email: user.email,
			name: user.name,
			role: user.role
		})
	} catch (e) {
		res.status(400).json({ message: "user already exists" })
	}
})

app.post("/auth/login", async (req, res) => {
	const { email, password } = req.body || {}

	if (!email || !password ||
		typeof email !== "string" || !email.includes("@") ||
		typeof password !== "string" || password.length < 8) {
		return res.status(400).json({
			message: "incorrect data"
		})
	}

	const result = await pool.query(
		"SELECT * FROM users WHERE email = $1",
		[email]
	)

	const user = result.rows[0]
	if (!user) {
		return res.status(401).json({ message: "invalid email" })
	}

	const isValid = await bcrypt.compare(password, user.password)
	if (!isValid) {
		return res.status(401).json({ message: "invalid password" })
	}

	const token = jwt.sign(
		{ userId: user.id, role: user.role },
		SECRET,
		{ expiresIn: "1h" }
	)

	res.json({ token, email, name: user.name, role: user.role })
})

// ?page ?limit ?q ?discount
app.get("/products", authOptional, async (req, res) => {
	try {
		const page = Number(req.query.page) || 1
		const limit = Number(req.query.limit) || 10
		const offset = (page - 1) * limit
		const q = typeof req.query.q === "string" ? req.query.q : null
		const discount = Number(req.query.discount)
		const user = res.locals.user

		const conditions: string[] = []
		const values: any[] = []

		if (!isNaN(discount)) {
			values.push(discount)
			conditions.push(`discount_percent >= $${values.length}`)
		}

		if (q) {
			// % -- любые символы перед и после
			values.push(`%${q}%`)
			// ILIKE — игнорирует регистр
			conditions.push(`name ILIKE $${values.length}`)
		}

		if (!user || user.role !== "admin") {
			conditions.push(`visibility = true`)
		}

		const where = conditions.length
			? `WHERE ${conditions.join(" AND ")}`
			: ""

		values.push(limit)
		values.push(offset)

		const result = await pool.query(
			`
      SELECT *
      FROM products
      ${where}
      ORDER BY id
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
      `,
			values
		)

		res.json(result.rows)
	} catch (err) {
		console.error(err)
		res.status(500).json({ message: "database error" })
	}
})

// должен стоять после /products, 
// иначе будет перехватывть его запросы
app.get("/products/:id", authOptional, async (req, res) => {
	const id = Number(req.params.id)
	if (isNaN(id)) return res.status(400).json({ message: "invalid id" })

	const user = res.locals.user
	const conditions = [`id = $1`]
	const values = [id]

	if (!user || user.role !== "admin") {
		conditions.push(`visibility = true`)
	}

	const result = await pool.query(
		`SELECT * FROM products WHERE ${conditions.join(" AND ")}`,
		values
	)

	res.json(result.rows[0] || {})
})

app.post("/products", auth, adminOnly, async (req, res) => {
	const {
		name = "Название",
		description = "Описание",
		price = 0,
		discount_percent = 0,
		quantity = 0,
		visibility = false,
		image_url = "default.png"
	} = req.body || {}

	const result = await pool.query(
		`
    INSERT INTO products(name,description,price,discount_percent,quantity,visibility,image_url)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
    `,
		[name, description, price, discount_percent, quantity, visibility, image_url]
	)

	res.json(result.rows[0])
})

app.put("/products/:id", auth, adminOnly, async (req, res) => {
	const id = Number(req.params.id)
	if (isNaN(id)) return res.status(400).json({ message: "invalid id" })

	const allowedFields = [
		"name",
		"description",
		"price",
		"discount_percent",
		"quantity",
		"visibility",
		"image_url"
	]

	const updates: string[] = []
	const values: any[] = []

	for (const field of allowedFields) {
		if (req.body?.[field] !== undefined) {
			values.push(req.body[field])
			updates.push(`${field} = $${values.length}`)
		}
	}

	if (updates.length === 0) {
		return res.status(400).json({ message: "no fields to update" })
	}

	values.push(id)

	const result = await pool.query(
		`
    UPDATE products
    SET ${updates.join(", ")}
    WHERE id = $${values.length}
    RETURNING *
    `,
		values
	)

	res.json(result.rows[0])
})

app.delete("/products/:id", auth, adminOnly, async (req, res) => {
	const id = Number(req.params.id)
	if (isNaN(id)) return res.status(400).json({ message: "invalid id" })

	await pool.query(
		"DELETE FROM products WHERE id=$1",
		[id]
	)

	res.json({ message: "product deleted" })
})

app.get("/cart", auth, async (req, res) => {
	const userId = res.locals.user.userId

	const result = await pool.query(
		`
		SELECT cart_items.*, products.*
		FROM cart_items
		JOIN products ON products.id = cart_items.product_id
		WHERE cart_items.user_id = $1
		`,
		[userId]
	)

	res.json(result.rows)
})

app.get("/orders/user", auth, async (req, res) => {
	const userId = res.locals.user.userId

	const result = await pool.query(
		"SELECT * FROM orders WHERE user_id = $1",
		[userId]
	)

	res.json(result.rows)
})

app.post("/cart/add", auth, async (req, res) => {
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

app.post("/orders", auth, async (req, res) => {
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