# DECISIONS.md

Decisões de design do projeto Rádio Comunitária. Para cada decisão: o que escolhi, a alternativa descartada, o motivo e o que me faria mudar de ideia.

## 1. Onde o som toca

- **Escolhida:** player sincronizado pelo backend — o servidor é a fonte única da verdade do "relógio" de reprodução. Cada navegador sincroniza com o estado enviado pelo backend.
- **Alternativa descartada:** (a) player físico único na sala ("caixa de som"); (b) cada navegador tocando de forma independente.
- **Motivo:** comportamento de rádio real — quem entra pega a música no meio, e todos ouvem sincronizados. O backend manda `song_id + started_at + duration` e o cliente faz o seek. O player físico único foi descartado por exigir um dispositivo dedicado e complicar o controle remoto pelos celulares; o navegador independente foi descartado por dessincronizar os ouvintes (cada um ouviria em um ponto diferente).
- **O que me faria mudar de ideia:** se virar requisito uma caixa de som física na sala, adotaria o modo "caixa de som" (bônus do PROJETO.md).

## 2. Linguagem do back-end

- **Escolhida:** Python com FastAPI.
- **Alternativa descartada:** Java; Flask.
- **Motivo:** FastAPI tem WebSocket nativo, suporte a async, validação de entrada via Pydantic e type hints, alinhado à PEP 8 (exigência do AGENTS.md). Java tem tipagem estática mais forte, mas é mais lento para desenvolver e o WebSocket é mais verboso. Flask foi descartado por precisar de extensões (Flask-SocketIO) para tempo real.
- **O que me faria mudar de ideia:** se o projeto exigisse tipagem estática forte ou altíssima performance de CPU, reconsideraria Java.

## 3. Framework do front

- **Escolhida:** React com Vite.
- **Alternativa descartada:** Next.js.
- **Motivo:** é uma SPA pura, sem necessidade de SSR/SEO; Vite tem dev server rápido e HMR, e já é o padrão que uso no todo-app. Next foi descartado por trazer overhead de roteamento server-side desnecessário aqui.
- **O que me faria mudar de ideia:** se surgisse necessidade de SSR, SEO ou geração estática, migraria para Next.

## 4. Banco de dados

- **Escolhida:** PostgreSQL (via Docker Compose).
- **Alternativa descartada:** SQLite; somente memória.
- **Motivo:** persistência real — a fila sobrevive a reinício do servidor; transações garantem consistência sob concorrência (dois ouvintes votando/adicionando ao mesmo tempo). Memória foi descartada por perder tudo no restart. SQLite foi descartado por concorrência limitada e por o AGENTS.md já fixar PostgreSQL.
- **O que me faria mudar de ideia:** para uma demonstração efêmera/simplificada, aceitaria SQLite.

## 5. Tempo real

- **Escolhida:** WebSocket.
- **Alternativa descartada:** Server-Sent Events; polling.
- **Motivo:** é bidirecional (preciso mandar votos/mudo do cliente e receber estado da fila/player), com baixa latência, e é nativo no FastAPI. SSE é só servidor→cliente (votos exigiriam POST separado); polling tem alta latência e carga.
- **O que me faria mudar de ideia:** se o custo de conexão persistente virasse problema, usaria SSE para leitura + REST para escrita.

## 6. Sistema operacional e hospedagem

- **Escolhida:** Docker + Linux (ambiente local).
- **Alternativa descartada:** rodar só local, sem Docker.
- **Motivo:** Docker isola os serviços (PostgreSQL, Mailpit, back, front) e torna o ambiente reproduzível, alinhado ao AGENTS.md. Rodar sem Docker exigiria instalar e configurar tudo manualmente.
- **O que me faria mudar de ideia:** para deploy público, usaria um VPS Linux com Docker Compose (Linux por custo, estabilidade e suporte da toolchain).

## 7. Autenticação

- **Escolhida:** login próprio — apelido + e-mail + senha, com verificação de e-mail, senha com bcrypt e sessão via JWT (com revogação por `token_version`).
- **Alternativa descartada:** apelido simples; login com Google (OAuth).
- **Motivo:** apelido simples permite impersonação (qualquer um usa o nome do outro); Google OAuth exige config externa (consent screen) e reduz o controle. O login próprio mantém o apelido como identificador (exigido pelo PROJETO.md) e adiciona senha + verificação para segurança. O JWT é stateless e escalável; a revogação via `token_version` cobre logout e troca de senha sem denylist crescente.
- **O que me faria mudar de ideia:** se o professor exigir integração com Google, adotaria OAuth.

## 8. API de música

- **Escolhida:** YouTube Data API v3 (busca) + YouTube IFrame Player API (reprodução).
- **Alternativa descartada:** Spotify; SoundCloud.
- **Motivo:** o PROJETO.md já indica YouTube; a cota gratuita atende ao projeto; a IFrame Player API permite embutir o player sem baixar áudio.
- **O que me faria mudar de ideia:** se a cota da YouTube API virar gargalo, migraria para a Spotify Web API.

---

## 9. Chave natural de Song

- **Escolhida:** `youtube_id` como chave natural/única de `SONG` (deduplicação de músicas).
- **Alternativa descartada:** título normalizado (`trim` + `lowercase` do `title`); hash/fingerprint de título + artista.
- **Motivo:** o `youtube_id` é estável e único por vídeo no YouTube, enquanto o título pode se repetir entre músicas diferentes e pode mudar com o tempo. O banco já garante `UNIQUE` em `youtube_id`; a busca faz upsert e o "adicionar à fila" apenas referencia o registro existente. O `title` fica como exibição, sem participar da unicidade.
- **O que me faria mudar de ideia:** se o requisito virasse "a mesma música em vídeos diferentes deve ser tratada como duplicado", eu precisaria de um fingerprint de áudio/ISRC em vez do `youtube_id`.

---

## Exercício da fase (bônus)

O exercício "pergunta neutra vs. pergunta enviesada" (Python vs. Java) será registrado aqui após a comparação das respostas da IA. *(Pendente — a ser preenchido pelo aluno.)*
