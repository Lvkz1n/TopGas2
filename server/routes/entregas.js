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

// Função para calcular tempo total da entrega
function calcularTempoTotalEntrega(inicio, fim) {
  if (!inicio) return "Calculando...";

  const dataInicio = new Date(inicio);
  const dataFim = fim ? new Date(fim) : new Date();

  if (isNaN(dataInicio.getTime()) || (fim && isNaN(dataFim.getTime()))) {
    return "Calculando...";
  }

  const diffMs = dataFim - dataInicio;
  if (diffMs < null) return "Erro";

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

  // Buscar registros da página atual
  const { rows } = await query(
    `SELECT id, protocolo, nome_cliente, telefone_cliente, mercadoria_pedido, 
            entregador, telefone_entregador, endereco, cidade, bairro, 
            ponto_de_referencia, status_pedido, data_e_hora_inicio_pedido, 
            data_e_hora_envio_pedido, data_e_hora_confirmacao_pedido, 
            data_e_hora_cancelamento_pedido, unidade_topgas
     FROM topgas_entregas 
     ORDER BY id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return {
    entregas: rows,
    paginacao: {
      pagina: page,
      total: total,
      totalPaginas: Math.ceil(total / limit),
      registrosPorPagina: limit,
    },
  };
}

// Configuração para CSV de entregas
const ENTREGAS_CSV_CONFIG = {
  headers: [
    "ID",
    "Protocolo",
    "Nome do Cliente",
    "Telefone do Cliente",
    "Mercadoria/Pedido",
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
    const { rows: entregas } = await query(
      `SELECT * FROM topgas_entregas ORDER BY id DESC`
    );

    if (entregas.length === 0) {
      return res.status(404).json({ error: "Nenhuma entrega encontrada" });
    }

    // Adicionar cálculo de tempo total para cada entrega
    const entregasComTempo = entregas.map((entrega) => {
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
      "UPDATE topgas_entregas SET status_pedido = 'entregue', data_e_hora_confirmacao_pedido = NOW()::text WHERE id = $1",
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
      "UPDATE topgas_entregas SET status_pedido = 'cancelado', data_e_hora_cancelamento_pedido = NOW()::text WHERE id = $1",
      [id]
    );
    res.json({ message: "Entrega cancelada" });
  })
);

export default r;
