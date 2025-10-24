import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";
import {
  generateCSV,
  setCSVHeaders,
  asyncHandler,
  isValidId,
  calcularTempoTotal,
} from "../utils.js";

const r = Router();

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEntregaRow(row) {
  if (!row) return null;

  const valorItens = toNumber(row.valor_itens);
  const valorFreteInformado = toNumber(row.valor_frete);
  const valorFreteEntregador = toNumber(row.entregador_valor_frete);
  const valorFrete =
    valorFreteInformado ?? valorFreteEntregador ?? null;
  const valorTotalBanco = toNumber(row.valor_total);
  const valorTotalCalculado =
    valorItens !== null || valorFrete !== null
      ? (valorItens || 0) + (valorFrete || 0)
      : null;

  return {
    ...row,
    valor_itens: valorItens,
    valor_frete: valorFrete,
    valor_total: valorTotalBanco ?? valorTotalCalculado,
    valor_total_bruto: valorTotalBanco,
    valor_total_calculado: valorTotalCalculado,
    entregador: row.entregador_nome ?? row.entregador,
    telefone_entregador: row.entregador_telefone ?? row.telefone_entregador,
    entregador_nome: row.entregador_nome ?? row.entregador,
    entregador_telefone: row.entregador_telefone ?? row.telefone_entregador,
    entregador_frete_base: valorFreteEntregador,
  };
}

// Parser de data tolerante a formatos comuns (ISO, "YYYY-MM-DD HH:mm:ss", "DD/MM/YYYY[ HH:mm[:ss]]")
function parseDateSafe(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const raw = String(value).trim();

  // Caso ISO já válido
  const direct = new Date(raw);
  if (!isNaN(direct.getTime())) return direct;

  // Converter "YYYY-MM-DD HH:mm:ss(.sss)?[±TZ]" para ISO com 'T'
  if (
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:?\d{2}|Z)?$/.test(
      raw
    )
  ) {
    const iso = raw.replace(" ", "T");
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d;
  }

  // Suportar "DD/MM/YYYY" com hora opcional
  const m = raw.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (m) {
    const [, dd, mm, yyyy, hh = "00", mi = "00", ss = "00"] = m;
    const iso = `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date(NaN);
}

// Função para calcular tempo total da entrega
function calcularTempoTotalEntrega(inicio, fim) {
  if (!inicio) return "Erro...";

  const dataInicio = parseDateSafe(inicio);
  const dataFim = fim ? parseDateSafe(fim) : new Date();

  if (isNaN(dataInicio.getTime()) || (fim && isNaN(dataFim.getTime()))) {
    return "meudeusmeajuda";
  }

  const diffMs = dataFim - dataInicio;
  if (diffMs < 0) return "Erro";

  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHoras = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const diffSegundos = Math.floor((diffMs % (1000 * 60)) / 1000);

  const partes = [];
  if (diffDias > 0) partes.push(`${diffDias} d`);
  if (diffHoras > 0) partes.push(`${diffHoras} h`);
  if (diffMinutos > 0) partes.push(`${diffMinutos} m`);
  if (diffSegundos > 0) partes.push(`${diffSegundos} s`);

  return partes.length === 0 ? "0 s" : partes.join(" ");
}

// Função para obter entregas do banco com paginação
async function getEntregas(page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  // Buscar total de registros
  const { rows: totalRows } = await query(
    "SELECT COUNT(*) as total FROM topgas_entregas"
  );
  const total = parseInt(totalRows[0].total);

  // Buscar registros da página atual com dados do entregador
  const { rows } = await query(
    `SELECT 
        te.id,
        te.protocolo,
        te.nome_cliente,
        te.telefone_cliente,
        te.mercadoria_pedido,
        te.forma_pagamento,
        te.valor_itens,
        te.valor_frete,
        te.valor_total,
        te.entregador,
        te.telefone_entregador,
        te.entregador_id,
        e.nome AS entregador_nome,
        e.telefone AS entregador_telefone,
        e.valor_frete AS entregador_valor_frete,
        te.endereco,
        te.cidade,
        te.bairro,
        te.ponto_de_referencia,
        te.status_pedido,
        te.data_e_hora_inicio_pedido,
        te.data_e_hora_envio_pedido,
        te.data_e_hora_confirmacao_pedido,
        te.data_e_hora_cancelamento_pedido,
        te.data_finalizacao,
        te.unidade_topgas,
        te.observacoes
     FROM topgas_entregas te
     LEFT JOIN entregadores e ON e.id = te.entregador_id
     ORDER BY te.id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const entregas = rows.map(normalizeEntregaRow);

  return {
    entregas,
    paginacao: {
      pagina: page,
      total: total,
      totalPaginas: Math.ceil(total / limit),
      registrosPorPagina: limit,
    },
  };
}

async function getEntregaById(id) {
  const { rows } = await query(
    `SELECT 
        te.id,
        te.protocolo,
        te.nome_cliente,
        te.telefone_cliente,
        te.mercadoria_pedido,
        te.forma_pagamento,
        te.valor_itens,
        te.valor_frete,
        te.valor_total,
        te.entregador,
        te.telefone_entregador,
        te.entregador_id,
        e.nome AS entregador_nome,
        e.telefone AS entregador_telefone,
        e.valor_frete AS entregador_valor_frete,
        te.endereco,
        te.cidade,
        te.bairro,
        te.ponto_de_referencia,
        te.status_pedido,
        te.data_e_hora_inicio_pedido,
        te.data_e_hora_envio_pedido,
        te.data_e_hora_confirmacao_pedido,
        te.data_e_hora_cancelamento_pedido,
        te.data_finalizacao,
        te.unidade_topgas,
        te.observacoes
     FROM topgas_entregas te
     LEFT JOIN entregadores e ON e.id = te.entregador_id
     WHERE te.id = $1
     LIMIT 1`,
    [id]
  );

  if (!rows.length) return null;
  return normalizeEntregaRow(rows[0]);
}

// Configuração para CSV de entregas
const ENTREGAS_CSV_CONFIG = {
  headers: [
    "ID",
    "Protocolo",
    "Nome do Cliente",
    "Telefone do Cliente",
    "Mercadoria/Pedido",
    "Forma de Pagamento",
    "Valor Itens",
    "Valor Frete",
    "Valor Total",
    "Entregador",
    "Telefone do Entregador",
    "Endereço",
    "Cidade",
    "Bairro",
    "Ponto de Referência",
    "Status do Pedido",
    "Data e Hora de Início",
    "Data e Hora de Envio",
    "Data e Hora de Confirmação",
    "Data e Hora de Cancelamento",
    "Unidade TopGas",
    "Tempo Total",
  ],
  fieldMapping: {
    ID: "id",
    Protocolo: "protocolo",
    "Nome do Cliente": "nome_cliente",
    "Telefone do Cliente": "telefone_cliente",
    "Mercadoria/Pedido": "mercadoria_pedido",
    "Forma de Pagamento": "forma_pagamento",
    "Valor Itens": "valor_itens",
    "Valor Frete": "valor_frete",
    "Valor Total": "valor_total",
    Entregador: "entregador",
    "Telefone do Entregador": "telefone_entregador",
    Endereço: "endereco",
    Cidade: "cidade",
    Bairro: "bairro",
    "Ponto de Referência": "ponto_de_referencia",
    "Status do Pedido": "status_pedido",
    "Data e Hora de Início": "data_e_hora_inicio_pedido",
    "Data e Hora de Envio": "data_e_hora_envio_pedido",
    "Data e Hora de Confirmação": "data_e_hora_confirmacao_pedido",
    "Data e Hora de Cancelamento": "data_e_hora_cancelamento_pedido",
    "Unidade TopGas": "unidade_topgas",
    "Tempo Total": "tempo_total",
  },
};

// Rota GET /entregas protegida por autenticação com paginação
r.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await getEntregas(page, limit);
    res.json(result);
  })
);

// Rota de teste para verificar dados
r.get(
  "/test-data",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { rows } = await query(`
    SELECT id, protocolo, nome_cliente, status_pedido, 
           data_e_hora_inicio_pedido, data_e_hora_envio_pedido, 
           data_e_hora_confirmacao_pedido, data_e_hora_cancelamento_pedido
    FROM topgas_entregas 
    ORDER BY id DESC 
    LIMIT 5
  `);

    res.json({
      message: "Dados de teste",
      count: rows.length,
      data: rows,
    });
  })
);

// Rota GET /entregas/csv para download do relatório CSV (apenas admin)
r.get(
  "/csv",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT 
          te.*,
          e.nome AS entregador_nome,
          e.telefone AS entregador_telefone,
          e.valor_frete AS entregador_valor_frete
       FROM topgas_entregas te
       LEFT JOIN entregadores e ON e.id = te.entregador_id
       ORDER BY te.id DESC`
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Nenhuma entrega encontrada" });
    }

    const entregasComTempo = rows.map((entregaOriginal) => {
      const entrega = normalizeEntregaRow(entregaOriginal);
      let dataFim = null;
      const status = entrega.status_pedido;
      const isEntregue = status === "Entregue" || status === "entregue";
      const isCancelado = status === "cancelado" || status === "Cancelado";

      if (isEntregue && entrega.data_e_hora_confirmacao_pedido) {
        dataFim = entrega.data_e_hora_confirmacao_pedido;
      } else if (isCancelado && entrega.data_e_hora_cancelamento_pedido) {
        dataFim = entrega.data_e_hora_cancelamento_pedido;
      } else if (entrega.data_e_hora_confirmacao_pedido) {
        dataFim = entrega.data_e_hora_confirmacao_pedido;
      } else if (entrega.data_e_hora_cancelamento_pedido) {
        dataFim = entrega.data_e_hora_cancelamento_pedido;
      }

      return {
        ...entrega,
        tempo_total: calcularTempoTotalEntrega(
          entrega.data_e_hora_inicio_pedido,
          dataFim
        ),
      };
    });

    const csv = generateCSV(
      entregasComTempo,
      ENTREGAS_CSV_CONFIG.headers,
      ENTREGAS_CSV_CONFIG.fieldMapping
    );
    const filename = `relatorio_entregas_${
      new Date().toISOString().split("T")[0]
    }.csv`;

    setCSVHeaders(res, filename);
    res.send(csv);
  })
);

// Rota POST /entregas/:id/finalizar para registrar valores e concluir entrega
r.post(
  "/:id/finalizar",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const {
      forma_pagamento,
      valor_itens,
      valor_frete: valorFreteBody,
      observacoes = null,
      entregador_id: entregadorIdRaw = undefined,
    } = req.body || {};
    const observacoesTexto =
      typeof observacoes === "string" && observacoes.trim() !== ""
        ? observacoes.trim()
        : null;

    if (!forma_pagamento || typeof forma_pagamento !== "string") {
      return res
        .status(400)
        .json({ error: "Forma de pagamento é obrigatória." });
    }

    const valorItensNumero = toNumber(valor_itens);
    if (valorItensNumero === null) {
      return res
        .status(400)
        .json({ error: "Valor dos itens é obrigatório e deve ser numérico." });
    }

    const valorFreteNumero =
      valorFreteBody !== undefined ? toNumber(valorFreteBody) : null;

    if (valorFreteBody !== undefined && valorFreteNumero === null) {
      return res
        .status(400)
        .json({ error: "Valor de frete inválido. Informe um número válido." });
    }

    const entrega = await getEntregaById(id);
    if (!entrega) {
      return res.status(404).json({ error: "Entrega não encontrada." });
    }

    let entregadorSelecionado = null;
    if (
      entregadorIdRaw !== undefined &&
      entregadorIdRaw !== null &&
      String(entregadorIdRaw).trim() !== ""
    ) {
      if (!isValidId(entregadorIdRaw)) {
        return res
          .status(400)
          .json({ error: "ID de entregador inválido." });
      }

      const entregadorIdNumero = Number(entregadorIdRaw);
      const { rows: entregadorRows } = await query(
        `SELECT id, nome, telefone, valor_frete, ativo
           FROM entregadores
          WHERE id = $1`,
        [entregadorIdNumero]
      );

      if (!entregadorRows.length) {
        return res
          .status(404)
          .json({ error: "Entregador informado não foi encontrado." });
      }

      const entregadorRow = entregadorRows[0];
      entregadorSelecionado = {
        id: entregadorRow.id,
        nome: entregadorRow.nome,
        telefone: entregadorRow.telefone,
        valor_frete: toNumber(entregadorRow.valor_frete),
        ativo: entregadorRow.ativo,
      };
    } else if (entrega.entregador_id) {
      entregadorSelecionado = {
        id: entrega.entregador_id,
        nome: entrega.entregador_nome ?? entrega.entregador,
        telefone:
          entrega.entregador_telefone ?? entrega.telefone_entregador ?? null,
        valor_frete: toNumber(entrega.entregador_frete_base),
        ativo: true,
      };
    }

    const nomeEntregadorFinal =
      entregadorSelecionado?.nome ??
      entrega.entregador_nome ??
      entrega.entregador;
    const telefoneEntregadorFinal =
      entregadorSelecionado?.telefone ??
      entrega.entregador_telefone ??
      entrega.telefone_entregador ??
      null;

    const valorFreteFinal =
      valorFreteNumero ??
      toNumber(entrega.valor_frete) ??
      entregadorSelecionado?.valor_frete ??
      toNumber(entrega.entregador_frete_base) ??
      0;

    const valorTotalFinal = (valorItensNumero || 0) + (valorFreteFinal || 0);

    await query(
      `UPDATE topgas_entregas
         SET status_pedido = 'entregue',
             forma_pagamento = $2,
             valor_itens = $3,
             valor_frete = $4,
             valor_total = $5,
             observacoes = COALESCE($6, observacoes),
             data_e_hora_confirmacao_pedido = NOW()::text,
             data_finalizacao = NOW(),
             entregador = COALESCE($7, entregador),
             telefone_entregador = COALESCE($8, telefone_entregador),
             entregador_id = COALESCE($9, entregador_id)
       WHERE id = $1`,
      [
        id,
        forma_pagamento.trim(),
        valorItensNumero,
        valorFreteFinal,
        valorTotalFinal,
        observacoesTexto,
        nomeEntregadorFinal,
        telefoneEntregadorFinal,
        entregadorSelecionado?.id ?? entrega.entregador_id ?? null,
      ]
    );

    const entregaAtualizada = await getEntregaById(id);
    res.json({
      message: "Entrega finalizada com sucesso.",
      entrega: entregaAtualizada,
    });
  })
);

// Rota POST /entregas/:id/confirmar para confirmar entrega
r.post(
  "/:id/confirmar",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    await query(
      `UPDATE topgas_entregas
         SET status_pedido = 'entregue',
             data_e_hora_confirmacao_pedido = NOW()::text,
             data_finalizacao = NOW()
       WHERE id = $1`,
      [id]
    );
    res.json({ message: "Entrega confirmada" });
  })
);

// Rota POST /entregas/:id/cancelar para cancelar entrega
r.post(
  "/:id/cancelar",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    await query(
      `UPDATE topgas_entregas
         SET status_pedido = 'cancelado',
             data_e_hora_cancelamento_pedido = NOW()::text,
             data_finalizacao = NOW()
       WHERE id = $1`,
      [id]
    );
    res.json({ message: "Entrega cancelada" });
  })
);

export default r;
