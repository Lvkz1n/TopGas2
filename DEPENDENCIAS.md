# 📋 DEPENDÊNCIAS E CORREÇÕES - TopGas

## ✅ **CORREÇÕES APLICADAS:**

### 1. **package.json** - Dependência faltando
```json
"cookie": "^0.5.0"  // Adicionado
```

### 2. **Dockerfile.mono** - Build corrigido
```dockerfile
RUN npm install  // Removido --only=production
```

### 3. **docker-compose.yml** - Variável adicionada
```yaml
SKIP_WEBHOOKS: 'true'  // Adicionado
```

### 4. **nginx.conf** - Proxy corrigido
```nginx
proxy_pass http://127.0.0.1:8080/api/;  // Corrigido
```

## 📦 **DEPENDÊNCIAS COMPLETAS:**

### **Node.js (server/package.json):**
```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",        // Hash de senhas
    "cookie": "^0.5.0",          // Parse de cookies (ADICIONADO)
    "cookie-parser": "^1.4.6",   // Middleware cookies
    "cors": "^2.8.5",            // CORS
    "dotenv": "^16.4.5",         // Variáveis de ambiente
    "express": "^4.19.2",        // Framework web
    "pg": "^8.12.0"              // PostgreSQL client
  },
  "devDependencies": {
    "cross-env": "^7.0.3"        // Variáveis cross-platform
  }
}
```

### **Docker:**
- `node:20-alpine` - Runtime Node.js
- `nginx:alpine` - Servidor web
- `supervisor` - Gerenciador de processos
- `postgres:15-alpine` - Banco de dados

### **Sistema:**
- Node.js 20+
- PostgreSQL 15+
- Docker & Docker Compose

## 🔧 **VARIÁVEIS DE AMBIENTE NECESSÁRIAS:**

```bash
# Obrigatórias
DATABASE_URL=postgres://postgres:postgres@localhost:5432/topgas
CORS_ORIGIN=http://localhost
ADMIN_EMAIL=admin@topgas.local
ADMIN_PASSWORD=admin123

# Opcionais
SERVE_STATIC=false
PORT=8080
NODE_ENV=development
SKIP_WEBHOOKS=true  # Para desenvolvimento
```

## 🚀 **COMANDOS PARA EXECUTAR:**

### **Local (sem Docker):**
```bash
cd server
npm install
node db-migrate.js
node seed.js
npm run dev
```

### **Docker Compose:**
```bash
docker compose up --build -d
docker compose exec app node db-migrate.js
docker compose exec app node seed.js
```

### **EasyPanel:**
- Dockerfile: `Dockerfile.mono`
- Porta: `80`
- Variáveis: Todas listadas acima
- Dependência: Serviço PostgreSQL

## ✅ **STATUS:**
- ✅ Dependências corrigidas
- ✅ Dockerfile funcionando
- ✅ Nginx configurado
- ✅ Variáveis de ambiente completas
- ✅ Schema SQL válido
- ✅ Rotas funcionando
- ✅ Autenticação implementada

## 🧪 **TESTES:**
```bash
# Health
curl http://localhost:8080/api/health

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@topgas.local","password":"admin123"}'

# Métricas (com cookie)
curl http://localhost:8080/api/metricas \
  -H "Cookie: tg.session=SEU_COOKIE"
```
