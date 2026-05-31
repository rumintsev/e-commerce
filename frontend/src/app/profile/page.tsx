'use client';

import { useState, useEffect } from 'react';
import { loginAction, registerAction, getOrdersAction, Order } from '../api/profile';
import { type OrderStatus } from '@/app/api/orders';
import { STATUS_LABELS } from '@/app/admin/page';
import './page.css'
import Link from 'next/link';

export type UserInfo = {
	token: string;
	userId: number;
	email: string;
	name: string;
	role: 'user' | 'admin';
}

const dateFormat = (iso: string) =>
	new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

const totalOfOrder = (order: Order) =>
	order.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2);

export const isTokenExpired = (token: string) => {
	try {
		const payload = JSON.parse(atob(token.split('.')[1]));
		return payload.exp * 1000 < Date.now();
	} catch {
		return true;
	}
};

export const getUserInfo = (): UserInfo | null => {
	const userInfo = localStorage.getItem('UserInfo');
	if (!userInfo) return null;
	try {
		const data = JSON.parse(userInfo) as UserInfo;
		if (isTokenExpired(data.token)) {
			localStorage.removeItem('UserInfo');
		} else {
			return data;
		}
	} catch { }
	return null;
}

export default function ProfilePage() {
	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(false);
	const [ordersLoading, setOrdersLoading] = useState(false);
	const [error, setError] = useState('');
	const [mode, setMode] = useState<'login' | 'register'>('login');
	const [form, setForm] = useState({ name: '', email: '', password: '' });

	// auth
	useEffect(() => {
		const userInfo = getUserInfo();
		setUserInfo(userInfo);
	}, []);

	useEffect(() => {
		if (userInfo) loadOrders(userInfo.token);
	}, [userInfo]);

	const loadOrders = async (token: string) => {
		setOrdersLoading(true);
		try {
			setOrders(await getOrdersAction(token));
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error');
		} finally {
			setOrdersLoading(false);
		}
	};

	const logout = () => {
		localStorage.removeItem('UserInfo');
		setUserInfo(null);
		setOrders([]);
		window.dispatchEvent(new CustomEvent('auth:changed', { detail: null }));
	};

	const submit = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const data =
				mode === 'login'
					? await loginAction(form.email, form.password)
					: await registerAction(form.name, form.email, form.password);
			localStorage.setItem('UserInfo', JSON.stringify(data));
			setUserInfo(data);
			window.dispatchEvent(new CustomEvent('auth:changed', { detail: data }));
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="profilePage">
			{!userInfo ? (
				<section className="auth">
					<div className="authContent">
						<form className="form" onSubmit={submit}>
							{mode === 'register' && (
								<label className="field">
									<span>Name</span>
									<input
										required
										placeholder="John Doe"
										value={form.name}
										onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
									/>
								</label>
							)}
							<label className="field">
								<span>Email</span>
								<input
									type="email"
									required
									placeholder="you@example.com"
									value={form.email}
									onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
								/>
							</label>
							<label className="field">
								<span>Password</span>
								<input
									type="password"
									required
									placeholder="••••••••"
									value={form.password}
									onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
								/>
							</label>

							{error && <p className="err">{error}</p>}

							<button className="submit" type="submit" disabled={loading}>
								{loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Register'}
							</button>
							<p className="divider">
								{mode === 'login' ? "Don't have an account? " : "Already have an account? "}
								<span onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Register' : 'Login'}
								</span>
							</p>
						</form>
					</div>
				</section>
			) : (
				<div className="dashboard">
					<section className="userCard">
						<div className="userInfo">
							<h2>
								{userInfo.name}
								{userInfo.role === 'admin' && (
									<>
										<Link href="/admin" className="adminLink">Admin panel</Link>
									</>)}
							</h2>
							<p>{userInfo.email}</p>
							<button className="btnSignOut" onClick={logout}>
								Sign out
							</button>
						</div>
					</section>

					<section className="ordersSection">
						<h3 className="sectionTitle">My orders</h3>

						{ordersLoading ? (
							<div className="ordersLoading">
								{[1, 2, 3].map(i => <div key={i} className="skeleton" />)}
							</div>
						) : orders.length === 0 ? (
							<div className="empty">
								<p>No orders yet</p>
							</div>
						) : (
							<div className="ordersList">
								{orders.slice().reverse().map(order => {
									return (
										<details key={order.order_id} className="orderCard">
											<summary className="orderSummary">
												<div className="orderMeta">
													<span className="orderId">{dateFormat(order.created_at)}</span>
													{order.updated_at !== order.created_at && order.updated_at && (
														<span className="orderDate">Updated: {dateFormat(order.updated_at)}</span>
													)}
												</div>
												<div className="orderRight">
													<span
														className={`statusBadge status-${order.status}`}
													>
														{STATUS_LABELS[order.status as OrderStatus] || order.status}
													</span>
													<span className="orderTotalOfOrder">${totalOfOrder(order)}</span>
													<span className="chevron">›</span>
												</div>
											</summary>

											<ul className="itemsList">
												{order.items.map((item, idx) => (
													<li key={idx} className="itemRow">
														{item.image_url ? (
															<img
																src={`${process.env.NEXT_PUBLIC_API_URL}/images/${item.image_url}`}
																alt={item.name}
																className="itemImg"
																onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
															/>
														) : (
															<div className="itemImg itemImgPlaceholder"></div>
														)}
														<div className="itemInfo">
															<span className="itemName">{item.name}</span>
															<span className="itemQty">{item.quantity} pcs.</span>
														</div>
														<span className="itemPrice">${(item.price * item.quantity).toFixed(2)}</span>
													</li>
												))}
											</ul>
										</details>
									);
								})}
							</div>
						)}
					</section>
				</div>
			)}
		</div>
	);
}