import { Router } from "express";
import { query } from "../db.js";

const r = Router();

async function getCfg(key, fallback) {
  const { rows } = await query("SELECT value FROM configuracoes WHERE key=$1", [
    key,
  ]);
  return rows[0]?.value || fallback;
}

r.get("/", async (_req, res) => {
  const { rows } = await query(
    "SELECT * FROM entregas ORDER BY id DESC LIMIT 500"
  );
  res.json(rows);
});

r.post("/:id/confirmar", async (req, res) => {
  const id = Number(req.params.id);
  // 1) webhook externo
  try {
    const url = await getCfg(
      "webhook_confirmar",
      "https://webhook.cerion.com.br/webhook/topgas_confirmar_pedido"
    );
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedido_id: id, status: "entregue" }),
    });
    if (!resp.ok) throw new Error("Webhook falhou");
  } catch (e) {
    return res.status(502).json({ error: "webhook_error" });
  }
  // 2) atualiza DB
  await query(
    `UPDATE entregas SET status_pedido='entregue', data_e_hora_confirmacao_pedido=NOW() WHERE id=$1`,
    [id]
  );
  res.json({ ok: true });
});

r.post("/:id/cancelar", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const url = await getCfg(
      "webhook_cancelar",
      "https://webhook.cerion.com.br/webhook/topgas_cancelar_pedido"
    );
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedido_id: id, status: "cancelado" }),
    });
    if (!resp.ok) throw new Error("Webhook falhou");
  } catch (e) {
    return res.status(502).json({ error: "webhook_error" });
  }
  await query(
    `UPDATE entregas SET status_pedido='cancelado', data_e_hora_cancelamento_pedido=NOW() WHERE id=$1`,
    [id]
  );
  res.json({ ok: true });
});

export default r;
