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

Abra [http://localhost:3000](http://localhost:3000) e escolha um dos perfis:

- **Secretaria** — pode matricular, configurar regras e registar pagamentos.
- **Director** — consulta indicadores, alunos, pagamentos, relatórios e
  configurações em modo de leitura.

## Rotas da demo

- `/dashboard` — início e indicadores;
- `/students` — alunos, classes, salas e turmas;
- `/payments` — políticas por classe/ano, cobranças diversas, planilha e lançamentos;
- `/reports` — síntese financeira e histórico;
- `/settings` — parâmetros e gestão dos dados locais.

## Dados locais

Em **Configurações**, o perfil Secretaria pode exportar os dados para JSON,
importar exportações v3/v2 ou o formato anterior e repor os dados fictícios. Uma importação inválida
ou cancelada não substitui o estado actual. Sair da sessão não apaga os dados.

Os nomes e movimentos incluídos no estado inicial são dados de exemplo para
apresentação e testes locais.

No primeiro arranque, Secretaria escolhe **Abrir escola de exemplo** ou
**Configurar do início**. Recarregar não semeia novamente. Dados ilegíveis
permanecem guardados, com opção para descarregar o original e importar uma
cópia válida. As operações só mostram confirmação depois de gravar o snapshot
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
