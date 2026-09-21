# DIARIO.md

Registro por tarefa: o que a IA acertou, onde errou e o que foi feito na mão.

## C1 — Autenticação

- **O que a IA acertou:** backend completo de autenticação (models User/VerificationToken, bcrypt,
  JWT com revogação via `token_version`, verificação de e-mail, normalização apelido/e-mail,
  endpoints register/login/verify/logout) com 80 testes passando (incluindo 16 payloads de SQL
  injection), migração Alembic e ambiente Docker Compose rodando de ponta a ponta.
- **Onde a IA errou:** entregou apenas o backend e deixou o frontend do C1 incompleto
  (páginas de login, cadastro e verificação não foram implementadas).
- **Motivo da falha:** a IA interpretou o checkpoint C1 como "autenticação = backend", sem
  planejar a parte de frontend nem confirmar o escopo completo com o aluno antes de avançar.
  O erro só foi identificado quando o aluno apontou que faltava a página de login.
- **Esclarecimento de arquitetura:** o WebSocket não é pendência do C1 (entra só em C3/C4).
  O princípio confirmado: o frontend nunca chama serviço externo direto (YouTube, SMTP); tudo
  passa pelo backend. Registrado como regra no `AGENTS.md`.
- **O que foi feito na mão:** (preencher).

## Correção pós-C1 — CORS + testes de integração + E2E

- **Onde a IA errou:** não configurou CORS e não criou testes de integração de conexão. O erro
  "OPTIONS /api/auth/register → 405" e "falta `Access-Control-Allow-Origin`" (front `:5173` →
  back `:8000`) só apareceu ao rodar no navegador, pois nenhum teste verificava front↔back.
- **Correção:** `CORSMiddleware` restrito à origem do front + testes de CORS (preflight
  permitido/negado) + endpoint `/health/db` com teste de conexão back↔banco + E2E com Playwright
  (cadastro → verificação via Mailpit → login).
- **Bugs pegos pelos novos testes:**
  1. E-mail `@example.com` era rejeitado (deliverability check) → trocado para validação de
     formato apenas (`check_deliverability=False`).
  2. Verificação não era idempotente (deletava o token) → o StrictMode do React chamava o
     endpoint duas vezes e a segunda falhava com "token inválido ou expirado" → verify agora
     é idempotente.
  3. Login redirecionava para `/`, que voltava para `/login` → criada a página `Radio` como home.
- **O que foi feito na mão:** (preencher).

## Testes adicionados (correção pós-C1)

### Backend (pytest — 84 testes no total)
- `tests/test_cors.py`
  - `test_cors_preflight_allowed` — preflight com origem permitida retorna 200 + header correto.
  - `test_cors_preflight_disallowed` — origem não permitida retorna 400.
- `tests/test_health.py`
  - `test_health_db` — conexão back↔banco (`GET /health/db` faz `SELECT 1`).
- `tests/test_auth.py`
  - `test_verify_is_idempotent` — verificar o mesmo token duas vezes retorna 200 nas duas.

### Frontend (Vitest — 8 testes no total)
- `src/App.test.tsx` — `/` renderiza a rádio e `/login` renderiza o login.
- `src/components/LoginForm.test.tsx` — login salva o token; erro é exibido.
- `src/components/RegisterForm.test.tsx` — cadastro mostra "verificação"; erro é exibido.
- `src/hooks/useTheme.test.tsx` — tema começa em system/light e alterna para dark persistindo.

### E2E (Playwright — 3 testes)
- `e2e/login.spec.ts`
  - `página de login renderiza`
  - `cadastro mostra mensagem de verificação`
  - `fluxo completo: cadastro, verificação e login` (usa Mailpit para extrair o token)

## Isolamento do banco de dados nos testes

- **Problema:** o E2E (Playwright) rodava contra o backend de desenvolvimento (`:8000` → banco
  `radio`), poluindo o banco de dev com usuários de teste (`user*@example.com`).
- **Correção:** o E2E agora sobe um backend de teste (`:8001`) e um front de teste (`:5174`),
  apontando para um banco dedicado `radio_e2e`. Esse banco é **criado antes** (`scripts/e2e_db.py
  create`) e **dropado depois** (`scripts/e2e_db.py drop`, via `globalTeardown`) dos testes.
- **Ajuste de apoio:** o link de verificação de e-mail deixou de ser hardcoded em `:5173` e passou
  a usar a config `FRONTEND_URL` (necessário porque o front de teste roda em `:5174`).
- **Resultado:** `radio` (dev) nunca é tocado; `radio_test` (pytest) já era isolado.

## C1 — Autenticação (concluído)

- **Status:** completo (backend + frontend + testes + infraestrutura).
- **Backend:** register/login (apelido e e-mail), verificação por e-mail, JWT com revogação
  (`token_version`), normalização apelido/e-mail, política de senha, CORS, `/health/db`.
- **Frontend:** páginas Login, Cadastro, Verificação e Rádio (home), tema claro/escuro
  (`useTheme`), cliente de API (só fala com o backend).
- **Testes:** pytest (84, incl. SQL injection e CORS), Vitest (8), Playwright E2E (3).
- **Bancos isolados:** `radio` (dev), `radio_test` (pytest), `radio_e2e` (E2E, criado/dropado).
- **O que foi feito na mão:** (preencher).

## C2 — Rádio: Tarefa 1 (models + migração)

- **Status:** concluído.
- **O que foi feito:** models `Song`, `QueueItem`, `Vote`, `History`, `PlaybackState` +
  migração `a4f9c2e71b5d` (reversível), `models/__init__.py` e `conftest.py` (fixture
  `db_session` + truncate das novas tabelas), e 6 testes novos em `tests/test_models.py`
  (unicidade de `youtube_id`, voto duplicado, FKs e `PlaybackState`).
- **Nota de spec:** `queue_item.added_by` e `vote.user_id/queue_item_id` não apareciam na
  lista de atributos das entidades em `SPEC.md`, mas são exigidos pelas regras 1 (limite de
  3 por pessoa) e 4 (voto duplicado) e pelo relacionamento `USER ||--o{ QUEUE_ITEM`.
  Implementados sem alterar o contrato de `API.md`.
- **Testes:** pytest passou de 84 → 90; `ruff` e `mypy src` limpos.
- **O que a IA acertou:** (preencher).
- **O que a IA errou:** (preencher).
- **O que foi feito na mão:** (preencher).

## C2 — Rádio: Tela (frontend + MSW como fake backend)

- **Status:** concluído.
- **Decisão do aluno:** não mexer no backend real por enquanto; o front consome `/api/*`
  normalmente e um **fake backend (MSW)** atende apenas os testes. Sem preview no navegador.
- **O que foi feito:** devDependency `msw` + handlers em `src/test/handlers.ts` e servidor em
  `src/test/setup.ts`; camada `api/radio.ts` (tipos alinhados ao `API.md`) e `logoutUser`;
  guard `RequireAuth` na rota `/`; hooks `useQueue`/`useHistory`/`usePlayer` (IFrame do YouTube);
  componentes `PlayerBar` (IFrame real), `SearchBar`, `QueueList`, `HistoryList`, `MuteButton`;
  página `Radio` completa; estilos 100% em tokens (CSS Modules, sem Tailwind).
- **Testes:** Vitest passou de 8 → 22; `oxlint` 0 warnings/0 erros; `tsc`/`vite build` ok.
- **Observação (lint):** a regra experimental `react/set-state-in-effect` do oxlint apontava
  falso positivo no padrão de fetch assíncrono via `useCallback`. Corrigido espelhando o padrão
  já usado em `Verify.tsx` (função async definida dentro do `useEffect` com flag de cancelamento).
- **O que a IA acertou:** (preencher).
- **O que a IA errou:** (preencher).
- **O que foi feito na mão:** (preencher).

## C2 — Rádio: MVP backend (busca, fila, motor) + ligação com o front

- **Status:** concluído (MVP funcional de ponta a ponta).
- **Backend:** `GET /songs/search` (YouTube real, 2 chamadas `search.list` + `videos.list`,
  parse ISO 8601 → segundos, cache TTL, `503` em falha); `POST/GET /queue` e
  `POST /queue/{id}/vote` (limite 3/pessoa, repetição últimas 20, voto idempotente via
  `ON CONFLICT DO NOTHING`, advisory lock para concorrência); motor de reprodução em
  background (`services/playback.py`) com avanço por duração, skip >50% (presença por
  heartbeat) e `PlaybackState` no banco; `GET /state` e `GET /history`; handler global de
  exceção (500 sempre JSON) + lifespan no `main.py`.
- **Frontend:** polling em `useQueue`/`useHistory` (efeito "tempo real" sem WebSocket);
  `apiFetch` com timeout (AbortController) e tratamento de 401; `ErrorBoundary`; catch no logout.
- **Testes:** pytest passou de 90 → 145; Vitest 22; `ruff`/`mypy src`/`oxlint`/`tsc` limpos.
- **Smoke test real:** registro → verificação (Mailpit) → login → busca "led zeppelin"
  (10 resultados com duração correta) → adicionar à fila → motor inicia a música (state).
- **Decisões de MVP:** skip usa presença por heartbeat (WebSocket fica para depois); DJ
  automático e mudo "até música X" ficam de fora por ora.
- **O que a IA acertou:** (preencher).
- **O que a IA errou:** (preencher).
- **O que foi feito na mão:** (preencher).

## Correção pós-MVP — bugs encontrados no teste manual (navegador)

- **Onde a IA errou / bugs do happy path que só apareceram no navegador:**
  1. **Crash `NotFoundError: insertBefore`** — o `YT.Player` substituía a `<div>` gerenciada
     pelo React pelo `<iframe>`, e a re-render (polling/mudo) tentava reconciliar um nó que
     não existia mais → o `ErrorBoundary` derrubava o app. Corrigido criando uma div imperativa
     (`document.createElement('div')`) dentro do `usePlayer`, que o React não conhece.
  2. **Player saindo da div** — o iframe do YouTube nasce com tamanho padrão (~640px) e não
     herda o `width:100%`. Corrigido com `width:100%` + `aspect-ratio:16/9` na div imperativa.
  3. **Aviso `postMessage` origin mismatch** — inofensivo (widget do YouTube em dev/localhost),
     não quebra nada.
- **Esclarecimento de arquitetura:** o backend é o "relógio" (`DECISIONS.md` #1) — decide o que
  toca e quando começou (`started_at`); cada navegador embute o iframe e **sincroniza**. Faltava
  ligar o front ao `/state`; feito com `usePlaybackState` + `cueVideoById(videoId, offset)` no
  `usePlayer` (entra no meio da música, todos juntos).
- **O que foi feito na mão:** (preencher).
