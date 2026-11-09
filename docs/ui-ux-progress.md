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
| `npm test` | 205 aprovados: 140 de domínio/persistência e 65 de interface. |
| `npm run lint` | Sem erros nem avisos. |
| `npm run build` | Compilação, TypeScript e geração das rotas aprovadas. |
| `git diff --check` | Aprovado. |
| HTML do build | Contém o formulário; não contém a antiga mensagem global. |
| Scripts referidos no HTML inicial | Sem os marcadores textuais da planilha e da confirmação financeira inspeccionados; não é uma medição completa de desempenho. |

Dez testes novos cobrem o primeiro HTML, ausência de leitura/gravação antes
do login, armazenamento vazio/corrompido/bloqueado, destino interno, papel,
retry sem substituição, shell com skeleton e preservação do menu/foco na
transição para o conteúdo e preferência de sidebar escolhida durante o skeleton.
Dois testes anteriores passam a
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

O segundo ensaio (`42625712352`) passou 18/19 casos de navegador, incluindo
o Drawer. A sidebar revelou outra transição: uma escolha feita no skeleton
ficava só em memória e a restauração posterior lia a preferência anterior.
A frame passou a persistir a escolha no próprio evento, antes de a comunicar
à área; um teste adicional confirma a gravação sem ler o conjunto escolar.

A `main` e produção não são alteradas por esta implementação em branch.
Depois da revisão e integração autorizada, verificar o commit/READY na Vercel
e os percursos na URL publicada. Teclado virtual e dispositivo físico continuam
distintos de emulação e testes de DOM.

## UI-1 — Integração confirmada

A PR #12 foi integrada em `main` no commit `8e84121`. O workflow
`42627925560` terminou com sucesso. A Vercel publicou o mesmo commit em
produção, READY, no deployment `dpl_6nxcXa9v5oxhKaoLohf7SaEpGGCh`, com o
alias `lss-iota.vercel.app`. Esta confirmação substitui o estado pendente
registado acima durante o desenvolvimento da UI-1.

## UI-2 — Superfícies comuns

Base: `main` `8e84121`. Branch: `codex/lss-ui2-responsive-surfaces`.

`TaskSurface` reúne título/contexto, fecho visível, corpo com scroll próprio,
rodapé, estado de gravação e decisão de saída. Usa uma única árvore de
Dialog MUI: CSS muda a geometria em 768 px, mantendo formulário, foco, erro
e ID em vez de desmontar Dialog e montar Drawer. A folha abre na base com
cantos superiores; não se introduz gesto global nem arrastamento obrigatório.
Os papéis modais, o foco contido e o retorno de foco continuam no MUI.

| Tarefa migrada | Mobile | Tablet/desktop |
| --- | --- | --- |
| Detalhe de cobrança | Folha inferior | Dialog |
| Pagamento simples | Folha alta | Dialog |
| Pagamento distribuído/correcção | Ecrã completo | Dialog |
| Matrícula/renovação e alteração de matrícula | Ecrã completo | Dialog |
| Correcção de dados/contacto | Folha inferior | Dialog |
| Recibo e prévia de relatório/caixa | Visualizador em ecrã completo | Dialog de documento |
| Confirmação pontual de configuração/recuperação | Dialog compacto | Dialog compacto |

A geometria usa `dvh`, área segura inferior, alvos de 44 px e campos móveis
de 16 px. O movimento reduzido é respeitado. Reduzir a altura de viewport
em teste verifica espaço disponível; não comprova o teclado virtual real.

Fechar, Escape, toque fora e Voltar passam pela mesma política. Gravação em
curso impede saída. Uma correcção com alterações por guardar pede decisão
dentro da mesma superfície, mantendo os campos montados enquanto a pessoa
escolhe continuar ou descartar. Uma correcção intacta fecha directamente.
A matrícula mantém a sessão no proprietário; mesmo com falha no armazenamento
opcional, fechar/reabrir no mesmo separador recupera o preenchimento em memória.
A persistência bem-sucedida mantém também o percurso de recarga já existente.

Uma entrada temporária do histórico permite Voltar fechar a tarefa antes de
sair da área. Trocar detalhe por pagamento reutiliza a entrada; concluir uma
tarefa que muda a área substitui essa entrada. A URL não transporta campos do
formulário. O estado do domínio e o ID permanecem nos proprietários anteriores.

Importação/reposição de desenvolvimento, mudança de etapa e início/fecho de
ano usam confirmação da aplicação, com efeito e cancelamento preservados.
A auditoria das chamadas em `app` deixa apenas o callback financeiro
`confirm(draft, id)`; não é uma chamada ao browser. Nenhum fluxo de negócio
mantém `window.alert`, `window.confirm` ou `window.prompt`.

Recibo e relatório têm um alvo `.lss-print-target`. Os estilos de impressão
referem o alvo e as classes da superfície comum, independentemente de classes
MuiDialog: retiram navegação, backdrop, cabeçalho e rodapé, libertam altura e
scroll e mantêm só um documento montado. Reimprimir não chama os comandos.

### Verificação da UI-2

Seis testes de interface novos cobrem saída com/sem alterações, campos/erro
na mesma montagem, gravação em curso, confirmação explícita/cancelamento,
rascunho de matrícula em memória e cancelamento da mudança de configuração.
Os testes anteriores de reposição e fecho de matrícula foram actualizados para
as decisões próprias da aplicação.

Nove ensaios novos de Chromium cobrem folha/matrícula a 320, 360, 390, 768,
1024 e 1440 px, redimensionamento após falha de gravação com o mesmo ID,
viewport curto, Voltar e confirmação de descarte sem empilhar modais. Reusam
os testes anteriores de recibo/PDF, relatórios e retorno à célula. A execução
e a revisão das capturas são registadas na PR; não inferir aprovação de
navegador apenas a partir do DOM ou da compilação.

### Limites e fase seguinte

Esta entrega estabelece a estrutura comum e migra os percursos acima. A
simplificação do formulário de pagamento e escolha explícita no atalho geral,
as superfícies dos movimentos/comprovativos/benefícios e a reorganização de
listas/filtros continuam nas UI-3/UI-4. A impressão da caixa usa o visualizador
comum; os comandos de caixa ainda seguem para a revisão da área.

Não foi criada API/base real, alterado o domínio financeiro, adicionado outro
kit de componentes nem actualizado o lockfile. Android físico/teclado virtual
continuam por verificar. A integração em `main` e produção é uma etapa posterior
à revisão desta branch, seguindo o fluxo acordado.

Validação local desta entrega: 140 testes de domínio/persistência e 71 de
interface aprovados; lint, TypeScript, build e `git diff --check` aprovados.
O Chromium não está instalado no executor; o ensaio de navegador segue no
workflow da PR, sem tratar os testes de DOM como revisão visual. Os primeiros
ensaios locais corrigiram tipos/selectores dos novos testes e passaram a
simular a falha de sessionStorage com um adaptador que efectivamente lança
a excepção, em vez de atribuir um método ao objecto Storage.
