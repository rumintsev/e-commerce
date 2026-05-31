'use server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type CartItem = {
	id: number;
	cart_quantity: number;
	product_quantity: number;
	product_id: number;
	name: string;
	price: number;
	old_price?: number;
	image_url?: string;
};

export async function getCartQuantity(token: string): Promise<number> {
	const res = await fetch(`${API_URL}/cart/count`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	console.log('Cart count response:', res.status);
	return res.ok ? (await res.json()).totalCount : 0;
}

export async function getCart(token: string): Promise<CartItem[]> {
	const res = await fetch(`${API_URL}/cart`, {
		headers: { Authorization: `Bearer ${token}` },
		cache: 'no-store',
	});

	if (!res.ok) return [];
	return res.json();
}

export async function addToCart(productId: number, quantity: number, token: string): Promise<boolean> {
	const res = await fetch(`${API_URL}/cart/${productId}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ quantity }),
	});

	return res.ok;
}

export async function updateCartItem(productId: number, quantity: number, token: string): Promise<boolean> {
	const res = await fetch(`${API_URL}/cart/${productId}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ quantity }),
	});

	return res.ok;
}

export async function removeFromCart(productId: number, token: string): Promise<boolean> {
	const res = await fetch(`${API_URL}/cart/${productId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` },
	});

	return res.ok;
}