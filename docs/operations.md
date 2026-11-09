# Operação do LSS

Guia da apresentação com dados fictícios. Para instalar, configurar e conhecer
as contas de desenvolvimento, consulte [Arranque](quick-start.md).
Os limites do ambiente ficam na documentação técnica; a interface apresenta
os percursos habituais de uma escola.

## Abrir e fechar o atendimento

1. Entre na conta da Secretaria e confirme o ano de acompanhamento/consulta.
2. Reveja comprovativos pendentes e a sessão de caixa. Feche uma sessão de
   outro dia antes de registar novos movimentos físicos.
3. Abra o caixa com o numerário de fundo, se existir. Banco e carteiras não
   pertencem a esse fundo.
4. No fim, confira os movimentos por forma, conte o numerário e guarde o fecho.
5. Descarregue a cópia actual e use Sair. Não limpar os dados do navegador.

Use apenas uma aba para escrever. O Director consulta alunos, regras,
relatórios, caixa e histórico; não matricula, recebe, devolve ou restaura dados.
As permissões centrais e vários postos simultâneos pertencem à futura API.

## Localizar e matricular

A pesquisa encontra nome, número e contacto, ignorando acentos/maiúsculas.
O nome abre a ficha com Dados, Matrículas, Financeiro, Comprovativos e Histórico.
A pesquisa pessoal permanece na sessão e não vai no URL.

Em Nova matrícula, preencha identificação, colocação e condições/revisão.
Reveja correspondências antes de criar outra pessoa. Escolha turma com vaga,
data da matrícula, primeiro mês cobrável e benefício, quando aplicável.

- Guardar rascunho não matricula, não ocupa vaga e não cria cobranças.
- Guardar matrícula permite pagar a inscrição depois, pela ficha.
- Guardar e pagar abre a inscrição do aluno acabado de criar, com contexto e
  valor preenchidos. Bolsa integral não produz pagamento fictício.

A condição financeira e o estado académico são distintos. Renovar reutiliza
a pessoa noutro ano. Transferir ou registar saída exige data, motivo e revisão
do efeito. A pauta anterior e os movimentos financeiros permanecem no histórico.

## Receber e emitir o recibo

Em Pagamentos, escolha ano, classe, turma e Mês/Trimestre/Ano. Abra uma célula
ou Registar pagamento. Confirme aluno, item, forma, data efectiva e distribuição
antes de guardar. Um valor parcial mantém o restante em aberto; o excedente é
crédito, sem liquidar outros itens automaticamente.

Seleccionar uma mensalidade Prevista exige confirmar a antecipação. Outras
cobranças/anos da mesma pessoa só recebem valor quando seleccionados. Rever
os montantes por item evita aplicar tudo ao ano errado.

Depois de guardar, o mesmo diálogo apresenta o recibo persistido. Fechar
conserva o contexto da planilha. Imprimir ou reimprimir não recebe dinheiro
novamente. O documento é interno, sem validade fiscal atribuída por esta demo.

Se a gravação falhar, conserve o preenchimento e repita a tentativa existente.
Não criar outro pagamento para obter um recibo. Se os dados tiverem mudado
noutra aba, recarregue/reveja a distribuição antes de confirmar.

## Comprovativos e datas anteriores

Para transferência, depósito, Multicaixa, M-Pesa ou e-Mola, registe referência,
data efectiva, valor e observação. Guardar para conferência mantém a dívida
em análise: não confirma recebimento nem emite recibo.

Em Relatórios → Conferência → Consultar movimentos, confira a referência,
data e montante e registe a decisão. Rejeição conserva a evidência e o saldo.
Uma confirmação cria um único recebimento e recibo. A referência repetida é
recusada. Cobranças com comprovativo pendente ficam fora dos lembretes.

Se o dinheiro foi pago antes e apresentado depois, use a data efectiva correcta,
a evidência e o motivo da apresentação posterior. O sistema conserva multas
originais e regista os ajustamentos aplicáveis; não editar ou apagar a história.

## Crédito, correcção e devolução

Consultar movimentos permite seleccionar a origem e as cobranças para aplicação
de crédito. A aplicação entre anos fica ligada à pessoa e não cria receita nova.

Devolução tem valor disponível, data, forma e motivo. Conserva o recebimento e
o recibo originais. Corrigir recebimento conserva o valor físico, anula
logicamente o original e liga o substituto. Não usar correcção para esconder
uma devolução. Se a origem já tiver crédito transferido/devolvido, o sistema
pede revisão desses movimentos antes de corrigir.

## Caixa e relatórios

Numerário esperado = abertura + recebimentos/reforços em numerário −
devoluções/saídas em numerário. Saídas têm categoria, forma e motivo; documento
é opcional. Não contar transferências ou carteiras como notas/moedas.

Rever efeito precede a confirmação do fecho. Diferença entre esperado e contado
exige justificação. O fecho é um retrato preservado. Correcções posteriores
aparecem ligadas como ajustamentos; não reescrevem a contagem anterior.

Os totais dos painéis abrem o detalhe. Recebimentos seguem a data efectiva;
liquidação segue a competência; crédito, benefícios e previsão são distintos.
CSV e impressão abrangem toda a lista filtrada, incluindo páginas não visíveis.
Confira período, ano/âmbito, forma, funcionário e pesquisa antes de exportar.

A prévia de mensagem identifica destinatário, período e montante. Copiar não
envia WhatsApp, SMS ou e-mail. O LSS não afirma ter enviado cobranças.

## Navegação, cópias e incidentes

Recolher menu liberta espaço no desktop. No telemóvel, Abrir menu mostra o
Drawer; Escape, destino ou toque fora fecham. Expandir planilha e Escape
conservam filtros/posição sem alterar a preferência permanente.

Em Relatórios → Cópias de segurança, descarregue, verifique e só depois reponha
uma cópia. O [guia de recuperação](recovery.md) explica prévia, estado anterior,
erros e conservação do original. Cópias locais não são backups de servidor.

Se ocorrer um resultado inesperado, registe data, aluno fictício, item, ID do
recibo, acção e mensagem observada. Conserve uma cópia antes de restaurar.
Não editar saldos numa planilha paralela para compensar o sistema.
