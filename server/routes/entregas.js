import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js"; // Importa middleware de autenticação

const r = Router();

// Função para obter entregas do banco com paginação
async function getEntregas(page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  
  // Buscar total de registros
  const { rows: totalRows } = await query("SELECT COUNT(*) as total FROM topgas_entregas");
  const total = parseInt(totalRows[0].total);
  
  // Buscar registros da página atual
  const { rows } = await query(
    `SELECT id_pedido, nome_cliente, horario_inicio, nome_entregador, 
            horario_recebimento, status_entrega 
     FROM topgas_entregas 
     ORDER BY horario_inicio DESC 
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  
  return {
    entregas: rows,
    paginacao: {
      pagina: page,
      total: total,
      totalPaginas: Math.ceil(total / limit),
      registrosPorPagina: limit
    }
  };
}

// Função para gerar CSV de entregas
function generateEntregasCSV(entregas) {
  const headers = [
    'ID do Pedido',
    'Nome do Cliente', 
    'Horário de Início',
    'Nome do Entregador',
    'Horário de Recebimento',
    'Status da Entrega'
  ];
  
  const csvRows = [headers.join(',')];
  
  for (const entrega of entregas) {
    const row = [
      entrega.id_pedido,
      `"${entrega.nome_cliente}"`,
      entrega.horario_inicio ? new Date(entrega.horario_inicio).toLocaleString('pt-BR') : '',
      `"${entrega.nome_entregador || ''}"`,
      entrega.horario_recebimento ? new Date(entrega.horario_recebimento).toLocaleString('pt-BR') : '',
      entrega.status_entrega
    ];
    csvRows.push(row.join(','));
  }
  
  return csvRows.join('\n');
}

// Rota GET /entregas protegida por autenticação com paginação
r.get("/entregas", requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await getEntregas(page, limit);
    res.json(result);
  } catch (error) {
    console.error("Erro ao buscar entregas:", error);
    res.status(500).json({ error: "Erro interno ao buscar entregas" });
  }
});

// Rota GET /entregas/csv para download do relatório CSV (apenas admin)
r.get("/entregas/csv", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Buscar todas as entregas para o CSV
    const { rows: entregas } = await query(
      `SELECT id_pedido, nome_cliente, horario_inicio, nome_entregador, 
              horario_recebimento, status_entrega 
       FROM topgas_entregas 
       ORDER BY horario_inicio DESC`
    );
    
    const csv = generateEntregasCSV(entregas);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio_entregas.csv"');
    res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8'));
    
    res.send(csv);
  } catch (error) {
    console.error("Erro ao gerar CSV de entregas:", error);
    res.status(500).json({ error: "Erro interno ao gerar CSV" });
  }
});

// Rota POST /entregas/:id/confirmar para confirmar entrega
r.post("/entregas/:id/confirmar", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await query(
      "UPDATE topgas_entregas SET status_entrega = 'entregue', horario_recebimento = NOW() WHERE id_pedido = $1", 
      [id]
    );
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
    await query(
      "UPDATE topgas_entregas SET status_entrega = 'cancelado' WHERE id_pedido = $1", 
      [id]
    );
    res.json({ message: "Entrega cancelada" });
  } catch (error) {
    console.error("Erro ao cancelar entrega:", error);
    res.status(500).json({ error: "Erro interno ao cancelar entrega" });
  }
});

export default r;