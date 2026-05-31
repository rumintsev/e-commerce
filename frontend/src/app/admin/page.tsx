'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './page.css';

import { getUserInfo } from '@/app/profile/page';
import { getAllOrders, updateOrderStatus, type Order, type OrderStatus } from '@/app/api/orders';

export const STATUS_LABELS: Record<OrderStatus, string> = {
	created: 'Created',
	confirmed: 'Confirmed',
	shipped: 'Shipped',
	delivered: 'Delivered',
	cancelled: 'Cancelled',
};

function dateFormat(iso: string) {
	const d = new Date(iso);
	return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) +
		' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function orderTotal(order: Order) {
	return (order.items ?? []).reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export default function AdminadminPage() {
	const router = useRouter();

	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [updatingId, setUpdatingId] = useState<number | null>(null);
	const [expandedId, setExpandedId] = useState<number | null>(null);
	const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');

	useEffect(() => {
		const info = getUserInfo();
		if (!info || info.role !== 'admin') {
			router.push('/');
			return;
		}
		(async () => {
			const data = await getAllOrders(info.token);
			setOrders(data);
			setLoading(false);
		})();
	}, []);

	async function handleStatusChange(order: Order, status: OrderStatus) {
		const info = getUserInfo();
		if (!info) return;
		setUpdatingId(order.id);
		const ok = await updateOrderStatus(order.id, status, info.token);
		if (ok) {
			setOrders((prev) =>
				prev.map((o) => (o.id === order.id ? { ...o, status } : o))
			);
		}
		setUpdatingId(null);
	}

	const filtered = filterStatus === 'all'
		? orders
		: orders.filter((o) => o.status === filterStatus);

	const counts = orders.reduce((acc, o) => {
		acc[o.status] = (acc[o.status] ?? 0) + 1;
		return acc;
	}, {} as Record<OrderStatus, number>);

	if (loading) {
		return (
			<div className="adminPage">
				<div className="centered">
					<p className="muted">Loading…</p>
				</div>
			</div>
		);
	}

	return (
		<div className="adminPage">
			<div className="content">
				<div className="pageHeader">
					<h1 className="title">Orders</h1>
					<span className="totalCount">{orders.length} total</span>
				</div>

				<div className="filterTabs">
					{(['all', 'created', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const).map((s) => (
						<button
							key={s}
							className={`filterTab${filterStatus === s ? ' filterTabActive' : ''}`}
							onClick={() => setFilterStatus(s)}
						>
							{s === 'all' ? 'All' : STATUS_LABELS[s]}
							{s !== 'all' && counts[s] ? (
								<span className="filterBadge">{counts[s]}</span>
							) : null}
							{s === 'all' && (
								<span className="filterBadge">{orders.length}</span>
							)}
						</button>
					))}
				</div>

				{filtered.length === 0 ? (
					<div className="emptyState">
						<p className="muted">No orders here.</p>
					</div>
				) : (
					<div className="ordersList">
						{filtered.slice().reverse().map((order) => {
							const isExpanded = expandedId === order.id;
							const isUpdating = updatingId === order.id;
							const nextStatuses = (Object.keys(STATUS_LABELS) as OrderStatus[]).filter(s => s !== order.status); return (
								<div key={order.id} className={`orderCard${isUpdating ? ' dimmed' : ''}`}>
									<div
										className="orderHeader"
										onClick={() => setExpandedId(isExpanded ? null : order.id)}
									>
										<div className="orderMeta">
											<span className="orderId">ID: {order.id}</span>
											<div className="orderDates">
												<span className="orderDate">Created: {dateFormat(order.created_at)}</span>
												{order.updated_at && (
													<span className="orderDate">Updated: {dateFormat(order.updated_at)}</span>
												)}
											</div>
										</div>

										<div className="orderRight">
											<span className={`statusBadge status-${order.status}`}>
												{STATUS_LABELS[order.status]}
											</span>
											<span className="orderTotal">${orderTotal(order).toFixed(2)}</span>
											<span className={`chevron${isExpanded ? ' chevronOpen' : ''}`}>›</span>
										</div>
									</div>

									{isExpanded && (
										<div className="orderBody">
											<div className="itemsTable">
												{(order.items ?? []).map((item) => (
													<div key={item.id} className="itemRow">
														<div className="itemImageWrap">
															{item.image_url ? (
																<img
																	src={`${process.env.NEXT_PUBLIC_API_URL}/images/${item.image_url}`}
																	alt={item.name}
																	className="itemImage"
																/>
															) : (
																<span className="itemImagePlaceholder" />
															)}
														</div>
														<div className="itemInfo">
															<span className="itemName">{item.name}</span>
															<span className="itemQty">{item.quantity} pcs.</span>
														</div>
														<span className="itemPrice">${(item.price * item.quantity).toFixed(2)}</span>
													</div>
												))}
											</div>

											{nextStatuses.length > 0 && (
												<div className="statusActions">
													<span className="statusActionsLabel">Change to:</span>
													{nextStatuses.map((s) => (
														<button
															key={s}
															className={`statusBtn status-${s}`}
															onClick={() => handleStatusChange(order, s)}
															disabled={isUpdating}
														>
															{STATUS_LABELS[s]}
														</button>
													))}
												</div>
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}