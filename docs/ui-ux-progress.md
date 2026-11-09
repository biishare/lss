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

O primeiro workflow UI-2 (`42632119031`, commit `76cd57e`) aprovou testes,
lint, TypeScript e build. No Chromium, 21/28 casos passaram, incluindo falha /
retry com ID conservado e Voltar. Sete casos revelaram um identificador ARIA
duplicado: DialogTitle adoptava o aria-labelledby do Dialog, que já estava
no h2. Chromium anunciava, por exemplo, «Nova matrícula Fechar tarefa» em vez
do título exacto. O cabeçalho recebeu um ID próprio, distinto do h2; um teste
verifica o nome e a unicidade da referência. Os selectores de navegador
mantêm os nomes exactos para comprovar a correcção, em vez de a contornar.

## UI-2 — Integração confirmada

A PR #13 foi integrada em `main`, commit `7425ef5`. O workflow `42634948952`
terminou com sucesso. A Vercel publicou o mesmo commit em produção, READY,
no deployment `dpl_EaWmPKeRHrC7RTpNyRtnEoabMU2A`, com o alias
`lss-iota.vercel.app`. O ensaio final anterior à integração aprovou 211 testes
e 28 casos de Chromium, com 66 capturas e quatro PDFs.

## UI-3 — Percursos de atendimento

Base: `main` `7425ef5`. Branch: `codex/lss-ui3-service-flows`.

### Entrada e contexto do pagamento

O atalho geral abre «Escolher aluno»: pesquisa por nome, número, contacto ou
ano e escolha explícita da matrícula. Só depois mostra as cobranças elegíveis;
não escolhe o primeiro aluno nem a primeira cobrança. Um preenchimento pendente
pode ser retomado por uma acção explícita com o nome do aluno.

Uma célula de inscrição/mensalidade com saldo abre directamente o pagamento
para Secretaria. Director mantém o detalhe de consulta. Células regularizadas,
não aplicáveis e sínteses continuam a abrir consulta. Diversos e síntese deixam
a cobrança a escolher, em vez de aproveitar silenciosamente o primeiro item.
O cálculo e a elegibilidade continuam no ledger e nos serviços existentes.

O formulário apresenta aluno, número, ano e cobrança como contexto; as acções
Alterar cobrança/Alterar aluno são explícitas. Valor, data e forma são os campos
principais. Antecipação aparece para competência futura ou item ainda não
emitido; uma cobrança já emitida no mês corrente não é tratada como previsão
apenas porque o vencimento ainda não chegou.

«Outras opções do recebimento» reúne crédito e distribuição. A distribuição
extensa passa a ecrã completo, conservando a mesma montagem/ID. O detalhe
contabilístico é uma vista opcional da mesma tarefa. Consultar um recibo anterior
e voltar não empilha superfícies nem confirma novamente o pagamento pendente.
O estado anulado/confirmado do recibo mantém a definição anterior.

Uma única acção principal corresponde ao estado. No não numerário, o padrão é
Guardar para conferência, mantendo a dívida e sem recibo. A confirmação imediata
exige a indicação explícita de que referência, valor e data foram conferidos;
alterar esses dados limpa essa indicação. Comprovativos pendentes são visíveis
no contexto e oferecem acesso à lista de conferência da pessoa.

### Continuidade e operações

O ID da tentativa é comunicado ao proprietário ao abrir a tarefa e mantém-se
ao editar, consultar, fechar/reabrir e redimensionar. Reabrir a mesma célula
retoma um preenchimento pendente dessa cobrança. Mudar o mês da planilha só
altera a consulta; já não modifica o pagamento em curso. Uma operação concluída,
incluindo comprovativo guardado, deixa de ser apresentada como pagamento por
concluir com o ID já aplicado.

Movimentos, comprovativos e crédito têm consultas separadas na página. As
superfícies servem à operação escolhida, em vez de obrigar a abrir uma janela
com todas as operações. A pesquisa substitui o selector extenso de matrículas.
A lista e os seus botões mantêm-se montados sob a tarefa para devolver o foco;
quando o botão deixa de existir após concluir, o foco regressa ao controlo
correspondente da consulta.

Conferência usa folha alta; aplicação de crédito/devolução usam ecrã completo
móvel, com rever → confirmar na mesma tarefa. ID e data de preparação pertencem
a cada preenchimento. Rascunhos independentes por comprovativo/origem podem
ser retomados; uma falha de sessionStorage conserva-os em memória. A gravação
mescla os outros rascunhos disponíveis e retira apenas a operação concluída.
O formato anterior é lido quando válido; IDs já aplicados e entradas ilegíveis
não são retomados. Isto não executa movimentos financeiros na leitura.

A correcção recupera aluno/cobrança do movimento original, conserva valor físico,
campos, motivo e ID ao reabrir. A gravação opcional bem-sucedida permite fechar
sem aviso repetido; se o preenchimento não estiver conservado, o fecho pede
continuar ou descartar na própria tarefa.

### Matrícula e benefícios

A matrícula conserva os três passos. Guardar rascunho e Anterior ficam no corpo;
o rodapé destaca Continuar ou as duas escolhas finais Guardar matrícula /
Guardar e pagar. Erros focam o campo relevante e podem regressar ao passo
correspondente, conservando a sessão. Guardar e pagar mantém a nova inscrição
e a pessoa; comprovativo/recibo ocupam o resultado da mesma tarefa.

Benefícios começam pela escolha explícita da matrícula. Vigência, benefício e
respectivo término passam à superfície comum em ecrã completo móvel, com a
prévia anterior e decisão de descarte apenas para alterações por guardar.
As fórmulas, valores, definições, permissões e serviços anteriores mantêm-se.

### Verificação e limites da UI-3

Acrescentados quatro testes de apresentação/recuperação de rascunhos, sem
reescrever os cálculos, e seis casos de interface: escolha de outra pessoa,
consulta/retoma com ID, foco da matrícula, conferência não numerária, devolução
com falhas e correcção retomada. Os testes anteriores percorrem agora a escolha
explícita e o pagamento directo, conservando as suas verificações financeiras.

Oito novos ensaios de navegador cobrem o atalho e comprovativo → conferência →
recibo a 360/1440 px, devolução retomada com ID, consulta de recibo anterior na
mesma tarefa, recibo de célula liquidada com foco de retorno e Director sem mutações. Reusam os 28 casos anteriores, incluindo
as oito larguras, falha/retry, PDFs, rascunho e foco ao voltar à célula.
Resultados, capturas e prévia são acompanhados na PR. Emulação e viewport curto
não comprovam teclado virtual nem Android físico.

A UI-4 continuará a densidade das páginas, filtros secundários, listas móveis,
caixa e textos. A UI-5 fará a verificação integrada. Não foi criada API/base real,
alterada a autenticação de servidor ou actualizado o lockfile. A integração em
main/produção continua separada da implementação e revisão desta branch.

Validação local: 144 testes de domínio/persistência e 77 de interface aprovados;
lint, TypeScript, build e `git diff --check` aprovados. Após as últimas alterações
de validação dos rascunhos, repetidos os quatro testes desse módulo e os 15 de
regras/atendimento, todos aprovados. Os oito ensaios novos de Chromium seguem
para o workflow, juntamente com os 28 anteriores. O executável não está instalado
no executor; a evidência de navegador e da prévia será registada na PR.

O primeiro workflow UI-3 (`42642170376`, commit `62ebc1a`) aprovou os 221 testes,
lint, TypeScript e build; Chromium passou 35/36 casos. O ensaio de recibo anterior
detectou uma submissão indevida ao regressar ao formulário: React reutilizava
o nó do botão Voltar como botão submit antes da acção nativa do clique. Os
controlos receberam identidades distintas por função, tipo explícito e a
navegação cancela a acção nativa. O ensaio compara o estado financeiro antes e
depois de cada regresso, além de conservar campo e ID. O percurso de comprovativo
passa também pelo aviso da célula e atalho para a conferência. Esta correcção
segue para novo ensaio completo, sem integrar a versão em revisão na main.

A revisão das capturas acrescentou contexto visível ao cabeçalho das operações
de conferência, crédito e devolução (aluno, matrícula e ano) e uma referência ao
recibo de origem nos formulários de crédito/devolução. Não é necessário consultar
a lista de fundo para identificar a pessoa e o recebimento em revisão.

No workflow `42643814770` (`5857196`), o regresso da consulta ao formulário
passou com o estado financeiro intacto. Os 221 testes, lint, TypeScript e build
passaram; 34/36 casos Chromium passaram. Os dois restantes pararam por um
selector ambíguo do ensaio novo: o formulário apresenta tanto o aviso de
comprovativo pendente como a explicação de guardar para conferência. O selector
passou a identificar expressamente o aviso de pendência, mantendo a asserção
da referência e a passagem pelo atalho de conferência.


## Integração da UI-3

A PR 14 foi integrada na main em `7846dfaaa8f46ce7626f012fbddba5c6bc936382`.
O workflow `42648443492` aprovou 144 testes de domínio/persistência, 77 de
interface e 36 de Chromium, lint, TypeScript e build. A Vercel publicou esse
commit em produção READY (`dpl_ANYEej8aw2o9bTQst2UWf8Ufmc1p`), com o alias
lss-iota.vercel.app confirmado e a entrada observada no navegador. A consulta
de erros/fatal desse deployment nos últimos 15 minutos não devolveu registos.

## UI-4 — Pesquisa, densidade e consistência

Implementação na branch `codex/lss-ui4-density-consistency`, sobre a main UI-3.

### Listas e contexto

Pagamentos abre numa lista compacta em mobile. Sem período escolhido, começa
no mês corrente que pertença ao ano activo; períodos explicitamente guardados
continuam a ser respeitados. Desktop conserva a planilha por defeito. Ver
planilha completa e Ver lista compacta mudam a apresentação, sem limpar
pesquisa, selecção nem o preenchimento financeiro. Cada linha identifica a
pessoa, matrícula, mês, saldo e estado textual; inscrição/diversos/síntese ficam
numa secção secundária. A lista e a tabela reutilizam o mesmo ledger e a mesma
acção de célula, com consulta para Director. A pesquisa inclui número e contacto.

Uma chave de apresentação identifica a cobrança entre lista e tabela. Se a
largura mudar durante o pagamento, o foco regressa à cobrança equivalente,
sem depender de um botão que deixou de existir. Sem mudança de composição,
o foco e a posição anteriores mantêm-se.

A lista de alunos usa cartões legíveis abaixo de 768 px e tabela em desktop,
com o mesmo conjunto e paginação. Filtros por classe, turma e situação são
independentes do contexto obrigatório da planilha; permanecem na ficha, no
regresso e na recarga. O URL transporta IDs e estados, nunca a pesquisa pessoal.

### Filtros e relatórios

O editor comum abre em bottom sheet no telemóvel e painel compacto em desktop.
Edita uma cópia controlada: Aplicar publica o conjunto; Cancelar, Fechar,
Escape e Voltar conservam o anterior. Limpar apenas muda a cópia até Aplicar.
Mostra a contagem dos filtros secundários e permite removê-los individualmente.
A cópia não se perde ao redimensionar. Pesquisa, relatório e período continuam
junto aos resultados; definições extensas e indicadores relacionados ficam
recolhidos. Os resultados, totais, CSV e PDF usam o mesmo ReportResult dos
serviços existentes. Conferência geral mostra todos os comprovativos até uma
escolha explícita de pessoa, sem seleccionar o primeiro aluno.

### Caixa

A página põe as operações e a sessão em atendimento antes do histórico.
Movimentos usam cartões em mobile e tabela em desktop. O detalhe indica forma,
quantidade e líquido dos movimentos apresentados; CSV e Imprimir detalhe / PDF
usam exactamente essas linhas. A conferência e a impressão da sessão completa
estão identificadas como tal e ficam numa secção secundária; preservam o retrato
do fecho e os ajustamentos posteriores.

Abertura usa a superfície comum em folha; saída/reforço/fecho usam tarefa em
ecrã completo móvel. Rever e confirmar continuam separados. Cada preenchimento
tem ID próprio e referência à sua sessão; fechar, retomar, recarregar e mudar de
largura não criam uma tentativa nova. Rascunhos opcionais ficam em sessionStorage,
com recuperação validada, exclusão de IDs já aplicados e memória em caso de
falha da escrita opcional. Uma tarefa de outra sessão não é aplicada à actual.
A validação e execução continuam em planCash/executeCash, com o relógio actual.

Foram encurtados rótulos, corrigidas contagens singulares, mantidos estados
textuais e ampliados alvos de toque. O resumo mensal da planilha passa a usar
apenas os alunos apresentados, sem alterar o cálculo da emissão da turma.
Não há alteração de serviços/cálculos financeiros, API, base real, autenticação
ou dependências.

### Verificação em curso

Os primeiros checks locais aprovaram 147 testes de domínio/persistência e
80 de interface (227), lint, TypeScript e build. Três novos casos verificam
estado/recuperação de contexto e rascunhos de caixa; três casos de interface
cobrem aplicar/cancelar/limpar, retoma do caixa e prévia filtrada. Os ensaios
anteriores foram adaptados aos controlos explícitos.

Sete casos de navegador acrescentam lista/planilha com selecção e foco,
filtros temporários com CSV/PDF, saída de caixa retomada e ficha com filtros,
totalizando 43 casos com os 36 anteriores. A tentativa local de Chromium parou no arranque
por uma restrição de socket do processo, antes de abrir qualquer página. Não é
registada como teste funcional aprovado. A execução de navegador, capturas e
PDFs segue para o workflow da branch, com resultados finais registados na PR.
Android físico e teclado virtual real continuam na UI-5. Esta branch ainda não
foi integrada na main.
