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

async function main() {
  await seedClientes();
  await seedEntregas();
  console.log("Mock seed concluído.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


