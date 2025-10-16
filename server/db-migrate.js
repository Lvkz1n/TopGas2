import dotenv from "dotenv";
import { pool } from "./db.js";

dotenv.config();

const ddl = `
-- ===== USUARIOS =====
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nome TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_email ON usuarios(email);

-- ===== CLIENTES =====
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome_cliente TEXT NOT NULL,
  bairro TEXT,
  cidade TEXT,
  telefone_cliente TEXT,
  total_pedidos_entregues INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_cliente TEXT;
ALTER TABLE clientes ALTER COLUMN nome_cliente SET NOT NULL;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefone_cliente TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS total_pedidos_entregues INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ===== ENTREGAS =====
CREATE TABLE IF NOT EXISTS entregas (
  id SERIAL PRIMARY KEY
);
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS cliente_id INTEGER;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS status_pedido TEXT NOT NULL DEFAULT 'pendente';
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS data_e_hora_confirmacao_pedido TIMESTAMPTZ;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS data_e_hora_cancelamento_pedido TIMESTAMPTZ;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
-- referência opcional (ignorar erro se já existir constraint com outro nome)
DO $$ BEGIN
  ALTER TABLE entregas
    ADD CONSTRAINT fk_entregas_cliente
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_entregas_status ON entregas(status_pedido);
CREATE INDEX IF NOT EXISTS idx_entregas_bairro ON entregas(bairro);

-- ===== CONFIGURACOES =====
CREATE TABLE IF NOT EXISTS configuracoes (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT ''
);
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE configuracoes ALTER COLUMN key SET NOT NULL;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS value TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_configuracoes_key ON configuracoes(key);

-- ===== PRODUTOS =====
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_pix NUMERIC(10,2),
  valor_debito NUMERIC(10,2),
  valor_credito NUMERIC(10,2),
  valor_entrega NUMERIC(10,2),
  valor_retirada NUMERIC(10,2),
  unidade TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);
-- limpeza de colunas antigas
ALTER TABLE produtos DROP COLUMN IF EXISTS codigo;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE produtos ALTER COLUMN nome SET NOT NULL;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS valor NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS valor_pix NUMERIC(10,2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS valor_debito NUMERIC(10,2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS valor_credito NUMERIC(10,2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS valor_entrega NUMERIC(10,2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS valor_retirada NUMERIC(10,2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS unidade TEXT;
ALTER TABLE produtos ALTER COLUMN unidade SET NOT NULL;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_unidade ON produtos(unidade);
`;

async function main() {
  await pool.query(ddl);
  console.log("Migração aplicada com sucesso.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Falha na migração:", e.message);
  process.exit(1);
});


