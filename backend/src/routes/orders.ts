import { Router } from "express";
import type { Request, Response } from "express";
import { pool } from "../db/testDbConnection.js";
import { auth, adminOnly, getUser } from "../middleware/auth.js";

const router = Router();

type OrderStatus = "created" | "confirmed" | "shipped" | "delivered" | "cancelled";
const ORDER_STATUSES: OrderStatus[] = ["created", "confirmed", "shipped", "delivered", "cancelled"];

router.get("/", auth, async (req: Request, res: Response) => {
	const userId = getUser(res)!.userId;

	const result = await pool.query(`
		SELECT 
			orders.id AS order_id,
			orders.status,
			orders.created_at,
			orders.updated_at,
			order_items.quantity,
			order_items.price,
			products.id AS product_id,
			products.name,
			products.image_url
		FROM orders
		JOIN order_items ON order_items.order_id = orders.id
		JOIN products ON products.id = order_items.product_id
		WHERE orders.user_id = $1`,
		[userId]);

	res.json(result.rows);
});

router.post("/", auth, async (req: Request, res: Response) => {
	const userId = getUser(res)!.userId;

	const cart = await pool.query(
		`
    SELECT 
			cart_items.quantity,
			cart_items.product_id,
			products.price
		FROM cart_items
		JOIN products ON products.id = cart_items.product_id
		WHERE cart_items.user_id = $1
    `,
		[userId],
	);

	if (cart.rowCount === 0) {
		return res.status(400).json({ message: "Cart is empty" });
	}

	const orderResult = await pool.query(
		`
    INSERT INTO orders(user_id, status)
    VALUES ($1, 'created')
    RETURNING *
    `,
		[userId],
	);

	const order = orderResult.rows[0];

	for (const item of cart.rows) {
		await pool.query(
			`
      INSERT INTO order_items(order_id, product_id, quantity, price)
      VALUES ($1, $2, $3, $4)
      `,
			[
				order.id,
				item.product_id,
				item.quantity,
				item.price,
			],
		);
	}

	await pool.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);

	res.json(order);
});

router.patch("/:id", adminOnly, async (req: Request, res: Response) => {
	const orderId = Number(req.params.id);

	if (isNaN(orderId)) {
		return res.status(400).json({ message: "Invalid order ID" });
	}

	const { status } = req.body as { status: OrderStatus };

	if (!ORDER_STATUSES.includes(status)) {
		return res.status(400).json({
			message: "Invalid status",
			allowed: ORDER_STATUSES,
		});
	}

	const result = await pool.query(
		`
    UPDATE orders
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
		[status, orderId],
	);

	if (result.rowCount === 0) {
		return res.status(404).json({ message: "Order not found" });
	}

	res.json(result.rows[0]);
});

export default router;
