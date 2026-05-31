"use client";
import { useEffect, useState } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, KeyboardEvent } from "react";
import { type UserInfo, getUserInfo } from '@/app/profile/page';
import { getCartQuantity } from "@/app/api/cart";
import "./Header.css";


export default function Header() {
	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
	const [cartCount, setCartCount] = useState<number>(0);

	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);

	// auth
	useEffect(() => {
		const data = getUserInfo();
		setUserInfo(data);
	}, []);

	useEffect(() => {
		const handleAuthChange = (e: CustomEvent) => {
			setUserInfo(e.detail);
		};

		window.addEventListener('auth:changed', handleAuthChange as EventListener);
		return () => window.removeEventListener('auth:changed', handleAuthChange as EventListener);
	}, []);

	// cart quantity
	useEffect(() => {
		if (!userInfo?.token) {
			setCartCount(0);
			return;
		}

		const token = userInfo.token;

		const refresh = async () => {
			const count = await getCartQuantity(token);
			setCartCount(count);
		};

		refresh();

		window.addEventListener('cart:updated', refresh);
		return () => window.removeEventListener('cart:updated', refresh);
	}, [userInfo]);

	function submitSearch() {
		const q = inputRef.current?.value.trim();
		if (q) {
			router.push(`/search?q=${encodeURIComponent(q)}`);
		}
	}

	function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter") submitSearch();
	}

	return (
		<header className="header">
			<div className="headerInner">
				<Link href="/" className="headerTitle">
					<h1 >E-Commerce</h1>
				</Link>

				<div className="headerSearch">
					<input
						ref={inputRef}
						type="text"
						className="headerSearchInput"
						placeholder="Search..."
						onKeyDown={handleKeyDown}
					/>
					<button className="headerSearchBtn" onClick={submitSearch} aria-label="Search">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
							<circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
						</svg>
					</button>
				</div>

				<div className="headerActions">
					<Link href="/profile" className="headerActionBtn" aria-label="Profile">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
							<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
						</svg>
					</Link>

					<Link href="/cart" className="headerActionBtn" aria-label="Cart" style={{ position: "relative" }}>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
							<circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
							<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
						</svg>
						{cartCount > 0 && (
							<span className="headerCartBadge" aria-label={`${cartCount} items in cart`}>
								{cartCount > 99 ? "99+" : cartCount}
							</span>
						)}
					</Link>
				</div>
			</div>
		</header>
	);
}