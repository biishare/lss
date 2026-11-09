# Roteiro de apresentação e ensaio

Use dados fictícios e uma aba de escrita. Prepare uma cópia antes de começar.
A apresentação não activa um piloto com dados ou dinheiro reais.

## Preparação

Confirme conta, ano, calendário, turma com vagas e valores das regras. A UI usa
o relógio da escola no momento; não inventar que o browser está numa data de
teste. Os ensaios automáticos usam Maio de 2026 e valores controlados.

| Caso | Percurso | Conferência |
| --- | --- | --- |
| Atendimento regular | Pesquisar → Nova matrícula → Guardar e pagar → recibo → ficha | Pessoa única, inscrição correcta, matrícula e documento persistidos. |
| Parcial | Abrir mensalidade → receber parte → recibo → regressar à célula → completar | Saldo restante exacto e recibo inicial preservado; total igual à soma dos recebimentos. |
| Bolsa integral | Matrícula com bolsa de 100%, âmbito e período revistos → guardar | Inscrição/mensalidade dispensadas, sem pagamento fictício; bolsa visível na ficha/planilha. |
| Comprovativo | Guardar para conferência → consultar movimento → rever e decidir | Em análise mantém saldo e suspende lembrete; confirmar cria um recibo; rejeitar conserva evidência. |
| Prova tardia | Data efectiva anterior, referência e motivo → conferência | Multa original conservada e ajustamento rastreável quando aplicável. |
| Caixa | Rever formas → saída justificada → contagem → fecho | Banco/carteiras fora do numerário; diferença explicada; retrato preservado. |
| Relatório | Abrir total → filtrar → ficha/recibo → CSV → prévia de impressão | Mesma definição, selecção, período e total; páginas adicionais incluídas. |
| Recuperação | Descarregar → ensaiar restauro → rever → cancelar ou confirmar | Contagens/saldos/documentos conferidos; estado anterior preservado. |
| Director | Sair → entrar como Director → consultar os mesmos registos | Sem botões de escrita e sem alterar os dados. |

Na apresentação, use o valor mostrado na prévia. Um exemplo de 1 000 MT não é
um preço oficial da escola. Para uma mensalidade de 1 000, um parcial de 600
deixa 400, antes de quaisquer multas exigíveis no contexto apresentado.

## Ensaio automático reproduzível

```bash
npm run test:rehearsal
```

Executa os serviços reais da aplicação contra repositórios locais isolados:

- matrícula, inscrição, parcial 600/400, falha/repetição com ID estável, recibo,
  relatório, saída/fecho e restauro reconciliado;
- bolsa integral sem recebimento fictício;
- pagamento efectivo em 8 de Maio, comprovativo apresentado no dia 14,
  conferência e neutralização da multa, mantendo original/evidência;
- 100/300 alunos sintéticos, pesquisa, CSV integral e ensaio de restauro.

É evidência do domínio e persistência local. Não substitui ensaio no navegador,
teclado virtual, impressão real ou critérios de servidor.

## Observar antes de expandir

Registe duração da tarefa, dificuldade, acção esperada, acção observada,
montantes, mensagem e referência do recibo. Não atribua uma diferença à pessoa
sem conferir os movimentos. Interrompa e corrija o bloqueio antes de expandir.

| Data/versão | Caso/aluno fictício | Esperado | Observado | Bloqueio | Correcção/reteste |
| --- | --- | --- | --- | --- | --- |
| A preencher no ensaio acompanhado | | | | | |

O piloto futuro começa com uma turma e um funcionário da Secretaria, depois
dos [critérios de entrada](pilot-plan.md). Os testes automáticos não são um
registo de observação de um funcionário real.
