# O Projeto

Cada aluno constrói o sistema completo: back-end, front-end, banco e testes. Os dois projetos seguem a mesma especificação, mas cada um toma suas próprias decisões — no final, vamos comparar os caminhos.

O colega participa como revisor: todo pull request precisa ser revisado pelo outro aluno antes do merge, e cada um testa o projeto do outro na sessão de "usuário hostil".

## Funcionalidades obrigatórias

* Entrar na rádio com um apelido (ou login simples).
* Buscar músicas (YouTube Data API) e adicionar à fila.
* Limite de músicas na fila por pessoa.
* Fila e "tocando agora" atualizados em tempo real para todos.
* Votar para pular; a música pula quando mais de X% dos ouvintes votam.
* DJ automático quando a fila esvazia.
* Histórico: o que tocou, quando e quem adicionou.

## Regras de negócio

É aqui que moram os testes. Cada regra abaixo precisa de pelo menos um teste automatizado.

* Uma música não pode se repetir entre as últimas N tocadas.
* Voto duplicado do mesmo ouvinte não conta.
* Quem sai da rádio perde o voto. As músicas que ele adicionou continuam na fila ou saem? Decida e documente.
* Se existe DJ automático, a fila nunca fica vazia enquanto houver alguém ouvindo.
* Se a API do YouTube falhar, o sistema não pode travar: avisa e continua.
* Dois ouvintes adicionando ou votando ao mesmo tempo não podem corromper a fila.

## Extras (bônus)

* Salas diferentes (cada turma com sua rádio).
* Modo "caixa de som da sala": um único player toca e os celulares só controlam.
* Estatísticas: quem mais adicionou, músicas mais puladas.

---

## 0 - Decidir

Antes de escrever qualquer código, você toma e justifica decisões.

Use a IA para pesquisar prós e contras, mas a escolha e o argumento são seus. Não combine com o colega: é esperado que os dois projetos façam escolhas diferentes.

| Decisão | Perguntas que ajudam |
| :--- | :--- |
| Onde o som toca? | Cada navegador toca por conta própria ou existe um player único na sala? Qual o impacto em sincronização? |
| Linguagem do back-end | Python ou Java? Velocidade de desenvolvimento vs. tipagem. Qual tem melhor suporte a WebSocket? |
| Framework do front | React, que você já conhece. Vite ou Next? Por quê? |
| Banco de dados | SQLite, PostgreSQL ou só memória? O que acontece com a fila se o servidor reiniciar? |
| Tempo real | WebSocket, Server-Sent Events ou polling? Diferenças e custo de cada um. |
| Sistema operacional e hospedagem | Roda só local? Docker? VPS ou serviço gratuito? Por que Linux no servidor? |
| Autenticação | Apelido simples, login próprio ou login com Google? O que muda em segurança? |
| API de música | YouTube ou outra? Limites da cota gratuita e termos de uso atuais. |

**Exercício da fase:**
Faça a mesma pergunta para a IA de duas formas: uma neutra ("Python ou Java para este projeto?") e uma enviesada ("Por que Java é melhor que Python para este projeto?"). Compare as respostas e anote o que percebeu.

**Entregável:** `DECISIONS.md` com, para cada decisão: o que escolheu, a alternativa descartada, o motivo e o que te faria mudar de ideia.

---

## 1 - Planejar

Especificação, dados, contrato da API e tarefas — antes do código.

* Escrever a especificação em `SPEC.md`: histórias de usuário ("como ouvinte, quero…") e regras de negócio.
* Modelar os dados: entidades, relacionamentos e diagrama (Mermaid). Peça à IA para gerar a partir da spec e critique o resultado.
* Definir o contrato da API (`API.md` ou OpenAPI) antes de qualquer código. Mesmo sozinho, o contrato separa o back do front e permite desenvolver um lado com dados falsos enquanto o outro não existe.
* Quebrar o projeto em tarefas pequenas o suficiente para o agente executar uma por vez. Regra prática: uma tarefa = um branch = um pull request que dá para revisar em 10 minutos.
* Criar o `AGENTS.md` do repositório: stack, convenções de código, como rodar os testes, e o que a IA não pode fazer sem avisar (instalar dependências, mudar o contrato da API, apagar testes).

**Entregável:** `SPEC.md`, `API.md`, diagrama de dados, `AGENTS.md` e o backlog de tarefas (issues no GitHub).

---

## 2 - Executar

O agente escreve, você lê, roda e decide.

**Fluxo obrigatório para toda tarefa:**
1. Crie um branch com o nome da tarefa.
2. Use o modo plan do OpenCode: o agente propõe a abordagem, você aprova ou corrige.
3. O agente implementa.
4. Leia o diff inteiro. Nada é aceito sem leitura.
5. Rode localmente e rode os testes.
6. Abra um pull request. O colega revisa e comenta antes do merge. A qualidade da revisão que você faz no projeto do outro também conta na sua nota.

**Regras:**
* Só aceite código que consiga explicar linha a linha.
* Chaves de API nunca vão para o repositório nem para o prompt. Use variáveis de ambiente e `.env` no `.gitignore`.
* A cada marco, uma tarefa curta obrigatória sem IA (definida pelo professor).
* Mantenha o `DIARIO.md`: a cada tarefa, três linhas — o que a IA acertou, onde errou, o que você fez na mão.

**Marcos, nesta ordem:**
1. Back com fila em memória e endpoints básicos; front com busca e lista da fila usando dados falsos.
2. Integração back/front pelo contrato; player tocando; persistência no banco.
3. Tempo real, votos e regras de negócio.
4. DJ automático, tratamento de falhas e polimento.

**Entregável:** Código funcionando, histórico de pull requests revisados e `DIARIO.md`.

---

## 3 - Validar e testar

Duas perguntas diferentes: faz o que a spec pede? Continua fazendo?

**Validar (O sistema faz o que a spec pede?):**
* Percorra cada história de usuário manualmente e marque como atendida ou não.
* Sessão de "usuário hostil": o professor e o colega tentam quebrar o seu sistema — votar duas vezes, clicar rápido, adicionar a mesma música, derrubar a internet no meio. Você faz o mesmo no projeto dele.

**Testar (Testes automatizados que provam que continua funcionando):**
* Unitários nas regras de negócio (repetição, votos, limites).
* Integração na API (cada endpoint do contrato).
* Pelo menos um teste end-to-end do fluxo principal: entrar, adicionar música, ver na fila, votar para pular.
* CI no GitHub Actions rodando tudo a cada pull request.

**Exercício da fase:**
Deixe a IA gerar uma bateria de testes. Encontre pelo menos um teste que passa mas não testa nada útil e explique por quê.

**Entregável:** Suíte de testes rodando em CI, checklist de validação preenchido e relatório da sessão de usuário hostil (o que quebrou e o que foi corrigido).

---

## 4 - Apresentar

15 a 20 minutos por aluno. Slides são opcionais e, se usados, feitos por você.

* Arquitetura desenhada na hora (quadro ou papel): componentes e o caminho de uma música do clique em "adicionar" até tocar na tela de todo mundo.
* As decisões: cada item do `DECISIONS.md` — o que escolheu, o que descartou, e se hoje escolheria diferente.
* A IA no processo: onde ajudou, onde errou, o que precisou fazer manualmente. Um exemplo concreto de cada.
* Perguntas do professor sobre trechos do código, sem aviso prévio.

Depois das duas apresentações, uma conversa de 15 minutos comparando os dois projetos: onde as decisões divergiram e o que cada caminho custou.

---

## Entregas

| Fase | Entregável |
| :--- | :--- |
| 0 — Decidir | `DECISIONS.md` |
| 1 — Planejar | `SPEC.md`, `API.md`, diagrama, `AGENTS.md`, backlog |
| 2 — Executar | Código funcionando, histórico de PRs revisados, `DIARIO.md` |
| 3 — Validar e testar | Testes em CI, checklist de validação, relatório de usuário hostil |
| 4 — Apresentar | Apresentação |
| Contínuo | Tarefas sem IA a cada marco |

## Como você será avaliado

O processo vale tanto quanto o resultado. Um sistema perfeito que você não consegue explicar vale menos que um sistema simples que você domina.

| Critério | Peso | O que será observado |
| :--- | :--- | :--- |
| Decisões de design | 20% | As escolhas foram justificadas com argumentos técnicos? Considerou alternativas? Sabe o que te faria mudar de ideia? |
| Planejamento | 10% | Spec clara, contrato de API definido antes do código, tarefas bem quebradas. |
| Execução e uso da IA | 25% | Histórico de PRs com revisão real. Diff lido antes de aceitar. Diário sincero e específico. Segredos fora do repositório. Qualidade das revisões feitas no projeto do colega. |
| Validação e testes | 20% | Testes cobrem as regras de negócio. CI funcionando. Encontrou testes inúteis gerados pela IA. Sistema resistiu à sessão hostil ou foi corrigido depois dela. |
| Domínio do código | 15% | Nas perguntas ao vivo: consegue explicar o que aceitou? Sabe por que aquele trecho existe? |
| Apresentação da arquitetura | 10% | Desenho correto e completo, fluxo explicado de ponta a ponta, clareza. |

## Penalidades

* Código aceito sem leitura (trechos que não consegue explicar): desconto em "Domínio do código".
* Chave de API no repositório: desconto em "Execução".
* Tarefa sem IA não entregue: desconto em "Execução".

## Bônus

* Funcionalidades extras funcionando e testadas.
* Encontrar e documentar um erro da IA que os testes não pegaram, com a correção.

---

**Ferramentas:**
* OpenCode com DeepSeek V4 (chave fornecida pelo professor, com limite de gasto).
* Git + GitHub (branches, pull requests, Actions).
* YouTube Data API v3 + YouTube IFrame Player API (chave própria de cada aluno, gratuita, criada no Google Cloud).
* O que mais você decidir na Fase 0.

> A IA acelera quem sabe avaliar o resultado. Ela não substitui saber o que se está fazendo — ela cobra isso ainda mais.
