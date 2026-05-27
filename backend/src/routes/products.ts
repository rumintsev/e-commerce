import { Router } from "express";
import type { Request, Response } from "express";
import { pool } from "../db/testDbConnection.js";
import { adminOnly, auth, authOptional, getUser } from "../middleware/auth.js";

const router = Router();

// Get products with pagination, search and discount filter
// Only visible products for regular users, all products for admin
// ?page ?limit ?q ?discount
router.get("/", authOptional, async (req: Request, res: Response) => {
	try {
		const page = Number(req.query.page) || 1;
		const limit = Number(req.query.limit) || 10;
		const discount = Number(req.query.discount);

		const offset = (page - 1) * limit;
		const q = typeof req.query.q === "string" ? req.query.q : null;
		const user = getUser(res);

		const conditions: string[] = [];
		const values: unknown[] = [];

		if (!isNaN(discount)) {
			values.push(discount);
			conditions.push(`
        old_price IS NOT NULL
        AND old_price > price
        AND ROUND((1 - price / old_price) * 100) >= $${values.length}
      `);
		}

		if (q) {
			values.push(`%${q}%`);
			conditions.push(`name ILIKE $${values.length}`);
		}

		if (!user || user.role !== "admin") {
			conditions.push("visibility = true");
		}

		const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

		values.push(limit);
		values.push(offset);

		const result = await pool.query(
			`
      SELECT *
      FROM products
      ${where}
      ORDER BY id
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
      `,
			values,
		);

		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Database error" });
	}
});

// Get product by id, only if it's visible or user is admin
router.get("/:id", authOptional, async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

	const user = getUser(res);
	const conditions = ["id = $1"];
	const values: unknown[] = [id];

	if (!user || user.role !== "admin") {
		conditions.push("visibility = true");
	}

	const result = await pool.query(
		`SELECT * FROM products WHERE ${conditions.join(" AND ")}`,
		values,
	);

	res.json(result.rows[0] || {});
});

// Add new product, admin only
router.post("/", auth, adminOnly, async (req: Request, res: Response) => {
	const {
		name = "Название",
		description = "Описание",
		price = 0,
		old_price = null,
		quantity = 0,
		visibility = false,
		image_url = "default.png",
	} = req.body || {};

	const result = await pool.query(
		`
    INSERT INTO products(name,description,price,old_price,quantity,visibility,image_url)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
    `,
		[name, description, price, old_price, quantity, visibility, image_url],
	);

	res.json(result.rows[0]);
});

// Update product, admin only
router.put("/:id", auth, adminOnly, async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

	const allowedFields = [
		"name",
		"description",
		"price",
		"old_price",
		"quantity",
		"visibility",
		"image_url",
	] as const;

	const updates: string[] = [];
	const values: unknown[] = [];

	for (const field of allowedFields) {
		if (req.body?.[field] !== undefined) {
			values.push(req.body[field]);
			updates.push(`${field} = $${values.length}`);
		}
	}

	if (updates.length === 0) {
		return res.status(400).json({ message: "No fields to update" });
	}

	values.push(id);

	const result = await pool.query(
		`
    UPDATE products
    SET ${updates.join(", ")}
    WHERE id = $${values.length}
    RETURNING *
    `,
		values,
	);

	res.json(result.rows[0]);
});

// Delete product, admin only
router.delete("/:id", auth, adminOnly, async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

	await pool.query("DELETE FROM products WHERE id=$1", [id]);

	res.json({ message: "Product deleted" });
});

export default router;
