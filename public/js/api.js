// Base: mesmo domínio (Nginx faz proxy /api → API)
// APENAS PARA DEV LOCAL
const API_BASE = "http://localhost:8080/api";

async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let msg = "Erro no servidor";
    try {
      const j = await res.json();
      msg = j.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

window.API = { api };
