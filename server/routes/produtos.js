import { Router } from "express";
import { query } from "../db.js";
import { requireAdmin } from "../auth.js";
import {
  asyncHandler,
  generateCSV,
  setCSVHeaders,
  isValidId,
} from "../utils.js";

const router = Router();

function mapProduto(row) {
  if (!row) return null;
  const valor =
    row.valor === null || row.valor === undefined ? null : Number(row.valor);
  return {
    id: row.id,
    codigo: row.codigo ?? null,
    nome: row.nome,
    descricao: row.descricao ?? null,
    valor,
    unidade: row.unidade,
    ativo: row.ativo ?? true,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT id, codigo, nome, descricao, valor, unidade, ativo, created_at, updated_at
       FROM produtos
       ORDER BY nome ASC`
    );
    res.json(rows.map(mapProduto));
  })
);

router.get(
  "/unidades",
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT DISTINCT unidade
       FROM produtos
       WHERE unidade IS NOT NULL AND unidade <> ''
       ORDER BY unidade ASC`
    );
    res.json(rows.map((r) => r.unidade));
  })
);

router.get(
  "/csv",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT id, codigo, nome, descricao, valor, unidade, ativo
       FROM produtos
       ORDER BY nome ASC`
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ error: "Nenhum produto cadastrado para exportar." });
    }

    const headers = ["ID", "Codigo", "Nome", "Descricao", "Valor", "Unidade", "Ativo"];
    const fieldMapping = {
      ID: "id",
      Codigo: "codigo",
      Nome: "nome",
      Descricao: "descricao",
      Valor: "valor_formatado",
      Unidade: "unidade",
      Ativo: "ativo_formatado",
    };

    const data = rows.map((row) => ({
      id: row.id,
      codigo: row.codigo ?? "",
      nome: row.nome,
      descricao: row.descricao ?? "",
      valor_formatado:
        row.valor !== null ? Number(row.valor).toFixed(2) : "0.00",
      unidade: row.unidade,
      ativo_formatado: row.ativo ? "Sim" : "Nao",
    }));

    const csv = generateCSV(data, headers, fieldMapping);
    const filename = `produtos_${new Date()
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
      codigo = null,
      nome,
      descricao = null,
      valor,
      unidade,
      ativo = true,
    } = req.body || {};

    if (!nome || !String(nome).trim()) {
      return res.status(400).json({ error: "Nome do produto e obrigatorio." });
    }

    if (valor === undefined || valor === null || Number.isNaN(Number(valor))) {
      return res
        .status(400)
        .json({ error: "Valor do produto e obrigatorio." });
    }

    if (!unidade || !String(unidade).trim()) {
      return res
        .status(400)
        .json({ error: "Unidade do produto e obrigatoria." });
    }

    const payload = [
      codigo ? String(codigo).trim() : null,
      String(nome).trim(),
      descricao ? String(descricao).trim() : null,
      Number(valor),
      String(unidade).trim(),
      Boolean(ativo),
    ];

    try {
      const { rows } = await query(
        `INSERT INTO produtos (codigo, nome, descricao, valor, unidade, ativo)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, codigo, nome, descricao, valor, unidade, ativo, created_at, updated_at`,
        payload
      );

      res.status(201).json(mapProduto(rows[0]));
    } catch (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "Codigo de produto ja esta em uso." });
      }
      throw error;
    }
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
      codigo = null,
      nome,
      descricao = null,
      valor,
      unidade,
      ativo = true,
    } = req.body || {};

    if (!nome || !String(nome).trim()) {
      return res.status(400).json({ error: "Nome do produto e obrigatorio." });
    }

    if (valor === undefined || valor === null || Number.isNaN(Number(valor))) {
      return res
        .status(400)
        .json({ error: "Valor do produto e obrigatorio." });
    }

    if (!unidade || !String(unidade).trim()) {
      return res
        .status(400)
        .json({ error: "Unidade do produto e obrigatoria." });
    }

    const payload = [
      codigo ? String(codigo).trim() : null,
      String(nome).trim(),
      descricao ? String(descricao).trim() : null,
      Number(valor),
      String(unidade).trim(),
      Boolean(ativo),
      id,
    ];

    try {
      const { rows } = await query(
        `UPDATE produtos
         SET codigo = $1,
             nome = $2,
             descricao = $3,
             valor = $4,
             unidade = $5,
             ativo = $6,
             updated_at = NOW()
         WHERE id = $7
         RETURNING id, codigo, nome, descricao, valor, unidade, ativo, created_at, updated_at`,
        payload
      );

      if (!rows.length) {
        return res.status(404).json({ error: "Produto nao encontrado." });
      }

      res.json(mapProduto(rows[0]));
    } catch (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "Codigo de produto ja esta em uso." });
      }
      throw error;
    }
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

    const result = await query("DELETE FROM produtos WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Produto nao encontrado." });
    }

    res.status(204).end();
  })
);

export default router;

