-- Schema do banco para TopGas (PostgreSQL)

-- extensões úteis (opcional)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== USUÁRIOS =====
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nome TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'user'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- ===== ENTREGAS =====
CREATE TABLE IF NOT EXISTS entregas (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  bairro TEXT,
  cidade TEXT,
  status_pedido TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'entregue' | 'cancelado'
  data_e_hora_confirmacao_pedido TIMESTAMPTZ,
  data_e_hora_cancelamento_pedido TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_entregas_status ON entregas(status_pedido);
CREATE INDEX IF NOT EXISTS idx_entregas_bairro ON entregas(bairro);

-- ===== CONFIGURAÇÕES =====
CREATE TABLE IF NOT EXISTS configuracoes (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT ''
);


