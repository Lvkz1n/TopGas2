// Configuração do banco de dados
export const dbConfig = {
  host: '166.0.186.92',
  port: 5432,
  database: 'postgres_rabbitmq',
  user: 'postgres',
  password: 'postgres_cerion@2025',
  ssl: false
};

// URL de conexão completa
export const DATABASE_URL = `postgres://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}?sslmode=disable`;

// Configurações do servidor
export const serverConfig = {
  port: process.env.PORT || 8080,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  sessionSecret: process.env.SESSION_SECRET || 'topgas_secret_key_2025',
  nodeEnv: process.env.NODE_ENV || 'production',
  serveStatic: process.env.SERVE_STATIC === 'true' || true
};
