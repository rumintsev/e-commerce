import { Header } from "@/components/Header";
import { fetchProducts } from "@/lib/productsAPI";
import { getProductPricing } from "@/lib/pricing";
import "./home.css";

export default async function Home() {
  let products: Awaited<ReturnType<typeof fetchProducts>> = [];
  let error: string | null = null;

  try {
    products = await fetchProducts();
  } catch {
    error = "Не удалось загрузить товары.";
  }

  return (
    <div className="page">
      <Header />

      <main className="main">
        <section className="section">
          <h2 className="catalogTitle">Каталог</h2>
        </section>

        {error ? (
          <p className="message">{error}</p>
        ) : products.length === 0 ? (
          <p className="message">Товаров пока нет.</p>
        ) : (
          <ul className="productGrid">
            {products.map((product) => {
              const pricing = getProductPricing(product);

              return (
                <li key={product.id} className="productCard">
                  <h3 className="productName">{product.name}</h3>
                  <p className="productDesc">{product.description}</p>
                  <div className="productPriceRow">
                    <span className="currentPrice">
                      {pricing.currentPrice} ₽
                    </span>
                    {pricing.hasDiscount && (
                      <>
                        <span className="oldPrice">
                          {pricing.oldPrice} ₽
                        </span>
                        <span className="productDiscount">
                          −{pricing.discountPercent}%
                        </span>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
