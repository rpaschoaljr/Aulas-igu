# API.md

Contrato da API. Definido **antes** de qualquer código. Qualquer mudança aqui exige aprovação explícita.

- Base URL: `/api`
- Formato: JSON
- Autenticação: `Authorization: Bearer <JWT>`
- Erros: sempre `{ "detail": "mensagem" }` com status HTTP correto.

## Convenções de erro

| Status | Significado |
|---|---|
| `400` | Validação de entrada (Pydantic) |
| `401` | Não autenticado / token inválido ou revogado |
| `403` | E-mail não verificado / sem permissão |
| `404` | Recurso não encontrado |
| `409` | Conflito (apelido/e-mail duplicado) |
| `429` | Rate limit excedido |
| `503` | YouTube API indisponível (sistema continua funcionando) |

## Autenticação

### `POST /auth/register`
Cadastra o usuário e dispara o e-mail de verificação.

```json
// request
{ "nickname": "tEste", "email": "Fulano@Email.com", "password": "Senha1@forte" }

// response 201
{ "id": "<uuid>", "nickname": "tEste", "email": "Fulano@Email.com", "verified": false }
```

- Normaliza `nickname` e `email` (trim + lowercase) antes de salvar/verificar unicidade.
- `409` se `nickname_normalized` ou `email_normalized` já existir.
- `400` se o e-mail for inválido ou a senha não atender a política.

### `POST /auth/login`
Autentica por apelido **ou** e-mail.

```json
// request
{ "login": "teste ou email@ex.com", "password": "Senha1@forte" }

// response 200
{ "access_token": "<jwt>", "token_type": "bearer" }
```

- `403` se o e-mail ainda não foi verificado.
- `401` se credenciais inválidas.

### `GET /auth/verify?token=`
Ativa a conta. `200` em sucesso, `404` se token inválido/expirado.

### `POST /auth/logout`
Revoga a sessão (incrementa `token_version`). Requer JWT.

## Músicas e fila

### `GET /songs/search?q=`
Busca no YouTube Data API. Retorna lista de músicas.

```json
// response 200
{ "results": [ { "youtube_id": "...", "title": "...", "duration": 210, "thumbnail": "..." } ] }
```

- `503` com `{ "detail": "busca indisponível" }` se a API do YouTube falhar (não trava o sistema).

### `POST /queue`
Adiciona música à fila.

```json
// request
{ "youtube_id": "..." }

// response 201
{ "id": "<uuid>", "position": 2 }
```

- `400` se exceder o limite de 3 por pessoa ou violar a regra de repetição (últimas 20).
- `404` se a música não existir.

### `GET /queue`
Retorna a fila atual (ordenada por `position`).

### `POST /queue/{id}/vote`
Vota para pular. Idempotente: voto duplicado do mesmo usuário não conta.

- `404` se o item da fila não existir.

### `GET /history?limit=&offset=`
Retorna o histórico (música, `played_at`, quem adicionou), paginado do mais recente para o mais antigo.

- `limit` (padrão `10`, máximo `50`) e `offset` (padrão `0`) controlam a paginação.

### `GET /state`
Estado atual de reprodução (fallback REST do WebSocket).

```json
{ "current_song_id": "<uuid|null>", "started_at": "2026-09-07T12:00:00Z", "duration": 210 }
```

## Tempo real — WebSocket `/ws`

Conexão autenticada (JWT na query `?token=` ou no primeiro frame).

### servidor → cliente
| Evento | Payload |
|---|---|
| `state` | `{ "song_id", "started_at", "duration" }` — enviado ao conectar e a cada troca de música |
| `queue_updated` | fila atualizada |
| `skip_triggered` | `{ "song_id" }` — música pulada |
| `error` | `{ "detail" }` |

### cliente → servidor
| Evento | Payload |
|---|---|
| `mute_until_next` | — |
| `mute_until_song` | `{ "song_id" }` |
| `vote` | `{ "queue_item_id" }` |
| `playback_report` | `{ "song_id", "duration", "load_offset" }` — enviado no `PLAYING`: corrige a duração real (IFrame), registra o atraso de carregamento e crava o `started_at` real (primeira confirmação) |
| `playback_ended` | `{ "song_id" }` — enviado no `ENDED`: o backend avança para a próxima música |
| `ping` | — |

## Segurança

- Todas as queries são parametrizadas (zero SQL injection).
- Validação de entrada via Pydantic antes de acessar o banco.
- Senhas com bcrypt; e-mail armazenado normalizado (trim + lowercase) em texto puro.
- JWT com `exp` de 24h e `token_version` para revogação.
- Rate limiting em `register` e `login`.
- CORS restrito à origem do front; headers de segurança (CSP, `X-Content-Type-Options`, etc.).
- Sanitização de saída no front (anti-XSS).

## Testes obrigatórios por endpoint

Cada endpoint listado acima tem **1 teste válido + pelo menos 10 testes inválidos** (payloads de SQL injection e casos de validação), escritos **antes** da implementação (TDD).
