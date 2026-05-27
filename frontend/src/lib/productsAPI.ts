'use server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  old_price: number | null;
  quantity: number;
  visibility: boolean;
  image_url: string;
};

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products`, {
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error("Failed to load products");
  }

  return res.json();
}
