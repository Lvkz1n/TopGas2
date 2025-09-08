import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";
import { generateCSV, setCSVHeaders, asyncHandler, isValidId } from "../utils.js";

const r = Router();

// Função para obter clientes consolidados da tabela topgas_entregas
async function getClientesConsolidados() {
  const { rows } = await query(`
    SELECT 
      MAX(id) as id,
      nome_cliente,
      bairro,
      cidade,
      telefone_cliente as telefone,
      COUNT(CASE WHEN status_pedido = 'entregue' THEN 1 END) as total_pedidos_entregues
    FROM topgas_entregas 
    GROUP BY nome_cliente, bairro, cidade, telefone_cliente
    ORDER BY MAX(id) DESC
  `);
  return rows;
}

// Configuração para CSV de clientes
const CLIENTES_CSV_CONFIG = {
  headers: [
    'ID',
    'Nome do Cliente',
    'Bairro',
    'Cidade', 
    'Telefone',
    'Total de Pedidos Entregues'
  ],
  fieldMapping: {
    'ID': 'id',
    'Nome do Cliente': 'nome_cliente',
    'Bairro': 'bairro',
    'Cidade': 'cidade',
    'Telefone': 'telefone',
    'Total de Pedidos Entregues': 'total_pedidos_entregues'
  }
};

r.get("/", requireAuth, asyncHandler(async (_req, res) => {
  const clientes = await getClientesConsolidados();
  res.json(clientes);
}));

// Rota GET /clientes/csv para download do relatório CSV (apenas admin)
r.get("/csv", requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const clientes = await getClientesConsolidados();
  const csv = generateCSV(clientes, CLIENTES_CSV_CONFIG.headers, CLIENTES_CSV_CONFIG.fieldMapping);
  
  setCSVHeaders(res, "relatorio_clientes.csv");
  res.send(csv);
}));

r.post("/", requireAuth, asyncHandler(async (req, res) => {
  const { nome_cliente, bairro, cidade, telefone_cliente } = req.body || {};
  if (!nome_cliente) return res.status(400).json({ error: "missing_nome" });

  const { rows } = await query(
    `INSERT INTO clientes (nome_cliente, bairro, cidade, telefone_cliente)
     VALUES ($1,$2,$3,$4)
     RETURNING id, nome_cliente, bairro, cidade, telefone_cliente, total_pedidos_entregues`,
    [nome_cliente, bairro || null, cidade || null, telefone_cliente || null]
  );
  res.json(rows[0]);
}));

r.put("/:id", requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { nome_cliente, bairro, cidade, telefone } = req.body || {};
  
  if (!isValidId(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }
  
  // Primeiro, buscar o cliente atual para obter os dados originais
  const { rows: clienteAtual } = await query(`
    SELECT nome_cliente, bairro, cidade, telefone_cliente
    FROM topgas_entregas 
    WHERE id = $1
  `, [id]);
  
  if (!clienteAtual[0]) {
    return res.status(404).json({ error: "Cliente não encontrado" });
  }
  
  const dadosOriginais = clienteAtual[0];
  
  // Atualizar todos os registros do mesmo cliente na tabela topgas_entregas
  const { rows: updatedRows } = await query(
    `UPDATE topgas_entregas
     SET nome_cliente = COALESCE($1, nome_cliente),
         bairro = COALESCE($2, bairro),
         cidade = COALESCE($3, cidade),
         telefone_cliente = COALESCE($4, telefone_cliente)
     WHERE nome_cliente = $5 AND telefone_cliente = $6
     RETURNING id, nome_cliente, bairro, cidade, telefone_cliente`,
    [
      nome_cliente ?? null,
      bairro ?? null,
      cidade ?? null,
      telefone ?? null,
      dadosOriginais.nome_cliente,
      dadosOriginais.telefone_cliente
    ]
  );
  
  if (updatedRows.length === 0) {
    return res.status(404).json({ error: "Nenhum registro atualizado" });
  }
  
  // Retornar os dados atualizados do primeiro registro
  res.json({
    id: updatedRows[0].id,
    nome_cliente: updatedRows[0].nome_cliente,
    bairro: updatedRows[0].bairro,
    cidade: updatedRows[0].cidade,
    telefone: updatedRows[0].telefone_cliente,
    message: `${updatedRows.length} registro(s) atualizado(s) com sucesso`
  });
}));

r.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  
  if (!isValidId(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }
  
  await query("DELETE FROM clientes WHERE id=$1", [id]);
  res.status(204).end();
}));

export default r;
