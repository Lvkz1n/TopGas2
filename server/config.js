// Detectar ambiente
const isLocalhost = process.env.NODE_ENV === 'development' || 
                   process.env.LOCALHOST === 'true' ||
                   !process.env.DATABASE_URL;

// Configuração do banco de dados
export const dbConfig = isLocalhost ? {
  // Configuração para localhost/desenvolvimento
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5433,
  database: process.env.DB_NAME || 'topgas',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: false
} : {
  // Configuração para Easy Panel/produção
  host: process.env.DB_HOST || '166.0.186.92',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'postgres_rabbitmq',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres_cerion@2025',
  ssl: false
};

// URL de conexão completa
export const DATABASE_URL = process.env.DATABASE_URL || 
  `postgres://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}?sslmode=disable`;

// Configurações do servidor
export const serverConfig = {
  port: parseInt(process.env.PORT) || (isLocalhost ? 3000 : 8080),
  corsOrigin: process.env.CORS_ORIGIN || (isLocalhost ? 'http://localhost:3000' : '*'),
  sessionSecret: process.env.SESSION_SECRET || 'topgas_secret_key_2025',
  nodeEnv: process.env.NODE_ENV || (isLocalhost ? 'development' : 'production'),
  serveStatic: process.env.SERVE_STATIC === 'true' || isLocalhost,
  isLocalhost
};
