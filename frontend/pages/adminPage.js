import { showToast } from "../components/toast.js";

export async function adminPage(app) {
  app.innerHTML = `
    <h1 class="section-title">Admin Dashboard</h1>
    <section class="card stack fade-in" style="padding:16px;">
      <h3>Overview</h3>
      <div id="adminDashboard" class="stack"></div>
      <p class="muted" style="font-size:12px;">Admin actions are served via <code>/api/admin/dashboard</code>.</p>
    </section>
  `;

  const dashboardEl = document.getElementById("adminDashboard");

  async function load() {
    try {
      if (!window.firebaseApi?.getAdminDashboard) {
        throw new Error("Admin dashboard unavailable");
      }
      const data = await window.firebaseApi.getAdminDashboard();
      dashboardEl.innerHTML = `
        <div class="row"><span class="muted">Revenue (today)</span><strong class="price">₹${Number(data?.revenue?.today || 0).toLocaleString("en-IN")}</strong></div>
        <div class="row"><span class="muted">Revenue (week)</span><strong class="price">₹${Number(data?.revenue?.weekly || 0).toLocaleString("en-IN")}</strong></div>
        <div class="row"><span class="muted">Revenue (total)</span><strong class="price">₹${Number(data?.revenue?.total || 0).toLocaleString("en-IN")}</strong></div>
        <div class="row"><span class="muted">Orders</span><strong>${Number(data?.orders?.length || 0)}</strong></div>
        <div class="row"><span class="muted">Users</span><strong>${Number(data?.users?.length || 0)}</strong></div>
      `;
    } catch (error) {
      dashboardEl.innerHTML = `<p class="danger">${error.message}</p>`;
      showToast(error.message);
    }
  }

  await load();
}
