// Base: mesmo domínio (Nginx faz proxy /api → API)
// Funciona tanto em dev quanto em produção
const API_BASE = "/api";

async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let msg = "Erro no servidor";
    let details = null;
    try {
      const j = await res.json();
      msg = j.error || msg;
      details = j.details;
    } catch {}
    const error = new Error(msg);
    if (details) error.details = details;
    throw error;
  }
  return res.status === 204 ? null : res.json();
}

window.API = { api };
