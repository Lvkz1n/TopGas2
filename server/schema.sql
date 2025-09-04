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

-- ===== TOPGAS_ENTREGAS (Tabela principal com todas as informações) =====
CREATE TABLE IF NOT EXISTS topgas_entregas (
  id SERIAL PRIMARY KEY,
  protocolo TEXT NOT NULL,
  nome_cliente TEXT NOT NULL,
  telefone_cliente TEXT NOT NULL,
  mercadoria_pedido TEXT NOT NULL,
  entregador TEXT NOT NULL,
  telefone_entregador TEXT NOT NULL,
  endereco TEXT NOT NULL,
  cidade TEXT NOT NULL,
  bairro TEXT NOT NULL,
  ponto_de_referencia TEXT NOT NULL,
  status_pedido TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'em_andamento' | 'entregue' | 'cancelado'
  data_e_hora_inicio_pedido TEXT NOT NULL,
  data_e_hora_envio_pedido TEXT NOT NULL,
  data_e_hora_confirmacao_pedido TEXT NOT NULL,
  data_e_hora_cancelamento_pedido TEXT NOT NULL,
  unidade_topgas TEXT DEFAULT '0'
);

-- ===== CONFIGURAÇÕES =====
CREATE TABLE IF NOT EXISTS configuracoes (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT ''
);

