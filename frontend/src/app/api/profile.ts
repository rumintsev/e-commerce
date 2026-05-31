'use server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export async function loginAction(email: string, password: string) {
	const res = await fetch(`${API_URL}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password }),
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.message ?? 'Error logging in');
	}
	return res.json() as Promise<{ token: string; userId: number; email: string; name: string; role: 'user' | 'admin' }>;
}

export async function registerAction(name: string, email: string, password: string) {
	const res = await fetch(`${API_URL}/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, email, password }),
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.message ?? 'Error registering');
	}
	return res.json() as Promise<{ token: string; userId: number; email: string; name: string; role: 'user' | 'admin' }>;
}

export interface OrderItem {
	quantity: number;
	price: number;
	product_id: number;
	name: string;
	image_url: string;
}

export interface Order {
	order_id: number;
	status: string;
	created_at: string;
	updated_at: string;
	items: OrderItem[];
}

export async function getOrdersAction(token: string): Promise<Order[]> {
	const res = await fetch(`${API_URL}/orders`, {
		headers: { Authorization: `Bearer ${token}` },
		cache: 'no-store',
	});
	if (!res.ok) throw new Error('Error fetching orders');
	const rows: (OrderItem & { order_id: number; status: string; created_at: string; updated_at: string })[] = await res.json();

	const map = new Map<number, Order>();
	for (const row of rows) {
		if (!map.has(row.order_id)) {
			map.set(row.order_id, {
				order_id: row.order_id,
				status: row.status,
				created_at: row.created_at,
				updated_at: row.updated_at,
				items: [],
			});
		}
		map.get(row.order_id)!.items.push({
			quantity: row.quantity,
			price: row.price,
			product_id: row.product_id,
			name: row.name,
			image_url: row.image_url,
		});
	}
	return Array.from(map.values());
}