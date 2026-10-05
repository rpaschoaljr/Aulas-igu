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

## Sincronização do player — controles, drift e autoplay

- **Status:** concluído.
- **O que foi feito:** bloqueio de controles do player (`controls: 0` + `disablekb: 1`
  + overlay transparente que captura cliques sobre o iframe, mantendo o player visível
  16:9); correção de drift (a cada 30s compara `getCurrentTime()` com o esperado e faz
  `seekTo` se passar de 2s, via utilitários puros `expectedOffsetSeconds`/`shouldResync`
  em `utils/playbackSync.ts`); fallback mudo de autoplay (player inicia em `mute()` e
  banner "Clique para ativar o som"). Sem mudança no contrato (`API.md`) nem no backend.
- **Testes:** Vitest 43 no total (novos: 7 de `playbackSync`, 5 do `usePlayer` com
  `FakePlayer`, 3 do banner no `PlayerBar`); `oxlint` 0/0 e `tsc`/`vite build` limpos.
- **O que a IA acertou:** (preencher).
- **O que a IA errou:** (preencher).
- **O que foi feito na mão:** (preencher).

## Erros encontrados e corrigidos (caracteres, DJ e sincronização)

1. **Título com entidades HTML** — a YouTube Data API devolve o `snippet.title` com
   entidades (`&quot;`, `&amp;`, `&#39;`…), e a busca gravava o título do jeito que
   vinha, exibindo `Skillet - &quot;The Resistance&quot;`. Corrigido com
   `html.unescape(...)` em `services/youtube.py` (+ teste em `test_youtube.py`).

2. **Sincronização cortava ~30s por música** — o desenho original decidia o "fim" por
   relógio de parede (`started_at + duration`) e a correção de drift fazia `seekTo`
   para frente (pulando áudio). Como o front só começa a tocar de verdade **depois** do
   carregamento (atraso `load_offset` que era medido mas ignorado), cada troca perdia
   esses segundos. Reformulado para o avanço ser dirigido pelo evento real `ENDED`
   (nova mensagem `playback_ended`) e o `started_at` ser cravado no `PLAYING` (via
   `playback_report`); o `tick()` passou a ser só um fallback de segurança
   (`duration + SAFETY_MARGIN`).

3. **DJ automático ausente** — tinha sido planejado mas não implementado: o
   `_start_next` simplesmente parava a música quando a fila esvaziava. Implementado com
   um baralho do histórico (sorteia sem repetir até esgotar o ciclo) e prioridade à fila
   entre uma música do DJ e outra.

4. **Ainda perdendo ~30s no começo de cada música** — mesmo após a reformulação do item
   2 (avanço guiado pelo `ENDED` + `started_at` refinado no `PLAYING`), o começo
   continuou sendo cortado. Causa raiz: o front ainda usa o **relógio de parede**
   (`offset = Date.now() - started_at` e a correção de drift com `seekTo` para frente a
   cada 30s), que quebra quando o relógio do navegador diverge do servidor (skew de
   ~30s). Correção: cravar o começo em 0 nas trocas, usar relógio relativo
   (`performance.now`) no drift e não pular para frente.

- **O que a IA acertou:** (preencher).
- **O que foi feito na mão:** (preencher).

## Sessão de debugging do áudio — tentativas que NÃO resolveram

O áudio parou de sair; o player do YouTube passou a dar `onError 2` + "No available
adapters" (o vídeo nem chega ao estado PLAYING). Hipóteses testadas e descartadas:

1. **Mudo** — trocou-se o `toggleMute` para usar o estado do React + `setVolume(100)`
   e adicionou-se `origin` nos playerVars. **Não resolveu** (o vídeo nem tocava; o
   problema nunca foi o mute).
2. **Offset com vírgula (float)** — suspeita de erro 2 por parâmetro inválido.
   Aplicou-se `Math.floor` no offset. **Não resolveu** (offset inteiro 104/8 continua
   dando erro 2).
3. **Fallback no `onError`** — para erro transitório (2/5) antes do PLAYING, re-cue no
   0. **Não resolveu** (segue sem PLAYING).
4. **Navegador** — testado no Chrome. **Continua falhando** (não é o Firefox).
5. **Vídeo não incorporável** — testado com "Me at the zoo" (`jNQXAC9IVRw`), o vídeo
   mais incorporável que existe. **Continua falhando** (não é o vídeo).
6. **CORS** — suspeita de bloqueio cross-origin. **Descartado**: o "play" é direto
   front↔YouTube (não passa pelo backend) e o front recebe `state`/`queue_updated`
   normalmente (o CORS front↔back funciona).

**Suspeita atual:** o parâmetro `origin: window.location.origin` adicionado nos
playerVars (única mudança na URL do embed) — a ser revertido.

## Ajuste da janela de repetição e deduplicação do histórico

- **Problema:** A janela de repetição de 20 músicas (`REPETITION_WINDOW = 20`) impedia a repetição de músicas tocadas no histórico de forma praticamente permanente em ambientes com poucas músicas, e o histórico acumulava múltiplas entradas da mesma música, desbalanceando as probabilidades do DJ automático.
- **Correção:**
  1. Redução da janela de repetição no backend para 3 músicas (`REPETITION_WINDOW = 3` em `queue.py` e `config.py`), permitindo que qualquer música que já tenha tido pelo menos 3 outras músicas tocadas após ela possa ser adicionada novamente à fila.
  2. Deduplicação no avanço de reprodução (`_advance` em `playback.py`): antes de inserir a música no histórico, registros antigos da mesma música são removidos (`delete(History).where(History.song_id == first.song_id)`), mantendo apenas uma entrada por faixa no histórico e garantindo chances iguais no DJ automático.
- **Testes:**
  - `test_add_allowed_after_three_songs_in_history` em `test_queue.py` (valida liberação após 3 músicas e rejeição dentro das 3 últimas).
  - `test_advance_does_not_accumulate_duplicate_history` em `test_playback.py` (valida deduplicação no histórico).
  - 178 testes de backend e 54 testes de frontend passando com 100% de sucesso.

## Layout: Fila integrada à coluna do Player

- **Problema:** No desktop, a Fila ficava em uma linha abaixo de todas as 3 colunas (`grid-area: queue`), sendo empurrada para baixo quando os painéis de Histórico ou Busca estavam abertos.
- **Correção:** A seção `<section className={styles.queue}>` foi movida para dentro da `div.playerCol`, compartilhando a mesma coluna central do player com `flex-direction: column` e `gap: var(--space-5)`. O grid de 3 colunas no desktop agora mantém a Fila sempre visível e limpa logo abaixo do Player.
- **Testes:** `App.test.tsx` e suite completa do Vitest validados sem regressões.

## Sincronização automática em caso de pausa (Anti-pausa) e logs de depuração

- **Problema:** Ao pausar o player, ele voltava no mesmo segundo de onde havia pausado (não avançava para o tempo real), e não havia logs no console para inspecionar os eventos internos de transição de estado da YouTube IFrame API.
- **Causa raiz:** O cálculo de tempo dependia do relógio do sistema operacional e, ao dar `play` para retomar a reprodução (`PLAYING`), o hook não verificava o atraso acumulado em relação ao tempo ao vivo da rádio.
- **Correção:**
  1. No hook `usePlayer.ts`, adicionamos logs detalhados e estruturados com emojis (`[PLAYER] 🔄 onStateChange`, `[PLAYER] ⏸️ PAUSED detectado`, `[PLAYER] ▶️ PLAYING`, etc.) mapeando os nomes dos estados (`UNSTARTED`, `ENDED`, `PLAYING`, `PAUSED`, `BUFFERING`, `CUED`) e o tempo atual.
  2. Uso do cronômetro monótono de alta precisão (`performance.now()` relativo ao `cuePerfRef`) para calcular o `expectedTime` com exatidão imune a fusos ou relógio de parede.
  3. No evento `PLAYER_STATE_PAUSED` (2): força o `seekTo(expected, true)` e `playVideo()` imediatos.
  4. No evento `PLAYER_STATE_PLAYING` (1): se o player estiver atrasado em mais de 1.5s (por exemplo, após ter ficado pausado externamente), faz `seekTo(expected, true)` saltando para o ponto ao vivo da rádio.
- **Testes:** Dois testes unitários adicionados em `usePlayer.test.tsx` (`força reprodução e sincronização para o tempo real quando pausado` e `avança para o tempo real ao retomar play após ter ficado atrasado`). 56 testes no Vitest e 178 no pytest passando com 100% de sucesso.
