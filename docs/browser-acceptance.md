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

O [workflow 42591882535](https://github.com/biishare/lss/actions/runs/42591882535)
passou os 195 testes de domínio/DOM e os 15 ensaios de Chromium sobre o commit
`ed03e93`, além de lint, TypeScript e build. Foram produzidas 40 capturas das
cinco áreas, capturas dos diálogos e quatro PDFs A4. A revisão visual confirmou
a planilha a toda a largura, os filtros legíveis, matrícula e recibo. Os quatro
PDFs conservaram aluno, valor, número e total, numa página nos casos ensaiados,
sem navegação ou botões.

A revisão encontrou e corrigiu a coluna vazia que ainda reservava o formulário
retirado e os rótulos nativos sobrepostos a Todas/Todos nos relatórios. Foram
também ajustados o fundo branco de impressão e o espaço útil das colunas do
PDF. As capturas aguardam o fim das animações e usam a janela visível quando
há um diálogo aberto. A execução final destas verificações e da recuperação
de mês/período com Voltar/Avançar é acompanhada na [PR #11](https://github.com/biishare/lss/pull/11).

A execução de Chromium neste executor foi bloqueada pela restrição de sockets
do ambiente; as verificações e os artefactos vêm do runner do GitHub Actions.

Capturas de Chromium e PDFs gerados não demonstram teclado virtual, zoom de
um dispositivo físico, impressão numa impressora, autenticação de servidor,
concorrência entre postos ou os critérios centrais adiados para a API. Os
dados de ensaio também não demonstram atendimento de um piloto real.
