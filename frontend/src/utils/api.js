// Create this new file to centralize all API logic
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const apiClient = {
  async post(endpoint, data, idempotencyKey = null) {
    const headers = { "Content-Type": "application/json" };
    if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },
};
