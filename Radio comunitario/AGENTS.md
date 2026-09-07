# AGENTS.md

Este documento define as diretrizes para agentes de IA atuando neste repositório. **Todas as IAs devem ler e seguir estritamente este arquivo em todas as interações.**

## Stack Tecnológica
* **Front-end:** React + Vite (SPA)
* **Back-end:** Python + FastAPI (WebSocket)
* **Banco de Dados:** PostgreSQL
* **Tempo real:** WebSocket
* **E-mail:** Mailpit (dev) / SMTP Gmail (produção)
* **Infraestrutura:** Docker e Docker Compose
* **Música:** YouTube Data API v3 + IFrame Player API

## Documentos do Projeto (ler antes de trabalhar)
* `PROJETO.md` — fases e metodologia
* `SPEC.md` — histórias e regras de negócio
* `API.md` — contrato REST + WebSocket (não alterar sem aprovação)
* `DECISIONS.md` — decisões de design
* `design-system.md` — tokens de estilo

## Convenções de Código e Arquitetura
* **Metodologia TDD:** escreva os testes antes da implementação.
* **Python:** PEP 8, type hints, FastAPI + Pydantic (validação antes do banco), pytest. Queries sempre parametrizadas.
* **React:** componentes funcionais e hooks (Vite).
* **Estilização (CSS):** Nunca hardcodar valores. Usar **CSS Variables (design tokens) + CSS Modules**. **Proibido Tailwind.** Seguir obrigatoriamente os tokens de `design-system.md`.
* **Segurança e OWASP Top 10:** seguir rigorosamente. SQL Injection: queries parametrizadas no back e validação estrita no front. Senha com bcrypt, JWT com revogação (`token_version`), verificação de e-mail obrigatória. Apelido e e-mail únicos via campo normalizado (trim + lowercase).
* **Idioma:** variáveis, funções e código em inglês. Comentários e documentações em português.
* **Variáveis de Ambiente:** nunca hardcodar senhas ou chaves. Usar variáveis de ambiente e `.env` local (não commitado).

## Como Rodar e Testar (Via Docker)
* Subir o ambiente: `docker-compose up --build`
* Backend (testes): `pytest`
* Frontend (testes): `npm run test` (Vitest)

## Regras para a IA (O que NÃO fazer sem avisar)
1. Instalar novas dependências (`pip install`, `npm install`, etc.).
2. Modificar o contrato da API (`API.md`).
3. Apagar, ignorar ou pular testes existentes.
4. Alterar as regras de negócio principais (`SPEC.md`).
5. Inserir chaves de API reais no código.
6. Alterar os tokens do `design-system.md`.
