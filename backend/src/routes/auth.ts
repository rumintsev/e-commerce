import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Router } from "express";
import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { pool } from "../db/testDbConnection.js";

const router = Router();

function isLoginValid(email: unknown, password: unknown): boolean {
	return (
		typeof email === "string" &&
		email.includes("@") &&
		typeof password === "string" &&
		password.length >= 8
	);
}

// register route
router.post("/register", async (req: Request, res: Response) => {
	const { name, email, password } = req.body || {};
	if (!name || !isLoginValid(email, password)) {
		return res.status(400).json({ message: "Name, password or email is incorrect" });
	}

	try {
		const hashedPassword = await bcrypt.hash(password, 10);
		const result = await pool.query(
			"INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email",
			[name, email, hashedPassword, "user"],
		);

		const user = result.rows[0];

		const token = jwt.sign(
			{ userId: user.id, role: 'user' },
			env.jwtSecret,
			{ expiresIn: "8h" },
		);

		res.json({ token, userId: user.id, email: user.email, name, role: "user" });
	} catch {
		res.status(400).json({ message: "User already exists" });
	}
});

// login route
router.post("/login", async (req: Request, res: Response) => {
	const { email, password } = req.body || {};
	if (!isLoginValid(email, password)) {
		return res.status(400).json({ message: "Password or email is incorrect" });
	}

	const result = await pool.query("SELECT * FROM users WHERE email = $1", [
		email,
	]);

	const user = result.rows[0];
	if (!user) {
		return res.status(401).json({ message: "No user with this email found" });
	}

	const isValid = await bcrypt.compare(password, user.password);
	if (!isValid) {
		return res.status(401).json({ message: "Wrong password" });
	}

	const token = jwt.sign(
		{ userId: user.id, role: user.role },
		env.jwtSecret,
		{ expiresIn: "8h" },
	);

	res.json({ token, userId: user.id, email: user.email, name: user.name, role: user.role });
});

export default router;