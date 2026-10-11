# 📻 Rádio 2.0 - Plataforma Fullstack Colaborativa

Plataforma de streaming de rádio social em tempo real com reprodução contínua sincronizada via YouTube, fila democrática de pedidos, chat ao vivo e sistema de votação para pular faixas (*skip vote*).

---

## 🚀 Portas e Serviços em Execução

| Serviço | Porta Externa | Porta Interna | Descrição | URL de Acesso |
| :--- | :---: | :---: | :--- | :--- |
| **Frontend** | `4200` | `4200` | Angular 22 Standalone SPA + Nginx Alpine com Proxy Reverso | [http://localhost:4200](http://localhost:4200) |
| **Backend** | `8080` | `8080` | Golang 1.25 API REST + Hub WebSocket + Motor de Rádio | [http://localhost:8080](http://localhost:8080) |
| **PostgreSQL** | `5432` | `5432` | PostgreSQL 18.4 Alpine (Dupla Coluna, JSONB cache YouTube) | `localhost:5432` |

> [!NOTE]
> O Nginx do Frontend atua como proxy reverso para `/api/` e `/ws/`, permitindo que o navegador acesse toda a aplicação diretamente em `http://localhost:4200` sem problemas de CORS.

## ⚡ Desenvolvimento Rápido com Hot Reload / Live Reload (HMR)

Para que qualquer alteração de código `.ts`, `.html` ou `.css` no Angular reflita no navegador instantaneamente sem precisar rebuildar imagens nem dar F5 na página:

### Modo 1: Desenvolvimento Híbrido Ágil (Recomendado)
Rode o banco e backend no Docker e o frontend nativo no seu terminal:
1. Suba o banco de dados e o backend em segundo plano:
   ```bash
   docker compose up -d backend postgres
   ```
2. Inicie o Angular Dev Server com proxy integrado:
   ```bash
   cd frontend && npm start
   ```
3. Acesse `http://localhost:4200`. Qualquer arquivo salvo no VSCode atualiza a tela na hora em ~50ms!

### Modo 2: Desenvolvimento 100% no Docker com Live Reload
Caso prefira rodar até o frontend dentro do Docker com espelhamento de arquivos locais e Hot Reload via polling:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

---

## 🐳 Comandos Docker para Executar o Projeto em Produção

Todos os serviços são orquestrados de forma unificada através do arquivo `docker-compose.yml`.

### 1. Iniciar o ambiente completo (Compilação & Inicialização)
Para construir as imagens e subir os containers em segundo plano:
```bash
docker compose up --build -d
```

### 2. Iniciar containers já compilados
Caso já tenha feito o build anteriormente:
```bash
docker compose up -d
```

### 3. Verificar o status e saúde dos containers
```bash
docker compose ps
```
*Saída esperada: todos os 3 containers com status `Up` e PostgreSQL `(healthy)`.*

### 4. Acompanhar os logs em tempo real
- **Todos os serviços simultaneamente:**
  ```bash
  docker compose logs -f
  ```
- **Apenas o Backend (Go):**
  ```bash
  docker compose logs -f backend
  ```
- **Apenas o Frontend (Nginx/Angular):**
  ```bash
  docker compose logs -f frontend
  ```
- **Apenas o Banco de Dados (PostgreSQL):**
  ```bash
  docker compose logs -f postgres
  ```

### 5. Reiniciar um serviço específico
```bash
docker compose restart backend
```

### 6. Parar os containers (mantendo os dados salvos)
```bash
docker compose stop
# ou
docker compose down
```

### 7. Reset total do ambiente (remove containers e apaga volumes do banco)
> [!CAUTION]
> Este comando remove os volumes persistentes, apagando as músicas cacheadas e histórico do PostgreSQL.
```bash
docker compose down -v
```

---

## 🔒 Configuração de Variáveis de Ambiente (`.env`)

O projeto utiliza um arquivo `.env` na raiz para proteger chaves e senhas. Ele já está configurado e protegido pelo `.gitignore`.

Para criar um novo a partir do modelo:
```bash
cp .env.example .env
```

### Variáveis configuradas:
- `POSTGRES_USER`: Usuário do banco (`postgres`).
- `POSTGRES_PASSWORD`: Senha de alta entropia de **64 caracteres** (com maiúsculas, minúsculas, números e caracteres especiais) para impedir ataques de força bruta.
- `POSTGRES_DB`: Nome do banco (`radio20`).
- `POSTGRES_PORT`: Porta exposta do banco (`5432`).
- `PORT`: Porta do servidor HTTP/WebSocket Go (`8080`).
- `JWT_SECRET`: Chave secreta de **64 caracteres** para assinatura de tokens JWT (HMAC-SHA256).
- `YOUTUBE_API_KEY`: Chave da YouTube Data API v3 (opcional; o sistema possui fallback automático caso não fornecida).
- `FRONTEND_PORT`: Porta web (`4200`).
- `BACKEND_PORT`: Porta da API (`8080`).

---

## 🧪 Como Rodar os Testes Automatizados (TDD)

O projeto segue estritamente a metodologia **Test-Driven Development (TDD)** com 100% de sucesso nas suítes.

### Testes do Frontend (Angular / Vitest)
```bash
cd frontend
npm test -- --watch=false
```
*Cobre: sincronização contínua de player, auth com `sessionStorage`, cache de histórico, estado das salas e alternância de temas.*

### Testes do Backend (Go / Race Detector)
```bash
cd backend
go test -race ./... -v
```
*Cobre: sanitização de texto, dupla coluna, autenticação JWT, deduplicação YouTube, detecção de concorrência com `-race`, WebSocket Hub e motor contínuo da rádio.*

---

## 📻 Regras de Ouro e Arquitetura

1. **Conceito de Rádio Inegociável:**
   - A rádio é **ao vivo e contínua**. Não existem botões de "Play" ou "Pause" individuais para pausar a transmissão apenas para um usuário.
   - O usuário possui controle de **Mute local** e volume.
   - Em caso de desvio no player do YouTube, o frontend sincroniza compulsoriamente com o timestamp do servidor (`seekTo(elapsedSeconds, true)`).
2. **Padrão Universal de Banco (Dupla Coluna):**
   - Todo campo textual possui duas colunas:
     - `display`: preserva a formatação original e letras maiúsculas como o usuário digitou.
     - `normalized`: minúsculas, sem espaços duplicados e com caracteres HTML decodificados (`html.UnescapeString`), utilizada para índices de unicidade e busca.
3. **Cache Database-First do YouTube:**
   - Pesquisas no catálogo verificam o banco de dados primeiro. Se houver $\ge 20$ resultados, **nenhuma chamada à API do YouTube é feita**, economizando cota diária.
   - Os metadados completos de cada faixa são persistidos em formato **JSONB** (`raw_metadata`).
4. **Prevenção Estrita de Músicas Duplicadas:**
   - Adições à fila verificam duplicatas por ID e título normalizado. Tentativas de adicionar faixas repetidas retornam **`HTTP 409 Conflict`**.
5. **Sessão Efêmera JWT:**
   - O token JWT e os dados da sessão ficam armazenados em `sessionStorage` no frontend. Ao fechar o navegador ou a aba, a sessão é destruída e o ouvinte é obrigado a realizar novo login.
