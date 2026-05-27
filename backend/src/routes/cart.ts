import { Router } from "express";
import type { Request, Response } from "express";
import { pool } from "../db/testDbConnection.js";
import { auth, getUser } from "../middleware/auth.js";

const router = Router();

async function getProductQuantity(productId: number): Promise<number | null> {
	const result = await pool.query(
		`SELECT quantity FROM products WHERE id = $1`,
		[productId],
	);
	if (result.rows.length === 0) return null;
	return Number(result.rows[0].quantity);
}

async function getCartProductQuantity(userId: number, productId: number): Promise<number> {
	const result = await pool.query(
		`
    SELECT COALESCE(SUM(quantity), 0)::int AS total
    FROM cart_items
    WHERE user_id = $1 AND product_id = $2
    `,
		[userId, productId],
	);
	return Number(result.rows[0].total);
}

// get cart items amount
router.get("/count", auth, async (req: Request, res: Response) => {
	const userId = getUser(res)!.userId;

	const result = await pool.query(
		`SELECT COALESCE(SUM(quantity), 0)::int AS total_count
     FROM cart_items
     WHERE user_id = $1`,
		[userId],
	);

	res.json({ totalCount: result.rows[0].total_count });
});

// get cart items
router.get("/", auth, async (req: Request, res: Response) => {
	const userId = getUser(res)!.userId;
	const result = await pool.query(
		`
    SELECT 
			cart_items.id,
			cart_items.quantity AS cart_quantity,
			products.quantity AS product_quantity,
			products.id AS product_id,
			products.name,
			products.price,
			products.old_price,
			products.image_url
    FROM cart_items
    JOIN products ON products.id = cart_items.product_id
    WHERE cart_items.user_id = $1
    `,
		[userId],
	);

	res.json(result.rows);
});

// add item to cart
// params: { productId }
router.post("/:productId", auth, async (req: Request, res: Response) => {
	const userId = getUser(res)!.userId;
	const productId = Number(req.params.productId);
	const { quantity } = req.body;

	if (isNaN(productId)) {
		return res.status(400).json({ message: "Invalid product id" });
	}

	if (
		typeof quantity !== "number" ||
		!Number.isInteger(quantity) ||
		quantity < 1
	) {
		return res.status(400).json({
			message: "Quantity must be > 0",
		});
	}

	const productQuantity = await getProductQuantity(productId);
	if (productQuantity === null) {
		return res.status(404).json({ message: "Product not found" });
	}

	const alreadyInCart = await getCartProductQuantity(userId, productId);
	if (alreadyInCart + quantity > productQuantity) {
		return res.status(400).json({ message: "Not enough product quantity" });
	}

	// if the item is not in the cart, add it with the specified quantity,
	// if it is in the cart, add it to the existing quantity
	const result = await pool.query(
		`INSERT INTO cart_items(user_id, product_id, quantity)
   VALUES ($1, $2, $3)
   ON CONFLICT (user_id, product_id)
   DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
   RETURNING *`,
		[userId, productId, quantity],
	);

	res.json(result.rows[0]);
});

// remove item from cart
// params: { productId }
router.delete("/:productId", auth, async (req: Request, res: Response) => {
	const userId = getUser(res)!.userId;
	const productId = Number(req.params.productId);

	if (isNaN(productId)) {
		return res.status(400).json({ message: "Invalid product id" });
	}

	const result = await pool.query(
		`
    DELETE FROM cart_items
    WHERE user_id = $1 AND product_id = $2
    RETURNING *
    `,
		[userId, productId],
	);

	if (result.rowCount === 0) {
		return res.status(404).json({ message: "Item not found in cart" });
	}

	res.json(result.rows[0]);
});

// update item quantity
// body: { quantity }
router.put("/:productId", auth, async (req: Request, res: Response) => {
	const userId = getUser(res)!.userId;
	const productId = Number(req.params.productId);
	const { quantity } = req.body;

	if (isNaN(productId)) {
		return res.status(400).json({ message: "Invalid product id" });
	}

	if (
		typeof quantity !== "number" ||
		!Number.isInteger(quantity) ||
		quantity < 1
	) {
		return res.status(400).json({
			message: "Quantity must be >0",
		});
	}

	const productQuantity = await getProductQuantity(productId);
	if (productQuantity === null) {
		return res.status(404).json({ message: "Product not found" });
	}

	if (quantity > productQuantity) {
		return res.status(400).json({ message: "Not enough product quantity" });
	}

	const result = await pool.query(
		`
    UPDATE cart_items
    SET quantity = $1
    WHERE user_id = $2 AND product_id = $3
    RETURNING *
    `,
		[quantity, userId, productId],
	);

	if (result.rowCount === 0) {
		return res.status(404).json({ message: "Item not found in cart" });
	}

	res.json(result.rows[0]);
});

export default router;