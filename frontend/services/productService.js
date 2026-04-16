function normalizeProducts(raw) {
  const items = Array.isArray(raw) ? raw : [];
  return items
    .map((p) => ({
      id: String(p?.id ?? ""),
      name: String(p?.name ?? "Product"),
      category: String(p?.category ?? "Essentials"),
      price: Number(p?.price ?? 0),
      image: String(p?.image ?? ""),
      secondaryImage: String(p?.secondaryImage ?? p?.hoverImage ?? p?.image ?? ""),
      thirdImage: String(p?.thirdImage ?? ""),
      description: String(p?.description ?? ""),
      rating: Number(p?.rating ?? 0),
      stock: Number(p?.stock ?? 0),
      badge: String(p?.badge ?? ""),
      badgeType: String(p?.badgeType ?? ""),
      sizes: Array.isArray(p?.sizes) ? p.sizes : undefined
    }))
    .filter((p) => p.id);
}

function filterProducts(products, params = {}) {
  const search = String(params?.search ?? "").trim().toLowerCase();
  const category = String(params?.category ?? "").trim().toLowerCase();
  return products.filter((p) => {
    const okSearch = !search || p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search);
    const okCategory = !category || p.category.toLowerCase() === category;
    return okSearch && okCategory;
  });
}

async function fetchProductsFromFirebase(params = {}) {
  if (!window.firebaseApi?.getProducts) {
    throw new Error("Products unavailable");
  }
  if (window.firebaseReady) {
    await window.firebaseReady;
  }
  const remote = await window.firebaseApi.getProducts();
  const normalized = normalizeProducts(remote);
  const filtered = filterProducts(normalized, params);
  return { products: filtered };
}

export async function fetchProducts(params = {}) {
  return fetchProductsFromFirebase(params);
}

export async function fetchProduct(id) {
  const { products } = await fetchProductsFromFirebase({});
  const product = products.find((p) => String(p.id) === String(id)) || null;
  if (!product) throw new Error("Product not found.");
  return { product };
}

export function createProduct(payload) {
  throw new Error("Product write is disabled in Firebase-only mode.");
}

export function updateProduct(id, payload) {
  throw new Error("Product write is disabled in Firebase-only mode.");
}

export function deleteProduct(id) {
  throw new Error("Product write is disabled in Firebase-only mode.");
}
