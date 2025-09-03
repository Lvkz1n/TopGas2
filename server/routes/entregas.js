import { Router } from "express";
import { query } from "../db.js";

const r = Router();

  async function getEntregas(fallback) {
  const { rows } = await query("SELECT value FROM entregas WHERE key=$1", [
            fallback,
  ]);
  return rows[0]?.value || fallback;
}


function getStatusIcon(statusRaw) {
  const s = String(statusRaw || "").trim().toLowerCase();
  if (["entregue", "finalizado", "finalizada", "finalizadas"].includes(s))
    return "✔️";
  if (["cancelado", "cancelada", "canceladas"].includes(s))
    return "❌";
  if (
    ["pendente", "em entrega", "em_entrega", "em rota", "em rota de entrega"].includes(
      s
    )
  )
    return "⏳";
  // fallback: mostra o texto original se não bater com nada
  return statusRaw || "⏳";
}

async function confirmar(id) {
  try {
    await getEntregas(`/entregas/${id}/confirmar`, { method: "POST" });
    alert("Entregue!");
    location.reload();
  } catch (e) {
    alert("Falha: " + e.message);
  }
}

async function cancelar(id) {
  try {
    await API.api(`/entregas/${id}/cancelar`, { method: "POST" });
    alert("Cancelado!");
    location.reload();
  } catch (e) {
    alert("Falha: " + e.message);
  }
}