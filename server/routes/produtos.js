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
  const valorBase =
    row.valor === null || row.valor === undefined ? null : Number(row.valor);
  const valorPix =
    row.valor_pix === null || row.valor_pix === undefined
      ? null
      : Number(row.valor_pix);
  const valorDebito =
    row.valor_debito === null || row.valor_debito === undefined
      ? null
      : Number(row.valor_debito);
  const valorCredito =
    row.valor_credito === null || row.valor_credito === undefined
      ? null
      : Number(row.valor_credito);
  const valorEntrega =
    row.valor_entrega === null || row.valor_entrega === undefined
      ? null
      : Number(row.valor_entrega);
  const valorRetirada =
    row.valor_retirada === null || row.valor_retirada === undefined
      ? null
      : Number(row.valor_retirada);
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao ?? null,
    valor: valorBase,
    valor_pix: valorPix,
    valor_debito: valorDebito,
    valor_credito: valorCredito,
    valor_entrega: valorEntrega,
    valor_retirada: valorRetirada,
    unidade: row.unidade,
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
      `SELECT id, nome, descricao, valor, valor_pix, valor_debito, valor_credito,
              valor_entrega, valor_retirada, unidade, observacoes, ativo,
              created_at, updated_at
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
      `SELECT id, nome, descricao, valor, valor_pix, valor_debito, valor_credito,
              valor_entrega, valor_retirada, unidade, observacoes, ativo,
              created_at, updated_at
       FROM produtos
       ORDER BY nome ASC`
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ error: "Nenhum produto cadastrado para exportar." });
    }

    const headers = [
      "ID",
      "Nome",
      "Valor Base",
      "Valor Pix",
      "Valor Debito",
      "Valor Credito",
      "Valor Entrega",
      "Valor Retirada",
      "Unidade",
      "Ativo",
      "Descricao",
      "Observacoes",
      "Criado Em",
      "Atualizado Em",
    ];
    const fieldMapping = {
      ID: "id",
      Nome: "nome",
      "Valor Base": "valor_base_formatado",
      "Valor Pix": "valor_pix_formatado",
      "Valor Debito": "valor_debito_formatado",
      "Valor Credito": "valor_credito_formatado",
      "Valor Entrega": "valor_entrega_formatado",
      "Valor Retirada": "valor_retirada_formatado",
      Unidade: "unidade",
      Ativo: "ativo_formatado",
      Descricao: "descricao",
      Observacoes: "observacoes",
      "Criado Em": "criado_em",
      "Atualizado Em": "atualizado_em",
    };

    const data = rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      valor_base_formatado:
        row.valor !== null ? Number(row.valor).toFixed(2) : "0.00",
      valor_pix_formatado:
        row.valor_pix !== null && row.valor_pix !== undefined
          ? Number(row.valor_pix).toFixed(2)
          : "",
      valor_debito_formatado:
        row.valor_debito !== null && row.valor_debito !== undefined
          ? Number(row.valor_debito).toFixed(2)
          : "",
      valor_credito_formatado:
        row.valor_credito !== null && row.valor_credito !== undefined
          ? Number(row.valor_credito).toFixed(2)
          : "",
      valor_entrega_formatado:
        row.valor_entrega !== null && row.valor_entrega !== undefined
          ? Number(row.valor_entrega).toFixed(2)
          : "",
      valor_retirada_formatado:
        row.valor_retirada !== null && row.valor_retirada !== undefined
          ? Number(row.valor_retirada).toFixed(2)
          : "",
      unidade: row.unidade,
      ativo_formatado: row.ativo ? "Sim" : "Nao",
      descricao: row.descricao ?? "",
      observacoes: row.observacoes ?? "",
      criado_em: row.created_at ?? "",
      atualizado_em: row.updated_at ?? "",
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
      nome,
      descricao = null,
      valor,
      unidade,
      ativo = true,
      valor_pix = null,
      valor_debito = null,
      valor_credito = null,
      valor_entrega = null,
      valor_retirada = null,
      observacoes = null,
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

    const optionalNumbers = [
      { key: "valor_pix", raw: valor_pix, label: "valor_pix" },
      { key: "valor_debito", raw: valor_debito, label: "valor_debito" },
      { key: "valor_credito", raw: valor_credito, label: "valor_credito" },
      { key: "valor_entrega", raw: valor_entrega, label: "valor_entrega" },
      { key: "valor_retirada", raw: valor_retirada, label: "valor_retirada" },
    ];
    const parsedNumbers = {};
    for (const field of optionalNumbers) {
      if (field.raw === null || field.raw === undefined || field.raw === "") {
        parsedNumbers[field.key] = null;
      } else {
        const num = Number(field.raw);
        if (Number.isNaN(num)) {
          return res
            .status(400)
            .json({ error: `Valor invalido para ${field.label}.` });
        }
        parsedNumbers[field.key] = num;
      }
    }

    const payload = [
      String(nome).trim(),
      descricao ? String(descricao).trim() : null,
      Number(valor),
      parsedNumbers.valor_pix,
      parsedNumbers.valor_debito,
      parsedNumbers.valor_credito,
      parsedNumbers.valor_entrega,
      parsedNumbers.valor_retirada,
      String(unidade).trim(),
      observacoes ? String(observacoes).trim() : null,
      Boolean(ativo),
    ];

    try {
      const { rows } = await query(
        `INSERT INTO produtos (nome, descricao, valor, valor_pix, valor_debito, valor_credito,
                               valor_entrega, valor_retirada, unidade, observacoes, ativo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, nome, descricao, valor, valor_pix, valor_debito, valor_credito,
                   valor_entrega, valor_retirada, unidade, observacoes, ativo, created_at, updated_at`,
        payload
      );

      res.status(201).json(mapProduto(rows[0]));
    } catch (error) {
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
      nome,
      descricao = null,
      valor,
      unidade,
      ativo = true,
      valor_pix = null,
      valor_debito = null,
      valor_credito = null,
      valor_entrega = null,
      valor_retirada = null,
      observacoes = null,
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

    const optionalNumbers = [
      { key: "valor_pix", raw: valor_pix, label: "valor_pix" },
      { key: "valor_debito", raw: valor_debito, label: "valor_debito" },
      { key: "valor_credito", raw: valor_credito, label: "valor_credito" },
      { key: "valor_entrega", raw: valor_entrega, label: "valor_entrega" },
      { key: "valor_retirada", raw: valor_retirada, label: "valor_retirada" },
    ];
    const parsedNumbers = {};
    for (const field of optionalNumbers) {
      if (field.raw === null || field.raw === undefined || field.raw === "") {
        parsedNumbers[field.key] = null;
      } else {
        const num = Number(field.raw);
        if (Number.isNaN(num)) {
          return res
            .status(400)
            .json({ error: `Valor invalido para ${field.label}.` });
        }
        parsedNumbers[field.key] = num;
      }
    }

    const payload = [
      String(nome).trim(),
      descricao ? String(descricao).trim() : null,
      Number(valor),
      parsedNumbers.valor_pix,
      parsedNumbers.valor_debito,
      parsedNumbers.valor_credito,
      parsedNumbers.valor_entrega,
      parsedNumbers.valor_retirada,
      String(unidade).trim(),
      observacoes ? String(observacoes).trim() : null,
      Boolean(ativo),
      id,
    ];

    try {
      const { rows } = await query(
        `UPDATE produtos
         SET nome = $1,
             descricao = $2,
             valor = $3,
             valor_pix = $4,
             valor_debito = $5,
             valor_credito = $6,
             valor_entrega = $7,
             valor_retirada = $8,
             unidade = $9,
             observacoes = $10,
             ativo = $11,
             updated_at = NOW()
         WHERE id = $12
         RETURNING id, nome, descricao, valor, valor_pix, valor_debito, valor_credito,
                   valor_entrega, valor_retirada, unidade, observacoes, ativo, created_at, updated_at`,
        payload
      );

      if (!rows.length) {
        return res.status(404).json({ error: "Produto nao encontrado." });
      }
      res.json(mapProduto(rows[0]));
    } catch (error) {
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
