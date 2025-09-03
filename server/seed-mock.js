import dotenv from "dotenv";
import { query } from "./db.js";

dotenv.config();

async function seedClientes() {
  const clientes = [
    { nome_cliente: "João Silva", bairro: "Centro", cidade: "Itabuna", telefone_cliente: "73999990001" },
    { nome_cliente: "Maria Souza", bairro: "Pontal", cidade: "Ilhéus", telefone_cliente: "73999990002" },
    { nome_cliente: "Carlos Almeida", bairro: "São Caetano", cidade: "Itabuna", telefone_cliente: "73999990003" },
    { nome_cliente: "Ana Paula", bairro: "Banco da Vitória", cidade: "Ilhéus", telefone_cliente: "73999990004" }
  ];
  for (const c of clientes) {
    await query(
      `INSERT INTO clientes (nome_cliente, bairro, cidade, telefone_cliente)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT DO NOTHING`,
      [c.nome_cliente, c.bairro, c.cidade, c.telefone_cliente]
    );
  }
}

async function seedEntregas() {
  const { rows: clientes } = await query(
    "SELECT id, bairro, cidade FROM clientes ORDER BY id ASC LIMIT 10"
  );
  const statuses = ["pendente", "entregue", "cancelado"];
  for (let i = 0; i < 30; i++) {
    const c = clientes[i % clientes.length];
    const st = statuses[i % statuses.length];
    await query(
      `INSERT INTO entregas (cliente_id, bairro, cidade, status_pedido)
       VALUES ($1,$2,$3,$4)`,
      [c?.id || null, c?.bairro || null, c?.cidade || null, st]
    );
  }
}

async function seedTopGasEntregas() {
  const entregadores = ["João Entregador", "Maria Entregadora", "Carlos Entregador", "Ana Entregadora"];
  const statuses = ["pendente", "em_andamento", "entregue", "cancelado"];
  
  // Limpar tabela existente
  await query("DELETE FROM topgas_entregas");
  
  for (let i = 1; i <= 50; i++) {
    const status = statuses[i % statuses.length];
    const entregador = entregadores[i % entregadores.length];
    const horarioInicio = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Últimos 30 dias
    const horarioRecebimento = status === 'entregue' ? new Date(horarioInicio.getTime() + Math.random() * 24 * 60 * 60 * 1000) : null;
    
    await query(
      `INSERT INTO topgas_entregas (
        id_cliente, nome_cliente, bairro, cidade, telefone, 
        horario_inicio, nome_entregador, horario_recebimento, status_entrega
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        i,
        `Cliente ${i}`,
        `Bairro ${i % 5 + 1}`,
        i % 2 === 0 ? "Itabuna" : "Ilhéus",
        `7399999${String(i).padStart(4, '0')}`,
        horarioInicio,
        entregador,
        horarioRecebimento,
        status
      ]
    );
  }
}

async function main() {
  await seedClientes();
  await seedEntregas();
  await seedTopGasEntregas();
  console.log("Mock seed concluído.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


