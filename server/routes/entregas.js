import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../auth.js"; // Importa middleware de autenticação

const r = Router();

// Função para obter entregas do banco
async function getEntregas() {
  const { rows } = await query("SELECT * FROM topgas_entregas");
  return rows;
}

// Rota GET /entregas protegida por autenticação
r.get("/entregas", requireAuth, async (req, res) => {
  try {
    const entregas = await getEntregas();
    res.json(entregas);
  } catch (error) {
    console.error("Erro ao buscar entregas:", error);
    res.status(500).json({ error: "Erro interno ao buscar entregas" });
  }
});

// Rota POST /entregas/:id/confirmar para confirmar entrega
r.post("/entregas/:id/confirmar", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await query("UPDATE topgas_entregas SET status_pedido = 'finalizado' WHERE id = $1", [id]);
    res.json({ message: "Entrega confirmada" });
  } catch (error) {
    console.error("Erro ao confirmar entrega:", error);
    res.status(500).json({ error: "Erro interno ao confirmar entrega" });
  }
});

// Rota POST /entregas/:id/cancelar para cancelar entrega
r.post("/entregas/:id/cancelar", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await query("UPDATE topgas_entregas SET status_pedido = 'cancelado' WHERE id = $1", [id]);
    res.json({ message: "Entrega cancelada" });
  } catch (error) {
    console.error("Erro ao cancelar entrega:", error);
    res.status(500).json({ error: "Erro interno ao cancelar entrega" });
  }
});

export default r;