# TopGas

## Executar local (sem Docker)
1. Instale Node 20+ e PostgreSQL 15+.
2. Crie o banco: `topgas`.
3. Copie `server/.env.example` para `server/.env` e ajuste `DATABASE_URL`.
4. No diretório `server/`:
   - `npm install`
   - `node db-migrate.js` (cria/atualiza tabelas)
   - `node seed.js` (cria admin) — login: `admin@topgas.local` / `admin123`
   - Opcional: `node seed-mock.js` (dados fake)
   - `npm run dev` (API em `http://localhost:8080`)
5. Para ver o frontend estático no dev pelo Node, defina `SERVE_STATIC=true` no `.env` e acesse `http://localhost:8080`.
   - Endpoints de API em `/api/*` (ex.: `/api/health`).

## Executar com Docker Compose
1. `docker compose up --build -d`
2. Acesse `http://localhost:8080` (Nginx serve estático e faz proxy `/api` → Node).
3. Popular dados (opcional):
   - `docker compose exec app node db-migrate.js`
   - `docker compose exec app node seed.js`
   - `docker compose exec app node seed-mock.js`

## Deploy no EasyPanel
- App do tipo Dockerfile, apontando para `Dockerfile.mono`.
- Variáveis de ambiente no painel (iguais às do `.env`):
  - `DATABASE_URL` (use o Postgres do EasyPanel ou externo)
  - `CORS_ORIGIN` (ex.: `https://seu-dominio`)
  - `NODE_ENV=production`, `PORT=8080`, `SERVE_STATIC=false`
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- Porta exposta: 80 (o Nginx interno atende e proxy para a API).

## Estrutura
- `public/`: frontend estático (html/css/js).
- `server/`: API Node (Express + Postgres).
- `Dockerfile.mono`: container com Nginx + Node via Supervisor.
- `nginx.conf`: serve estático e proxy `/api`.

## Comandos úteis
- `npm run db:migrate` → `node db-migrate.js`
- `npm run db:apply` aplica `schema.sql` diretamente.
- `npm run db:seed` cria admin; `npm run db:seed:mock` dados de exemplo.

## Healthcheck
- `GET /api/health` → `{ ok: true }`
