# LSS — gestão escolar

Aplicação escolar do Liceu São Silvestre, construída com Next.js, React,
TypeScript, Material UI e Tailwind CSS. A Secretaria opera a escola e o
Director consulta os dados. As contas são geridas no `lss-admin`.

## Modo central da Fase 8

O modo central é a configuração por defeito. A aplicação valida a sessão
através de `lss-api` antes de carregar alunos, turmas, pagamentos ou relatórios.
Os pedidos passam pelo servidor Next.js na origem do `lss` e os cookies de
sessão `HttpOnly` são conservados nessa origem. A API autoriza e confirma cada
operação. Em caso de indisponibilidade, o formulário continua aberto.

| Variável do servidor do `lss` | Configuração |
| --- | --- |
| `LSS_DATA_MODE` | `central` para a API. `demo` para um ambiente de apresentação separado. |
| `LSS_API_ORIGIN` | Origem HTTPS da `lss-api` no mesmo ambiente. |
| `LSS_SCHOOL_ORIGINS` | Origens do `lss`, separadas por vírgulas. |

Na API, inclua as origens de `lss` do mesmo ambiente em `LSS_TRUSTED_ORIGINS`,
conservando as origens do painel e dos outros clientes autorizados. O acesso
de produção começa com as contas da Secretaria e do Director activadas pelo
administrador. `CLOUDINARY_URL`, MongoDB e os segredos Better Auth são
configurados no servidor da API. O envio de logótipo usa essa configuração.

Para Previews protegidos, autorize o projecto `lss` como origem de confiança
de Preview para Preview em `lss-api`. O servidor encaminha a identidade OIDC
da Vercel. `/api/health/ready` verifica o percurso até à base central.

O adaptador converte montantes em cêntimos inteiros. Após perda da resposta de
uma escrita, consulta o comando confirmado e reutiliza a mesma chave ao
repetir. Mantém a pesquisa pessoal em memória e envia-a no corpo do pedido.

Actualize o contrato tipado a partir do `openapi.json` da API.

```bash
node scripts/generate-school-contract.mjs ../lss-api/openapi.json
```

### Verificar a integração

Os ensaios de navegador arrancam o `lss`, a API e um replica set MongoDB
descartável. Usam contas e registos sintéticos e precisam de um checkout
`../lss-api` com `npm ci` executado. `LSS_API_CHECKOUT` indica um caminho
alternativo. O Chrome pode ser instalado por `npx playwright install chromium`.

```bash
npm ci
npm run build
npm run test:central
```

## Executar a apresentação local

Use Node.js 24.x; esta entrega foi validada com Node.js 24.22.1.
O runner de testes usa o suporte a TypeScript do Node, além do mínimo do Next.js.

```bash
npm ci
LSS_DATA_MODE=demo npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) e entre com o utilizador e a
palavra-passe de apresentação indicados no [guia técnico](docs/operations.md).
A conta determina o painel e o papel:

- **Secretaria** — pode matricular, configurar regras e registar pagamentos.
- **Director** — consulta indicadores, alunos, pagamentos, relatórios e
  configurações em modo de leitura.

Neste modo, os pares de acesso fictícios são validados pelo adaptador local
de apresentação. Os dados e os rascunhos de exemplo pertencem ao navegador.

A interface apresentada ao cliente usa identidade da escola e percursos normais,
sem rótulos Demo, escolha de perfil ou utilitários técnicos. Os limites da demo
ficam nesta documentação.

O layout permanece montado ao navegar pelas cinco áreas. Desktop usa menu
256/64 px; tablet usa barra de 64 px e expansão sobreposta; telemóvel usa Drawer.
Na planilha, **Expandir planilha** oculta temporariamente o menu e os blocos
secundários. **Sair da vista expandida** ou Escape restaura o layout.
Filtros, pesquisa, selecção e posições da tabela ficam na sessão do mesmo
cenário. O URL inclui apenas IDs/contexto, sem pesquisa ou contactos.

## Rotas da demo

- `/dashboard` — início e indicadores;
- `/students` — alunos, classes, salas e turmas;
- `/payments` — políticas por classe/ano, cobranças diversas, planilha e lançamentos;
- `/reports` — relatórios detalháveis, caixa, conferência e cópias;
- `/settings` — escola, calendário, níveis, classes, salas e regras.

## Dados locais

Com `NEXT_PUBLIC_LSS_DEVELOPER_TOOLS=true`, em **Configurações**, a Secretaria pode exportar os dados para JSON,
importar exportações v3/v2 ou o formato anterior e repor os dados fictícios. Uma importação inválida
ou cancelada não substitui o estado actual. Sair da sessão não apaga os dados.

Os nomes e movimentos incluídos no estado inicial são dados de exemplo para
apresentação e testes locais.

Por defeito, o primeiro arranque prepara a escola fictícia apenas quando não
existem dados, inclusive se Director entrar primeiro. Recarregar não semeia
novamente. Dados ilegíveis permanecem intactos; o cliente vê orientação para o
responsável, que pode activar as ferramentas técnicas para descarregar o
original e importar uma cópia válida. No modo de desenvolvimento, continua
disponível a escolha entre escola de exemplo e configuração vazia.
As operações só mostram confirmação depois de gravar o snapshot
completo; cada pagamento inclui aplicações, recibo e histórico numa escrita.

O formato local v3 conserva a chave anterior, acrescenta revisão, identidade do
cenário e IDs de comandos. Detecta alterações já concluídas noutra aba; o uso
suportado continua a ser uma aba de escrita de cada vez. Rascunhos de matrícula
e pagamento ficam na sessão do mesmo navegador e cenário.

## Validar

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

O registo fase a fase está em [`docs/upgrade-progress.md`](docs/upgrade-progress.md)
e o guia de operação em [`docs/operations.md`](docs/operations.md).

`npm test` executa testes do domínio/repositório e testes de interface num DOM
simulado. Estes últimos verificam interacções e falhas de armazenamento, mas
não substituem a revisão visual num navegador.

## Alunos e estrutura

A fase 3 acrescenta ficha permanente, matrícula anual em três passos, rascunhos,
renovação, transferência, saída e configuração guiada de anos/classes/salas/turmas.
A pesquisa encontra nome, número e contacto; a lista pagina 50 alunos e conserva
ficha/separador/ano/página ao regressar ou recarregar. Guardar e pagar abre a
inscrição correcta num Dialog; operações e recibo usam o repositório comum.

O [registo da fase 3](docs/phase-3-2026-11-08.md) descreve compatibilidade, 107
testes, medições sintéticas e limites.

A [fase 4](docs/phase-4-2026-11-08.md) acrescenta regras por vigência/nível,
calendário e emissão automática, benefícios com prévia e ajustamentos,
dinheiro exacto e multas simples com segunda etapa opcional. As cobranças e
os recibos anteriores conservam os originais. A revisão visual completa,
e os requisitos centrais da API continuam separados.

A [fase 5](docs/phase-5-2026-11-09.md) acrescenta atendimento no Dialog,
Mês/Trimestre/Ano, conferência de comprovativos, aplicação de crédito entre
anos, correcção ligada ao original, devoluções e recibos com série e snapshot.
Uma aplicação de crédito não é contada como novo recebimento.

A [fase 6](docs/phase-6-2026-11-09.md), integrada na `main` pela PR #9,
acrescenta painéis, relatórios com CSV/impressão, caixa com retrato do fecho e
cópias locais com ensaio de restauro. Essas cópias estão em Relatórios, sem
precisar de activar ferramentas técnicas.

A [fase 7](docs/phase-7-2026-11-09.md) reúne ensaios de atendimento, escala,
regressões, matriz de aceitação e preparação do piloto. Os checks de testes,
lint, TypeScript e build passam a correr nas PRs e na `main` pelo workflow
`Validar LSS`; a Git integration da Vercel continua responsável pelos deploys.

Guias: [arranque/configuração](docs/quick-start.md), [apresentação](docs/presentation.md),
[operação](docs/operations.md), [recuperação](docs/recovery.md) e
[piloto](docs/pilot-plan.md). A [matriz v3](docs/acceptance-v3.md) distingue
validação local, observação no navegador e requisitos centrais adiados.
