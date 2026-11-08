# LSS - registo de implementação

Instrução vigente: [especificação mesclada v3](lss-especificacao-mesclada-v3.md),
com a decisão posterior do utilizador de 08/11/2026: **não criar base de dados
real agora; a base central e o backend serão implementados depois numa API
dedicada**. Esta decisão prevalece sobre as secções anteriores da v3 que
previam PostgreSQL e servidor nesta etapa.

## Estado actual

| Fase | Estado | Resultado |
| --- | --- | --- |
| 0 - Diagnóstico | Concluída | Base e PDF lidos; código, testes e diferenças inventariados; âmbito actualizado. |
| 1 - Estado e serviços locais | Concluída no âmbito local autorizado | Repositório local, snapshot v3, validação, revisão, comandos, recuperação, recibo persistido e rascunhos ligados à UI; 59 testes aprovados. |
| 2 - Entrada e shell | Pendente | Preparar entrada/integração futura, MUI, navegação, largura útil e contexto recuperável. Autenticação real aguarda a API. |
| 3 - Académico | Pendente | Ficha única, pessoa/matrícula/colocação, renovação, transferência, vagas e configuração guiada. |
| 4 - Regras | Pendente | Dinheiro exacto, emissão, benefícios e cálculos de multas conforme v3. |
| 5 - Atendimento | Pendente | Pagamento inteiramente no modal, conferência, crédito, devoluções e série de recibos. |
| 6 - Relatórios e caixa | Pendente | Definições, listas, CSV/PDF, fecho e movimento de caixa. |
| 7 - Qualidade da demo | Pendente | Matriz completa F/U/A/I/M/R, revisão visual e ensaio de atendimento. Critérios P de servidor ficam para a API posterior. |

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

## Validação desta entrega

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

O trabalho fica numa branch para revisão. `main` e a publicação não são alteradas
como parte desta fase.

## Evidência histórica

A implementação anterior declarava as oito fases da demo v2 concluídas e tinha
29 testes aprovados. O [diagnóstico de 08/11/2026](diagnostico-demo-v2-2026-11-08.md)
confirmou diferenças de persistência, UI e cálculos; a tabela actual acima
substitui essa marcação histórica como estado de execução.
