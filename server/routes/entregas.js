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
r.get("/", requireAuth, async (req, res) => {
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

// Rota de teste para verificar dados
r.get("/test-data", requireAuth, requireAdmin, async (req, res) => {
  try {
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
      data: rows 
    });
  } catch (error) {
    console.error("Erro ao buscar dados de teste:", error);
    res.status(500).json({ error: "Erro interno", details: error.message });
  }
});

// Rota GET /entregas/csv para download do relatório CSV (apenas admin)
r.get("/csv", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    
    console.log("=== INÍCIO CSV ===");
    console.log("Parâmetros recebidos:", { data_inicio, data_fim });
    
    // Query mais simples primeiro
    let querySQL = `SELECT * FROM topgas_entregas LIMIT 10`;
    let params = [];
    
    // Se tem filtro de período, aplicar
    if (data_inicio && data_fim) {
      querySQL = `
        SELECT * FROM topgas_entregas 
        WHERE data_e_hora_inicio_pedido IS NOT NULL 
        AND DATE(data_e_hora_inicio_pedido) BETWEEN $1 AND $2
        ORDER BY id DESC
      `;
      params = [data_inicio, data_fim];
    }
    
    console.log("Query SQL:", querySQL);
    console.log("Parâmetros:", params);
    
    const { rows: entregas } = await query(querySQL, params);
    console.log(`Encontradas ${entregas.length} entregas`);
    
    if (entregas.length === 0) {
      console.log("Nenhuma entrega encontrada");
      return res.status(404).json({ 
        error: "Nenhuma entrega encontrada para o período selecionado",
        details: `Período: ${data_inicio} a ${data_fim}`
      });
    }
    
    // CSV simples para teste
    const csv = "ID,Protocolo,Nome,Status\n" + 
                entregas.map(e => `${e.id},${e.protocolo || ''},"${e.nome_cliente || ''}",${e.status_pedido || ''}`).join('\n');
    
    const filename = data_inicio && data_fim 
      ? `relatorio_${data_inicio}_${data_fim}.csv`
      : 'relatorio.csv';
    
    console.log("CSV gerado:", csv.length, "caracteres");
    console.log("=== FIM CSV ===");
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
    
  } catch (error) {
    console.error("=== ERRO CSV ===");
    console.error("Erro:", error.message);
    console.error("Stack:", error.stack);
    console.error("=== FIM ERRO ===");
    res.status(500).json({ 
      error: "Erro interno ao gerar CSV", 
      details: error.message,
      stack: error.stack 
    });
  }
});

// Rota POST /entregas/:id/confirmar para confirmar entrega
r.post("/:id/confirmar", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await query(
      "UPDATE topgas_entregas SET status_pedido = 'entregue', data_e_hora_confirmacao_pedido = NOW()::text WHERE id = $1", 
      [id]
    );
    res.json({ message: "Entrega confirmada" });
  } catch (error) {
    console.error("Erro ao confirmar entrega:", error);
    res.status(500).json({ error: "Erro interno ao confirmar entrega" });
  }
});

// Rota POST /entregas/:id/cancelar para cancelar entrega
r.post("/:id/cancelar", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await query(
      "UPDATE topgas_entregas SET status_pedido = 'cancelado', data_e_hora_cancelamento_pedido = NOW()::text WHERE id = $1", 
      [id]
    );
    res.json({ message: "Entrega cancelada" });
  } catch (error) {
    console.error("Erro ao cancelar entrega:", error);
    res.status(500).json({ error: "Erro interno ao cancelar entrega" });
  }
});

export default r;