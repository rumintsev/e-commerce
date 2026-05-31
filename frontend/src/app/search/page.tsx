import ProductCatalog from "@/components/ProductCatalog";
import "../page.css";

interface SearchPageProps {
	searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
	const { q = "" } = await searchParams;

	return (
		<div className="page">
			<main className="main">
				<section className="section">
					<h2 className="title">
						{q ? `Results for «${q}»` : "Search"}
					</h2>
					<ProductCatalog query={q} />
				</section>
			</main>
		</div>
	);
}