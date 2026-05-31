'use server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type OrderStatus = "created" | "confirmed" | "shipped" | "delivered" | "cancelled";

export type OrderItem = {
	id: number;
	product_id: number;
	name: string;
	price: number;
	quantity: number;
	image_url?: string;
};

export type Order = {
	id: number;
	status: OrderStatus;
	created_at: string;
	items: OrderItem[];
	updated_at?: string;
};

type OrderRow = {
	order_id: number;
	status: OrderStatus;
	created_at: string;
	updated_at: string;
	quantity: number;
	price: number;
	product_id: number;
	name: string;
	image_url?: string;
};

export async function createOrder(token: string): Promise<boolean> {
	const res = await fetch(`${API_URL}/orders`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}` },
	});

	return res.ok;
}

export async function getAllOrders(token: string): Promise<Order[]> {
	const res = await fetch(`${API_URL}/orders/all`, {
		headers: { Authorization: `Bearer ${token}` },
		cache: 'no-store',
	});

	if (!res.ok) return [];

	const rows: OrderRow[] = await res.json();

	const map = new Map<number, Order>();
	for (const row of rows) {
		if (!map.has(row.order_id)) {
			map.set(row.order_id, {
				id: row.order_id,
				status: row.status,
				created_at: row.created_at,
				updated_at: row.updated_at,
				items: [],
			});
		}
		map.get(row.order_id)!.items.push({
			id: row.product_id,
			product_id: row.product_id,
			name: row.name,
			price: row.price,
			quantity: row.quantity,
			image_url: row.image_url,
		});
	}

	return Array.from(map.values());
}

export async function updateOrderStatus(
	orderId: number,
	status: OrderStatus,
	token: string,
): Promise<boolean> {
	const res = await fetch(`${API_URL}/orders/${orderId}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ status }),
	});

	return res.ok;
}