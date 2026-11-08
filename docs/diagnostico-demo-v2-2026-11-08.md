# LSS: diagnóstico da especificação v2

Revisão de 8 de Novembro de 2026. Esta entrega corresponde à fase 0: leitura,
inventário e validação da base. A implementação das restantes fases ainda não
foi iniciada nesta revisão.

## Base confirmada

- Documento: `LSS_Upgrade_Demo_Especificacao_Codex_v2_2026-09-02.pdf`, lido
  integralmente, 30 páginas. As propostas visuais das páginas 15 e 16 também
  foram renderizadas e observadas.
- Repositório: <https://github.com/biishare/lss>.
- Base: `main`, commit `28faa2bd3b7c6a6efeb132d086d0e149a784e385`, de
  3 de Setembro de 2026, `feat: upgrade LSS presentation and payment policies`.
- O commit histórico `f1a8f5c` citado no PDF é anterior à base actual e não deve
  ser restaurado para iniciar o trabalho.
- Clone sem alterações locais preexistentes. A outra branch remota,
  `codex/ux-finance-rework`, não tem commits exclusivos relativamente a `main`.
  Não havia pull requests abertas durante a consulta.
- Acesso ao GitHub confirmado com permissões de leitura, escrita e administração.
- O estado do commit no GitHub indica `Vercel: success`. A página publicada
  indicada pelo próprio repositório, <https://lss-iota.vercel.app/>, foi aberta
  e o percurso da planilha foi observado. Isto não confirma, por si só, acesso
  administrativo ao painel da Vercel; esse acesso não foi validado nesta fase.
- `AGENTS.md` e documentação local lidos. Também foi consultada a documentação
  de rotas e layouts incluída na versão instalada do Next.js.

## Âmbito acordado

A entrega continua a ser uma demo com dados fictícios, persistência no navegador,
perfis Secretaria e Director e operações académicas e financeiras completas nesse
âmbito. A v2 substitui a v1. PostgreSQL, ORM, autenticação real, API financeira,
filas e integrações de envio não são dependências desta entrega.

O percurso combinado é: desenvolver numa branch, validar, rever o resultado e,
quando estiver correcto, integrar em `main` e verificar o resultado na Vercel.
Esta revisão não alterou código da aplicação, não enviou commits para o remoto e
não accionou uma publicação.

## Mapa técnico para reutilizar

| Camada | Localização | Papel actual |
| --- | --- | --- |
| Rotas | `app/page.tsx`, `app/{dashboard,students,payments,reports,settings}/page.tsx` | Entrada e cinco áreas do produto; encaminham para o componente principal. |
| Integração visual | `app/layout.tsx`, `app/theme.ts`, `app/globals.css` | Cache MUI do App Router, tema, camadas CSS e layout Tailwind. |
| Estado e operações | `app/components/school-admin-demo.tsx` | Sessão demo, navegação, estado React, carregamento, gravação e operações académicas/financeiras. |
| Componentes | `app/components/school-admin-demo.components.tsx` | Formulários, filtros, células, Dialog MUI, recibos e apresentação de regras. |
| Cálculos e modelos | `app/components/school-admin-demo.model.ts` | Cobranças, versões, benefícios, multas, aplicações, correcções e selecção de totais. |
| Domínio financeiro | `app/features/finance/domain/` | Entidades, controlo de acesso demonstrativo, invariantes e conversão do formato anterior. |
| Exportação/importação | `app/features/demo/local-repository.ts` | Envelope JSON v2 e validação superficial das colecções; ainda não encapsula toda a gravação. |
| Exemplos e tipos antigos | `app/lib/school-demo-data.ts` | Alunos, organização escolar, configurações e movimentos fictícios. |
| Verificação | `tests/` | 21 testes financeiros, 5 de snapshots e 3 de políticas. |

Versões efectivamente instaladas a partir do lockfile: Next.js 16.3.0,
React/React DOM 19.2.8, MUI 9.4.0, Tailwind 4.3.3 e TypeScript 5.9.3.
Ambiente de verificação: Node.js 24.22.1 e npm 11.9.0.

Os três ficheiros principais somam 11 636 linhas. A separação entre regras,
comandos, persistência e apresentação deve ser gradual, preservando os módulos
financeiros úteis e os formatos antigos.

## O que a base já fornece

- Entrada sem palavra-passe, identidades fictícias, cinco rotas e consulta pelo
  Director com verificações de acesso nas operações existentes.
- MUI integrado, sidebar de 256/64 px a partir do breakpoint actual de 1024 px,
  Drawer móvel e células com nomes acessíveis.
- Dados locais na chave `gestao-academica-demo-state-v2`, exportação/importação
  v2, confirmação de reposição e mecanismos de preservação do formato anterior.
- Classes, salas, turmas, matrícula, números de pauta estáveis, pesquisa,
  condições financeiras e bolsa integral incluindo inscrição.
- Regras versionadas, snapshots das cobranças, aplicações de pagamentos,
  parciais, antecipação autorizada, cobranças diversas, histórico, recibo e
  correcção compensatória.

Estas funcionalidades são ponto de partida. A designação «concluída» no registo
anterior não comprova os critérios completos do PDF v2.

## Diferenças verificadas

| Área / referência do PDF | Evidência actual | Trabalho necessário |
| --- | --- | --- |
| Persistência, secções 20–22 | `loadStoredState()` devolve `null` tanto para ausência de dados como para erro de leitura/JSON. A gravação corre num `useEffect` depois de mudar o estado React. | Distinguir vazio/erro, preservar o original ilegível e confirmar operações apenas depois de gravar um próximo snapshot válido. |
| Integridade, I01/I02/M02 | Não há `revision` nem ID de comando no snapshot/fluxo de confirmação. O parser aceita alunos com IDs repetidos e registos incompletos desde que a colecção seja uma lista. | Validar entidades/relações/valores, rejeitar duplicados, verificar revisão e garantir repetição segura do mesmo comando. |
| Académico, secções 04–06 | `saveEnrollment()` cria sempre um novo `Student` e novo número, mesmo com o tipo `renewal`; não verifica a capacidade da turma. | Separar pessoa, matrícula anual e colocações; renovar sem duplicar pessoa; validar vagas; implementar transferências, saída e histórico anual. |
| Organização escolar | Catálogos e activações de classes/salas continuam separados. | Unificar o percurso, configurar calendário/anos e verificar conflito de sala e capacidade. |
| Cobranças e multas, secções 07–09 | O código cria cobranças para os meses aplicáveis em conjunto; as multas usam o saldo actual e o total anterior. Ambas as etapas fazem parte da configuração actual. | Distinguir Previsto de Emitido, sincronizar pela data, versionar algoritmo e tornar a segunda etapa opcional nas novas regras. |
| Benefícios, secção 08 | Existe um perfil financeiro por aluno, com histórico e snapshots. | Completar sobreposição pelo maior benefício, âmbito por item, ajustamento retroactivo e crédito sem alterar o recebimento original. |
| Pagamento no modal, secções 10/14/16 | Confirmado no código e no navegador: célula abre detalhe; «Registar pagamento» fecha o detalhe e prepara o formulário permanente fora do modal. | Concluir prévia, confirmação, recibo e regresso à célula dentro do mesmo percurso, conservando contexto e rascunho. |
| Comprovativos, crédito, devoluções e caixa | Há data efectiva e sobra não alocada; não foram localizados percursos completos de conferência, aplicação de crédito, devolução e sessão de caixa. | Implementar os movimentos e estados próprios, incluindo relações de origem e fechos imutáveis. |
| Recibos, secção 11 | ID derivado de `REC-${payment.id}`; recibo reconstruído a partir dos registos; impressão chama `window.print()`. | Guardar snapshot e série estáveis, incluir marca de demonstração e impressão limpa; reimprimir sem reinterpretar valores. |
| Planilha e navegação, secções 12–16 | Persistem limite global de 90rem, tabela HTML, formulário permanente e contexto repetido. Não foram encontrados Mês/Trimestre/Ano nem vista expandida. Os filtros não são recuperados por parâmetros. | Completar o shell MUI, libertar largura, oferecer períodos/lista móvel, preservar filtros, selecção e posição. |
| Relatórios, secção 17 | Indicadores agregados e histórico de gerações; sem percursos completos localizados para CSV filtrado e caixa. | Separar recebido pela data efectiva, liquidado por competência, dívida, benefício, previsão e crédito; ligar totais às listas. |

Localizações úteis na base auditada:

- Leitura local: `school-admin-demo.model.ts:439`.
- Gravação automática: `school-admin-demo.tsx:607–688`; sucesso e recibo do
  pagamento: `school-admin-demo.tsx:2493–2576`.
- Matrícula: `school-admin-demo.tsx:1921–2042`.
- Acção do modal: `school-admin-demo.tsx:1710`; formulário fora do modal:
  `school-admin-demo.tsx:4650`.
- Descontos: `school-admin-demo.model.ts:2107` e `:2164`.
- Multas: `school-admin-demo.model.ts:1327`.
- Recibos: `school-admin-demo.model.ts:2679` e
  `school-admin-demo.components.tsx:2326`.
- Relatórios: `school-admin-demo.tsx:4709`.

## Verificações executadas

| Comando / verificação | Resultado observado |
| --- | --- |
| `npm ci --no-audit --no-fund` | Concluído; 417 pacotes instalados. Lockfile preservado. |
| `npm test` | 29/29 aprovados. |
| `npm run lint` | Código de saída 0; dois avisos de variáveis/funções não utilizadas, em `school-admin-demo.tsx:278` e `:2112`. |
| `npm run build` | Compilação, verificação TypeScript e geração das rotas concluídas. |
| `npx tsc --noEmit` | Código de saída 0. |
| `npm start -- --hostname 0.0.0.0` | Servidor local arrancou. O navegador remoto não alcançou `localhost:3000`; não se afirma validação visual dessa instância local. |
| Navegador, versão publicada | Entrada Secretaria, navegação para Pagamentos, planilha, detalhe de Junho e preparação do pagamento observados. Nenhum pagamento foi confirmado. |

Foram também executadas sondagens directas das funções TypeScript através do
mesmo loader da suíte (`node --experimental-strip-types --loader
./tests/ts-extension-loader.mjs --input-type=module`). Estas sondagens não foram
acrescentadas aos 29 testes existentes e não representam validação de todos os
casos F/U do PDF.

| Caso | Esperado no PDF | Resultado da sondagem |
| --- | --- | --- |
| F01: base 1 000,10; bolsa parcial 15% | Desconto 150,02; devido 850,08. | Desconto 150,00; devido 850,10. |
| F06: multa de 50 já emitida; pagamento efectivo no dia 8, apresentado no dia 14; vencimento dia 10 | Multa neutralizada por ajustamento, saldo de multa zero. | A multa de 50 permanece em aberto. |
| F07: base 1 000; 600 no dia 9; 200 no dia 15; patamares acumulados 5%/10% nos dias 11/21 | Principal 200; multas 20 + 10; total 230. | Principal 200; só a primeira multa de 20; total 220. |
| M02: importação com dois alunos com o mesmo ID | Recusa antes de substituir o estado. | `parseDemoSnapshot` aceita o conteúdo. |
| M03: JSON inválido guardado | Erro explícito, original preservado. | `loadStoredState()` devolve `null`, como se não existissem dados. |

Nas sondagens F06/F07 foram usados dados fictícios de Junho de 2026, inscrição
zero, mensalidade 1 000, vencimento dia 10, patamares 5%/10%, e datas efectivas
explícitas. Em F07, o pagamento do dia 9 foi autorizado explicitamente na
configuração actual para garantir aplicação ao mês de Junho: o código trata um
item ainda dentro do prazo como futuro. As multas foram avaliadas no dia 11 e
no dia 21. No F06, a multa foi avaliada no dia 14 antes de registar a prova.

Os resultados identificam diferenças relativamente ao contrato v2; ao corrigir,
preservar a lógica e os saldos dos snapshots legados por versão explícita.

## Ordem de execução a partir desta base

| Fase | Estado desta revisão | Próxima entrega verificável |
| --- | --- | --- |
| 0 | Concluída | Este diagnóstico, base identificada, testes da base e mapa de diferenças. |
| 1 | Base parcial; completar | Repositório local real, leitura segura, revisão, comandos idempotentes, validação de importação e exemplos reproduzíveis. |
| 2 | Base parcial; completar | Shell/componentes MUI, largura útil, drawer/tablet, vista expandida e contexto recuperável. |
| 3 | Base parcial; completar | Pessoa única, matrícula anual, vagas, configuração guiada, renovação e colocações com histórico. |
| 4 | Base parcial; completar | Dinheiro exacto, calendário/emissões, benefícios, nova política de multas e ajustamentos por data efectiva. |
| 5 | Base parcial; completar | Pagamento integralmente no Dialog, conferência, crédito, devoluções, correcções e recibo persistido. |
| 6 | Base parcial; completar | Relatórios por data/competência, listas de detalhe, CSV, caixa e cópia de mensagens. |
| 7 | Critérios completos por validar | F01–F17, U01–U09, A01–A02, I01–I03, M01–M03 e R01; revisão responsiva e roteiro de apresentação. |

Cada fase deverá actualizar o registo com os comandos e resultados efectivamente
observados. O merge em `main` e a verificação da Vercel seguem a revisão da
implementação; os 29 testes antigos, isoladamente, não constituem esse critério.
