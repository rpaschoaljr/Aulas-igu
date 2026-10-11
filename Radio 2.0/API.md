# Contrato de API e WebSocket (API.md) - Rádio 2.0

Este documento especifica os contratos de comunicação entre o Frontend (Angular) e o Backend (Go). Toda e qualquer comunicação do cliente passa exclusivamente por este contrato.

---

## 1. Endpoints REST (HTTP)

Prefixo base: `/api`

### 1.1 Autenticação

#### `POST /api/auth/google`
Valida as credenciais emitidas pelo Google OAuth / Identity Services e cria ou recupera o ouvinte com permissões completas (pedir músicas, votar skip, ouvir rádio e chat).
* **Request Body:**
  ```json
  {
    "name": "Pedro Paschoal",
    "email": "pedro@gmail.com",
    "avatar_url": "🎧",
    "token": "google_credential_token",
    "google_id": "google_unique_sub"
  }
  ```
* **Response 200 OK:**
  ```json
  {
    "token": "jwt_token_here",
    "user": {
      "id": "e85e44b8-...",
      "nickname": "Pedro Paschoal",
      "email": "pedro@gmail.com",
      "avatar_url": "🎧",
      "is_guest": false
    }
  }
  ```

#### `GET /api/auth/google/client-id`
Retorna o Google Client ID público configurado no servidor para inicialização do Google Identity Services no frontend (sem expor client_secret).
* **Response 200 OK:**
  ```json
  {
    "client_id": "358965777735-utakg2tk3v8g67mats0v490rsgetuu7p.apps.googleusercontent.com"
  }
  ```

#### `GET /api/auth/check-nickname?nickname={apelido}`
Verifica em tempo real se um apelido já está em uso por outro ouvinte registrado no PostgreSQL.
* **Query Params:** `nickname=NomeDesejado`
* **Response 200 OK (Disponível):**
  ```json
  {
    "available": true,
    "message": "Apelido disponível!"
  }
  ```
* **Response 200 OK (Ocupado):**
  ```json
  {
    "available": false,
    "message": "Este apelido já está em uso por outro ouvinte."
  }
  ```

#### `POST /api/auth/guest`
Cria um usuário convidado único com validação estrita de apelido e avatar emoji.
* **Request Body:**
  ```json
  {
    "nickname": "DJ_Coruja",
    "avatar_url": "🎧"
  }
  ```
* **Response 200 OK:**
  ```json
  {
    "token": "sess_guest_jwt_here",
    "user": {
      "id": "a12e33f4-...",
      "nickname": "DJ_Coruja",
      "avatar_url": "🎧",
      "role": "listener",
      "is_guest": true
    }
  }
  ```
* **Response 409 Conflict:**
  ```text
  Este apelido já está em uso por outro ouvinte. Por favor, escolha outro apelido.
  ```

> [!IMPORTANT]
> **Regra de Permissões Estritas para Visitantes (`is_guest: true`):**
> - Usuários convidados têm permissão apenas para **ouvir a rádio** e **conversar no chat**.
> - Chamadas a `POST /api/radio/queue`, `POST /api/radio/queue/batch` e `POST /api/radio/vote-skip` efetuadas por convidados são sumariamente rejeitadas com **HTTP 403 Forbidden**.

---

### 1.2 Músicas e Fila

#### `GET /api/youtube/search?q={termo}`
Busca músicas através do Backend em Go (que consome a YouTube Data API v3 com cache em memória para economizar cota).
* **Response 200 OK:**
  ```json
  {
    "items": [
      {
        "youtubeId": "jfKfPfyJRdk",
        "title": "Lofi Hip Hop Radio - Beats to Relax/Study to",
        "channel": "Lofi Girl",
        "durationSeconds": 240,
        "thumbnailUrl": "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg"
      }
    ]
  }
  ```

#### `GET /api/radio/history?room={roomSlug}&limit=20&offset=0`
Retorna faixas do histórico de músicas tocadas e puladas da sala com paginação para suporte a scroll infinito.
* **Query Params:**
  * `room` (string): Slug da sala (ex: `radio-six-nine`).
  * `limit` (int, padrão 20): Quantidade de faixas por lote (máximo 50).
  * `offset` (int, padrão 0): Deslocamento inicial para scroll infinito.
* **Response 200 OK:**
  ```json
  [
    {
      "id": "hist-123",
      "room_id": "pop-hits",
      "youtube_id": "jfKfPfyJRdk",
      "title": "Lofi Hip Hop Radio",
      "channel": "Lofi Girl",
      "duration_seconds": 240,
      "cover_url": "https://...",
      "user_nickname": "DJ_Coruja",
      "was_skipped": false,
      "played_at": "2026-10-06T20:30:00Z"
    }
  ]
  ```

#### `GET /api/radio/queue?room={roomSlug}`
Retorna as músicas da fila de reprodução da sala.
* A fila de reprodução respeita com prioridade máxima os pedidos dos ouvintes.
* Se a fila estiver vazia, o DJ adiciona **apenas 1 faixa** de sugestão (`requested_by.nickname: "DJ Six-Nine"` e `status: "dj_upcoming"`), sorteada do histórico da sala sem repetições até completar o ciclo.
* Se a fila já contiver pedidos de ouvintes, o DJ não insere faixas adicionais.
* **Response 200 OK:** Array de `QueueItem`.

#### `GET /api/radio/user-quota?room={roomSlug}`
Retorna a cota oficial do usuário na sala (contabilizando músicas na fila de espera + música que está tocando no ar no momento).
* **Headers:** `Authorization: Bearer <token>` (opcional; se omitido, assume 0 faixas ativas e `can_request: true`).
* **Response 200 OK:**
  ```json
  {
    "room_slug": "radio-six-nine",
    "user_id": "user-uuid",
    "active_tracks": 2,
    "max_quota": 5,
    "can_request": true,
    "authenticated": true
  }
  ```
    "can_request": true,
    "authenticated": true
  }
  ```

#### `POST /api/radio/queue`
Adiciona uma música individual à fila da rádio com validação de duração (30s a 600s), anti-duplicata, trava de cooldown das 5 faixas mais recentes e limite de cota máxima de 5 músicas ativas por usuário (fila + música no ar).
* **Headers:** `Authorization: Bearer <token>` (Obrigatório).
* **Request Body:**
  ```json
  {
    "room_slug": "radio-six-nine",
    "track": {
      "youtube_id": "jfKfPfyJRdk",
      "title": "Lofi Hip Hop Radio",
      "channel": "Lofi Girl",
      "duration_seconds": 240,
      "thumbnail_url": "https://..."
    }
  }
  ```
* **Response 201 Created:** Item adicionado na fila.
* **Response 401 Unauthorized:** Token JWT ausente ou inválido.
* **Response 409 Conflict:** Faixa duplicada na fila ativa, presente nas últimas 5 faixas tocadas no histórico, ou cota de 5 pedidos ativos do usuário excedida (na fila ou no ar).

#### `POST /api/radio/queue/batch`
Processa o carrinho de pedidos em lote de uma só vez (máximo 5 músicas por pedido), respeitando a cota restante do usuário.
* **Headers:** `Authorization: Bearer <token>` (Obrigatório).
* **Request Body:**
  ```json
  {
    "room_slug": "radio-six-nine",
    "tracks": [
      {
        "youtube_id": "jfKfPfyJRdk",
        "title": "Lofi Hip Hop Radio",
        "channel": "Lofi Girl",
        "duration_seconds": 240,
        "thumbnail_url": "https://..."
      }
    ]
  }
  ```
* **Response 201 Created:**
  ```json
  {
    "success_count": 1,
    "failed_count": 0,
    "enqueued_items": [ ... ],
    "rejected": [],
    "user_quota": {
      "room_slug": "radio-six-nine",
      "user_id": "user-uuid",
      "active_tracks": 3,
      "max_quota": 5,
      "can_request": true,
      "authenticated": true
    }
  }
  ```
* **Response 400 Bad Request:** Payload vazio ou mais de 5 faixas enviadas no lote.
* **Response 401 Unauthorized:** Token JWT ausente ou inválido.
* **Response 409 Conflict:** Cota ativa do usuário excedida (na fila ou no ar).

#### `POST /api/radio/queue/remove` (ou `DELETE /api/radio/queue`)
Remove uma faixa da fila de reprodução. Apenas o usuário que adicionou a faixa (ou administrador) tem permissão para removê-la. Libera imediatamente a vaga na cota do usuário e renumera as posições.
* **Headers:** `Authorization: Bearer <token>` (Obrigatório).
* **Request Body:**
  ```json
  {
    "room_slug": "radio-six-nine",
    "queue_id": "queue-item-uuid"
  }
  ```
* **Response 200 OK:**
  ```json
  {
    "status": "removed",
    "queue_id": "queue-item-uuid",
    "user_quota": {
      "room_slug": "radio-six-nine",
      "user_id": "user-uuid",
      "active_tracks": 2,
      "max_quota": 5,
      "can_request": true,
      "authenticated": true
    }
  }
  ```
* **Response 401 Unauthorized:** Token ausente ou inválido.
* **Response 403 Forbidden:** Tentativa de remover música adicionada por outro usuário.
* **Response 404 Not Found:** Música não encontrada na fila.

#### `POST /api/radio/queue/swap` (ou `PUT /api/radio/queue`)
Substitui os dados de uma faixa da fila por outra música mantendo a posição original. Apenas o proprietário da faixa tem permissão de troca.
* **Headers:** `Authorization: Bearer <token>` (Obrigatório).
* **Request Body:**
  ```json
  {
    "room_slug": "radio-six-nine",
    "queue_id": "queue-item-uuid",
    "track": {
      "youtube_id": "new-yt-id",
      "title": "Novo Título",
      "channel": "Novo Canal",
      "duration_seconds": 240,
      "thumbnail_url": "https://..."
    }
  }
  ```
* **Response 200 OK:** Item substituído com sucesso na mesma posição.
* **Response 401 Unauthorized:** Token ausente ou inválido.
* **Response 403 Forbidden:** Tentativa de trocar música de outro usuário.
* **Response 409 Conflict:** Nova música está em cooldown (últimas 5 faixas tocadas) ou duplicada na fila.

---

### 1.3 Auditoria e Logs de Erro (Telemetria Front & Back)

#### `POST /api/errors/log`
Registra falhas e exceções do frontend ou backend na tabela permanente `app_error_logs` no PostgreSQL para depuração e feedback.
* **Request Body:**
  ```json
  {
    "source": "frontend",
    "error_type": "CART_CLOSE_ERROR",
    "message": "Descrição detalhada do erro capturado",
    "stack_trace": "Error: ...",
    "room_id": "radio-six-nine",
    "endpoint": "/app",
    "payload": { ... }
  }
  ```
* **Response 201 Created:** `{"status": "logged", "id": "uuid", "created_at": "timestamp"}`

#### `GET /api/errors/logs?limit=50`
Consulta os últimos registros de erros persistidos para monitoramento.
* **Response 200 OK:** Lista de erros ordenada por `created_at DESC`.

---


## 2. Protocolo WebSocket

Endpoint: `ws://localhost:8080/ws`

### 2.1 Envelopes de Mensagem
Todas as mensagens seguem a estrutura padronizada:
```json
{
  "type": "NOME_DO_EVENTO",
  "payload": { ... }
}
```

### 2.2 Mensagens Cliente ➔ Servidor (Go)

1. **Autenticação na Conexão (`AUTH_JOIN`):**
   ```json
   {
     "type": "AUTH_JOIN",
     "payload": {
       "token": "sess_jwt_token_here"
     }
   }
   ```

2. **Adicionar Música à Fila (`QUEUE_ADD`):**
   ```json
   {
     "type": "QUEUE_ADD",
     "payload": {
       "youtubeId": "jfKfPfyJRdk",
       "title": "Lofi Hip Hop Radio",
       "channel": "Lofi Girl",
       "durationSeconds": 240
     }
   }
   ```

3. **Remover Própria Música da Fila (`QUEUE_REMOVE`):**
   ```json
   {
     "type": "QUEUE_REMOVE",
     "payload": {
       "queueId": "q-987"
     }
   }
   ```

4. **Votar para Pular (`VOTE_SKIP`):**
   ```json
   {
     "type": "VOTE_SKIP",
     "payload": {}
   }
   ```

5. **Enviar Reação / Emoji (`SEND_REACTION`):**
   ```json
   {
     "type": "SEND_REACTION",
     "payload": {
       "emoji": "🔥"
     }
   }
   ```

---

### 2.3 Mensagens Servidor (Go) ➔ Clientes (Broadcast)

1. **Sincronização Inicial Completa (`SYNC_SNAPSHOT`):**
   Enviado imediatamente quando o cliente conecta.
   ```json
   {
     "type": "SYNC_SNAPSHOT",
     "payload": {
       "serverTimestamp": 1791334500,
       "nowPlaying": {
         "queueId": "q-100",
         "youtubeId": "jfKfPfyJRdk",
         "title": "Lofi Hip Hop Radio",
         "channel": "Lofi Girl",
         "durationSeconds": 240,
         "startedAt": 1791334440,
         "currentOffsetSeconds": 60,
         "addedBy": "Pedro"
       },
       "queueSlice": [
         {
           "queueId": "q-101",
           "youtubeId": "5qap5aO4i9A",
           "title": "ChilledCow Beat",
           "channel": "ChilledCow",
           "durationSeconds": 180,
           "addedBy": "DJ_Coruja",
           "isDjTrack": false
         }
       ],
       "totalTracksInQueue": 4,
       "totalQueueDurationSeconds": 720,
       "listenersCount": 7,
       "skipVotes": {
         "current": 2,
         "required": 4,
         "votedUserIds": ["u1", "u2"]
       }
     }
   }
   ```

2. **Troca de Música (`TRACK_CHANGED`):**
   ```json
   {
     "type": "TRACK_CHANGED",
     "payload": {
       "nowPlaying": {
         "queueId": "q-101",
         "youtubeId": "5qap5aO4i9A",
         "title": "ChilledCow Beat",
         "channel": "ChilledCow",
         "durationSeconds": 180,
         "startedAt": 1791334680,
         "currentOffsetSeconds": 0,
         "addedBy": "DJ_Coruja"
       },
       "queueSlice": [ ... ],
       "totalTracksInQueue": 3
     }
   }
   ```

3. **Atualização da Fila Fatiada (`QUEUE_UPDATED`):**
   ```json
   {
     "type": "QUEUE_UPDATED",
     "payload": {
       "queueSlice": [ ... ],
       "totalTracksInQueue": 5,
       "totalQueueDurationSeconds": 900
     }
   }
   ```

4. **Atualização de Votos para Pular (`VOTES_UPDATED`):**
   ```json
   {
     "type": "VOTES_UPDATED",
     "payload": {
       "current": 3,
       "required": 4,
       "votedUserIds": ["u1", "u2", "u3"],
       "wasSkipped": false
     }
   }
   ```

5. **Contagem de Ouvintes Atualizada (`LISTENERS_UPDATED`):**
   ```json
   {
     "type": "LISTENERS_UPDATED",
     "payload": {
       "count": 8,
       "listeners": [
         { "id": "u1", "nickname": "Pedro", "avatarUrl": "..." }
       ]
     }
   }
   ```

6. **Reação Emitida (`REACTION_BROADCAST`):**
   ```json
   {
     "type": "REACTION_BROADCAST",
     "payload": {
       "emoji": "🔥",
       "fromUser": "DJ_Coruja"
     }
   }
   ```

7. **Sincronização de Duração Real pelo Player (`track_duration_sync` - Cliente -> Servidor):**
   Emitido pelo frontend quando o IFrame do YouTube inicia a reprodução e reporta a duração real via `player.getDuration()`.
   ```json
   {
     "type": "track_duration_sync",
     "room_id": "radio-six-nine",
     "payload": {
       "youtube_id": "WM8bTdBs-cw",
       "duration_seconds": 465
     }
   }
   ```

8. **Broadcast de Duração Atualizada (`track_duration_updated` - Servidor -> Clientes):**
   Emitido pelo Hub para todos os ouvintes da sala quando o motor atualiza a duração da faixa no ar.
   ```json
   {
     "type": "track_duration_updated",
     "room_id": "radio-six-nine",
     "payload": {
       "roomId": "radio-six-nine",
       "youtubeId": "WM8bTdBs-cw",
       "durationSeconds": 465
     },
     "timestamp": 1791507179263
   }
   ```

9. **Sinal de Término de Faixa pelo Player (`track_ended` - Cliente -> Servidor):**
   Emitido pelo cliente quando o player do YouTube atinge o estado final `YT.PlayerState.ENDED`. O backend valida a tolerância de término (faltando 10s ou menos) e dispara o avanço imediato para eliminar silêncio ou latência.
   ```json
   {
     "type": "track_ended",
     "room_id": "radio-six-nine",
     "payload": {
       "youtube_id": "WM8bTdBs-cw",
       "youtubeId": "WM8bTdBs-cw"
     }
   }
   ```

10. **Broadcast de Histórico Atualizado (`history_updated` - Servidor -> Clientes):**
    Emitido pelo Hub quando a faixa atual encerra e é arquivada no histórico, disparando a atualização da listagem de histórico no frontend em tempo real.
    ```json
    {
      "type": "history_updated",
      "room_id": "radio-six-nine",
      "payload": {
        "action": "advance",
        "trackId": "track-uuid"
      },
      "timestamp": 1791552308293
    }
    ```


