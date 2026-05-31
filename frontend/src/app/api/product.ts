'use server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type Product = {
	id: number;
	name: string;
	description: string;
	price: number;
	old_price: number | null;
	quantity: number;
	visibility: boolean;
	image_url: string;
};

export type FetchProductsParams = {
	page?: number;
	limit?: number;
	q?: string;
	discount?: number;
};

export type FetchProductsResult = {
	items: Product[];
	hasNextPage: boolean;
};

export async function fetchProducts(params: FetchProductsParams = {}): Promise<FetchProductsResult> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.q) searchParams.set("q", params.q);
	if (params.discount) searchParams.set("discount", String(params.discount));

	const query = searchParams.toString();
	const url = `${API_URL}/products${query ? `?${query}` : ""}`;

	const res = await fetch(url, {
		next: { revalidate: 1 },
	});

	if (!res.ok) {
		throw new Error("Failed to load products");
	}

	return res.json();
}

export async function getProduct(productId: number, token?: string): Promise<Product | null> {
	const res = await fetch(`${API_URL}/products/${productId}`, {
		headers: token ? { Authorization: `Bearer ${token}` } : {},
		cache: 'no-store',
	});
	if (!res.ok) return null;
	const raw = await res.json();
	if (
		raw &&
		typeof raw === 'object' &&
		!Array.isArray(raw) &&
		Object.keys(raw).length === 0
	) {
		return null;
	}
	return raw;
}

export async function updateProduct(
	productId: number,
	data: Partial<Product>,
	token: string,
): Promise<Product | null> {
	const res = await fetch(`${API_URL}/products/${productId}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(data),
	});

	if (!res.ok) return null;
	return res.json();
}

export async function deleteProduct(productId: number, token: string): Promise<boolean> {
	const res = await fetch(`${API_URL}/products/${productId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` },
	});

	return res.ok;
}