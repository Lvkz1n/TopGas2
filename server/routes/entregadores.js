import { Router } from "express";
import { query } from "../db.js";
import { requireAdmin } from "../auth.js";
import { asyncHandler, generateCSV, setCSVHeaders, isValidId } from "../utils.js";

const router = Router();

function normalizeMoney(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function mapEntregador(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome,
    unidade: row.unidade ?? null,
    telefone: row.telefone ?? null,
    valor_frete: row.valor_frete !== null ? Number(row.valor_frete) : null,
    observacoes: row.observacoes ?? null,
    ativo: row.ativo ?? true,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT id, nome, unidade, telefone, valor_frete, observacoes, ativo, created_at, updated_at
       FROM entregadores
       ORDER BY nome ASC`
    );
    res.json(rows.map(mapEntregador));
  })
);

router.get(
  "/csv",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT id, nome, unidade, telefone, valor_frete, observacoes, ativo, created_at, updated_at
       FROM entregadores
       ORDER BY nome ASC`
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ error: "Nenhum entregador cadastrado para exportar." });
    }

    const headers = [
      "ID",
      "Nome",
      "Unidade",
      "Telefone",
      "Valor Frete",
      "Ativo",
      "Observacoes",
      "Criado Em",
      "Atualizado Em",
    ];
    const fieldMapping = {
      ID: "id",
      Nome: "nome",
      Unidade: "unidade",
      Telefone: "telefone",
      "Valor Frete": "valor_frete_formatado",
      Ativo: "ativo_formatado",
      Observacoes: "observacoes",
      "Criado Em": "criado_em",
      "Atualizado Em": "atualizado_em",
    };

    const data = rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      unidade: row.unidade ?? "",
      telefone: row.telefone ?? "",
      valor_frete_formatado:
        row.valor_frete !== null ? Number(row.valor_frete).toFixed(2) : "",
      ativo_formatado: row.ativo ? "Sim" : "Nao",
      observacoes: row.observacoes ?? "",
      criado_em: row.created_at ?? "",
      atualizado_em: row.updated_at ?? "",
    }));

    const csv = generateCSV(data, headers, fieldMapping);
    const filename = `entregadores_${new Date()
      .toISOString()
      .split("T")[0]
      .replace(/-/g, "")}.csv`;
    setCSVHeaders(res, filename);
    res.send(csv);
  })
);

router.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const {
      nome,
      unidade = null,
      telefone = null,
      valor_frete = null,
      observacoes = null,
      ativo = true,
    } = req.body || {};

    if (!nome || !String(nome).trim()) {
      return res.status(400).json({ error: "Nome do entregador e obrigatorio." });
    }

    const frete = normalizeMoney(valor_frete);
    if (valor_frete !== null && valor_frete !== undefined && frete === null) {
      return res.status(400).json({ error: "Valor de frete invalido." });
    }

    const params = [
      String(nome).trim(),
      unidade ? String(unidade).trim() : null,
      telefone ? String(telefone).trim() : null,
      frete,
      observacoes ? String(observacoes).trim() : null,
      Boolean(ativo),
    ];

    const { rows } = await query(
      `INSERT INTO entregadores (nome, unidade, telefone, valor_frete, observacoes, ativo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, unidade, telefone, valor_frete, observacoes, ativo, created_at, updated_at`,
      params
    );

    res.status(201).json(mapEntregador(rows[0]));
  })
);

router.put(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ error: "ID invalido." });
    }

    const {
      nome,
      unidade = null,
      telefone = null,
      valor_frete = null,
      observacoes = null,
      ativo = true,
    } = req.body || {};

    if (!nome || !String(nome).trim()) {
      return res.status(400).json({ error: "Nome do entregador e obrigatorio." });
    }

    const frete = normalizeMoney(valor_frete);
    if (valor_frete !== null && valor_frete !== undefined && frete === null) {
      return res.status(400).json({ error: "Valor de frete invalido." });
    }

    const params = [
      String(nome).trim(),
      unidade ? String(unidade).trim() : null,
      telefone ? String(telefone).trim() : null,
      frete,
      observacoes ? String(observacoes).trim() : null,
      Boolean(ativo),
      id,
    ];

    const { rows } = await query(
      `UPDATE entregadores
       SET nome = $1,
           unidade = $2,
           telefone = $3,
           valor_frete = $4,
           observacoes = $5,
           ativo = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, nome, unidade, telefone, valor_frete, observacoes, ativo, created_at, updated_at`,
      params
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Entregador nao encontrado." });
    }

    res.json(mapEntregador(rows[0]));
  })
);

router.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ error: "ID invalido." });
    }

    const result = await query("DELETE FROM entregadores WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Entregador nao encontrado." });
    }

    res.status(204).end();
  })
);

export default router;

