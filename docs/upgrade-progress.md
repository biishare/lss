# LSS - registo de implementação

Instrução vigente: [especificação mesclada v3](lss-especificacao-mesclada-v3.md),
com a decisão posterior do utilizador de 08/11/2026: **não criar base de dados
real agora; a base central e o backend serão implementados depois numa API
dedicada**. Esta decisão prevalece sobre as secções anteriores da v3 que
previam PostgreSQL e servidor nesta etapa.

## Estado actual

| Fase da v3 | Estado | Resultado |
| --- | --- | --- |
| 0 - Confirmar base e rever o plano | Diagnóstico realizado | Base, código, testes e diferenças inventariados. |
| 1 - Dados e serviços fiáveis | Parcial face à v3 integral; âmbito local entregue na main | Snapshot v3, validação, revisão, comandos, recuperação, recibo persistido e rascunhos. Base central, transacções e backups adiados para a API. |
| 2 - Login, MUI e navegação | Parte local implementada; fase integral parcial | Login e navegação de apresentação com cinco áreas. Autenticação/recuperação/autorização reais adiadas. Revisão visual pendente. |
| 3 - Alunos e estrutura | Implementada e validada no âmbito local; revisão visual pendente | Ficha permanente, matrículas anuais, configuração guiada, vagas, pautas, rascunhos, renovação, transferência e saída. Validação de servidor aguarda a API. |
| 4 - Regras e cobranças | Pendente | Emissão, benefícios, dinheiro exacto e multas conforme v3. |
| 5 - Atendimento, crédito e recibos | Pendente | Modal completo, conferência, crédito, devoluções e série de recibos. |
| 6 - Relatórios, caixa e continuidade | Pendente | Totais detalháveis, CSV/PDF, caixa e fechos; backups centrais para a API. |
| 7 - Validar, apresentar e preparar piloto | Pendente | Matriz de aceitação, ensaio de atendimento e critérios de piloto/servidor. |

## Fase 1: alterações

- A chave `gestao-academica-demo-state-v2` foi conservada para encontrar os dados
  existentes; o conteúdo e as novas exportações passam a versão 3.
- O adaptador local distingue ausência de dados, leitura válida e erro. Não há
  gravação automática de dados financeiros após renderizar nem reposição ao
  carregar. A primeira utilização oferece exemplo ou configuração vazia.
- Exportações v2 e o formato anterior continuam legíveis. A primeira gravação
  do formato anterior conserva o original completo em `legacySource`.
- Dados inválidos permanecem intactos; a recuperação permite descarregar o
  original e importar uma cópia válida, com confirmação e preservação do original.
- Importação valida versão, colecções, IDs, relações, valores e aplicações;
  mostra contagens e só substitui após confirmação e gravação bem-sucedida.
- Cada alteração guarda um próximo snapshot completo antes de actualizar os
  dados apresentados. Matrícula e registo financeiro são uma escrita; pagamento,
  aplicações, recibo e histórico também são uma escrita.
- O mesmo ID/conteúdo de pagamento recupera o resultado original. Conteúdo
  diferente com o mesmo ID é recusado. Director não pode escrever pelo serviço.
- `revision` e `datasetId` detectam alterações concluídas noutra aba e
  substituições do cenário. Continua suportada uma aba de escrita por vez;
  não é garantia de concorrência simultânea nem segurança de produção.
- Falha conserva formulário/dados. Rascunhos de pagamento e matrícula são
  recuperáveis na sessão do mesmo cenário; preferência de sidebar é lida antes
  de ser escrita.
- Os exemplos têm data-base fixa, números permanentes únicos, dois preços e
  metadados do ano activo/próximo. Números repetidos no formato antigo são
  conservados com aviso, para revisão académica explícita na fase 3.

## Validação da fase 1

| Comando | Resultado observado |
| --- | --- |
| `npm test` | 59 testes aprovados: 49 de domínio/persistência e 10 de interface. |
| `npm run lint` | Aprovado, sem erros nem avisos. |
| `npm run build` | Compilação, verificação TypeScript e geração das rotas concluídas. |
| `npx tsc --noEmit` | Aprovado. |
| `git diff --check` | Aprovado. |

Os testes de UI usam React Testing Library e Happy DOM; verificam as operações
no DOM, incluindo falhas, mas não substituem revisão visual desktop/mobile.
Foram verificados recuperação sem reposição silenciosa, falha/repetição de
pagamento, matrícula com gravação única, consulta pelo Director, cancelamento de
reposição, importação inválida, conflito entre abas e preservação de rascunhos
ao navegar imediatamente, antes de correr o temporizador de gravação.

## Pendências e limites

Os cenários completos de conferência, crédito, devolução, transferência e dívida
anual dependem das fases académicas/financeiras seguintes. O estado base já
preserva essas operações quando existirem, sem as declarar implementadas.
Os cálculos F01/F06/F07 identificados no diagnóstico continuam para a fase 4.
A numeração dos recibos ainda usa o formato anterior; a série institucional e a
impressão limpa serão concluídas na fase 5.

Não foram criados SQL, ORM, servidor, endpoints financeiros ou base remota.
Contas reais, autenticação, validação no servidor, backups centrais e critérios
P01-P12 de produção dependem da API dedicada posterior. Exportar JSON não
substitui esses backups.

A fase 1 foi integrada em `main` na PR #2 (commit `9bf73ce`) por instrução do
utilizador. O deploy de produção da Vercel passou; início, planilha e detalhe
foram verificados com o cenário anterior preservado. Publicar a demo não a
transforma num sistema com autenticação ou dados centrais.

## Fase 2: entrada, shell e contexto

Branch: `codex/lss-v3-navigation`, a partir da `main` publicada na fase 1.

- Entrada única de demonstração, com duas contas fixas. O papel deriva da conta;
  sessões antigas são reconhecidas, sem aceitar nome ou papel arbitrários.
  Não há formulário de credenciais simulado, palavra-passe ou backend.
- Layout partilhado entre as rotas reais do Next.js. Navegar não desmonta o
  estado de atendimento. A navegação usa a History API integrada no App Router.
- Cinco áreas, topo de 64/56 px, ano e conta. Retirados o cartão de perfil, a
  mensalidade global e o cabeçalho de atalhos repetidos. Atendimento fica no Início.
- Sidebar desktop de 256/64 px (1200+), barra compacta no tablet e expansão
  sobreposta, Drawer móvel até 288 px com pelo menos 48 px livres. Tooltips e
  nomes acessíveis nas acções compactas, foco e fechos do MUI preservados.
- Planilha pode ocupar toda a largura disponível, sem limite global de 90rem.
  A vista expandida oculta navegação/resumos/formulário sem remontar a tabela
  nem escrever a preferência permanente. Escape respeita um diálogo aberto.
- Classe/turma, mês e área/separador no URL; pesquisa e selecção apenas na sessão
  do cenário. Recuperação valida IDs e relações. Voltar, Avançar, recarregar e
  mudar de área conservam contexto, rascunhos e posições da planilha.
- A entrada e a sessão de exemplo estão isoladas em adaptadores próprios;
  autenticação, permissões de servidor e P01/P02/P11 continuam para a API.

Validação automatizada desta fase: 55 testes de domínio/persistência e 18 de UI
(73 no total), incluindo contas, compatibilidade, URL sem pesquisa pessoal,
links directos, retorno/reabertura, rascunho, selecção, scroll, Drawer e Escape.
Lint sem erros/avisos, `npx tsc --noEmit`, `git diff --check` e `npm run build` aprovados. Todas as rotas foram geradas na compilação de produção.

PR #3: https://github.com/biishare/lss/pull/3. O commit de código `5e97eca`
foi publicado com árvore Git idêntica à testada localmente. O check Vercel
terminou em `success`; o bot confirmou o preview como Ready, deployment
`J8fu7s5gwwScXh7yVMaTZUA7XuS4`.

A abertura do preview neste navegador foi redireccionada para o login da Vercel.
O navegador também não alcança o servidor local deste ambiente (`localhost:3000`).
Por isso, **não foi concluída a revisão visual das oito larguras** nem a medição
real dos 192 px libertados. Não foram alteradas protecções ou acesso do preview.
O comportamento de retorno, scroll, foco/Escape e fechos foi verificado no DOM
simulado, sem o apresentar como ensaio visual ou de teclado virtual. Esse limite de verificação permanece registado. A PR foi entretanto integrada por instrução do utilizador.

A fase 2 foi integrada na `main` pelo commit `0f64d75` (PR #3). Essa publicação não conclui os requisitos centrais da v3.
O atendimento completo no Dialog, Mês/Trimestre/Ano e a impressão ficam na
fase 5; a configuração única e os vários anos ficam na fase 3.

## Ajuste da fase 2: experiência de aplicação normal

Branch: `codex/lss-normal-app`, criada a partir da `main` `0f64d75`. As alterações académicas ainda não guardadas da outra branch foram preservadas e não fazem parte desta entrega.

Decisão nova do utilizador: a condição de demo fica apenas nos bastidores e na documentação técnica. A interface e os percursos apresentados ao cliente devem corresponder a uma aplicação normal. Mantêm-se os dados fictícios e a API posterior.

- Um formulário com Utilizador/Palavra-passe substitui a lista de contas. O par deve corresponder a uma conta fictícia; o papel vem dessa conta. Erros de acesso são genéricos e não abrem sessão. A recuperação orienta para a administração, sem fingir envio de mensagens.
- O adaptador local de entrada é uma fixture de apresentação inspectável no browser, não um mecanismo de segurança. Não guarda a palavra-passe submetida nem cria utilizadores reais, sessões de servidor ou requisitos P01/P02/P11.
- Selo Demo e explicações técnicas retirados do percurso normal. Importação, reposição, recuperação técnica e preparação de cenários exigem `NEXT_PUBLIC_LSS_DEVELOPER_TOOLS=true` e Secretaria; por defeito estão desligados. Esta flag é configuração de apresentação e não autorização de produção.
- Primeira utilização prepara a escola fictícia uma vez, inclusive quando a primeira conta é Director. A inicialização verifica a ausência de estado antes de escrever. Dados existentes/ilegíveis e falhas de armazenamento não desencadeiam reposição; um erro mantém o original e indica contacto do responsável.
- Os títulos e a numeração originais das fases foram repostos na cópia da especificação. As decisões posteriores ficam num complemento inicial; progresso local e conclusão integral da v3 têm estados separados.

Validação desta branch: 56 testes de domínio/persistência e 22 de interface (78 no total) aprovados. Lint sem erros/avisos, TypeScript, `git diff --check` e build de produção aprovados. As sete rotas da aplicação foram geradas. Foram ensaiados os dois acessos, credenciais incorrectas sem sessão, ausência de palavras-passe no estado guardado, primeira utilização pelo Director sem reposição no recarregamento, dados ilegíveis, falha inicial de gravação e ferramentas técnicas ausentes no modo do cliente.

Limite da revisão visual: `sites-preview start` acrescentou `--host 127.0.0.1 --port 4173 --strictPort`, que o `next dev` instalado não aceita. `sites-preview status` confirmou o preview parado. Não foram alterados scripts da aplicação, permissões ou infra-estrutura para contornar a incompatibilidade. O build passou; browser/mobile/teclado virtual e as oito larguras continuam pendentes de ensaio visual. Não confundir os testes no DOM com essa revisão.

Autorização de entrega: o primeiro envio da branch foi bloqueado pela revisão automática por falta de autorização explícita reconhecida para transmitir o código privado ao GitHub. Em 08/11/2026, o utilizador autorizou expressamente: **«Envia para main»**. Essa instrução autoriza enviar a branch a `biishare/lss`, abrir a PR, integrar a alteração testada e acompanhar a publicação Vercel. O estado final da integração e do deploy deve ser confirmado no GitHub/Vercel. As alterações académicas da outra branch permanecem intactas e fora desta entrega.

A PR #4 foi integrada na `main` pelo commit `699ced4`; o preview e a publicação de produção terminaram em sucesso. O endereço `https://lss-iota.vercel.app/` mostrou o novo formulário sem rótulos de demo. A primeira inspecção visual encontrou campos com apenas 23 px: o reset global `box-sizing: border-box`, fora das camadas, sobrepunha o `content-box` dos inputs MUI e absorvia o padding. A correcção em `codex/lss-login-layout` coloca os resets de elementos na camada `base`, abaixo de `mui`, e usa campos de tamanho médio no login. A revisão das oito larguras, teclado virtual e percursos completos continua pendente; não foi declarado login de servidor ou segurança de produção.

## Fase 3 — Alunos e estrutura

Branch: `codex/lss-v3-academics-complete`, criada a partir da `main` `61bf511`. O trabalho académico anterior em `/workspace/scratch/d3e2d31e9a05/lss` foi preservado. O modelo iniciado foi aproveitado e revisto; os ficheiros originais não foram substituídos.

A experiência permanece normal para o cliente, sem rótulos de demo ou pormenores de armazenamento. A implementação é local, conforme a decisão de adiar a API.

- Pessoa permanente separada da matrícula anual e das colocações datadas. Números de pauta reservados, sem renumerar nem reutilizar após transferência/saída. Fichas anteriores derivadas em leitura, com eventos de origem anterior sem inventar autores/instantes.
- Ficha com Dados, Matrículas, Financeiro, Comprovativos e Histórico. Pesquisa geral ignora acentos, encontra contactos/números, e fica na sessão. IDs de ficha, ano, separador e página recuperam-se pelo URL; paginação de 50 alunos.
- Matrícula em três passos com identificação, colocação e condições/revisão. Correspondências existentes podem ser reutilizadas; outra pessoa com o mesmo nome exige revisão explícita. Rascunho não cria pessoa, matrícula, vaga ocupada ou cobranças.
- Guardar permite pagar depois. Guardar e pagar abre a inscrição correcta num Dialog; pagamento/recibo usam o serviço comum. Uma inscrição coberta integralmente não cria recebimento fictício. Rascunhos de matrícula e inscrição são retomáveis; os pagamentos de anos diferentes mantêm contexto/ID separados.
- Configuração guiada em cinco etapas, catálogo de níveis/classes e salas, oferta anual e turmas num único percurso. Validar capacidade inteira, limite da sala, datas, dias/horas e conflitos de sala. Avisar aos 90%; bloquear turma cheia no serviço local.
- Preparar ano conserva o actual; iniciar exige encerrar o anterior e confirmar o calendário. Encerramento conserva cobranças, dívida, crédito e recibos. Novo calendário não exclui matrículas/cobranças existentes; valor zero é distinto de campo em falta.
- Renovação reutiliza pessoa e cria vínculo/financeiro do novo ano. Transferência conserva matrícula, números anteriores e movimentos. A colocação futura é projectada pela data de efeito. Saída mantém o mês corrente devido, anula futuros por ajustamento e liberta aplicações como crédito, conservando recebimentos, originais, multas e recibos.
- Comandos passam pela mesma revisão, autorização local, ID estável e gravação única. JSON com versão académica desconhecida, relações partidas, matrícula duplicada ou colocações sobrepostas é recusado. Director tem consulta na UI e é recusado também no serviço local.

Ver [registo detalhado e limites](phase-3-2026-11-08.md). Validação: 107 testes aprovados (75 domínio/persistência e 32 UI), TypeScript, lint sem avisos, diff check e build aprovados. O primeiro envio foi bloqueado pela revisão automática. O utilizador autorizou posteriormente a integração com «Pode colocar no main», incluindo envio para `biishare/lss`, PR e publicação ligada à Vercel. A integração e o deploy devem ser confirmados externamente. Os critérios de servidor/piloto continuam pendentes da API.

## Evidência histórica

A implementação anterior declarava as oito fases da demo v2 concluídas e tinha
29 testes aprovados. O [diagnóstico de 08/11/2026](diagnostico-demo-v2-2026-11-08.md)
confirmou diferenças de persistência, UI e cálculos; a tabela actual acima
substitui essa marcação histórica como estado de execução.
