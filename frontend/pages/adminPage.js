import { createProduct, deleteProduct, fetchProducts, updateProduct } from "../services/productService.js";
import { fetchAllOrders } from "../services/orderService.js";
import { showToast } from "../components/toast.js";

export async function adminPage(app) {
  app.innerHTML = `
    <h1 class="section-title">Admin Dashboard</h1>
    <section class="card stack fade-in" style="padding:16px; margin-bottom:14px;">
      <h3>Add / Edit Product</h3>
      <form id="productForm" class="form-grid">
        <input class="full" name="id" placeholder="Product ID for update (optional)">
        <input name="name" placeholder="Name" required>
        <input name="category" placeholder="Category" required>
        <input name="price" type="number" placeholder="Price" required>
        <input class="full" name="image" placeholder="Image URL">
        <textarea class="full" name="description" placeholder="Description"></textarea>
        <input name="stock" type="number" placeholder="Stock">
        <p id="adminFormError" class="inline-error full"></p>
        <button id="saveProductBtn" class="btn primary" type="submit">Save Product</button>
      </form>
    </section>
    <section class="card stack" style="padding:16px; margin-bottom:14px;">
      <h3>Products</h3>
      <div id="adminProducts"></div>
    </section>
    <section class="card stack" style="padding:16px;">
      <h3>Orders</h3>
      <div id="adminOrders"></div>
    </section>
  `;

  const productsEl = document.getElementById("adminProducts");
  const ordersEl = document.getElementById("adminOrders");

  async function load() {
    const { products } = await fetchProducts();
    productsEl.innerHTML = products
      .map(
        (p) => `
        <div class="row" style="padding:8px 0;border-bottom:1px solid var(--border);">
          <span>${p.name} - ₹${Number(p.price).toLocaleString("en-IN")}</span>
          <button class="btn" data-delete="${p.id}">Delete</button>
        </div>
      `
      )
      .join("");

    products.forEach((p) => {
      productsEl.querySelector(`[data-delete="${p.id}"]`)?.addEventListener("click", async () => {
        await deleteProduct(p.id);
        showToast("Product deleted");
        load();
      });
    });

    const { orders } = await fetchAllOrders();
    ordersEl.innerHTML = orders
      .map((o) => `<div class="row"><span>${o.userEmail}</span><span class="price">₹${Number(o.totalAmount).toLocaleString("en-IN")}</span></div>`)
      .join("") || '<p class="muted">No orders yet.</p>';
  }

  document.getElementById("productForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = Object.fromEntries(formData.entries());
    const errorEl = document.getElementById("adminFormError");
    const saveBtn = document.getElementById("saveProductBtn");
    errorEl.textContent = "";
    payload.price = Number(payload.price);
    payload.stock = Number(payload.stock || 0);

    if (!payload.name || !payload.category || !payload.price) {
      errorEl.textContent = "Name, category and price are required.";
      return;
    }

    try {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="spinner"></span>';
      if (payload.id) {
        await updateProduct(payload.id, payload);
        showToast("Product updated");
      } else {
        delete payload.id;
        await createProduct(payload);
        showToast("Product added");
      }
      event.target.reset();
      load();
    } catch (error) {
      errorEl.textContent = error.message;
      showToast("Error occurred");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Product";
    }
  });

  await load();
}
