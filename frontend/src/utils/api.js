const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const apiClient = {
  /**
   * Executes a POST request against the backend engine.
   *
   * @param {string} endpoint - The API route (e.g., '/api/v1/ai/mid-screen-eval')
   * @param {object} data - The JSON payload
   * @param {object} options - Optional configurations (idempotencyKey, signal)
   */
  async post(endpoint, data, options = {}) {
    const { idempotencyKey, signal } = options;
    const headers = { "Content-Type": "application/json" };

    // Aligns perfectly with FastAPI's Header(alias="Idempotency-Key")
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        signal, // Hooks into browser's native garbage collection to drop stale sockets
      });

      if (!response.ok) {
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        try {
          // Attempt to extract FastAPI's structured HTTPException detail
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage =
              typeof errorData.detail === "string"
                ? errorData.detail
                : JSON.stringify(errorData.detail);
          }
        } catch (e) {
          // Fallback to standard status text if body is not JSON
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        console.warn(
          `[Network] Request to ${endpoint} safely aborted by client.`,
        );
      }
      throw error;
    }
  },

  /**
   * Executes a GET request against the backend engine.
   * Useful for dynamically fetching XML templates if they are moved to Cloud Storage.
   */
  async get(endpoint, options = {}) {
    const { signal, headers = {} } = options;

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "GET",
        headers,
        signal,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      // Auto-detect response type to support FastAPI's XML injection route
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/xml")) {
        return await response.text();
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        console.warn(
          `[Network] Request to ${endpoint} safely aborted by client.`,
        );
      }
      throw error;
    }
  },
};
