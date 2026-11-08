# LSS — demonstração de gestão escolar

Demo navegável do Liceu São Silvestre, construída com Next.js, React,
TypeScript, Material UI e Tailwind CSS. Usa apenas dados fictícios e guarda as
alterações no `localStorage` do navegador.

Na implementação actual não existe backend, base de dados central, autenticação
real ou integração externa.

## Especificação vigente

O trabalho seguinte é definido pela
[`especificação mesclada v3`](docs/lss-especificacao-mesclada-v3.md), que combina
o PDF v2 com a proposta posterior do utilizador. Por decisão posterior, a base
central, autenticação e validação no servidor serão feitas depois numa **API
dedicada**. A etapa actual continua local e preserva a demo; não cria SQL, ORM
ou serviços financeiros remotos. O progresso é registado em
[`docs/upgrade-progress.md`](docs/upgrade-progress.md).

## Executar

Requer Node.js 20.9 ou posterior.

```bash
npm ci
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) e entre com o utilizador e a
palavra-passe de apresentação indicados no [guia técnico](docs/operations.md).
A conta determina o painel e o papel:

- **Secretaria** — pode matricular, configurar regras e registar pagamentos.
- **Director** — consulta indicadores, alunos, pagamentos, relatórios e
  configurações em modo de leitura.

Os pares de acesso são fictícios e a validação é local, num adaptador de
apresentação. Não constituem segurança de produção. Sessões e autorização
reais serão fornecidas pela API posterior. Não se guardam palavras-passe submetidas.

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
- `/reports` — síntese financeira e histórico;
- `/settings` — parâmetros e gestão dos dados locais.

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
