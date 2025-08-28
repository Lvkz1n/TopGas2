import { Router } from "express";
import { query } from "../db.js";
const r = Router();

r.get("/", async (_req, res) => {
  const { rows } = await query(
    "SELECT id, nome_cliente, bairro, cidade, telefone_cliente, total_pedidos_entregues FROM clientes ORDER BY id DESC LIMIT 1000"
  );
  res.json(rows);
});

r.post("/", async (req, res) => {
  const { nome_cliente, bairro, cidade, telefone_cliente } = req.body || {};
  if (!nome_cliente) return res.status(400).json({ error: "missing_nome" });

  const { rows } = await query(
    `INSERT INTO clientes (nome_cliente, bairro, cidade, telefone_cliente)
     VALUES ($1,$2,$3,$4)
     RETURNING id, nome_cliente, bairro, cidade, telefone_cliente, total_pedidos_entregues`,
    [nome_cliente, bairro || null, cidade || null, telefone_cliente || null]
  );
  res.json(rows[0]);
});

r.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const {
    nome_cliente,
    bairro,
    cidade,
    telefone_cliente,
    total_pedidos_entregues,
  } = req.body || {};
  const { rows } = await query(
    `UPDATE clientes
       SET nome_cliente = COALESCE($1, nome_cliente),
           bairro = COALESCE($2, bairro),
           cidade = COALESCE($3, cidade),
           telefone_cliente = COALESCE($4, telefone_cliente),
           total_pedidos_entregues = COALESCE($5, total_pedidos_entregues),
           updated_at = NOW()
     WHERE id=$6
     RETURNING id, nome_cliente, bairro, cidade, telefone_cliente, total_pedidos_entregues`,
    [
      nome_cliente ?? null,
      bairro ?? null,
      cidade ?? null,
      telefone_cliente ?? null,
      total_pedidos_entregues ?? null,
      id,
    ]
  );
  if (!rows[0]) return res.status(404).json({ error: "not_found" });
  res.json(rows[0]);
});

r.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await query("DELETE FROM clientes WHERE id=$1", [id]);
  res.status(204).end();
});

export default r;
