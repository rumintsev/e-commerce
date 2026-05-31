"use client";

import { useState, useEffect } from "react";
import { Product, fetchProducts } from "@/app/api/product";
import ProductGrid from "@/components/ProductGrid";
import "./ProductCatalog.css";

const LIMIT = 6;

interface ProductCatalogProps {
	query?: string;
}

export default function ProductCatalog({ query }: ProductCatalogProps) {
	const [products, setProducts] = useState<Product[]>([]);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		setPage(1);
	}, [query]);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError("");

		fetchProducts({ q: query, page, limit: LIMIT })
			.then(({ items, hasNextPage }) => {
				if (cancelled) return;
				setProducts(items);
				setHasMore(hasNextPage);
			})
			.catch(() => {
				if (!cancelled) setError("Can't load products. Please try again later.");
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => { cancelled = true; };
	}, [query, page]);

	return (
		<>
			{error ? (
				<p className="message">{error}</p>
			) : loading ? (
				<p className="message">Loading...</p>
			) : products.length === 0 ? (
				<p className="message">
					{query ? `No results for «${query}».` : "No products available."}
				</p>
			) : (
				<ProductGrid products={products} />
			)}

			{!loading && !error && products.length > 0 && (
				<div className="pagination">
					<button
						className="paginationBtn"
						onClick={() => setPage((p) => p - 1)}
						disabled={page === 1}
					>
						←
					</button>
					<span className="paginationPage">Page {page}</span>
					<button
						className="paginationBtn"
						onClick={() => setPage((p) => p + 1)}
						disabled={!hasMore}
					>
						 →
					</button>
				</div>
			)}
		</>
	);
}