import request from "supertest";
import express from "express";
import type { PoolClient } from "pg";
import { pool } from "../../db/testDbConnection.js";
import ordersRouter from "../orders.js";
import authRouter from "../auth.js";

const app = express();
app.use(express.json());
app.use("/auth", authRouter);
app.use("/orders", ordersRouter);

let client: PoolClient;
let userToken: string;
let userId: number;
let adminToken: string;
let adminId: number;
let productIds: number[];

beforeAll(async () => {
	// Authorize user
	const userRes = await request(app).post("/auth/login").send({
		email: process.env.USER_EMAIL,
		password: process.env.USER_PASSWORD,
	});
	userToken = userRes.body.token;
	userId = userRes.body.userId;

	// Authorize admin
	const adminRes = await request(app).post("/auth/login").send({
		email: process.env.ADMIN_EMAIL,
		password: process.env.ADMIN_PASSWORD,
	});
	adminToken = adminRes.body.token;
	adminId = adminRes.body.userId;

	client = await pool.connect();

	// Создаём тестовые продукты
	const products = await client.query(`
		INSERT INTO products (name, description, price, old_price, quantity, visibility, image_url) VALUES
		('Test Apple', 'Test fruit', 2.50, 3.00, 100, TRUE, 'apple.jpg'),
		('Test Banana', 'Test fruit 2', 1.50, 2.00, 50, TRUE, 'banana.jpg')
		RETURNING id;
	`);
	client.release();

	productIds = products.rows.map((row) => row.id);
});

beforeEach(async () => {
	client = await pool.connect();
	await client.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
	await client.query(`DELETE FROM cart_items WHERE user_id = $1`, [adminId]);
	await client.query(`DELETE FROM order_items WHERE order_id IN 
		(SELECT id FROM orders WHERE user_id = $1)`, [userId],
	);
	await client.query(`DELETE FROM order_items WHERE order_id IN 
		(SELECT id FROM orders WHERE user_id = $1)`, [adminId],
	);
	await client.query(`DELETE FROM orders WHERE user_id = $1`, [userId]);
	await client.query(`DELETE FROM orders WHERE user_id = $1`, [adminId]);
	client.release();
});

afterAll(async () => {
	client = await pool.connect();
	const res1 = await client.query(`DELETE FROM products WHERE id = ANY($1);`, [productIds]);
	const res2 = await client.query(`DELETE FROM cart_items WHERE user_id = ANY($1)`, [[userId, adminId]]);
	const res3 = await client.query(`DELETE FROM order_items WHERE order_id IN 
		(SELECT id FROM orders WHERE user_id = ANY($1))`, [[userId, adminId]],
	);
	const res4 = await client.query(`DELETE FROM orders WHERE user_id = ANY($1)`, [[userId, adminId]]);
	const res5 = await client.query(`SELECT * FROM cart_items WHERE user_id = ANY($1)`, [[userId, adminId]]);
	console.log(res1.rowCount, res2.rowCount, res3.rowCount, res4.rowCount);
	console.log("Remaining cart items:", res5.rows);

	await client.query(`INSERT INTO cart_items (user_id, product_id, quantity) VALUES 
		(1, 1, 1),
		(1, 3, 2),
		(2, 2, 1),
		(2, 3, 1);
	`);
	await client.query(`INSERT INTO orders (user_id, status) VALUES
		(1, 'created'),
		(2, 'created'),
		(2, 'created');
	`);
	await client.query(`INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
		(1, 1, 1, 2.35),
		(1, 3, 2, 3.75),
		(2, 2, 1, 1.25),
		(2, 3, 1, 3.75),
		(3, 1, 1, 2.35),
		(3, 3, 1, 3.75);
	`);
	client.release();
	await pool.end();
});
describe("Orders endpoints", () => {
	describe("GET /orders", () => {
		it("Empty array if no orders exist", async () => {
			const res = await request(app)
				.get("/orders")
				.set("Authorization", `Bearer ${userToken}`);

			expect(res.status).toBe(200);
			expect(res.body).toEqual([]);
		});

		it("401 without token", async () => {
			const res = await request(app).get("/orders");
			expect(res.status).toBe(401);
		});

		it("401 with invalid token", async () => {
			const res = await request(app)
				.get("/orders")
				.set("Authorization", "Bearer invalid.token.here");
			expect(res.status).toBe(401);
		});

		it("Return user's orders with their items", async () => {
			client = await pool.connect();
			await client.query(
				`INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, 3), ($1, $3, 1)`,
				[userId, productIds[0], productIds[1]],
			);
			client.release();

			const orderRes = await request(app)
				.post("/orders")
				.set("Authorization", `Bearer ${userToken}`);

			const orderId = orderRes.body.id;

			const res = await request(app)
				.get("/orders")
				.set("Authorization", `Bearer ${userToken}`);

			expect(res.status).toBe(200);
			expect(res.body).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						order_id: orderId,
						status: "created",
						product_id: productIds[0],
						quantity: 3,
					}),
					expect.objectContaining({
						order_id: orderId,
						status: "created",
						product_id: productIds[1],
						quantity: 1,
					}),
				]),
			);
		});
	});

	describe("GET /orders/:id", () => {
		it("Returns the order with its items", async () => {
			client = await pool.connect();
			const orderRes = await client.query(
				`INSERT INTO orders (user_id, status) VALUES ($1, 'created') RETURNING id`,
				[userId],
			);
			const orderId = orderRes.rows[0].id;
			await client.query(
				`INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, 2, 2.50), ($1, $3, 1, 1.50)`,
				[orderId, productIds[0], productIds[1]],
			);
			client.release();

			const res = await request(app)
				.get(`/orders/${orderId}`)
				.set("Authorization", `Bearer ${userToken}`);

			expect(res.status).toBe(200);
			expect(res.body.length).toBe(2);
			expect(res.body[0]).toMatchObject({
				order_id: orderId,
				status: "created",
			});
			expect(res.body.map((r: { product_id: number }) => r.product_id)).toEqual(
				expect.arrayContaining([productIds[0], productIds[1]]),
			);
		});

		it("404 if order of a different user", async () => {
			client = await pool.connect();
			const orderRes = await client.query(
				`INSERT INTO orders (user_id, status) VALUES ($1, 'created') RETURNING id`,
				[userId],
			);
			const orderId = orderRes.rows[0].id;
			client.release();

			const res = await request(app)
				.get(`/orders/${orderId}`)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(res.status).toBe(404);
		});

		it("400 if non-numeric id", async () => {
			const res = await request(app)
				.get("/orders/abc")
				.set("Authorization", `Bearer ${userToken}`);

			expect(res.status).toBe(400);
			expect(res.body.message).toBe("Invalid order ID");
		});

		it("401 without token", async () => {
			client = await pool.connect();
			const orderRes = await client.query(
				`INSERT INTO orders (user_id, status) VALUES ($1, 'created') RETURNING id`,
				[userId],
			);
			const orderId = orderRes.rows[0].id;
			client.release();

			const res = await request(app).get(`/orders/${orderId}`);
			expect(res.status).toBe(401);
		});
	});

	describe("POST /orders", () => {
		it("400 if cart is empty", async () => {
			const res = await request(app)
				.post("/orders")
				.set("Authorization", `Bearer ${userToken}`);

			expect(res.status).toBe(400);
		});

		it("401 without token", async () => {
			const res = await request(app).post("/orders");
			expect(res.status).toBe(401);
		});

		it("401 with invalid token", async () => {
			const res = await request(app)
				.post("/orders")
				.set("Authorization", "Bearer invalid.token.here");
			expect(res.status).toBe(401);
		});

		it("Makes an order from the cart and clears the cart", async () => {
			// Fill cart with items
			client = await pool.connect();
			await client.query(
				`INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, 3), ($1, $3, 1)`,
				[userId, productIds[0], productIds[1]],
			);

			const res = await request(app)
				.post("/orders")
				.set("Authorization", `Bearer ${userToken}`);

			expect(res.status).toBe(200);
			expect(res.body).toMatchObject({ status: "created", user_id: userId });

			// Check that cart is cleared
			const cart = await client.query(
				`SELECT * FROM cart_items WHERE user_id = $1`,
				[userId],
			);
			expect(cart.rowCount).toBe(0);

			// Check that order_items are created
			const items = await client.query(
				`SELECT * FROM order_items WHERE order_id = $1`,
				[res.body.id],
			);

			expect(items.rowCount).toBe(2);
			expect(items.rows).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ product_id: productIds[0], quantity: 3 }),
					expect.objectContaining({ product_id: productIds[1], quantity: 1 }),
				]),
			);
			client.release();
		});

		it("Fixes the price of the product at the time of order placement", async () => {
			client = await pool.connect();
			await client.query(
				`INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, 1)`,
				[userId, productIds[0]],
			);

			// Current price
			const priceRes = await client.query(
				`SELECT price FROM products WHERE id = $1`,
				[productIds[0]],
			);
			const expectedPrice = Number(priceRes.rows[0].price);

			const res = await request(app)
				.post("/orders")
				.set("Authorization", `Bearer ${userToken}`);
			expect(res.status).toBe(200);

			// Change product price after order is placed
			await client.query(
				`UPDATE products SET price = $1 WHERE id = $2`,
				[expectedPrice + 1, productIds[0]],
			);

			const item = await client.query(
				`SELECT price FROM order_items WHERE order_id = $1`,
				[res.body.id],
			);
			expect(Number(item.rows[0].price)).toBe(expectedPrice);
			client.release();
		});

		it("Does not create an order from another user's cart", async () => {
			// Add item to user's cart
			client = await pool.connect();
			await client.query(
				`INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, 1)`,
				[userId, productIds[0]],
			);

			// Other user tries to make an order
			const res = await request(app)
				.post("/orders")
				.set("Authorization", `Bearer ${adminToken}`);

			expect(res.status).toBe(400);
			expect(res.body).toMatchObject({ message: "Cart is empty" });

			client.release();
		});
	});

	describe("PATCH /orders/:id", () => {
		it("Updates the status of an order (admin)", async () => {
			client = await pool.connect();
			const orderRes = await client.query(
				`INSERT INTO orders (user_id, status) VALUES ($1, 'created') RETURNING id`,
				[userId],
			);
			const orderId = orderRes.rows[0].id;
			client.release();

			const res = await request(app)
				.patch(`/orders/${orderId}`)
				.set("Authorization", `Bearer ${adminToken}`)
				.send({ status: "confirmed" });

			expect(res.status).toBe(200);
			expect(res.body).toMatchObject({ id: orderId, status: "confirmed" });
		});

		it("Updates the updated_at field when status is changed", async () => {
			client = await pool.connect();
			const orderRes = await client.query(
				`INSERT INTO orders (user_id, status) VALUES ($1, 'created') RETURNING id`,
				[userId],
			);
			const orderId = orderRes.rows[0].id;
			client.release();

			client = await pool.connect();
			const before = await client.query(
				`SELECT updated_at FROM orders WHERE id = $1`,
				[orderId],
			);

			// Wait a bit to ensure updated_at will have a different timestamp
			await new Promise((r) => setTimeout(r, 50));

			const res = await request(app)
				.patch(`/orders/${orderId}`)
				.set("Authorization", `Bearer ${adminToken}`)
				.send({ status: "shipped" });

			expect(res.status).toBe(200);
			expect(new Date(res.body.updated_at).getTime()).toBeGreaterThan(
				new Date(before.rows[0].updated_at).getTime(),
			);

			client.release();
		});

		it("400 if status is invalid", async () => {
			client = await pool.connect();
			const orderRes = await client.query(
				`INSERT INTO orders (user_id, status) VALUES ($1, 'created') RETURNING id`,
				[userId],
			);
			const orderId = orderRes.rows[0].id;
			client.release();

			const res = await request(app)
				.patch(`/orders/${orderId}`)
				.set("Authorization", `Bearer ${adminToken}`)
				.send({ status: "flying" });

			expect(res.status).toBe(400);
		});

		it("400 if order ID is not a number", async () => {
			const res = await request(app)
				.patch("/orders/abc")
				.set("Authorization", `Bearer ${adminToken}`)
				.send({ status: "confirmed" });

			expect(res.status).toBe(400);
			expect(res.body.message).toBe("Invalid order ID");
		});

		it("400 if no fields are provided", async () => {
			client = await pool.connect();
			const orderRes = await client.query(
				`INSERT INTO orders (user_id, status) VALUES ($1, 'created') RETURNING id`,
				[userId],
			);
			const orderId = orderRes.rows[0].id;
			client.release();

			const res = await request(app)
				.patch(`/orders/${orderId}`)
				.set("Authorization", `Bearer ${adminToken}`)
				.send({});

			expect(res.status).toBe(400);
		});

		it("403 if regular user tries to update status", async () => {
			client = await pool.connect();
			const orderRes = await client.query(
				`INSERT INTO orders (user_id, status) VALUES ($1, 'created') RETURNING id`,
				[userId],
			);
			const orderId = orderRes.rows[0].id;
			client.release();

			const res = await request(app)
				.patch(`/orders/${orderId}`)
				.set("Authorization", `Bearer ${userToken}`)
				.send({ status: "confirmed" });

			expect(res.status).toBe(403);
		});

		it("401 without token", async () => {
			client = await pool.connect();
			const orderRes = await client.query(
				`INSERT INTO orders (user_id, status) VALUES ($1, 'created') RETURNING id`,
				[userId],
			);
			const orderId = orderRes.rows[0].id;
			client.release();

			const res = await request(app)
				.patch(`/orders/${orderId}`)
				.send({ status: "confirmed" });

			expect(res.status).toBe(401);
		});

		it("401 with invalid token", async () => {
			client = await pool.connect();
			const orderRes = await client.query(
				`INSERT INTO orders (user_id, status) VALUES ($1, 'created') RETURNING id`,
				[userId],
			);
			const orderId = orderRes.rows[0].id;
			client.release();

			const res = await request(app)
				.patch(`/orders/${orderId}`)
				.set("Authorization", "Bearer bad.token")
				.send({ status: "confirmed" });

			expect(res.status).toBe(401);
		});
	});
});