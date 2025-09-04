import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";

const r = Router();

// Função para obter clientes consolidados da tabela topgas_entregas
async function getClientesConsolidados() {
  const { rows } = await query(`
    SELECT 
      MIN(id) as id,
      nome_cliente,
      bairro,
      cidade,
      telefone_cliente as telefone,
      COUNT(CASE WHEN status_pedido = 'entregue' THEN 1 END) as total_pedidos_entregues
    FROM topgas_entregas 
    GROUP BY nome_cliente, bairro, cidade, telefone_cliente
    ORDER BY nome_cliente
  `);
  return rows;
}

// Função para gerar CSV de clientes
function generateClientesCSV(clientes) {
  const headers = [
    'ID',
    'Nome do Cliente',
    'Bairro',
    'Cidade', 
    'Telefone',
    'Total de Pedidos Entregues'
  ];
  
  const csvRows = [headers.join(',')];
  
  for (const cliente of clientes) {
    const row = [
      cliente.id,
      `"${cliente.nome_cliente}"`,
      `"${cliente.bairro || ''}"`,
      `"${cliente.cidade || ''}"`,
      cliente.telefone || '',
      cliente.total_pedidos_entregues
    ];
    csvRows.push(row.join(','));
  }
  
  return csvRows.join('\n');
}

r.get("/", requireAuth, async (_req, res) => {
  try {
    const clientes = await getClientesConsolidados();
    res.json(clientes);
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    res.status(500).json({ error: "Erro interno ao buscar clientes" });
  }
});

// Rota GET /clientes/csv para download do relatório CSV (apenas admin)
r.get("/csv", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const clientes = await getClientesConsolidados();
    const csv = generateClientesCSV(clientes);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio_clientes.csv"');
    res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8'));
    
    res.send(csv);
  } catch (error) {
    console.error("Erro ao gerar CSV de clientes:", error);
    res.status(500).json({ error: "Erro interno ao gerar CSV" });
  }
});

r.post("/", requireAuth, async (req, res) => {
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

r.put("/:id", requireAuth, async (req, res) => {
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

r.delete("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await query("DELETE FROM clientes WHERE id=$1", [id]);
  res.status(204).end();
});

export default r;
