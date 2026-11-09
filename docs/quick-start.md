# Arranque e configuração do LSS

Este guia acompanha a apresentação local com dados fictícios. A API e a base
central serão implementadas separadamente, por decisão do responsável.

## Preparar o ambiente

Use Node.js 24.x e o lockfile do repositório. A validação desta entrega usou
Node.js 24.22.1, também fixado no workflow de integração. O mínimo de Next.js
não basta para executar os testes: estes usam o suporte a TypeScript do Node.

```bash
npm ci
npm run dev
```

Abra `http://localhost:3000`. Para validar a compilação:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Comandos adicionais:

```bash
npm run test:rehearsal
npm run benchmark
```

O ensaio usa dados isolados e relógio fixo. O benchmark mede domínio e CSV com
100/300 alunos sintéticos; não mede renderização, rede ou teclado virtual.
O workflow `.github/workflows/validate.yml` executa testes, lint, TypeScript e
build nas PRs e na `main`, sem credenciais da Vercel nem da futura API.

## Contas de apresentação

| Utilizador | Palavra-passe fictícia e pública | Papel |
| --- | --- | --- |
| `marta` | `Lss!Marta2026` | Secretaria |
| `antonio` | `Lss!Antonio2026` | Director |

São fixtures de desenvolvimento. Não reutilizar palavras-passe pessoais nem
introduzir dados reais. O formulário não é autenticação de servidor. A conta
determina o papel; sair conserva os dados da escola neste dispositivo.

## Primeira utilização e configuração

A apresentação normal prepara uma escola fictícia somente quando não existem
dados guardados. Reabrir ou trocar de conta não repõe o cenário. Dados ilegíveis
não são substituídos por exemplos.

Em **Configurações**, reveja Escola, Ano e calendário, Níveis e classes,
Salas e turmas e Regras de pagamento. Confirme calendário, ano activo, capacidade
e horário antes de matricular. Uma sala é cadastrada uma vez e reutilizada.
Prepare o ano seguinte sem alterar o anterior; a activação exige o encerramento
do ano actual.

Em **Pagamentos → Dados de pagamentos**, configure preços por ano/nível e
vigência. Um preço futuro não reescreve cobranças emitidas. A multa simples é
o padrão; activar uma segunda etapa exige configuração explícita. Em
**Bolsas e isencoes**, reveja âmbito, período, motivo e efeito retroactivo.

Em **Relatórios → Caixa**, indique o fundo inicial, se existir. Receber antes
da abertura cria uma sessão de 0 MT; um reforço posterior exige motivo.
Em **Relatórios → Cópias de segurança**, confira cópias activas e descarregue
uma cópia fora do dispositivo antes de apresentar ou restaurar dados.

## Ferramentas técnicas opcionais

`NEXT_PUBLIC_LSS_DEVELOPER_TOOLS=true` activa a preparação vazia, reposição e
recuperação técnica em Configurações para Secretaria. Num build, a flag é
fixada na compilação. Deixe-a ausente na apresentação normal.

A flag é de apresentação, não uma barreira de segurança. Não há parâmetro de
URL para a activar. Não são necessárias variáveis de base de dados nesta etapa.
Não acrescentar segredos de produção ao código, ao browser ou às exportações.

## Publicação e critérios

Trabalhe numa branch, valide, abra PR e confira o deploy ligado à Vercel.
Compare equipa `biilearn`, projecto `lss`, commit, ambiente e estado READY.
O check de deploy não prova percursos, permissões ou impressão.

A revisão do resultado precede integração na `main`. Ao integrar, acompanhe a
publicação de produção e verifique o endereço público. Consulte a
[matriz de aceitação](acceptance-v3.md), o [roteiro](presentation.md) e os
[critérios do piloto](pilot-plan.md) antes de declarar um marco concluído.
