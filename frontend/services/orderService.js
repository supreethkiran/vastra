export async function fetchMyOrders() {
  if (!window.firebaseApi?.getMyOrders) {
    throw new Error("Orders unavailable");
  }
  const orders = await window.firebaseApi.getMyOrders();
  return { orders };
}

export async function fetchAllOrders() {
  throw new Error("Admin orders unavailable in Firebase-only mode.");
}
