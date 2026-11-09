# Ensaio de navegador da fase 7

Continuação da fase 7 sobre a `main` `f572555` (PR #10). A v3 termina na fase 7;
este trabalho fecha pendências de uso e apresentação, sem iniciar uma fase 8,
uma API ou um piloto com dados reais.

## Executar

```bash
npm ci
npx playwright install --with-deps chromium
npm run build
npm run test:browser
```

O Playwright inicia o build de produção em `127.0.0.1:3100`. Cada teste usa um
contexto de navegador isolado, dados fictícios e relógio fixo em 05/05/2026,
no fuso Africa/Maputo. As sessões sem login são fixtures do adaptador local;
dois casos adicionais exercitam o formulário com as contas fictícias já
documentadas. Não há acesso à base de um utilizador, token de Vercel ou
relaxamento da protecção dos deploys.

## Cobertura

| Casos | Evidência produzida |
| --- | --- |
| Cinco áreas a 320/360/390/768/1024/1280/1440/1920 px | 40 capturas e medição de overflow da página; erros do cliente fazem falhar o teste. |
| Sidebar e vista expandida | Medição de 256/64 px e ganho de 192 px; preferência e pesquisa conservadas. |
| Drawer móvel | Limite de largura, foco contido, Escape, toque fora, destino e retorno do foco. |
| Parcial em 390/1440 px | Célula → pagamento de 600/1 000 → recibo → célula, recarga e reimpressão em relatórios. |
| Impressão em Chromium | PDF A4 do recibo e relatório; menu/botões ocultos e dados conservados. |
| Matrícula a 390 px | Erro junto ao campo, identificação/revisão e Guardar e pagar com aluno/inscrição correctos. |
| Entrada por papel e saída | Credenciais fictícias inválidas/válidas; Director em consulta; saída conserva a escola. |

Os resultados ficam em `test-results/` e `playwright-report/`, ignorados pelo
Git. O workflow `Validar LSS` guarda o arquivo `lss-browser-acceptance` por
14 dias, incluindo capturas, PDFs, relatório e traces das falhas.

## Resultado e limites

A execução de Chromium neste executor foi bloqueada pela restrição de sockets
do ambiente. O ensaio corre no runner do GitHub Actions. A primeira execução,
`42590865367`, confirmou as cinco áreas nas oito larguras, a sidebar, o Drawer
e a matrícula: 11 casos aprovados. Os quatro casos restantes pararam em
selectores do próprio ensaio: o diálogo deixa a árvore acessível na impressão
e o Next.js acrescenta um segundo `alert` para anunciar a navegação. Os
selectores foram corrigidos sem reduzir as verificações.

A revisão das capturas revelou duas correcções de interface: a planilha
reservava uma coluna vazia para o formulário já retirado e os rótulos de
filtros nativos vazios sobrepunham Todas/Todos nos relatórios. A planilha passa
a uma coluna em toda a largura; os filtros mantêm o rótulo elevado. Os testes
de navegador passam a verificar também estes dois comportamentos.

A reexecução após estas correcções fica registada na PR #11.

Capturas de Chromium e PDFs gerados não demonstram teclado virtual, zoom de
um dispositivo físico, impressão numa impressora, autenticação de servidor,
concorrência entre postos ou os critérios centrais adiados para a API. Os
dados de ensaio também não demonstram atendimento de um piloto real.
