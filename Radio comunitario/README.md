# Rádio Comunitária

Sistema de rádio comunitária em tempo real: entre com um apelido, busque músicas (YouTube), monte uma fila coletiva, vote para pular e ouça sincronizado com os outros ouvintes — como uma rádio de verdade.

## Stack

- **Front-end:** React + Vite + TypeScript (Vitest)
- **Back-end:** Python + FastAPI (WebSocket)
- **Banco:** PostgreSQL (SQLAlchemy + Alembic)
- **Tempo real:** WebSocket
- **E-mail:** Mailpit (dev) / SMTP Gmail (produção)
- **Música:** YouTube Data API v3 + IFrame Player API
- **Infra:** Docker Compose

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [uv](https://docs.astral.sh/uv/) (gerenciador de dependências Python)
- [Node.js](https://nodejs.org/) 20+ (para rodar o front fora do Docker)

## Documentos do projeto

| Arquivo | Conteúdo |
|---|---|
| `PROJETO.md` | fases e metodologia |
| `SPEC.md` | histórias e regras de negócio |
| `API.md` | contrato REST + WebSocket |
| `DECISIONS.md` | decisões de design |
| `design-system.md` | tokens de estilo |
| `AGENTS.md` | regras para a IA |

## Configuração (.env)

Copie o modelo e preencha (nunca commitado):

```bash
cp .env.example .env
```

Variáveis principais:

| Variável | Descrição |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | credenciais do banco |
| `SECRET_KEY` | chave do JWT (use valor forte) |
| `YOUTUBE_API_KEY` | chave da YouTube Data API v3 |
| `SMTP_HOST` / `SMTP_PORT` | servidor de e-mail (Mailpit em dev) |
| `SMTP_FROM` | remetente do e-mail de verificação |

## Como rodar

### 1. Docker (tudo de uma vez)

```bash
docker compose up --build
```

Serviços e portas:

- Frontend: http://localhost:5173
- Backend (API/docs): http://localhost:8000 (`/docs` para o Swagger)
- Mailpit (e-mails): http://localhost:8025
- PostgreSQL: `localhost:5432`

> **Nota:** o `docker-compose.yml` usa `network_mode: host` (todas as portas ficam expostas direto no host). Isso é necessário neste ambiente, onde o Docker não consegue criar rede bridge (`operation not supported`). Em máquinas com Docker normal, o bridge funciona — basta restaurar `ports:` e os nomes de serviço (`db`, `mailpit`) se quiser o modo tradicional.

### 2. Manual (sem Docker Compose)

**Banco + e-mail (Docker):**

```bash
docker compose up -d db mailpit
```

**Backend:**

```bash
cd backend
uv sync                 # instala dependências
uv run alembic upgrade head   # aplica migrações
uv run uvicorn radio_backend.main:app --reload
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

## Testes

**Backend** (requer o PostgreSQL rodando em `localhost:5432`; o banco de teste `radio_test` é criado automaticamente):

```bash
cd backend
uv run pytest
```

**Frontend:**

```bash
cd frontend
npm run test:run
```

**E2E (Playwright):** requer a stack rodando (`docker compose up --build`) e o navegador instalado (`npx playwright install chromium`):

```bash
cd frontend
npm run test:e2e
```

## Lint e type checking

**Backend:**

```bash
cd backend
uv run ruff check .
uv run mypy src
```

**Frontend:**

```bash
cd frontend
npm run lint
npm run build   # inclui tsc (typecheck)
```

## Migrações (Alembic)

```bash
cd backend
uv run alembic upgrade head                  # aplica
uv run alembic revision --autogenerate -m "..."   # gera nova a partir dos models
```

## Estrutura

```
Radio comunitario/
  backend/          # FastAPI (src/radio_backend) + Alembic + pytest
  frontend/         # Vite + React + TypeScript + Vitest
  docker-compose.yml
  .env.example
  *.md              # documentação do projeto
```
