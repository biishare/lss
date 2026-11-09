# Matriz de aceitação v3 — fase 7

Base: fase 7 integrada na `main` em `f572555` (PR #10), com a continuação de
navegador na PR #11. Decisões posteriores do
responsável: apresentação normal ao cliente e API/base central adiadas.

**Automatizado local** significa domínio, repositório e/ou Happy DOM. Não
significa navegador real, autorização de servidor, vários postos ou piloto.
A evidência de publicação e de observação fica no [registo da fase 7](phase-7-2026-11-09.md)
e no [ensaio de navegador](browser-acceptance.md). **Chromium** refere-se ao
build de produção isolado no GitHub Actions, não a um dispositivo físico ou
a navegação autenticada na prévia protegida da Vercel.

## Cálculos e movimentos

| Critério | Evidência automatizada | Estado no âmbito actual |
| --- | --- | --- |
| F01 | `tests/billing-v3.test.ts`: half-up, 1 000,10 × 15% | Automatizado local. |
| F02/F03 | Mesmo ficheiro: bolsa integral, inscrição e maior benefício | Automatizado local; ensaio de bolsa em `tests/pilot-rehearsal.test.ts`. |
| F04/F05 | Mesmo ficheiro: incrementos e limites das datas de multa | Automatizado local. |
| F06 | Mesmo ficheiro + `tests/finance-service.test.ts`: evidência tardia e ajustamento | Ensaio integrado de comprovativo, relatório e caixa em `pilot-rehearsal`. |
| F07/F08 | `billing-v3`: parcial 600/200 e multa sem principal | Automatizado local. |
| F09/F10 | `finance-service`: excedente 200 e aplicação explícita | Automatizado local; sem nova receita. |
| F11/F12 | `finance-service`: benefício retroactivo e devolução limitada | Automatizado local. |
| F13/F14 | `billing-v3`: antecipação e vigência futura preservando emitidas | Automatizado local. |
| F15 | `finance-service` + `cash-continuity`: correcção ligada, uma entrada e fecho preservado | Automatizado local, inclusive ajustamento no mesmo instante do fecho. |
| F16 | `finance-service` + `reports`: 700/300, um recebido físico | Automatizado local. |
| F17 | `billing-v3`: 60 dias, multa simples única | Automatizado local. |

Datas-limite, fuso Africa/Maputo, viragem de mês/ano, cêntimos, valores inválidos,
benefícios temporários, extras e compatibilidade histórica têm cobertura em
`billing-v3`, `payment-policies` e `finance-spreadsheet`.

## Uso e persistência

| Critério | Evidência existente | Observação que não pode ser inferida desses testes |
| --- | --- | --- |
| U01 | `demo-ui` e Chromium: menu, contexto e preferência | Chromium mediu 256/64 e ganho de 192 px, conservando a pesquisa. |
| U02 | Chromium: cinco áreas nas oito larguras, capturas e medição | Sem overflow da página nos casos ensaiados; planilha a toda a largura e filtros de relatório corrigidos. |
| U03 | DOM e Chromium: Drawer, Escape/destino/fora e foco | Confirmado em Chromium a 390 px; dispositivo físico ainda por ensaiar. |
| U04 | DOM e Chromium: célula → parcial → recibo → célula | Pesquisa e foco confirmados em 390/1440 px. Selecção/scroll também cobertos pelo DOM. |
| U05 | `demo-ui`, `academics-ui`, `workspace-context`: períodos, ficha, história e recarga | Confirmar contexto na versão publicada. |
| U06 | `demo-ui`: vista expandida e Escape | Teclado virtual, zoom e alcance dos botões exigem dispositivo/navegador. |
| U07 | `billing-v3`, `finance-spreadsheet`, `pilot-rehearsal`: bolsa e multa pendente | Conferir apresentação dos mesmos estados na ficha/planilha. |
| U08 | Domínio/DOM e quatro PDFs A4 gerados em Chromium | Recibo/relatório a partir de 390/1440 px, sem menu e com os valores preservados; impressora e documentos longos ainda por ensaiar. |
| U09 | DOM e Chromium: erro, dados mantidos e inscrição correcta | Matrícula e Guardar e pagar confirmados a 390 px; ensaio com operador no posto ainda pendente. |
| A01/A02 | Serviços locais recusam Director; `demo-ui` cobre contas/saída | Não é autorização ou autenticação de servidor. |
| I01 | `demo-repository`, `finance-service`, `cash-continuity`: ID/conteúdo e repetição | Não prova resposta perdida/conflito simultâneo numa API. |
| I02 | `demo-ui`, `demo-repository`, `academics`: revisão obsoleta | Detecta alteração já ocorrida noutra aba; uma aba de escrita suportada. |
| I03 | `billing-v3`, `demo-ui`: sincronização e arranque sem reposição | Não declara concorrência central. |
| M01 | `academics`, `academics-ui`: entrada, renovação, transferência e pauta | Servidor ainda por implementar. |
| M02 | `cash-continuity`, `pilot-rehearsal`, `synthetic-readiness`: validação e restauro repetido | Ensaio local isolado, não restauro PostgreSQL. |
| M03 | `demo-ui`, `demo-repository`, `cash-continuity`: falha, cancelamento e rascunho | Sem confirmação financeira offline de servidor. |
| R01 | `reports`, `reports-ui`, `synthetic-readiness`: detalhe, filtros, CSV e crédito | CSV ensaiado com todos os 100/300 registos, sem limitar à página visível. |

## Critérios centrais e piloto

| Critérios | Situação e porta de entrada |
| --- | --- |
| P01/P02/P11 | API: contas, sessão, papéis, recuperação e isolamento validados no servidor. |
| P03/P04/P05 | API/base: transacções, recuperação por ID e concorrência real. Os testes locais são adicionais. |
| P06 | API/base: persistência entre dispositivos autorizados. |
| P07 | Backup remoto e restauro de base central isolada, com política operacional aprovada. Há apenas ensaio local nesta entrega. |
| P08 | Migração central ensaiada, original conservado, relações e saldos reconciliados. Compatibilidade local não activa dados reais. |
| P09 | Caixa local coberto por `cash-continuity` e ensaio integrado; conferir no ambiente central e no posto do piloto. |
| P10 | Confirmar equipa/projecto, commit, ambiente, build e percursos na Vercel. READY não substitui o ensaio de uso. |
| P12 | Uma turma e um funcionário, parcial/bolsa/prova tardia sem planilha de compensação. Ensaio fictício preparado; piloto real não iniciado. |

O [plano do piloto](pilot-plan.md) define a sequência e o registo a preencher
com o responsável. Nenhum critério central é marcado concluído por existir
uma simulação, uma conta fictícia ou um documento.
