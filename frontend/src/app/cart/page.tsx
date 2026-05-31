'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './page.css';

import { getUserInfo, type UserInfo } from '@/app/profile/page';
import { getCart, updateCartItem, removeFromCart, type CartItem } from '@/app/api/cart';
import { createOrder } from '@/app/api/orders';

export default function CartPage() {
	const router = useRouter();

	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
	const [items, setItems] = useState<CartItem[]>([]);
	const [loading, setLoading] = useState(true);

	const [updatingId, setUpdatingId] = useState<number | null>(null);
	const [orderLoading, setOrderLoading] = useState(false);
	const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

	useEffect(() => {
		const info = getUserInfo();
		if (!info) {
			router.push('/profile');
			return;
		}
		setUserInfo(info);
	}, []);

	useEffect(() => {
		if (!userInfo) return;
		(async () => {
			const data = await getCart(userInfo.token);
			setItems(data);
			setLoading(false);
		})();
	}, [userInfo]);

	function showFeedback(text: string, error = false) {
		setFeedback({ text, error });
		setTimeout(() => setFeedback(null), 2500);
	}

	async function handleQuantityChange(item: CartItem, delta: number) {
		if (!userInfo) return;
		const newQty = item.cart_quantity + delta;
		if (newQty < 1 || newQty > item.product_quantity) return;

		setUpdatingId(item.product_id);
		const ok = await updateCartItem(item.product_id, newQty, userInfo.token);
		if (ok) {
			setItems((prev) =>
				prev.map((i) => (i.product_id === item.product_id ? { ...i, cart_quantity: newQty } : i))
			);
			window.dispatchEvent(new CustomEvent('cart:updated'));
		} else {
			showFeedback('Failed to update quantity', true);
		}
		setUpdatingId(null);
	}

	async function handleRemove(productId: number) {
		if (!userInfo) return;
		setUpdatingId(productId);
		const ok = await removeFromCart(productId, userInfo.token);
		if (ok) {
			setItems((prev) => prev.filter((i) => i.product_id !== productId));
			window.dispatchEvent(new CustomEvent('cart:updated'));
		} else {
			showFeedback('Failed to remove item', true);
		}
		setUpdatingId(null);
	}

	async function handleOrder() {
		if (!userInfo) return;
		setOrderLoading(true);
		const ok = await createOrder(userInfo.token);
		if (ok) {
			setItems([]);
			window.dispatchEvent(new CustomEvent('cart:updated'));
			showFeedback('Order placed successfully!');
		} else {
			showFeedback('Failed to place order', true);
		}
		setOrderLoading(false);
	}

	const total = items.reduce((sum, item) => {
		return sum + item.price * item.cart_quantity;
	}, 0);

	const totalOld = items.reduce((sum, item) => {
		return sum + (item.old_price ?? item.price) * item.cart_quantity;
	}, 0);

	const hasSavings = totalOld > total;

	if (loading) {
		return (
			<div className="cartPage">
				<div className="centered">
					<p className="muted">Loading…</p>
				</div>
			</div>
		);
	}

	if (!userInfo) return null;

	return (
		<div className="cartPage">
			<div className="content">
				{items.length === 0 ? (
					<div className="emptyState">
						<p className="emptyText">Your cart is empty.</p>
						<Link href="/" className="backLink">
							← Browse products
						</Link>
					</div>
				) : (
					<div className="layout">
						<div className="itemsList">
							<h1 className="title">Cart</h1>
							{items.map((item) => {
								const isUpdating = updatingId === item.product_id;

								return (
									<div key={item.product_id} className={`itemCard ${isUpdating ? "dimmed" : ""}`}>
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
											<Link href={`/products/${item.product_id}`} className="itemName">
												{item.name}
											</Link>

											<div className="itemPriceRow">
												<span className="itemPrice">${item.price}</span>
												{item.old_price && (
													<>
														<span className="itemOldPrice">${item.old_price}</span>
														{/* <span className="itemDiscount">−{pricing.discountPercent}%</span> */}
													</>
												)}
											</div>
										</div>

										<div className="itemActions">
											<div className="quantityControl">
												<button
													className="qBtn"
													onClick={() => handleQuantityChange(item, -1)}
													disabled={isUpdating || item.cart_quantity <= 1}
												>
													−
												</button>
												<span className="qCount">{item.cart_quantity}</span>
												<button
													className="qBtn"
													onClick={() => handleQuantityChange(item, 1)}
													disabled={isUpdating || item.cart_quantity >= item.product_quantity}
												>
													+
												</button>
											</div>

											<span className="itemSubtotal">
												${(item.price * item.cart_quantity).toFixed(2)}
											</span>

											<button
												className="removeBtn"
												onClick={() => handleRemove(item.product_id)}
												disabled={isUpdating}
												title="Remove"
											>
												✕
											</button>
										</div>
									</div>
								);
							})}
						</div>

						<div className="summary">
							<h2 className="summaryTitle">Summary</h2>

							<div className="summaryRows">
								<div className="summaryRow">
									<span>Items</span>
									<span>{items.reduce((s, i) => s + i.cart_quantity, 0)}</span>
								</div>
								{hasSavings && (
									<div className="summaryRow">
										<span>Original price</span>
										<span className="muted">${totalOld.toFixed(2)}</span>
									</div>
								)}
								{hasSavings && (
									<div className="summaryRow">
										<span className="savingsLabel">Savings</span>
										<span className="savingsLabel">−${(totalOld - total).toFixed(2)}</span>
									</div>
								)}
								<div className="summaryRow totalRow">
									<span>Total</span>
									<span>${total.toFixed(2)}</span>
								</div>
							</div>

							{feedback && (
								<p className={`feedback ${feedback.error ? "feedbackError" : ""}`}>
									{feedback.text}
								</p>
							)}

							<button
								className="orderBtn"
								onClick={handleOrder}
								disabled={orderLoading || items.length === 0}
							>
								{orderLoading ? 'Placing order…' : 'Place order'}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}