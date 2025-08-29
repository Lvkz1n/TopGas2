# TopGas

Aplicação para gestão de entregas de gás, composta por frontend estático e API Node.js com PostgreSQL. O sistema permite cadastrar e gerenciar entregas, clientes e usuários, além de acompanhar métricas básicas em um painel.

## Principais recursos
- Registro e gestão de entregas
- Listagem agregada de clientes a partir das entregas
- Autenticação de usuários e perfis de acesso
- Painel de acompanhamento

## Tecnologias
- Frontend estático (`public/`)
- API Node.js/Express com PostgreSQL (`server/`)
- Nginx (servir estático e proxy de API)
- Docker (opcional para empacotamento)

## Estrutura do projeto
- `public/`: HTML, CSS e JS do frontend
- `server/`: API (rotas, banco e scripts de migração/seed)
- `Dockerfile.mono` e `nginx.conf`: infraestrutura de execução

## Como executar (visão geral)
- Configure variáveis de ambiente em `server/.env` com credenciais do banco
- Instale dependências no diretório `server/`
- Execute as migrações e inicialização do banco
- Inicie a API e sirva os arquivos estáticos

Observação: este README não inclui dados sensíveis, links externos ou credenciais de acesso. Consulte o arquivo de anotações (ignorado no repositório) para detalhes de desenvolvimento.
