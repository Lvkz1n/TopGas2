import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";

const r = Router();

// Função para obter entregas do banco com paginação
async function getEntregas(page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  
  // Buscar total de registros
  const { rows: totalRows } = await query("SELECT COUNT(*) as total FROM topgas_entregas");
  const total = parseInt(totalRows[0].total);
  
  // Buscar registros da página atual
  const { rows } = await query(
    `SELECT id, protocolo, nome_cliente, telefone_cliente, mercadoria_pedido, 
            entregador, telefone_entregador, endereco, cidade, bairro, 
            ponto_de_referencia, status_pedido, data_e_hora_inicio_pedido, 
            data_e_hora_envio_pedido, data_e_hora_confirmacao_pedido, 
            data_e_hora_cancelamento_pedido, unidade_topgas
     FROM topgas_entregas 
     ORDER BY data_e_hora_inicio_pedido DESC
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
    'ID',
    'Protocolo',
    'Nome do Cliente', 
    'Telefone do Cliente',
    'Mercadoria/Pedido',
    'Entregador',
    'Telefone do Entregador',
    'Endereço',
    'Cidade',
    'Bairro',
    'Ponto de Referência',
    'Status do Pedido',
    'Data e Hora de Início',
    'Data e Hora de Envio',
    'Data e Hora de Confirmação',
    'Data e Hora de Cancelamento',
    'Unidade TopGas'
  ];
  
  const csvRows = [headers.join(',')];
  
  for (const entrega of entregas) {
    const row = [
      entrega.id,
      entrega.protocolo,
      `"${entrega.nome_cliente}"`,
      entrega.telefone_cliente,
      `"${entrega.mercadoria_pedido}"`,
      `"${entrega.entregador}"`,
      entrega.telefone_entregador,
      `"${entrega.endereco}"`,
      `"${entrega.cidade}"`,
      `"${entrega.bairro}"`,
      `"${entrega.ponto_de_referencia}"`,
      entrega.status_pedido,
      entrega.data_e_hora_inicio_pedido || '',
      entrega.data_e_hora_envio_pedido || '',
      entrega.data_e_hora_confirmacao_pedido || '',
      entrega.data_e_hora_cancelamento_pedido || '',
      entrega.unidade_topgas || ''
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
      `SELECT id, protocolo, nome_cliente, telefone_cliente, mercadoria_pedido, 
              entregador, telefone_entregador, endereco, cidade, bairro, 
              ponto_de_referencia, status_pedido, data_e_hora_inicio_pedido, 
              data_e_hora_envio_pedido, data_e_hora_confirmacao_pedido, 
              data_e_hora_cancelamento_pedido, unidade_topgas
       FROM topgas_entregas 
       ORDER BY data_e_hora_inicio_pedido DESC`
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
      "UPDATE topgas_entregas SET status_pedido = 'entregue', data_e_hora_confirmacao_pedido = NOW() WHERE id = $1", 
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
      "UPDATE topgas_entregas SET status_pedido = 'cancelado', data_e_hora_cancelamento_pedido = NOW() WHERE id = $1", 
      [id]
    );
    res.json({ message: "Entrega cancelada" });
  } catch (error) {
    console.error("Erro ao cancelar entrega:", error);
    res.status(500).json({ error: "Erro interno ao cancelar entrega" });
  }
});

export default r;