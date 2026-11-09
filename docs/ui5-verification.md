# UI-5 — verificação integrada e entrega

Data: 9 de Novembro de 2026. Referência: instrução UI/UX v1.1, UX-01 a UX-17.
Esta fase reúne evidência das UI-1 a UI-4 e acrescenta o percurso composto que
faltava entre entrada, matrícula, recebimento e conferência.

## Versões e alcance

- Main recebida: `7a7ffdeb7a70b36d0bda38d74df006d81d84ca32`, PR #15 (UI-4).
- Branch de trabalho: `codex/lss-ui5-integrated-verification`, PR #16.
- Produção confirmada: `https://lss-iota.vercel.app/`, deployment
  `dpl_7CL8FyhqQHtMH8DjEi5xh7vV9RNV`, estado READY, Git SHA igual à main recebida.
- O workflow da main UI-4 `42680615838` aprovou 147 testes de domínio,
  81 de interface, lint, TypeScript, build e 43 ensaios Chromium.

Os testes usam o adaptador de apresentação e dados fictícios, com persistência
local isolada por contexto. Não são prova de autenticação de servidor, API,
base de dados real, concorrência entre computadores ou liquidação financeira.
Não foram alterados esses serviços nem as dependências nesta fase.

## Percurso integrado acrescentado

`tests/browser/integrated-flow.spec.ts` acrescenta dois casos, a 390 e 1440 px.
Cada caso começa sem sessão nem dados escolares guardados; não injecta estado.
Usa as contas fictícias do adaptador exclusivamente no servidor local da CI.

1. Abrir uma ligação de alunos, confirmar ausência de dados antes da entrada
   e entrar como Secretaria pelo formulário, conservando a turma do URL.
2. Matricular uma pessoa fictícia, escolher a turma e usar Guardar e pagar.
3. Confirmar a inscrição do aluno correcto e conferir valor e ID do recibo.
4. Fechar e recarregar a ficha; confirmar uma única matrícula/recebimento e
   igualdade do estado persistido, sem nome ou contacto no URL.
5. Sair; entrar como Director pela ligação de relatórios; pesquisar a pessoa.
6. Consultar o mesmo recibo, conferir uma linha e o mesmo total em ecrã,
   CSV e PDF, sem controlo de confirmação de pagamento.
7. Recarregar o relatório, conservar pesquisa e provar que a consulta,
   exportação e impressão não alteraram os dados.

Os dois casos rejeitam diálogos JavaScript nativos, erros não tratados e
overflow horizontal da página. O PDF é gerado em modo de impressão com a
estrutura de navegação oculta. Capturas e PDFs permanecem nos artefactos da CI.

## Matriz de aceitação

As referências à CI UI-5 abaixo correspondem ao workflow `42686319412`, commit
`473d5922268343eac6d439c78975a4c790b7c8cf`: 45/45 casos Chromium aprovados.

| Critério | Evidência principal | Situação |
| --- | --- | --- |
| UX-01 — entrada no primeiro HTML | `entry.spec.ts`, entrada sem executar JavaScript; medição abaixo | Aprovado na CI UI-5 |
| UX-02 — sessão existente e encaminhamento | `acceptance.spec.ts`, `surfaces.spec.ts`, recargas do percurso integrado | Aprovado na CI UI-5 |
| UX-03 — ligações e contexto seguro | `entry.spec.ts`, `density.spec.ts`, percurso integrado sem pesquisa pessoal no URL | Aprovado na CI UI-5 |
| UX-04 — armazenamento inválido/bloqueado | `entry.spec.ts` e testes de repositório/interface; original preservado | Aprovado na CI UI-5 |
| UX-05 — aluno explícito e origem correcta | `service-flows.spec.ts`, matrícula → inscrição no percurso integrado | Aprovado na CI UI-5 |
| UX-06 — superfícies móveis | `acceptance.spec.ts`, `surfaces.spec.ts`, 320/360/390 px | Aprovado na CI UI-5 |
| UX-07 — tablet/desktop e menu | `acceptance.spec.ts`, 768/1024/1280/1440/1920 px e sidebar 256/64 px | Aprovado na CI UI-5 |
| UX-08 — rotação/teclado sem perder campos/ID | `surfaces.spec.ts`, redimensionamento e altura reduzida | Emulação coberta; Android/teclado físico pendentes |
| UX-09 — saída, foco e rascunhos | `surfaces.spec.ts`, `service-flows.spec.ts`, `density.spec.ts` | Aprovado na CI UI-5 |
| UX-10 — regresso do recibo com contexto | `acceptance.spec.ts`, célula/foco/scroll; ficha no percurso integrado | Aprovado na CI UI-5 |
| UX-11 — persistência e idempotência | testes de domínio/repositório/interface; repetições e retoma no navegador | Cobertura local; concorrência de API futura fora do alcance |
| UX-12 — filtros e exportações coerentes | `density.spec.ts`, Cancelar/Aplicar/Remover e CSV/PDF; relatório integrado | Aprovado na CI UI-5 |
| UX-13 — impressão limpa | PDFs de recibo, relatório e caixa em `acceptance`, `density` e `integrated-flow` | 10 PDFs conferidos, uma página cada; novos PDFs revistos visualmente |
| UX-14 — Director consulta, Secretaria escreve | `acceptance.spec.ts`, `service-flows.spec.ts` e mudança de conta integrada | Controlo de apresentação; não prova de autorização de servidor |
| UX-15 — custo da entrada antes/depois | `scripts/measure-entry.mjs`, JSON e condições abaixo | Conteúdo inicial medido; tempos frio/quente e rede móvel pendentes |
| UX-16 — produção e percursos publicados | Vercel READY e SHA UI-4; entrada, matrícula, inscrição, recibo, relatório e recargas observados | Aprovado na produção UI-4; publicação UI-5 após integração |
| UX-17 — sem alert/confirm/prompt | busca no código da aplicação e detecção de diálogos nos ensaios | Sem chamadas nativas encontradas; CI UI-5 aprovada |

## Medição reproduzível da entrada

Comparação feita em 2026-11-09, com Node 24.22.1, Linux x64, Next 16.3.0,
React 19.2.8 e o mesmo lockfile/dependências. Builds de produção separados e
sequenciais; cada versão servida por `next start` em HTTP local. Os dados
detalhados, caminhos e hashes dos scripts estão em `ui5-entry-measurement.json`.

Antes: `eaa29a7b652835c8ec076c2a9d53d2ade54d3695`, imediatamente anterior à UI-1.
Depois: `7a7ffdeb7a70b36d0bda38d74df006d81d84ca32`, UI-4 integrada. Esta fase
acrescenta verificação e documentação, sem mudar o código entregue ao cliente.

| Recurso na primeira resposta | Antes | Depois |
| --- | ---: | ---: |
| HTML de `/` (bytes UTF-8) | 21 252 | 36 316 |
| HTML de `/` (gzip calculado, bytes) | 4 664 | 7 215 |
| Scripts externos únicos referenciados no HTML | 9 | 10 |
| Soma desses scripts (bytes UTF-8) | 1 295 411 | 863 699 |
| Soma desses scripts (gzip calculado por ficheiro, bytes) | 379 240 | 269 178 |
| Campos de utilizador/palavra-passe no HTML | Ausentes | Presentes |
| Mensagem bloqueante global no HTML | Presente | Ausente |

Na ligação directa `/payments?year=2026&month=jun&period=month`, os scripts têm
os mesmos totais. O HTML passa de 21 756 para 38 574 bytes (gzip calculado:
4 700 para 7 341 bytes). O login também está presente nessa primeira resposta.

O HTML cresceu porque inclui agora a entrada utilizável. O JavaScript
referenciado diminuiu 431 712 bytes em bruto e 110 062 bytes com gzip calculado.
O número de ficheiros aumentou um; a comparação conserva esse custo visível.

O método não executa JavaScript. Conta apenas `script src` únicos do HTML e
comprime os recursos individualmente com gzip nível 9. Não conta CSS, fontes,
imports posteriores à execução, dados carregados após a sessão nem tempos de
renderização. Os valores gzip não representam a transferência da Vercel
(que pode usar outra compressão). Não se infere percentagem de rapidez,
FCP, LCP, INP ou experiência em 4G a partir destes bytes. A prova de não criar
dados escolares antes de entrar vem dos ensaios de navegador, não deste script.

Para reproduzir, criar dois worktrees nesses commits, usar o mesmo lockfile,
versão Node e instalação de dependências, executar `npm run build` em cada um
e iniciar os dois builds em 3101/3102. Na branch UI-5:

```sh
node scripts/measure-entry.mjs \
  --before http://127.0.0.1:3101 \
  --after http://127.0.0.1:3102 \
  --before-ref eaa29a7b652835c8ec076c2a9d53d2ade54d3695 \
  --after-ref 7a7ffdeb7a70b36d0bda38d74df006d81d84ca32
```

## Validação e passos de entrega

Verificação local UI-5: 147 testes de domínio e 81 de interface aprovados,
lint, TypeScript e build aprovados. A restrição de sockets que impediu Chromium
local na UI-4 continua documentada; a execução funcional do navegador é feita
no workflow GitHub, sem reduzir essa protecção.

O primeiro workflow `42683846308` aprovou os 228 testes e checks de código;
os 43 ensaios anteriores passaram. Os dois novos casos pararam porque o teste
tirava a fotografia do armazenamento quando apenas o título da estrutura já
estava visível, antes de terminar a primeira preparação. O ensaio passou a
aguardar a acção Nova matrícula e os dados preparados, sem tempo fixo, sessão
injectada ou alteração do código da aplicação.

O workflow `42686319412`, commit `473d592`, aprovou os 147 testes de domínio,
81 de interface, lint, TypeScript, build e os 45 casos Chromium. Os dois novos
percursos passaram em ambas as larguras, incluindo a mudança para Director.

O artefacto `lss-browser-acceptance` dessa execução (`13705307093`) contém
88 capturas e 10 PDFs. O ZIP foi verificado pelo SHA-256 publicado pelo GitHub.
Todos os PDFs têm uma página, texto extraível e identificação da escola, sem
texto de navegação. Os dois novos PDFs foram renderizados e revistos; nome,
período, uma linha, valor e total cabem na página, sem menu, fundo ou duplicação.
As quatro novas capturas de recibo/relatório a 390/1440 px foram revistas.
Recibo móvel ocupa o ecrã e mantém as acções acessíveis; relatório móvel usa
cartões e desktop permite scroll dentro da tabela. Os restantes casos repetem
a cobertura de composição da UI-4, cujo código de aplicação não mudou aqui.

### Ensaio na produção UI-4

Metadados da Vercel conferidos e formulário público observado. A entrada segura
resultou numa sessão visível de Marta/Secretaria em `/dashboard`. A resposta
do pedido de acesso expirou, mas a observação posterior confirmou a sessão;
nenhum valor de acesso foi lido ou guardado como evidência.

No navegador, usando apenas dados fictícios do ensaio:

- Nova matrícula percorreu identificação, colocação na 7.ª classe/Turma A e
  revisão. Guardar e pagar abriu a inscrição de `Ensaio UI5 publicado`, número
  `LSS-000013`, com saldo de 3 500 MT.
- A confirmação produziu `LSS-2026-000001`, com 3 500 MT, sem multa nem crédito.
- Fechar e recarregar conservou a pessoa, turma, matrícula e separador da ficha.
- Relatórios mostrou exactamente um recebimento de 3 500 MT; a pesquisa
  encontrou a pessoa e a consulta abriu o mesmo recibo.
- A prévia de impressão mostrou a mesma pessoa, movimento, período e total.
- Recarregar o relatório conservou a pesquisa e um único registo. O URL contém
  contexto por IDs, sem nome ou contacto. A apresentação desktop foi observada.

O ensaio publicado usa o adaptador local: não enviou dinheiro nem criou dados
numa API real. CSV e PDFs completos, mudança de conta para Director, larguras
móveis e invariantes de persistência são verificados na CI; não se atribuem
automaticamente ao ensaio manual publicado. Registos de erro da extensão do
navegador foram distinguidos dos da aplicação, sem os apresentar como falhas
do LSS. A operação fictícia ficou no armazenamento deste navegador de ensaio.

Antes de dar toda a UI-5 como encerrada:

- Conferir os checks do commit final da PR, que acrescenta este relatório.
- Repetir o percurso publicado no deployment da UI-5 após a integração.
- Em Android físico, abrir a entrada em rede móvel, preencher matrícula e
  pagamento com teclado aberto, rodar o aparelho, voltar e confirmar que
  campo, erro, valor, ID e acção principal continuam acessíveis. Medir entrada
  fria/quente em condições registadas, sem confundir com redimensionamento.
- Após integração autorizada, conferir novo SHA da main, workflow, READY e
  repetir os percursos publicados no deployment correspondente.

Não há resultado de Android físico/teclado real nem de tempos frio/quente
registado nesta fase até este ponto. Estes itens continuam explicitamente
pendentes; a matriz não os apresenta como aprovados.
