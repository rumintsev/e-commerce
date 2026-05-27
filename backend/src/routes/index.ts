import { Router } from "express";
import authRoutes from "./auth.js";
import cartRoutes from "./cart.js";
import ordersRoutes from "./orders.js";
import productsRoutes from "./products.js";

const router = Router();

router.get("/", (_req, res) => {
  res.send("API works");
});

router.use("/auth", authRoutes);
router.use("/products", productsRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", ordersRoutes);

export default router;
