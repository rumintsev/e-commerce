import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { testDbConnection } from "./db/testDbConnection.js";
import routes from "./routes/index.js";
import path from "path";

async function main() {
	//  Test DB connection
	await testDbConnection();

	const app = express();

	app.use(cors());
	app.use(express.json());
	// For x-www-form-urlencoded
	app.use(express.urlencoded({ extended: true }));

	// For serving uploaded images
	app.use("/images", express.static(path.join(process.cwd(), "src", "images")));

	app.use(routes);

	app.listen(env.port, () => {
		console.log(`server running at http://localhost:${env.port}`);
	});
}

main();
