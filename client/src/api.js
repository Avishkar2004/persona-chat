// A production build is served by the API server itself, so it calls its own origin.
const DEFAULT_API_BASE =
  process.env.NODE_ENV === "production" ? "" : "http://localhost:8000";

export const API_BASE =
  process.env.REACT_APP_API_URL?.replace(/\/$/, "") || DEFAULT_API_BASE;

export async function api(path, options = {}) {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? body.message
        : "Request failed";
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}