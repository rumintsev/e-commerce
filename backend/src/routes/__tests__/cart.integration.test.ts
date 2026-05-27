import request from "supertest";
import express from "express";
import type { PoolClient } from "pg";
import { pool } from "../../db/testDbConnection.js";
import cartRouter from "../cart.js";
import authRouter from "../auth.js";

const app = express();
app.use(express.json());
app.use("/auth", authRouter);
app.use("/cart", cartRouter);

let client: PoolClient;
let token: string;
let userId: number;
let productIds: number[];

beforeAll(async () => {
	const res = await request(app).post("/auth/login").send({
		email: process.env.USER_EMAIL,
		password: process.env.USER_PASSWORD,
	});
	token = res.body.token;
	userId = res.body.userId;

	client = await pool.connect();
	await client.query(`DELETE FROM cart_items WHERE user_id = $1;`, [userId]);
	const products = await client.query(`
    INSERT INTO products (name, description, price, old_price, quantity, visibility, image_url) VALUES
		('Apples', 'Juicy apples', 2.12, 2.35, 5, TRUE, 'img1.jpg'),
		('Bananas', 'Juicy bananas', 1.25, 1.35, 2, TRUE, 'img2.jpg')
    RETURNING id;`, []);
	productIds = products.rows.map(row => row.id);
	console.log("Inserted product IDs:", productIds);
	client.release();
});

beforeEach(async () => {
	client = await pool.connect();
	await client.query(`DELETE FROM cart_items WHERE user_id = $1;`, [userId]);
	client.release();
});

afterAll(async () => {
	client = await pool.connect();
	await client.query(`DELETE FROM cart_items WHERE user_id = $1;`, [userId]);
	await client.query(`DELETE FROM products WHERE id = ANY($1);`, [productIds]);
	await client.query(`INSERT INTO cart_items (user_id, product_id, quantity) VALUES (2, 2, 1), (2, 3, 1);`);
	client.release();
	await pool.end();
});

describe("Cart endpoints", () => {
	describe("GET /cart", () => {
		it("Empty array if cart is empty", async () => {
			const res = await request(app)
				.get("/cart")
				.set("Authorization", `Bearer ${token}`);

			expect(res.status).toBe(200);
			expect(res.body).toEqual([]);
		});

		it("Returns item after adding", async () => {
			await request(app)
				.post(`/cart/${productIds[0]}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ quantity: 2 });

			const res = await request(app)
				.get("/cart")
				.set("Authorization", `Bearer ${token}`);

			expect(res.status).toBe(200);
			expect(res.body).toHaveLength(1);
		});

		it("Returns several items", async () => {
			await request(app)
				.post(`/cart/${productIds[0]}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ quantity: 2 });

			await request(app)
				.post(`/cart/${productIds[1]}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ quantity: 2 });

			const res = await request(app)
				.get("/cart")
				.set("Authorization", `Bearer ${token}`);

			expect(res.status).toBe(200);
			expect(res.body).toHaveLength(2);
		});
	});

	describe("GET /cart/count", () => {
		it("0 if cart is empty", async () => {
			const res = await request(app)
				.get("/cart/count")
				.set("Authorization", `Bearer ${token}`);

			expect(res.status).toBe(200);
			expect(res.body).toEqual({ totalCount: 0 });
		});

		it("Returns correct count for a single item", async () => {
			await request(app)
				.post(`/cart/${productIds[0]}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ quantity: 3 });

			const res = await request(app)
				.get("/cart/count")
				.set("Authorization", `Bearer ${token}`);

			expect(res.status).toBe(200);
			expect(res.body).toEqual({ totalCount: 3 });
		});

		it("Returns correct count for multiple items", async () => {
			await request(app)
				.post(`/cart/${productIds[0]}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ quantity: 3 });

			await request(app)
				.post(`/cart/${productIds[1]}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ quantity: 2 });

			const res = await request(app)
				.get("/cart/count")
				.set("Authorization", `Bearer ${token}`);

			expect(res.status).toBe(200);
			expect(res.body).toEqual({ totalCount: 5 });
		});
	});

	describe("PUT /cart/:id", () => {
		it("Updates the quantity of an item in the cart", async () => {
			const res1 = await request(app)
				.post(`/cart/${productIds[0]}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ quantity: 5 });

			const res2 = await request(app)
				.put(`/cart/${productIds[0]}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ quantity: 2 });

			const res = await request(app)
				.get("/cart")
				.set("Authorization", `Bearer ${token}`);

			expect(res.body[0].cart_quantity).toBe(2);
		});

		it("Count recalculates after updating quantity", async () => {
			await request(app)
				.post(`/cart/${productIds[0]}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ quantity: 3 });

			await request(app)
				.put(`/cart/${productIds[0]}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ quantity: 1 });

			const res = await request(app)
				.get("/cart/count")
				.set("Authorization", `Bearer ${token}`);

			expect(res.body).toEqual({ totalCount: 1 });
		});
	});

	describe("DELETE /cart/:id", () => {
		it("After removing an item, it is no longer in the cart", async () => {
			await request(app)
				.post(`/cart/${productIds[0]}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ quantity: 2 });

			await request(app)
				.post(`/cart/${productIds[1]}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ quantity: 2 });

			await request(app)
				.delete(`/cart/${productIds[0]}`)
				.set("Authorization", `Bearer ${token}`);

			const res = await request(app)
				.get("/cart")
				.set("Authorization", `Bearer ${token}`);

			expect(res.body).toHaveLength(1);
			expect(res.body[0].product_id).toBe(productIds[1]);
		});

		it("Count recalculates after removing an item", async () => {
			await request(app)
				.post(`/cart/${productIds[0]}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ quantity: 3 });

			await request(app)
				.post(`/cart/${productIds[1]}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ quantity: 2 });

			await request(app)
				.delete(`/cart/${productIds[0]}`)
				.set("Authorization", `Bearer ${token}`);

			const res = await request(app)
				.get("/cart/count")
				.set("Authorization", `Bearer ${token}`);

			expect(res.body).toEqual({ totalCount: 2 });
		});
	});
});