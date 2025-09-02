import { Router } from "express";
import { query } from "../db.js";

const r = Router();

  async function getEntregas(fallback) {
  const { rows } = await query("SELECT value FROM entregas WHERE key=$1", [
            fallback,
  ]);
  return rows[0]?.value || fallback;
}

async function getEntregas() {
  await Auth.guard();

  const tbody = document.querySelector("#tbEntregas tbody");
  const rows = await getEntregas();

  tbody.innerHTML = rows
    .map((r) => {
      const icon = getStatusIcon(r.status_icon || r.status_pedido);
      const cliente =
        r.nome_cliente ?? r.cliente_nome ?? r.cliente ?? "-";
      const entregador = r.entregador || "-";

      return `
      <tr>
        <td>${r.id}</td>
        <td>${cliente}</td>
        <td style="font-size:18px;text-align:center;">${icon}</td>
        <td>${entregador}</td>
        <td>
          <button class="btn" onclick="confirmar(${r.id})">Confirmar</button>
          <button class="btn" style="background:#ef4444" onclick="cancelar(${r.id})">Cancelar</button>
        </td>
      </tr>`;
    })
    .join("");
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