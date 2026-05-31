import Link from "next/link";
import "./Footer.css";

export default function Footer() {
	return (
		<footer className="footer">

			<div className="footerContent">
				<div className="footerBrand">
					<span className="footerLogo">E-commerce</span>
					<p className="footerLogoDesc">Fresh produce for every day.</p>
				</div>

				<nav className="footerNav">
					<div className="footerNavCol">
						<h4>Navigation</h4>
						<Link href="/">Catalog</Link>
						<Link href="/profile">Profile</Link>
						<Link href="/cart">Cart</Link>
					</div>
				</nav>
			</div>

			<div className="footerBottom">
				<span>{new Date().getFullYear()}. E-Commerce.</span>
			</div>

		</footer>
	);
};