# LSS — demonstração de gestão escolar

Demo navegável do Liceu São Silvestre, construída com Next.js, React,
TypeScript, Material UI e Tailwind CSS. Usa apenas dados fictícios e guarda as
alterações no `localStorage` do navegador.

Não existe backend, base de dados, autenticação real ou integração externa.

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
importar uma exportação v2 e repor os dados fictícios. Uma importação inválida
ou cancelada não substitui o estado actual. Sair da sessão não apaga os dados.

Os nomes e movimentos incluídos no estado inicial são dados de exemplo para
apresentação e testes locais.

## Validar

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

O registo fase a fase está em [`docs/upgrade-progress.md`](docs/upgrade-progress.md)
e o guia de operação em [`docs/operations.md`](docs/operations.md).
