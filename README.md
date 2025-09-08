# TopGas

Aplicação para gestão de entregas de gás, composta por frontend estático e API Node.js com PostgreSQL. O sistema permite cadastrar e gerenciar entregas, clientes e usuários, além de acompanhar métricas básicas em um painel.

## Principais recursos
- Registro e gestão de entregas com cálculo de tempo total
- Listagem agregada de clientes a partir das entregas
- Autenticação de usuários e perfis de acesso
- Painel de acompanhamento com métricas
- Exportação de relatórios em CSV
- Interface responsiva (desktop e mobile)

## Tecnologias
- Frontend estático (`public/`) com JavaScript vanilla
- API Node.js/Express com PostgreSQL (`server/`)
- Nginx (servir estático e proxy de API)
- Docker (opcional para empacotamento)

## Estrutura do projeto
- `public/`: HTML, CSS e JS do frontend
- `server/`: API (rotas, banco e scripts de migração/seed)
- `Dockerfile.mono` e `nginx.conf`: infraestrutura de execução

## 🚀 Como executar

### Desenvolvimento Local (Localhost)

1. **Clone o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd TopGas2
   ```

2. **Configure o ambiente**
   ```bash
   # Copie o arquivo de exemplo
   cp config.example.env .env
   
   # Edite o .env conforme necessário
   # Para localhost, as configurações padrão já estão corretas
   ```

3. **Instale dependências**
   ```bash
   cd server
   npm install
   ```

4. **Configure o banco de dados**
   ```bash
   # Opção 1: Usar Docker (recomendado)
   docker-compose up db -d
   
   # Opção 2: PostgreSQL local na porta 5433
   # Certifique-se de que o PostgreSQL está rodando
   ```

5. **Execute migrações e seed**
   ```bash
   npm run setup:localhost
   ```

6. **Inicie o servidor de desenvolvimento**
   ```bash
   npm run dev:localhost
   ```

7. **Acesse a aplicação**
   - Frontend: http://localhost:3000
   - API: http://localhost:3000/api

### Produção (Easy Panel)

1. **Configure variáveis de ambiente**
   ```bash
   NODE_ENV=production
   PORT=8080
   DATABASE_URL=postgres://postgres:postgres_cerion@2025@166.0.186.92:5432/postgres_rabbitmq
   CORS_ORIGIN=*
   SERVE_STATIC=false
   ```

2. **Execute a aplicação**
   ```bash
   npm run start:easypanel
   ```

### Docker (Desenvolvimento)

```bash
# Apenas banco de dados
docker-compose up db -d

# Aplicação completa para desenvolvimento
docker-compose up app-dev -d

# Aplicação para produção
docker-compose --profile production up app-prod -d
```

## 📊 Funcionalidades

### Entregas
- Visualização de todas as entregas com filtros
- Cálculo automático de tempo total (início → finalização)
- Confirmação e cancelamento de entregas
- Exportação de relatórios em CSV
- Interface responsiva para mobile

### Clientes
- Listagem consolidada de clientes
- Edição de dados dos clientes
- Histórico de entregas por cliente
- Exportação de relatórios

### Dashboard
- Métricas em tempo real
- Gráficos de regiões mais atendidas
- Contadores de status das entregas

### Usuários e Configurações
- Gerenciamento de usuários (apenas admin)
- Configurações do sistema (apenas admin)

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev                 # Modo desenvolvimento
npm run dev:localhost       # Desenvolvimento local na porta 3000

# Produção
npm start                   # Produção padrão
npm run start:easypanel     # Produção para Easy Panel

# Banco de dados
npm run db:migrate          # Executar migrações
npm run db:seed             # Popular banco com dados básicos
npm run db:seed:mock        # Popular com dados de teste
npm run setup:localhost     # Setup completo para localhost
```

## 🌐 Configuração de Ambiente

O sistema detecta automaticamente o ambiente baseado nas variáveis:

- **Localhost**: `NODE_ENV=development` ou `LOCALHOST=true`
- **Easy Panel**: `NODE_ENV=production` sem `LOCALHOST`

### Variáveis de Ambiente

| Variável | Localhost | Easy Panel | Descrição |
|----------|-----------|------------|-----------|
| `NODE_ENV` | `development` | `production` | Ambiente de execução |
| `PORT` | `3000` | `8080` | Porta do servidor |
| `CORS_ORIGIN` | `http://localhost:3000` | `*` | Origem permitida para CORS |
| `SERVE_STATIC` | `true` | `false` | Servir arquivos estáticos |
| `DATABASE_URL` | `postgres://...@localhost:5433/topgas` | `postgres://...@166.0.186.92:5432/postgres_rabbitmq` | URL do banco |

## 🐛 Solução de Problemas

### Erro de conexão com banco
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no arquivo `.env`
- Para Docker: `docker-compose up db -d`

### CORS errors
- Para localhost: `CORS_ORIGIN=http://localhost:3000`
- Para Easy Panel: `CORS_ORIGIN=*`

### Porta já em uso
- Localhost: mude `PORT=3000` para outra porta
- Easy Panel: use `PORT=8080`

## 📝 Notas de Desenvolvimento

- O sistema foi refatorado para remover repetições de código
- Utilitários compartilhados estão em `server/utils.js` e `public/js/utils.js`
- Cálculo de tempo total das entregas foi corrigido
- Interface responsiva melhorada
- Tratamento de erros aprimorado

