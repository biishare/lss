# Guia de operação da demo LSS

## Início rápido

1. Execute `npm ci` e `npm run dev`.
2. Abra `http://localhost:3000`.
3. Entre com uma das contas fictícias abaixo. A interface não mostra contas nem papéis para escolher; o papel deriva do acesso introduzido.
4. Na apresentação normal, a escola fictícia é preparada uma única vez se não houver estado guardado. O Director também pode ser a primeira conta. Abrir, recarregar ou sair não repõe dados existentes.
5. Use **Sair** para voltar ao formulário e trocar de conta. Os dados da escola permanecem.

| Utilizador | Palavra-passe de apresentação | Papel |
| --- | --- | --- |
| `marta` | `Lss!Marta2026` | Secretaria |
| `antonio` | `Lss!Antonio2026` | Director |

Estes pares são fixtures fictícias e públicas de desenvolvimento; não são segredos de produção. A comparação local de fingerprints apenas permite ensaiar o formulário e o papel. Pode ser inspeccionada/contornada no browser e será substituída pela API. Não reutilizar palavras-passe pessoais. A palavra-passe introduzida não é gravada em snapshots, preferências ou sessões.

## Apresentação ao cliente e ferramentas internas

O cliente vê identidade da escola, login e operações habituais. Não aparecem rótulos Demo, contas fictícias, pormenores de armazenamento ou botões de preparação/reposição. Isso não altera os limites técnicos registados neste guia.

As ferramentas internas ficam **desligadas por defeito**. Para desenvolvimento, configure `NEXT_PUBLIC_LSS_DEVELOPER_TOOLS=true` no ambiente local e reinicie `npm run dev`. Num build, a flag é fixada durante a compilação; remova-a/recompile para voltar à apresentação normal. Não há parâmetro no URL para a activar. A flag não protege dados nem substitui autorização.

Nesse modo, Secretaria dispõe da preparação inicial (escola de exemplo ou configuração vazia), importação, exportação, reposição e recuperação do original. Director mantém consulta. Para uma apresentação normal, deixe a flag ausente ou `false`.

## Navegação e contexto

As cinco áreas partilham o mesmo layout. **Recolher menu** passa de 256 a 64 px
no desktop (a partir de 1200 px). Entre 768 e 1199 px a barra começa compacta e
**Expandir menu** abre uma sobreposição sem alterar a preferência desktop.
No telemóvel, **Abrir menu** mostra o Drawer. Escape, destino, toque fora e
**Fechar menu** fecham a sobreposição; o foco regressa à abertura.

**Pagamentos** abre a planilha. **Expandir planilha** oculta o menu e os blocos
secundários, conservando filtros, selecção e rascunho. A saída restaura o layout.
Enquanto o atendimento no modal não estiver concluído na fase 5, **Registar
pagamento** no detalhe sai da vista expandida e prepara o formulário existente.

Voltar, Avançar e recarregar recuperam os IDs de classe/turma, mês e área no URL.
Pesquisa, selecção em lote e posições de scroll ficam na sessão do cenário,
sem colocar nomes ou contactos no URL. O ano mostrado é o ano operacional
existente; a organização e selecção de vários anos pertencem à fase 3.

## Roteiro sugerido

1. No **Início**, apresente os indicadores e alertas.
2. Em **Alunos e turmas**, seleccione classe/turma e faça uma matrícula fictícia.
3. Em **Pagamentos → Dados de pagamentos**, crie uma política, seleccione as
   classes abrangidas e mostre as cobranças diversas.
4. Na **Planilha financeira**, mostre geração de mensalidades, prévia e recibo.
5. Em **Relatórios**, compare previsto, recebido, descontos e dívida.
6. Use **Sair**, entre como Director e mostre o modo só de leitura.

## Exportar, importar e repor

As ferramentas ficam em **Configurações**, apenas com a flag de desenvolvimento activa e a conta Secretaria.

- **Exportar JSON** descarrega um snapshot v3 (também aceita exportações v2 e o formato anterior) com todos os dados locais.
- **Importar JSON** valida primeiro o ficheiro e só substitui o estado após
  confirmação. Ficheiros inválidos e versões desconhecidas são recusados.
- **Repor dados iniciais** pede confirmação e remove apenas as alterações da
  demo. Exporte antes se quiser conservar uma cópia.

## Recuperação

Se uma alteração indesejada for feita, importe a exportação mais recente. Se não
houver cópia, reponha os dados fictícios. Não limpe todo o armazenamento do
navegador: outras aplicações e as preferências do utilizador podem partilhar o
mesmo domínio.

## Limitações assumidas

- Dados apenas no navegador e no dispositivo actual.
- Credenciais locais fictícias para apresentação; sem utilizadores, autenticação, recuperação ou sessões reais de servidor.
- Sem servidor, base de dados, concorrência multiutilizador ou cópias remotas.
- Sem validade fiscal, contabilística ou jurídica dos recibos.
- Sem comunicações ou integrações externas.

Esta demo serve para apresentar fluxos e decisões do produto. Não deve receber
dados pessoais reais nem ser tratada como sistema de produção.

## Dados ilegíveis e falha de gravação

O ecrã normal conserva os dados existentes e orienta para o responsável. Em desenvolvimento, descarregue o original e, como Secretaria, importe uma cópia válida. A importação pede confirmação, recusa
versão/IDs/relações/saldos inválidos e não apaga o cenário se a gravação falhar.

Pagamento só é confirmado depois de guardar o conjunto completo. Se falhar,
o formulário conserva o preenchimento e a tentativa pode ser repetida com o
mesmo identificador. Se outra aba tiver alterado os dados, reveja o estado antes
de confirmar; use uma aba de escrita de cada vez.

Os rascunhos de matrícula e pagamento ficam na sessão e no cenário de origem.
A sua gravação não confirma nenhuma matrícula ou pagamento. Se o armazenamento
de rascunhos estiver bloqueado, o ecrã informa que o preenchimento só permanece
na página actual.

## API posterior

Por decisão do utilizador, esta etapa não cria uma base real ou backend. A API
dedicada posterior fornecerá autenticação, autorização, base central e backups.
Os perfis de exemplo e a exportação local não são esses mecanismos de produção.

## Alunos e estrutura — fase 3

Em **Configurações**, percorra Escola, Ano e calendário, Níveis e classes, Salas e turmas e Regras de pagamento. A classe é cadastrada uma vez e disponibilizada no ano escolhido; a sala é cadastrada uma vez e aparece logo nas turmas. Uma turma valida vaga/capacidade, sala e horário. Escolha **Ano de consulta** para preparar/consultar outro ano sem apagar o actual. O ano seguinte só pode tornar-se operacional depois de encerrar o anterior.

Em **Alunos e turmas**, use **Nova matrícula** e os três passos. Complete o nome, reveja as correspondências, escolha ano/turma e as condições. Pode guardar um rascunho, confirmar e pagar depois, ou **Guardar e pagar** para abrir a inscrição correcta. O formulário conserva o preenchimento em falha. Rascunho não é matrícula confirmada.

O nome abre a ficha permanente. Dados/contactos corrigidos pedem motivo e mantêm anterior/novo no Histórico. **Renovar matrícula** reutiliza a pessoa para outro ano. No separador Matrículas, **Transferir de turma** e **Registar saída** apresentam a data e o efeito antes da confirmação. O número anterior da pauta permanece no histórico. Pagamentos e recibos anteriores conservam-se; antecipações de obrigações anuladas ficam como crédito identificado, sem devolução automática.

A ficha reúne todos os anos. **Abrir pagamentos de [ano]** leva à planilha com o ano, classe e turma correspondentes. Comprovativos mostra os pagamentos/referências e recibos já guardados; não inventa recibos de movimentos antigos sem snapshot. A gestão completa de conferência/anexos, crédito/devolução e impressão pertence à fase 5.

Os calendários desta etapa usam os meses de um ano civil identificado por quatro algarismos. A vigência de novos preços por nível, emissão automática e precisão/multas completas continuam para a fase 4. Contas reais e validação central/concorrência entre postos dependem da API posterior.

## Atendimento da fase 5

Em Pagamentos, escolha turma/período e abra uma célula ou Registar pagamento.
Confirme a distribuição antes de guardar; o recibo surge no mesmo Dialog.
Fechar conserva o contexto. Imprimir / Guardar PDF usa o documento guardado;
repetir impressão não recebe dinheiro novamente.

Acrescentar outras cobranças permite distribuir um valor por anos da mesma
pessoa. Indique montantes por item quando necessário; o excedente fica em
crédito. Receber apenas crédito exige seleccionar esse destino.

Consultar movimentos reúne comprovativos, recibos, origens de crédito e
histórico. Guardar para conferência mantém a dívida; confirmar exige comparar
referência, data e valor com a evidência. Rejeitar conserva a decisão. O cenário
inicial novo inclui `DEP-2026-008` para ensaiar essa consulta.

Aplicar crédito e Registar devolução mostram o efeito antes de guardar e
recusam exceder o saldo. Corrigir recebimento preserva o original e liga um
substituto, sem duplicar a entrada física. Se o crédito já saiu para outro ano
ou foi devolvido, a correcção automática é bloqueada para revisão dos movimentos.
Não apagar histórico nem editar o saldo para contornar esse bloqueio.

Ver cobertura e limites em [phase-5-2026-11-09.md](phase-5-2026-11-09.md).
Relatórios detalhados, fecho/caixa e continuidade fazem parte da fase 6;
segurança e dados centrais aguardam a API dedicada.
