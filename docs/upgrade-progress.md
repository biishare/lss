# LSS — registo do upgrade da demo

Referência: `LSS_Upgrade_Demo_Especificacao_Codex_v2_2026-09-02.pdf`.
A v2 substitui integralmente a v1. O âmbito é uma demonstração local com dados
fictícios; PostgreSQL, SQL, backend, autenticação real, filas e integrações
externas estão deliberadamente fora do projecto.

## Estado das fases

| Fase | Estado | Resultado / validação |
| --- | --- | --- |
| 0 — Diagnóstico | concluída | PDF v2 e instruções do repositório lidos; aplicação e domínio financeiro inventariados; baseline com 21 testes e lint aprovados. |
| 1 — Estado local | concluída | `localStorage` preservado, schema local v2, sessão fictícia, exportação versionada, importação validada e reposição confirmada. Formato local anterior continua aceite. |
| 2 — Shell e navegação | concluída | Material UI integrado ao App Router; entrada por Secretaria/Director sem palavra-passe; cinco rotas; Drawer temporário móvel e barra lateral 256/64 no desktop. |
| 3 — Académico | concluída | Níveis, classes, salas, turmas, matrícula, filtros e números estáveis usam dados fictícios persistentes. Director consulta sem formulários de escrita. |
| 4 — Regras financeiras | concluída | Políticas nomeadas associam inscrição, mensalidade, período, limite, multas e estado a várias classes de um ano; uma classe/ano mantém uma única política activa e as versões históricas não são reescritas. |
| 5 — Pagamentos | concluída | Prévia, afectação por prioridade, antecipação explícita, diversos, recibo demonstrativo e correcção compensatória auditável. |
| 6 — Relatórios | concluída | Indicadores, dívida vencida/a vencer, totais, multas, diversos e histórico de gerações disponíveis aos dois perfis. |
| 7 — Qualidade e entrega | concluída | 29 testes automatizados, lint, TypeScript e build de produção aprovados; entrada, dados iniciais, cinco rotas, política por classes e menu de cobranças diversas verificados no navegador. |

## Preservação dos dados

- A chave de estado continua a ser `gestao-academica-demo-state-v2`.
- O carregamento tolera campos ausentes e normaliza snapshots anteriores.
- Exportações usam o envelope `lss-demo-snapshot`, versão 2 e data ISO.
- A importação valida o JSON e as colecções antes de pedir confirmação e gravar.
- A reposição remove apenas o estado da demo depois de confirmação; preferências
  visuais e a sessão são independentes.
- Erros de armazenamento/importação são apresentados sem indicar sucesso falso.

## Controlo de acesso demonstrativo

- **Secretaria:** operações académicas, regras, cobranças, pagamentos e
  ferramentas de dados.
- **Director:** leitura de dashboard, alunos/turmas, planilha, relatórios e
  parâmetros. Os serviços locais continuam a negar mutações financeiras mesmo
  que uma acção seja invocada fora da interface.

Isto é separação de perfis para demonstração, não autenticação nem segurança de
produção.

## Testes realizados

- Baseline: 21/21 testes do domínio financeiro.
- Repositório local: exportação/importação v2, compatibilidade legada, JSON
  inválido, versão futura e colecção incompatível.
- Políticas: aplicação conjunta às classes, exclusividade activa por classe/ano
  e histórico independente entre 2026 e 2027.
- Total actual: 29 testes automatizados aprovados.
- `eslint`, `tsc --noEmit` e `next build`: aprovados.

## Pendências fora do âmbito

- Backend, PostgreSQL/SQL, contas reais, permissões de servidor e auditoria de
  segurança.
- Documentos fiscais/contabilísticos, integração bancária, SMS/e-mail e
  sincronização entre dispositivos.
- Uso de dados reais ou publicação em produção.
