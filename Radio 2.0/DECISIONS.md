# Decisões de Arquitetura (DECISIONS.md)

Este documento registra todas as decisões técnicas tomadas para o projeto **Rádio 2.0**, justificando as escolhas frente às alternativas descartadas e prevendo os critérios que justificariam uma revisão futura.

---

## 1. Onde o som toca e modelo de reprodução

* **Escolha:** Transmissão contínua em tempo real sincronizada via servidor com player no cliente (YouTube IFrame). Não existem botões de play ou pause; o som roda continuamente como uma rádio física. Controles disponíveis no cliente são apenas Mute/Desmutar e volume local, além do modo opcional "Caixa de Som da Sala" (onde o cliente fica em silêncio e atua apenas como controle remoto). Se o usuário pausar externamente, o sistema força `seekTo(serverTime, true)`.
* **Alternativa descartada:** WebRTC/Stream de áudio bruto gerado no backend ou player com botão de pausa tradicional.
* **Motivo:** O YouTube hospeda o catálogo e o áudio com qualidade sem custo de streaming de dados para o nosso servidor. O modelo de rádio contínua sem pause garante que todos os ouvintes estejam escutando o mesmo trecho simultaneamente, tornando os votos para pular e as interações no chat justos e em tempo real.
* **O que me faria mudar de ideia:** Se a política de termos de uso do YouTube IFrame bloqueasse reprodução programática oculta ou se quiséssemos transmitir áudio de microfone do DJ em tempo real (exigindo WebRTC/Icecast).

---

## 2. Linguagem e Arquitetura do Back-end

* **Escolha:** Go (Golang).
* **Alternativa descartada:** Python e Java.
* **Motivo:** Go possui suporte nativo de altíssima performance para concorrência (goroutines leves e channels), o que é ideal para gerenciar centenas de conexões WebSocket com baixíssimo uso de memória e latência mínima. Além disso, Go compila para um binário estático único, tornando os containers Docker extremamente leves e rápidos de inicializar.
* **O que me faria mudar de ideia:** Necessidade de bibliotecas complexas de Machine Learning para recomendação de faixas (onde o ecossistema Python seria superior).

---

## 3. Framework do Front-end

* **Escolha:** Angular (versão moderna com Standalone Components, Signals e CSS Variables nativas).
* **Alternativa descartada:** React / Next.js / Vue.
* **Motivo:** Angular oferece uma estrutura robusta e padronizada (TypeScript rigoroso, injeção de dependências nativa, Signals reativos sem re-renders desnecessários e controle fino do DOM). O uso de CSS Variables nativas assegura troca instantânea de temas (Dark/Light) sem carregar bibliotecas pesadas de CSS-in-JS.
* **O que me faria mudar de ideia:** Se precisássemos de Server-Side Rendering (SSR) dinâmico complexo e indexação pesada em motores de busca (onde frameworks como Next poderiam ter vantagens de setup rápido).

---

## 4. Banco de Dados e Persistência

* **Escolha:** PostgreSQL (executado via Docker, com acesso estrito e exclusivo pelo backend em Go).
* **Alternativa descartada:** SQLite ou armazenamento puramente em memória.
* **Motivo:** O PostgreSQL oferece suporte robusto a transações ACID (essencial para evitar corrupção de fila com múltiplos ouvintes votando ou adicionando faixas em concorrência), suporte a JSONB para metadados de faixas e durabilidade caso o servidor reinicie. O frontend não tem qualquer acesso direto ao banco.
* **O que me faria mudar de ideia:** Se o projeto tivesse que rodar em sistemas embarcados mínimos sem suporte a Docker, onde o SQLite seria a única opção viável.

---

## 5. Comunicação em Tempo Real

* **Escolha:** WebSocket (bidirecional).
* **Alternativa descartada:** Server-Sent Events (SSE) ou Long Polling.
* **Motivo:** O WebSocket permite tráfego full-duplex de baixa latência em um único canal TCP tanto para receber atualizações da rádio (música atual, votos, fila) quanto para enviar ações do ouvinte (voto de skip, chat, reações instantâneas).
* **O que me faria mudar de ideia:** Se houvesse proxies intermediários corporativos estritos bloqueando WebSockets, exigindo fallback HTTP para SSE ou polling.

---

## 6. Autenticação e Gestão de Usuários

* **Escolha:** Híbrido: Login oficial com Google (OAuth 2.0 / Google Identity Services) + Entrada rápida como Convidado (Apelido/Nickname com avatar personalizado). Toda validação e emissão de sessão ocorre no backend em Go.
* **Alternativa descartada:** Sistema próprio de cadastro com e-mail/senha.
* **Motivo:** Reduz atrito de entrada. Ouvintes casuais podem entrar em 5 segundos apenas digitando um apelido; ouvintes frequentes podem usar a conta Google para manter seu histórico e identificação unificada. Evita também o risco de gerenciar e armazenar senhas em texto puro ou hashes no banco.
* **O que me faria mudar de ideia:** Exigência de conformidade corporativa interna com LDAP/SAML.

---

## 7. Infraestrutura e Docker

* **Escolha:** Docker e Docker Compose unificado orquestrando os serviços de Banco (PostgreSQL), Backend (Go) e Frontend (Angular).
* **Alternativa descartada:** Instalação manual de dependências no sistema operacional local.
* **Motivo:** Garante paridade exata de ambiente entre diferentes máquinas de desenvolvedores e servidores de produção, elimina o problema de "na minha máquina funciona" e simplifica a subida do banco de dados e testes integrados.
* **O que me faria mudar de ideia:** Se estivéssemos fazendo deploy em um ambiente serverless puro gerenciado onde containers não fossem suportados.

---

## 8. Consumo da YouTube Data API e Isolamento de Chaves

* **Escolha:** Todas as chamadas à API do YouTube são realizadas exclusivamente pelo Backend em Go através de proxy com cache em memória/banco. O Frontend nunca chama a API do YouTube diretamente nem conhece a chave de API.
* **Alternativa descartada:** Frontend chamando diretamente a API do YouTube no navegador do usuário.
* **Motivo:** Segurança de credenciais (a chave nunca é exposta no código do cliente ou no tráfego de rede aberto) e controle rígido de cota gratuita através de cache de resultados de busca frequentes.
* **O que me faria mudar de ideia:** Se a cota por IP do backend fosse severamente restrita e a Google exigisse token delegado individual de cada ouvinte.
