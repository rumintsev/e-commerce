import { Product, fetchProducts } from "@/app/api/product";
import "./page.css";
import ProductGrid from "@/components/ProductGrid";
import ProductCatalog from "@/components/ProductCatalog";

const DISCOUNT_PERCENT = 20;

export default async function Home() {
	let discountedProducts: Product[] = [];

	try {
		const { items } = await fetchProducts({ limit: 3, discount: DISCOUNT_PERCENT });
		discountedProducts = items;
	} catch { }

	return (
		<main className="main">
			{discountedProducts.length > 0 && (
				<section className="section">
					<h2 className="title">Sales from {DISCOUNT_PERCENT}%</h2>
					<ProductGrid products={discountedProducts} />
				</section>
			)}

			<section className="section">
				<h2 className="title">Catalog</h2>
				<ProductCatalog />
			</section>
		</main>
	);
}