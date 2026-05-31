'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import './page.css';

import { type UserInfo, getUserInfo } from '@/app/profile/page';
import { getProduct, updateProduct, deleteProduct, type Product } from '@/app/api/product';
import { addToCart, getCart, type CartItem } from '@/app/api/cart';
import { getProductPricing } from "@/lib/pricing";

export default function ProductPage() {
	const params = useParams();
	const router = useRouter();
	const productId = Number(params.productId);

	const [product, setProduct] = useState<Product | null>(null);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);

	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

	// cart
	const [quantity, setQuantity] = useState(1);
	const [cartQuantity, setCartQuantity] = useState(0);
	const [cartLoading, setCartLoading] = useState(false);
	const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

	// admin
	const [editName, setEditName] = useState('');
	const [editPrice, setEditPrice] = useState('');
	const [editOldPrice, setEditOldPrice] = useState('');
	const [editQuantity, setEditQuantity] = useState('');
	const [editDescription, setEditDescription] = useState('');
	const [editImageUrl, setEditImageUrl] = useState('');
	const [adminFeedback, setAdminFeedback] = useState<{ text: string; error?: boolean } | null>(null);
	const [adminLoading, setAdminLoading] = useState(false);

	// auth
	useEffect(() => {
		const userInfo = getUserInfo();
		setUserInfo(userInfo);
	}, []);

	// fetch product
	useEffect(() => {
		if (isNaN(productId)) {
			setNotFound(true);
			setLoading(false);
			return;
		}
		(async () => {
			const token = getUserInfo()?.token;
			const data = await getProduct(productId, token ?? undefined);
			if (!data || data === null) {
				setNotFound(true);
			} else {
				setProduct(data);
				setEditName(data.name);
				setEditPrice(String(data.price));
				setEditOldPrice(data.old_price ? String(data.old_price) : '');
				setEditQuantity(String(data.quantity));
				setEditDescription(String(data.description ?? ''));
				setEditImageUrl(String(data.image_url ?? ''));
			}
			setLoading(false);
		})();
	}, [productId]);

	// fetch cart
	useEffect(() => {
		if (!userInfo) return;
		(async () => {
			const cart = await getCart(userInfo.token);
			const item: CartItem | undefined = cart.find((i) => i.product_id === productId);
			if (item) {
				setCartQuantity(item.cart_quantity);
			}
		})();
	}, [userInfo, productId]);

	function showFeedback(text: string, error = false) {
		setFeedback({ text, error });
		setTimeout(() => setFeedback(null), 2500);
	}

	function showAdminFeedback(text: string, error = false) {
		setAdminFeedback({ text, error });
		setTimeout(() => setAdminFeedback(null), 2500);
	}

	// cart

	async function handleAddToCart() {
		if (!userInfo?.token) {
			router.push('/profile');
			return;
		}
		setCartLoading(true);
		const ok = await addToCart(productId, quantity, userInfo.token);
		if (ok) {
			setQuantity(1);
			setCartQuantity((q) => q + quantity);
			showFeedback('Added to cart');
			window.dispatchEvent(new CustomEvent('cart:updated'));
		} else {
			showFeedback('Error adding to cart', true);
		}
		setCartLoading(false);
	}

	// admin

	async function handleSave() {
		if (!userInfo?.token) return;
		setAdminLoading(true);
		const updated = await updateProduct(
			productId,
			{
				name: editName,
				price: Number(editPrice),
				old_price: editOldPrice ? Number(editOldPrice) : undefined,
				quantity: Number(editQuantity),
				description: editDescription || undefined,
				image_url: editImageUrl || undefined,
			},
			userInfo.token,
		);
		if (updated) {
			setProduct(updated);
			showAdminFeedback('Saved successfully');
		} else {
			showAdminFeedback('Error saving', true);
		}
		setAdminLoading(false);
	}

	async function handleDelete() {
		if (!userInfo?.token) return;
		if (!confirm('Delete product?')) return;
		setAdminLoading(true);
		const ok = await deleteProduct(productId, userInfo.token);
		if (ok) {
			router.push('/');
		} else {
			showAdminFeedback('Error deleting', true);
			setAdminLoading(false);
		}
	}

	if (loading) {
		return (
			<div className="productPage">
				<div className="notFound">
					<div className="notFoundContent">
						<p>Loading...</p>
					</div>
				</div>
			</div>
		);
	}

	if (notFound || !product) {
		return (
			<div className="productPage">
				<div className="notFound">
					<div className="notFoundContent">
						<h1>Product not found</h1>
						<p>Perhaps it was deleted or the link is outdated.</p>
						<Link href="/" className="backLink">
							← To products
						</Link>
					</div>
				</div>
			</div>
		);
	}

	const isAdmin = userInfo?.role === 'admin';
	const maxQuantity = product.quantity;
	const pricing = getProductPricing(product);

	return (
		<div className="productPage">
			<div className="content">
				<div className="card">
					<div className="imageWrap">
						{product.image_url ? (
							<img
								src={`${process.env.NEXT_PUBLIC_API_URL}/images/${product.image_url}`}
								alt={product.name}
								className="image"
							/>
						) : (
							<span className="imagePlaceholder"></span>
						)}
					</div>

					<div className="info">
						<h1 className="name">{product.name}</h1>

						<div className="priceRow">
							<span className="price">${pricing.currentPrice.toFixed(2)}</span>
							{pricing.hasDiscount && (
								<>
									<span className="oldPrice">${String(pricing.oldPrice?.toFixed(2))}</span>
									<span className="productDiscount">−{pricing.discountPercent}%</span>
								</>
							)}
						</div>

						{product.description && (
							<p className="description">{product.description}</p>
						)}
						<div>
							<p className="stockLabel">
								In stock: <span>{product.quantity} pcs.</span>
							</p>

							{cartQuantity > 0 && (
								<p className="stockLabel">
									Already in cart: <span>{cartQuantity} pcs.</span>
								</p>
							)}
						</div>
						{maxQuantity > 0 ? (
							<>
								{feedback && (
									<p className={`feedback${feedback.error ? ' feedbackError' : ''}`}>
										{feedback.text}
									</p>
								)}
								<div className="cartRow">
									<>
										<div className="quantityControl">
											<button
												className="qBtn"
												onClick={() => setQuantity((q) => Math.max(1, q - 1))}
												disabled={quantity <= 1}
											>
												−
											</button>
											<span className="qCount">{quantity}</span>
											<button
												className="qBtn"
												onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
												disabled={quantity >= maxQuantity || cartQuantity + quantity >= maxQuantity}
											>
												+
											</button>
										</div>
										<button
											className="addToCart"
											onClick={handleAddToCart}
											disabled={cartLoading || cartQuantity >= maxQuantity}
										>
											{cartLoading ? 'Adding…' : 'Add to cart'}
										</button>
									</>
								</div>
							</>
						) : (
							<p className="stockLabel" style={{ marginTop: 'auto' }}>
								<span style={{ color: '#e05252' }}>Out of stock</span>
							</p>
						)}
					</div>
				</div>

				{isAdmin && (
					<div className="adminSection">
						<h2>Edit Product</h2>
						<div className="adminForm">
							<div className="field">
								<span>Name</span>
								<input
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									placeholder="Product name"
								/>
							</div>
							<div className="field">
								<span>Price</span>
								<input
									type="number"
									value={editPrice}
									onChange={(e) => setEditPrice(e.target.value)}
									placeholder="0"
								/>
							</div>
							<div className="field">
								<span>Old Price</span>
								<input
									type="number"
									value={editOldPrice}
									onChange={(e) => setEditOldPrice(e.target.value)}
									placeholder="Optional"
								/>
							</div>
							<div className="field">
								<span>Quantity</span>
								<input
									type="number"
									value={editQuantity}
									onChange={(e) => setEditQuantity(e.target.value)}
									placeholder="0"
								/>
							</div>
							<div className="field">
								<span>Image URL</span>
								<input
									value={editImageUrl}
									onChange={(e) => setEditImageUrl(e.target.value)}
									placeholder="product.jpg"
								/>
							</div>
							<div className="field">
								<span>Description</span>
								<textarea
									rows={4}
									value={editDescription}
									onChange={(e) => setEditDescription(e.target.value)}
									placeholder="Product description…"
								/>
							</div>
							{adminFeedback && (
								<p className={`feedback${adminFeedback.error ? ' feedbackError' : ''}`}>
									{adminFeedback.text}
								</p>
							)}
							<div className="adminButtons">
								<button
									className="saveBtn"
									onClick={handleSave}
									disabled={adminLoading}
								>
									{adminLoading ? 'Saving…' : 'Save'}
								</button>
								<button
									className="deleteBtn"
									onClick={handleDelete}
									disabled={adminLoading}
								>
									Delete
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}