# LSS — ciclo de melhoria UI/UX

Referência: instrução UI/UX v1.1 de 09/11/2026, aprovada na conversa do projecto.
Complementa a v3, preservando a decisão de desenvolver a API/base real depois.
Este ciclo não cria uma fase 8 da v3 nem activa dados reais.

## UI-1 — Entrada e arranque

Base: `main` `eaa29a7` (PR #11). Branch: `codex/lss-ui1-entry-startup`.

Ao abrir a raiz sem sessão, a entrada já está no primeiro HTML. O controlo
leve de sessão só consulta a sessão local; não monta nem inicializa o repositório
escolar. O ambiente de trabalho e os seus cálculos são importados depois de
reconhecer a conta. A raiz pública foi retirada do grupo de rotas do workspace.

Nome, marca e navegação vivem num módulo leve; o login e o shell deixam de
importar o modelo que traz os dados e cálculos escolares. O modelo conserva
reexportações para não quebrar os consumidores anteriores.

Depois de entrar, skeletons substituem apenas o conteúdo enquanto o shell
conserva conta, menu e saída. O botão Entrar usa um indicador circular pequeno
durante a autenticação do adaptador local. Os skeletons não apresentam saldos
ou contagens fictícios e não usam animação contínua.

Uma ligação interna conserva a rota e parâmetros conhecidos de contexto.
Pesquisa pessoal e parâmetros desconhecidos não transitam no URL. IDs e
permissões continuam a ser tratados pelo domínio existente; esta filtragem
não é autenticação de servidor.

Dados ilegíveis e falhas de preparação mantêm o original, navegação e saída.
Tentar novamente repete a leitura sem recarregar toda a página nem repor
exemplos. Rascunhos, recibos e comandos financeiros permanecem nos serviços
anteriores. A preparação automática de um cenário vazio só ocorre após a
entrada no workspace.

### Validação local

| Verificação | Resultado |
| --- | --- |
| `npm test` | 204 aprovados: 140 de domínio/persistência e 64 de interface. |
| `npm run lint` | Sem erros nem avisos. |
| `npm run build` | Compilação, TypeScript e geração das rotas aprovadas. |
| `git diff --check` | Aprovado. |
| HTML do build | Contém o formulário; não contém a antiga mensagem global. |
| Scripts referidos no HTML inicial | Sem os marcadores textuais da planilha e da confirmação financeira inspeccionados; não é uma medição completa de desempenho. |

Nove testes novos cobrem o primeiro HTML, ausência de leitura/gravação antes
do login, armazenamento vazio/corrompido/bloqueado, destino interno, papel,
retry sem substituição, shell com skeleton e preservação do menu/foco na
transição para o conteúdo. Dois testes anteriores passam a
esperar a importação a frio do workspace, sem impor ao transpilador de testes
o limite de um segundo. O ensaio do Drawer aguarda o conteúdo pronto antes
de medir o retorno do foco.

Foram acrescentados quatro ensaios de Chromium: HTML sem JavaScript,
primeira entrada a 360/1440 px e dados ilegíveis depois do login/saída. A
execução local não iniciou o navegador: falta o executável e o download
oficial do Chromium falhou com arquivo incompleto. Estes testes seguem para
o workflow da PR. Não declarar capturas, revisão visual ou deploy verificados
com base nos testes de DOM ou no build.

### Próximas entregas

| Entrega | Estado |
| --- | --- |
| UI-1 — Entrada e arranque | Implementada e validada localmente; navegador e prévia acompanhados na PR. |
| UI-2 — Superfícies comuns | Pendente: bottom sheets, ecrã completo, foco/rascunhos e impressão. |
| UI-3 — Atendimento | Pendente: pagamento contextual, escolha explícita no atalho geral, matrícula e movimentos. |
| UI-4 — Densidade e consistência | Pendente: filtros, listas, relatórios, caixa e textos. |
| UI-5 — Verificação e entrega | Pendente: revisão integrada, dispositivo físico e produção. |

A remoção de `alert()`, `confirm()` e `prompt()` aplica-se a todo o ciclo.
A UI-1 não acrescenta estes métodos; as confirmações antigas de matrícula,
importação/reposição e outras operações serão substituídas nas entregas dos
respectivos percursos. Não foram removidas silenciosamente protecções de saída.

### Correcção do primeiro ensaio de navegador

O workflow `42615731198` aprovou os 203 testes anteriores, lint, TypeScript e
build, e executou os 19 casos de Chromium: 16 passaram e três falharam. Dois
selectores de teste coincidiam com o anunciador de rotas do Next.js; foram
delimitados à região de entrada. O outro caso revelou que o Drawer podia
desaparecer quando o skeleton era substituído pelo workspace.

O shell passou a ser propriedade de uma frame acima de Suspense. As áreas
fornecem apresentação e callbacks, mas só o conteúdo é substituído. O Drawer,
o seu botão e o foco mantêm-se montados; uma mudança real de breakpoint fecha
o menu, sem agendar um fecho na primeira montagem. Um novo teste exercita a
transição com o menu aberto e o retorno do foco ao mesmo botão. A nova execução
de Chromium e a prévia correspondente são acompanhadas na PR #12.

A `main` e produção não são alteradas por esta implementação em branch.
Depois da revisão e integração autorizada, verificar o commit/READY na Vercel
e os percursos na URL publicada. Teclado virtual e dispositivo físico continuam
distintos de emulação e testes de DOM.
