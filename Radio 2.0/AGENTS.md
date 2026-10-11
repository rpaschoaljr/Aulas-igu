# Diretrizes para Desenvolvedores e Agentes de IA (AGENTS.md)

Este documento dita os padrões de desenvolvimento, convenções de código e restrições inegociáveis para qualquer agente de IA ou desenvolvedor atuando no repositório **Rádio 2.0**.

---

## 1. Stack Tecnológica Obrigatória

* **Frontend:** Angular (Standalone Components, Signals, tipagem estática TypeScript, CSS Variables para estilização e Design Tokens).
* **Backend:** Go (Golang 1.22+), estruturado com padrão limpo (cmd, internal, repository, hub).
* **Banco de Dados:** PostgreSQL 16+ (acessado exclusivamente pelo backend em Go).
* **Comunicação em Tempo Real:** WebSocket (bidirecional) + REST para operações pontuais.
* **Orquestração:** Docker & Docker Compose unificado (`docker-compose.yml`).
* **Player:** YouTube IFrame Player API gerenciado sem botões de play/pause tradicionais.

---

## 2. Restrições Estritas (O que a IA NÃO PODE fazer sem autorização expressa)

1. **PROIBIDO vazar segredos ou chaves de API:**
   - Chaves da YouTube Data API, segredos OAuth do Google ou senhas de banco **nunca** devem constar no código, no frontend, em commits ou em prompts. Utilize sempre variáveis de ambiente (`.env` adicionado ao `.gitignore`).
2. **PROIBIDO conectar o Frontend diretamente ao PostgreSQL:**
   - Nenhuma chamada direta ao banco ou driver SQL pode existir no diretório `frontend/`. Toda persistência se dá através do backend em Go.
3. **PROIBIDO alterar contratos de API sem atualizar a documentação:**
   - Modificações em rotas ou formato de mensagens WebSocket exigem atualização imediata em `API.md` e alinhamento com a spec.
4. **PROIBIDO apagar ou silenciar testes automatizados:**
   - Testes que falham indicam regressão nas regras de negócio e devem ser investigados e corrigidos, jamais comentados ou apagados.
5. **PROIBIDO violar o conceito de Rádio:**
   - Não adicionar botões de "Pause" ou "Play" que pausem a música apenas para um usuário específico. A rádio é ao vivo e contínua; use sempre controle de Mute local e sincronização forçada com o timestamp do servidor.

---

## 3. Convenções de Código

### Metodologia TDD (Test-Driven Development) Obrigatória:
* **Fluxo Red-Green-Refactor:** Para toda nova funcionalidade ou regra de negócio, o teste automatizado DEVE ser escrito antes ou em conjunto com a implementação.
  - **No Frontend (Angular):** Criar e validar os arquivos `*.spec.ts` com Jasmine/Karma/Jest cobrindo os serviços de estado, sincronização de tempo, cálculo de limites e componentes.
  - **No Backend (Go):** Criar e validar os arquivos `*_test.go` cobrindo o motor de regras da rádio, concorrência, votos e endpoints REST/WebSocket.
* Nenhum PR ou marco é concluído sem a suíte de testes passando com 100% de sucesso.

### Responsividade & Mobile-First (Frontend):
* Toda interface deve ser desenhada com abordagem **Mobile-First**.
* O layout deve se adaptar com elegância a 3 perfis de dispositivo:
  - **Mobile (< 768px):** Navegação por abas/gavetas (bottom sheet), visualização vertical limpa, botões com áreas de toque generosas (mínimo 44x44px).
  - **Tablet (768px - 1024px):** Layout em 2 colunas com drawer retrátil.
  - **Desktop / TV (> 1024px):** Painel amplo com 3 colunas (Tocando Agora + Fila ao Vivo + Chat/Ouvintes/Histórico).
* Uso de CSS Grid, Flexbox e Container Queries vinculados aos tokens de layout em `variables.css`.

### Frontend (Angular):
* Componentes devem ser **Standalone** com `changeDetection: ChangeDetectionStrategy.OnPush`.
* Utilize **Angular Signals** (`signal`, `computed`, `effect`) para gerenciar estados reativos.
* Estilização através de **CSS Variables** (`var(--nome-da-variavel)`) definidas em arquivos de design tokens (`variables.css` / `themes.css`).
* Mantenha os payloads de dados enxutos: exiba apenas o bloco visível da fila (fatiamento de fila) e carregue o histórico sob demanda (fatiamento de histórico).

### Backend (Go):
* Tratamento explícito de erros (`if err != nil`).
* Programação defensiva anti-panic: toda goroutine deve usar `defer recover()` para capturar falhas imprevistas sem derrubar o processo.
* Validação rigorosa de slices/listas: sempre verificar `len(slice)` antes de indexar, impedindo *index out of range*.
* Normalização e sanitização estrita: sempre aplicar `strings.TrimSpace` e normalizar para minúsculas (`strings.ToLower`) nos dados recebidos do front.
* Decodificação UTF-8 e HTML Entities: todo dado vindo da API do YouTube deve ser processado com `html.UnescapeString` para garantir caracteres reais (como `"` e não `&quot;`).
* Concorrência protegida: hub WebSocket, contagem de votos e lista de conexões devem ser sincronizadas por `sync.RWMutex` ou goroutines com channels.
* Testes de stress obrigatórios: validar concorrência massiva e race conditions com `go test -race ./...`.

---

## 4. Como Rodar e Testar o Projeto

### Rodando o ambiente completo via Docker:
```bash
docker compose up --build
```
* Frontend acessível em: `http://localhost:4200`
* Backend API/WebSocket em: `http://localhost:8080`
* PostgreSQL em: `localhost:5432`

### Rodando testes do Backend (Go):
```bash
cd backend && go test ./... -v
```

### Rodando testes do Frontend (Angular):
```bash
cd frontend && npm test -- --watch=false
```

---

## 5. Registro Contínuo

A cada tarefa ou marco concluído, preencha obrigatoriamente 3 linhas no arquivo `DIARIO.md`:
1. O que a IA acertou.
2. Onde a IA errou ou precisou de intervenção.
3. O que foi feito/ajustado manualmente.
