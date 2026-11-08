# LSS

## Especificação mesclada v3.0

**Atendimento escolar centrado no aluno**

Matrículas, pagamentos, pendências e acompanhamento da escola.

**Liceu São Silvestre**

Preparado para António Marques | 8 de Novembro de 2026

Documento de requisitos e execução para o repositório `biishare/lss`.

## Decisão posterior do utilizador: API dedicada numa etapa separada

Em 08/11/2026, depois de autorizar a v3, o utilizador determinou: **não criar agora uma base de dados real; a base e o backend serão desenvolvidos depois, numa API dedicada**. Esta decisão prevalece sobre qualquer referência a implementação imediata de PostgreSQL, servidor ou autenticação real neste documento.

O âmbito actual é o frontend com persistência local fiável, dados fictícios, comandos sem duplicação, importação/exportação e preservação dos formatos anteriores. Não criar SQL, ORM, migrações de base remota, endpoints financeiros, credenciais de produção ou ligações a uma base nesta etapa. A autenticação real, a autorização de servidor, as transacções centrais e os backups de produção pertencem à API posterior. Manter o domínio e os adaptadores separados para essa integração, sem tratar a demo como segurança ou produção prontas.

**Instrução vigente:** esta versão mescla o PDF v2 de 02/09/2026 com a proposta de atendimento enviada posteriormente pelo utilizador. Nos conflitos, prevalece a proposta posterior, conforme a decisão expressa do utilizador.

O resultado final continua a prever login único, contas individuais, base central, validação no servidor, cópias de segurança e preparação para um piloto. Esses recursos centrais serão fornecidos pela API dedicada posterior. A demo local existente continua a ser preservada e aproveitada agora.

Este documento especifica trabalho a executar. Não declara que autenticação, servidor, base central ou critérios de produção já estejam implementados.

<!-- page -->

## 01. Autoridade, decisões e âmbito

Esta especificação substitui o PDF v2 como instrução de execução. Preserva as regras e os pormenores úteis daquele documento e incorpora todos os requisitos funcionais da proposta posterior. Referências de tempo de uma resposta anterior não são requisitos do produto.

| Assunto | Decisão vigente |
| --- | --- |
| Entrada | Uma página de login; cada conta abre automaticamente o painel correspondente ao seu papel. |
| Perfis | Secretaria opera; Director consulta dados, indicadores e histórico. |
| Navegação | Início, Alunos e turmas, Pagamentos, Relatórios e Configurações. |
| Interface | Next.js, React, TypeScript, MUI e Tailwind; desktop e telemóvel. |
| Dados do sistema | PostgreSQL como fonte central; operações validadas e autorizadas no servidor. |
| Fiabilidade | Transacções, protecção contra duplicados, histórico de alterações e backups desde a base da implementação. |
| Demo existente | Preservar dados, código útil, snapshots e exportação; usar dados fictícios em desenvolvimento e apresentação. |
| Entrega | Implementar numa branch, testar, rever e só depois integrar em `main` e verificar a Vercel. |

**Conflitos resolvidos:** a selecção manual de perfil deixa de ser a entrada principal; a exclusão de PostgreSQL, autenticação e servidor deixa de vigorar. As fases 0 a 7 passam a cobrir o sistema definido nesta v3, com marcos separados para apresentação, piloto e produção.

Nenhum botão, requisito escrito ou fase planeada conta como funcionalidade implementada. Registar sempre o que está planeado, implementado e efectivamente verificado.

<!-- page -->

## 02. Visão e mapa do produto

O LSS organiza o atendimento em torno de quatro tarefas: **matricular, receber pagamentos, consultar pendências e acompanhar a escola**. A ficha do aluno e os mesmos movimentos financeiros ligam todos os percursos.

| Área | Conteúdo principal | Rota de referência |
| --- | --- | --- |
| Início | Pendências do dia, pesquisa e atalhos para matrícula e pagamento; painel adequado à conta. | `/dashboard` |
| Alunos e turmas | Fichas, matrículas, listas, vagas, transferências e renovações. | `/students` e rotas equivalentes de turmas |
| Pagamentos | Pesquisa e planilha imediatamente visíveis; recebimentos, dívida, crédito e recibos. | `/payments` |
| Relatórios | Recebimentos, atrasos, bolsas, aplicações e movimento de caixa, com detalhe. | `/reports` |
| Configurações | Escola, ano, níveis, classes, salas, preços e contas de acesso autorizadas. | `/settings` |

Retirar os menus principais separados de Académico, Classes e Salas. Esses conceitos pertencem a percursos internos das cinco áreas. Eliminar o duplo processo de definir uma classe/sala num lugar e adicioná-la ou activá-la novamente noutro.

Uma informação é cadastrada uma vez e reutilizada. IDs são estáveis; nomes podem mudar sem quebrar relações. Reaproveitar rotas existentes equivalentes em vez de criar destinos concorrentes.

A interface usa português de Moçambique, com terminologia consistente: aluno, encarregado, turma, inscrição, mensalidade/propina e recibo. Nomes técnicos e rotas podem permanecer em inglês.

IA, aplicação móvel própria, portal dos encarregados, notas, presenças, gestão completa de pessoal e múltiplas escolas ficam para expansão. Contas dos funcionários e o respectivo papel fazem parte desta entrega.

<!-- page -->

## 03. Login único, contas e permissões

A entrada principal tem um único login. O funcionário identifica-se com a sua conta; o servidor determina o papel e abre o painel correspondente. Não pedir ao utilizador que escolha Secretaria ou Director para obter acesso.

| Operação | Secretaria | Director |
| --- | --- | --- |
| Consultar alunos, turmas, ficha e histórico | Sim | Sim |
| Matricular, editar dados e renovar | Sim | Consulta |
| Configurar escola, calendário e preços | Sim, conforme permissão | Consulta |
| Conceder benefícios e registar pagamentos | Sim | Consulta |
| Corrigir, devolver e fechar caixa | Sim, com motivo quando aplicável | Consulta |
| Consultar e exportar relatórios | Sim | Sim |
| Importar ou repor cenários de demonstração | Sim, com confirmação e no ambiente demo | Não |
| Gerir contas e papéis | Apenas responsável designado com permissão específica | Não por defeito |
| Apagar isoladamente histórico financeiro | Não | Não |

Usar autenticação mantida e adequada à aplicação, sem inventar criptografia. Implementar sessões seguras, saída, expiração, recuperação de acesso e desactivação de contas. Não guardar credenciais em `localStorage`, no código ou em exportações. Validar a autorização no servidor para cada leitura e escrita; esconder botões é apenas a apresentação dessa regra.

Uma conta desactivada perde acesso, mas o seu identificador permanece no histórico. Só um responsável autorizado pode atribuir papéis; o próprio utilizador não os escolhe no pedido. Preparar o primeiro responsável por um procedimento controlado e documentado.

Manter duas contas fictícias estáveis para demonstração dos papéis. Uma eventual entrada rápida de demo deve estar claramente identificada e isolada do ambiente com dados reais. Trocar conta ou sair não elimina dados da escola.

<!-- page -->

## 04. Instituição, calendário e estrutura académica

Começar com uma instituição. Guardar nome, logo, contactos, moeda MT e fuso `Africa/Maputo`. Separar o catálogo permanente da organização de cada ano, mantendo um único percurso de configuração.

| Conceito | Regra |
| --- | --- |
| Ano lectivo | Em preparação, Em curso ou Encerrado; apenas um operacional activo por instituição. Preparar o próximo sem alterar o actual. |
| Nível e classe | Catálogo estável; oferta anual liga a classe ao nível, calendário, matrículas e preços. |
| Turma | Classe, ano, nome, turno/horário, sala e capacidade. Nomes iguais em anos diferentes são legítimos. |
| Sala | Cadastro único com capacidade e localização; detectar conflitos no mesmo horário/turno. |
| Identificadores | Imutáveis e independentes de nome, ordenação ou filtro. |

A configuração guiada percorre escola, ano/calendário, níveis/classes, salas/turmas e regras de pagamento. Mostrar o que falta e uma acção que resolva a pendência. Disponibilizar uma escola de exemplo e a opção de começar uma configuração vazia.

Guardar início/fim do ano, meses cobráveis e vencimentos. Não presumir Março como início universal. Operações usam o ano seleccionado, nunca apenas o relógio do dispositivo. Se o dia de vencimento não existir num mês, usar o último dia e mostrar a data resultante.

Avisar aos 90% de ocupação. Ao atingir a capacidade, bloquear colocação adicional por defeito. Alterar capacidade exige motivo e verificação da sala. Transferências validam vaga, datas e conflitos de colocação.

Encerrar um ano conserva matrículas, regras, cobranças, pagamentos e relatórios. Dívidas e créditos continuam regularizáveis por movimentos ligados à origem. Não copiar dívida antiga como nova mensalidade.

<!-- page -->

## 05. Ficha única e pesquisa do aluno

O aluno é uma pessoa com registo permanente; cada ano tem a sua matrícula. Clicar no nome abre a ficha, em vez de obrigar a procurar novamente a pessoa noutra área.

No cabeçalho, mostrar nome, número permanente, turma/ano actual, condição financeira e contacto do encarregado. Organizar os dados em separadores Dados, Matrículas, Financeiro, Comprovativos e Histórico. Permitir chegar a cobranças, pagamentos, recibos, renovação, correcção de contacto e transferência a partir da mesma ficha.

**Pesquisa geral:** nome, número permanente, número de matrícula/pauta e contacto, ignorando acentos e maiúsculas. Respeitar o âmbito da instituição e as permissões da conta. Não colocar contactos ou pesquisa pessoal nos parâmetros do URL.

Avisar de possíveis duplicados pela combinação de nome, contacto e outros dados disponíveis. Nomes iguais, sozinhos, não impedem um aluno legítimo. Antes de criar uma nova pessoa, oferecer correspondências existentes para reutilizar a ficha.

**Numeração:** número permanente do aluno e número da pauta por turma/ano, apresentado como 001, 002, 003. O número da pauta não muda com pesquisa, ordenação, saída de outro aluno ou recarregamento e não é reutilizado. Transferência preserva a colocação e o número anteriores no histórico.

**Histórico:** guardar evento, origem, data efectiva, instante de registo e autor. Dados materiais corrigidos mostram anterior, novo valor e motivo. Não inventar autores ou datas que faltem no formato antigo.

A dívida e a situação académica são distintas. A cobrança gera acompanhamento; suspensão ou outra alteração académica depende de decisão registada da instituição.

<!-- page -->

## 06. Matrícula em três passos

| Passo | Dados e comportamento |
| --- | --- |
| 1. Identificação | Nome, encarregado e contacto; pesquisar pessoa existente e avisar de correspondências. Dados complementares em falta ficam como pendência visível. |
| 2. Colocação | Ano, classe e turma com vaga; aproveitar o contexto seleccionado. Turno e sala são informação derivada. |
| 3. Condições e revisão | Data da matrícula, mês inicial das mensalidades, benefício e resumo da inscrição. Apresentar Guardar matrícula e Guardar e pagar. |

Confirmar exige nome, ano/classe/turma válidos, data e início de cobrança coerentes com o calendário. Validar também no servidor. Mostrar erros junto ao campo e conservar todos os dados preenchidos.

Distinguir rascunho de matrícula confirmada. Um rascunho não cria cobranças, não ocupa matrícula confirmada nos relatórios e não conta como aluno matriculado. A confirmação cria o vínculo anual, a colocação e o calendário individual numa operação consistente.

Guardar matrícula permite inscrição por pagar. O estado académico não depende automaticamente da liquidação. Depois de guardar, mostrar aluno, número e próxima acção. Guardar e pagar abre o modal da inscrição do aluno acabado de criar, com valor e contexto preenchidos; uma bolsa integral não cria um pagamento fictício.

O servidor verifica capacidade e duplicação antes de confirmar. Duas tentativas de ocupar a última vaga não podem confirmar ambas por terem lido o mesmo saldo de vagas. O mesmo comando repetido devolve o resultado já guardado.

No primeiro mês, a mensalidade é integral por defeito. Qualquer redução excepcional tem valor/percentagem, motivo e registo próprios. Não aplicar proporcionalidade oculta.

<!-- page -->

## 07. Renovação, transferência e saída

| Situação | Efeito definido |
| --- | --- |
| Renovação | Reutilizar pessoa e contactos; criar matrícula do novo ano depois de escolher turma e condições. Não duplicar ficha nem apagar dívida anterior. |
| Entrada durante o ano | Começar no mês escolhido. Sugerir o maior entre primeiro mês cobrável e mês de entrada. Meses anteriores ficam Não aplicável. |
| Mudança de turma | Validar vaga/sala; guardar data e colocação anterior. Não duplicar matrícula anual nem mensalidade pela transferência. |
| Mudança de nível/preço | Preservar cobranças emitidas e pagas. Novo preço começa no mês seguinte por defeito; ajuste do mês corrente é explícito. |
| Desistência | Mês de saída continua devido por defeito; cessar meses seguintes e anular previsões/obrigações futuras por evento registado. |
| Cancelamento de erro | Conservar matrícula cancelada e motivo. Tratar cobranças, crédito e eventual devolução quando houver movimentos. |
| Dívida antiga | Manter ano e cobrança originais, com consulta e pagamento separados. Renovação não replica nem apaga a dívida. |

Antes de confirmar, apresentar data de efeito, colocação anterior/nova, cobranças que permanecem, futuras interrompidas, novo valor/mês inicial e créditos ou reembolsos a tratar. Conservar pagamentos antecipados; não os apagar nem converter silenciosamente em outra receita.

Estados da matrícula: rascunho, activa, desistente, concluída e cancelada. Transferência é um evento de colocação e pode manter a matrícula activa no mesmo ano.

Excepções institucionais devem ser operações explícitas, com efeito calculado, autorização e histórico. Não editar directamente o saldo guardado para representar uma decisão académica.

<!-- page -->

## 08. Regras e emissão automática de cobranças

Configurar preços por instituição, ano e nível, aproveitando associações às classes quando necessário. Impedir vigências contraditórias para o mesmo âmbito. Distinguir valor zero de configuração em falta.

Uma versão guarda inscrição/renovação, mensalidade, meses cobráveis, prazo da inscrição, vencimento mensal, multas, vigência, autor e simulação. Provas, uniforme, transporte e outros extras têm descrição, valor, prazo e alunos abrangidos.

**Retirar Gerar propinas da rotina mensal.** Ao confirmar a matrícula, criar o calendário individual. A mensalidade é emitida no primeiro dia do mês; meses posteriores permanecem Previsto. Sincronizar emissões devidas ao abrir a aplicação e após mudanças relevantes. No sistema central, assegurar que os percursos e relatórios sincronizam obrigações vencidas antes de as apresentar; um agendador adicional não é condição para funcionar.

Usar chave única por matrícula, tipo e competência; extras repetíveis incluem ocorrência. Repetir carregamento, sincronização ou pedido não duplica cobranças nem etapas. A Secretaria acompanha excepções, em vez de gerar turmas manualmente todos os meses.

Pagar antecipadamente um item Previsto emite apenas a obrigação seleccionada e confirma o pagamento na mesma transacção. A sincronização posterior reconhece esse item.

Cada cobrança guarda base, benefício, devido, prazo e versão. Novos preços valem a partir da vigência definida, apenas para próximas emissões elegíveis. Uma cobrança emitida muda por ajustamento rastreável, sem reescrever o recibo original. Regras históricas e seus algoritmos mantêm-se por versão.

Uma cobrança em lote apresenta alunos, contagem, valor unitário e total antes da confirmação.

<!-- page -->

## 09. Bolsas, descontos e isenções

Um benefício altera o valor devido; não representa dinheiro recebido. Não gerar pagamento fictício para mostrar uma célula liquidada.

| Condição | Regra |
| --- | --- |
| Bolsa integral | 100% de inscrição e mensalidades abrangidas. Outros custos exigem cobertura explícita. |
| Bolsa parcial / desconto percentual | Percentagem entre 0 e 100, itens, período e motivo; explicitar se inclui inscrição. |
| Isenção temporária | 100% dos itens/meses indicados, com início e fim; depois regressa à regra normal, sem cobrar retroactivamente o que foi isento. |
| Desconto excepcional | Redução com motivo, âmbito, validade e referência de autorização quando existir. |
| Sobreposição | Aplicar o maior benefício elegível à mesma cobrança; não somar percentagens automaticamente. |

Retirar Ponderação como categoria vaga da interface. Converter apenas quando o significado for conhecido; conservar a categoria e os dados originais quando houver ambiguidade e apresentar a pendência.

Guardar funcionário, instante de registo, motivo, período e referência à autorização. Mostrar o efeito antes de confirmar. A ficha identifica a condição, por exemplo Bolseiro de 50%; o saldo restante pode estar Pago, Parcial ou Em atraso.

Bolsa integral produz estado Bolseiro; outra isenção total produz Isento. Extras não cobertos continuam independentes. Não emitir multa sobre valor integralmente dispensado.

Benefício posterior distingue efeito futuro de retroactivo. O retroactivo gera ajustamentos ligados às cobranças; se já estavam pagas, o excedente vira crédito e pode originar devolução. Preservar o recebimento e o recibo original.

Exemplo: base 1 000 MT com bolsa de 50% e outro desconto de 20% resulta em desconto de 500 e devido de 500, sem soma de 70%. A multa incide sobre principal em aberto após benefícios.

<!-- page -->

## 10. Multas, datas e precisão

**Padrão das novas regras:** multa percentual simples, aplicada uma vez à mensalidade em atraso. A segunda etapa é opcional e começa desligada. Qualquer multa noutro tipo de item exige regra explícita. Não reinterpretar regras históricas pelo novo padrão.

O vencimento é inclusivo até ao fim do dia da escola. A primeira etapa começa depois do vencimento; a segunda, quando activa, depois da primeira. Configurar intervalos em dias após vencimento e convertê-los em datas reais, incluindo passagem ao mês/ano seguinte.

Para cada etapa i: **incremento = arredondar(saldo principal no início da etapa x (taxa acumulada i - taxa acumulada anterior) / 100, 2)**. A taxa anterior da primeira etapa é zero. A segunda taxa acumulada deve ser maior. Não calcular juros sobre multas.

O saldo inicial considera pagamentos confirmados com data efectiva anterior ao início da etapa. Um pagamento no próprio primeiro dia da multa já está sujeito a ela. Aplicar cada etapa uma única vez; não criar etapa se o principal já estiver liquidado.

| Exemplo: principal 1 000; vence dia 10 | Incremento | Multa acumulada |
| --- | --- | --- |
| Até dia 10 | 0 | 0 |
| Dia 11, taxa de 5% | 50 | 50 |
| Dia 21, taxa total de 10%, se activada | 50 | 100 |

Com 600 pagos no dia 9, primeira multa é 20; com mais 200 no dia 15 aplicados ao principal, segunda multa é 10. No dia 21 restam principal 200 e multas 30: total 230.

Pagamento efectivo dia 8, apresentado dia 14, não sofre multa de prazo encerrado dia 10. Se a multa já existir, recomputar a linha temporal e emitir ajustamento neutralizador, preservando original, evidência, motivo e data. Fechos conservam o retrato e identificam a correcção posterior.

Usar cêntimos inteiros ou decimal exacto; arredondamento half-up a duas casas por parcela. Mostrar base, taxa, data inicial e resultado. Um Clock injectável e o fuso da escola tornam os testes reproduzíveis.

<!-- page -->

## 11. Atendimento e confirmação do pagamento

Ao abrir Pagamentos, pesquisa e planilha são o conteúdo principal. Retirar formulários permanentemente abertos, indicadores demasiado grandes e atalhos repetidos.

1. Procurar o aluno ou abrir a turma.
2. Clicar na inscrição, mensalidade ou item seleccionado.
3. Confirmar valor, data efectiva e forma de pagamento no modal.
4. Guardar, emitir recibo e regressar à mesma célula.

Aluno, mês e valor devido vêm preenchidos. No cabeçalho, mostrar aluno, número, item e ano. Detalhes de descontos, multas e distribuição aparecem quando relevantes; revelar opções adicionais progressivamente. Não trocar o modal por um formulário lateral ou no fim da página.

Na distribuição, manter o item escolhido. Permitir acrescentar explicitamente outras cobranças da mesma pessoa e sugerir as vencidas mais antigas, sem substituir silenciosamente a selecção. Dentro de cada cobrança, aplicar primeiro ao principal e depois à multa. Mostrar parcelas e saldo antes de guardar.

Receber menos mantém o saldo claro. Receber mais produz crédito identificado, salvo selecção explícita de outro item. Receber só como crédito exige confirmar esse destino. Nunca distribuir entre alunos diferentes.

Data efectiva é obrigatória e não pode estar no futuro da data de referência. Guardar o instante de registo separadamente. Data substitui Referência como campo principal, sem perder referências históricas ou opcionais de comprovativos.

Desactivar a submissão enquanto confirma e reutilizar o ID na repetição da mesma tentativa. Confirmar só depois da transacção persistida, com pagamento, aplicações, crédito, recibo e histórico. Se a resposta for incerta, consultar o mesmo ID antes de reenviar. Falha mantém rascunho; não apresentar sucesso nem pedir novo pagamento.

<!-- page -->

## 12. Comprovativos e crédito

| Conceito | Tratamento |
| --- | --- |
| Cobrança | Obrigação ligada à matrícula, item, período e regra. |
| Comprovativo | Evidência Em análise ou conferida; sozinho não liquida dívida. |
| Pagamento confirmado | Valor, forma, aluno, data efectiva, instante de registo, autor e ID estável. |
| Aplicação | Distribuição do recebido por principal, multas, inscrição, mensalidades e extras. |
| Crédito | Parte recebida ainda disponível, associada à pessoa mesmo após mudança de ano. |

Numerário pode ser confirmado imediatamente. Para depósito, transferência ou carteira móvel, oferecer Guardar para conferência e Confirmar após conferência. O item Em análise mantém o saldo, mas suspende a geração de lembretes desse item. Mostrar destinatário, período e valor nas prévias de mensagens; oferecer Copiar mensagem, sem afirmar envio.

A conferência compara referência, data e valor. Guardar evidência, decisão, funcionário e instante. Nomes como M-Pesa ou e-Mola na lista são formas de registo, não integração com operadores. O LSS regista recebimentos; este escopo não executa transferências bancárias nem débitos automáticos.

Aplicar crédito a outra cobrança exige selecção visível e cria aplicações, sem novo recebimento. Crédito nunca fica negativo. Aplicações entre anos mostram a origem e o destino; um pagamento repartido não aparece integralmente em ambos os anos.

Em demo, metadados e consulta de um comprovativo de exemplo são obrigatórios; anexos binários são opcionais. Se guardados localmente, usar IndexedDB com limite e prévia, sem base64 volumoso no snapshot. No sistema central, anexos usados devem ficar em armazenamento privado, com acesso autorizado, limite e consulta estável. Exportação explica se inclui metadados, ficheiros ou ambos.

<!-- page -->

## 13. Recibos, correcções e devoluções

Emitir recibo após confirmação, uma única vez. A série usa instituição, ano local de emissão e sequência, com unicidade garantida na base central. Na demo, usar por exemplo DEMO-2026-000001 e a marca Demonstração - sem valor comprovativo.

Guardar um snapshot com escola, aluno, itens e respectivos anos, valores, multas, crédito, forma, data efectiva, instante de emissão e funcionário. A reimpressão conserva número e valores. Disponibilizar visualização, impressão limpa e PDF, pelo navegador ou geração directa existente. O documento inclui apenas conteúdo do recibo, sem navegação.

| Operação | Efeito obrigatório |
| --- | --- |
| Corrigir contacto/dados | Guardar anterior, novo valor, autor e instante; pedir motivo quando material. |
| Corrigir pagamento | Estornar logicamente o incorrecto e criar o substituto ligado; rever distribuição, multas e recibo. |
| Anular cobrança | Ajustamento com motivo; mostrar crédito resultante se houver pagamento. |
| Devolver dinheiro | Registo distinto com valor, forma, data, motivo e origem; não exceder o crédito disponível. |
| Alterar período fechado | Preservar fecho e retrato originais; mostrar ajustamento posterior ligado à origem. |

Antes de guardar, mostrar dívida reaberta, crédito criado, documento anulado e efeito no caixa. Corrigir e Registar devolução são acções distintas; não editar saldos directamente nem apagar o original.

Pagamento, aplicações, crédito, recibo e histórico são consistentes numa transacção. Falha de impressão repete apenas a impressão. Corrigir o aluno de um recebimento não cria uma segunda entrada física de dinheiro.

Recibo interno de produção e recibo de demonstração são identificados correctamente. Não atribuir validade fiscal à demo nem declarar uma homologação que não tenha sido definida e verificada.

<!-- page -->

## 14. Shell, desktop e navegação

| Largura / modo | Comportamento |
| --- | --- |
| Desktop, 1 200 px ou mais | Sidebar de 256 px com nomes e ícones; Recolher reduz a 64 px e liberta 192 px para conteúdo. |
| Tablet, 768 a 1 199 px | Barra compacta por defeito; expansão sobreposta quando o espaço não permite dividir a largura. |
| Mobile, menos de 768 px | Menu escondido; Drawer sobreposto de até 288 px, deixando pelo menos 48 px livres do viewport. |
| Expandir tabela | Ocultar temporariamente navegação e resumos secundários; manter contexto e Sair da vista expandida. Restaurar layout anterior. |

Usar coluna variável de navegação e conteúdo `minmax(0, 1fr)`. Retirar limite global de 90rem da planilha e margens excessivas. Limites de leitura ficam em formulários/textos, com margens laterais adaptadas de 16 a 24 px.

Topo compacto: cerca de 64 px no desktop e 56 px no mobile, com menu, título, ano e conta. Classe/turma e período ficam junto à tabela. Não repetir cartão do perfil, mensalidade global, indicadores ou atalhos em vários blocos.

Guardar preferência expandida/recolhida do desktop, sem restaurar um Drawer móvel aberto após recarregamento. Mudança de largura e vista expandida conservam filtros, selecção, scroll e rascunhos; o modo temporário não altera a preferência permanente.

No Drawer, escurecer/inactivar o fundo, impedir scroll externo, conter foco e fechar por destino, toque fora, Escape e botão Fechar. Devolver foco à abertura. Ícones compactos têm nome acessível e tooltip ao rato e ao teclado.

Estilo sóbrio: fundo claro, superfícies brancas, cor institucional nas acções, texto nos estados e sombras apenas quando úteis. Os desenhos desktop do PDF v2 continuam referências de composição, subordinados a estas regras.

<!-- page -->

## 15. Mobile, modal e acessibilidade

A primeira vista móvel mostra alunos e tarefas, com lista compacta no mês corrente elegível. A navegação só ocupa espaço quando aberta. Oferecer Ver planilha completa para consulta anual.

O modal de pagamento usa largura orientativa de 640 px no desktop e quase todo o ecrã ou ecrã integral no mobile. Cabeçalho com aluno/número e item/ano; campos principais valor recebido, data efectiva e forma. Comprovativo e detalhes adicionais são acessíveis sem dominar o percurso.

Mostrar distribuição, desconto, multa explicada, saldo final e crédito antes de confirmar. Manter Confirmar e emitir recibo num rodapé alcançável; o conteúdo interno pode rolar. O teclado virtual não tapa o campo activo nem impede chegar à confirmação. Se exigir conferência, a acção é Guardar comprovativo e o estado continua Em análise.

Garantir rótulos, erros junto aos campos, contraste, foco visível, teclado, Escape e regresso do foco. Dialog e Drawer contêm foco e tornam o fundo inactivo. Cores têm texto correspondente; acções não dependem apenas de hover. Alvos de toque têm pelo menos 44 x 44 px como objectivo de usabilidade.

Preservar zoom, movimento reduzido e scroll interno da planilha. Não acrescentar atrasos artificiais para imitar servidor; pedidos reais indicam espera e conservam os dados preenchidos.

Verificar 320, 360, 390, 768, 1 024, 1 280, 1 440 e 1 920 px. Sem overflow horizontal do documento; scroll lateral só no contentor da tabela quando necessário. Os desenhos mobile do PDF v2 continuam referência para lista, menu e pagamento, sem exigir que os valores ilustrativos sejam preços reais.

<!-- page -->

## 16. Planilha, períodos, filtros e estados

Colunas: número, aluno, inscrição, mensalidades do período, Provas, observações resumidas e saldo. Permitir escolher colunas e extras. Ocultar classe/turma quando comuns ao filtro. Contactos e notas longas ficam na ficha/detalhe; caixas de selecção surgem no modo de lote.

Oferecer Mês, Trimestre e Ano. Mês é o mês real; a contagem da mensalidade segue cada matrícula. Com início comum, cabeçalho pode mostrar Março (1.ª mensalidade); com inícios diferentes, cada célula/detalhe mostra a respectiva contagem.

| Estado | Critério |
| --- | --- |
| Não aplicável | Fora do calendário individual; não é dívida. |
| Previsto | Elegível, mas ainda não emitido; separado de A vencer. |
| Bolseiro / Isento | Devido zero por benefício integral; discriminar o dispensado. |
| Multa por pagar | Principal liquidado e multa em aberto; mostrar o saldo. |
| Pago / Pago com multa | Principal e multas liquidados; Com multa só se multa foi efectivamente paga. |
| Parcial | Aplicação positiva e saldo; acrescentar Vencido quando ultrapassou o prazo. |
| A vencer / Em atraso | Sem liquidação parcial; comparar prazo e saldo, com apresentação distinta. |
| Em análise | Marcador adicional de comprovativo; não substitui saldo nem significa Pago. |

Prioridade: elegibilidade/emissão, isenção, principal zero com multa em aberto, quitação, parcial e vencimento. Em análise é sempre adicional.

Pesquisa por nome, número e contacto; filtros de ano, classe, turma, estado e período. Cabeçalho e identificação essenciais permanecem visíveis ao rolar. Não impor 1 720 px a todas as vistas. Cada célula interactiva identifica aluno, mês/item, estado e valor de forma acessível.

<!-- page -->

## 17. Percursos, contexto e linguagem

| Tarefa | Percurso |
| --- | --- |
| Matricular | Alunos e turmas > Nova matrícula > três passos > Guardar ou Guardar e pagar. |
| Receber um mês | Pesquisa/turma > célula > prévia no modal > confirmar > recibo > mesma célula. |
| Receber sem escolher turma | Registar pagamento > pesquisa geral > aluno > itens em aberto > confirmação. |
| Consultar dívida | Indicador > lista com os mesmos filtros > aluno > cobranças e histórico que explicam o total. |
| Corrigir erro | Histórico > lançamento > Corrigir > efeito e motivo > confirmar > original e substituto ligados. |

Usar rotas reais do Next.js e parâmetros para IDs, ano, turma e período. Voltar, recarregar e abrir ligação recuperam contexto. Pesquisa textual com dados pessoais fica na sessão local; não incluir contactos, documentos ou segredos no URL.

Guardar/restaurar posição da planilha ao abrir detalhes. Não perder filtros, aluno, mês, selecção ou rascunho ao fechar recibo, mudar largura ou regressar da ficha.

Carregamento inicial tem estrutura estável. Durante gravação, desactivar apenas a submissão em curso. Listas vazias distinguem ausência de registos, filtros sem resultados e configuração em falta, com a acção correspondente.

Mostrar erro útil junto ao campo/acção, sem aparência de sucesso. Fechar com alterações por guardar exige aviso; navegação e leitura simples não pedem confirmações repetidas. Evitar modais empilhados.

Textos preferidos: Escolha uma turma; A turma atingiu a capacidade; Pagamento registado; Os dados foram actualizados. Reveja a distribuição; Comprovativo guardado para conferência. Não expor códigos, nomes internos e detalhes de implementação ao funcionário.

<!-- page -->

## 18. Painéis, relatórios e exportações

| Indicador | Definição obrigatória |
| --- | --- |
| Recebimentos no período | Confirmados pela data efectiva, líquidos de estornos lógicos de erro. Mostrar devoluções separadas e líquido após devoluções. |
| Liquidado por competência | Aplicações às cobranças dos meses/anos escolhidos, independentemente da data do recebimento. |
| Dívida vencida | Principal e multas exigíveis com prazo passado; excluir previsão, isenção e A vencer. |
| A vencer / Previsto | Separar obrigação emitida no prazo de projecção ainda não emitida; nenhuma é recebido. |
| Bolsas e descontos | Valor dispensado por benefício/período; não somar a dinheiro recebido. |
| Crédito disponível | Recebido ainda não aplicado/devolvido, por aluno. Utilizar crédito não cria receita nova. |
| Matrículas e ocupação | Contar matrículas confirmadas nos estados definidos, excluindo rascunhos/canceladas; mostrar vagas. |

Secretaria começa com pesquisa, matrícula/pagamento rápidos, comprovativos por conferir e pendências do dia. Director acompanha recebimentos, dívida, matrículas, ocupação, evolução mensal e histórico, sempre com acesso ao detalhe permitido.

Começar no mês corrente, permitindo alterar período. Não chamar Receita do mês à soma anual. Cada total abre a lista que o compõe, com os mesmos filtros e definições.

Filtros de datas, ano, turma, forma de pagamento e funcionário conforme o relatório. Caixa geral segue datas de movimentos; distribuição por ano lectivo segue aplicações. Divisão de um pagamento entre anos não duplica o valor recebido.

CSV usa exactamente os filtros da lista. Impressão/PDF têm definições, período, instante e identificação do ambiente demonstrativo quando aplicável. Totais, ficha, planilha, modal e recibo partilham as mesmas regras e selecção de dados.

<!-- page -->

## 19. Caixa diário, conferência e mensagens

Implementar fecho diário por funcionário, com detalhe por forma de pagamento. Separar numerário físico de banco/carteiras. Cada movimento de dinheiro representado tem origem e sessão responsável; relatórios podem agregar sessões/funcionários por dia.

**Saldo esperado em numerário = abertura + entradas em numerário - devoluções e saídas em numerário.** Guardar contagem indicada, diferença, justificação, autor e instante de fecho. Transferência bancária ou carteira não aumenta o numerário contado.

Começar com um único posto de caixa e uma sessão activa de cada vez; sessões identificam o funcionário e o período. Isso permite fecho diário por responsável sem criar uma estrutura de contabilidade completa. Se futuramente houver vários postos simultâneos, a unicidade e o fecho serão definidos por posto/sessão.

Saídas simples têm categoria, forma e motivo; documento de apoio é opcional. Devolução identifica crédito/origem e limita o montante disponível. Conferência de transferências compara referência, data e valor; evidência pendente não entra como recebimento confirmado.

Fechar conserva um retrato dos movimentos e totais. Correcções posteriores aparecem como ajustamentos ligados à origem. Corrigir aluno, competência ou data de um pagamento não representa uma segunda entrada física. Divergência deve ser explicada pela lista de movimentos, sem alterar o fecho silenciosamente.

Mensagens são prévias copiáveis, com destinatário, período e valor. Não integrar WhatsApp, SMS ou e-mail de cobrança nesta primeira entrega e não afirmar que algo foi enviado. Recuperação de acesso, se usar um canal de autenticação, é uma função técnica distinta e não autoriza envios de cobrança.

<!-- page -->

## 20. Arquitectura e componentes

Manter Next.js, React, TypeScript e Tailwind; usar MUI para componentes e tema. Inspeccionar versões e lockfile antes de alterar dependências. Seguir a documentação instalada e a integração MUI adequada ao App Router, incluindo a ordem de camadas se Tailwind 4 estiver presente. Não actualizar versões principais apenas para copiar exemplos.

| Camada | Responsabilidade |
| --- | --- |
| Páginas e componentes | Interface, acessibilidade, rascunhos, estados e apresentação das prévias. |
| Domínio | Benefícios, calendário, multas, saldos, distribuição e invariantes com Clock injectável. |
| Serviços de aplicação | Autorizar e validar comandos; matrícula, emissão, pagamento, correcção, crédito e fecho. |
| Repositório central | PostgreSQL, migrações, restrições, transacções e leitura consistente. |
| Adaptador local | Compatibilidade da demo, snapshots, importação/exportação e recuperação, usando o mesmo domínio quando aplicável. |
| Relatórios | Listas, totais, filtros e exportações derivados dos mesmos movimentos. |

Separar shell, académico, alunos, financeiro, relatórios e ferramentas. Reutilizar `app/features/finance/domain` antes de criar tipos equivalentes. Conceitos a preservar: Student/Guardian, Enrollment/Placement, AcademicYear/Group/Room, RuleVersion/FinancialAid, Charge/Penalty/Adjustment, Payment/Allocation/Credit, Receipt/Refund, CashSession e AuditEvent.

Navegação: Drawer, AppBar, List e Tooltip. Pagamento: Dialog, DialogTitle, DialogContent e DialogActions. Formulários: TextField, Select, Autocomplete e Stepper quando útil. Feedback: Chip, Alert e Snackbar. Planilha: Table/TableContainer gratuitos; não depender de Data Grid Pro/Premium ou licença de avaliação.

Concentrar estilo interno no tema MUI e layout no mecanismo existente, evitando disputa das mesmas propriedades com Tailwind. A arquitectura deve permitir demo e base central sem reescrever os cálculos.

<!-- page -->

## 21. Servidor, transacções e integridade

O servidor valida identidade, papel, instituição, campos e relações antes de qualquer operação. O cliente não decide valores financeiros definitivos nem autoriza o próprio papel. Usar Server Actions e/ou handlers conforme a base instalada, sem duplicar regras.

Confirmar pagamento numa transacção: ler estado actual, verificar comando, recalcular prévia, validar montantes, criar recebimento/aplicações/crédito, atribuir recibo e registar histórico. Se algo falhar, nenhum desses efeitos parciais fica confirmado.

Cada comando tem ID estável e conteúdo identificado. Repetir o mesmo ID/conteúdo recupera o resultado original, inclusive após perda da resposta. Mesmo ID com conteúdo diferente é rejeitado. Restrições na base garantem unicidade de cobranças, etapas, recibos, número de pauta e operações. Tratar disputa pela última vaga, aplicação de crédito e confirmação simultânea com transacção e controlo adequado.

**Invariantes:** dinheiro em decimal/cêntimos exactos; aplicações não ultrapassam recebido ou dívida; crédito não negativo; benefício não é recebimento; IDs e relações imutáveis; recibo reimpresso não muda. Datas efectivas seguem a escola; registo/auditoria têm instante do servidor e funcionário autenticado.

Uma prévia obsoleta exige revisão da distribuição. Não aceitar valores antigos porque o formulário permaneceu aberto. O erro explica que os dados mudaram e conserva o preenchimento.

Proteger credenciais e sessões; limitar tentativas de login, validar ficheiros e acessos a exportações/anexos, impedir leituras/escritas entre âmbitos não autorizados. Configurar segredos por ambiente, nunca no repositório ou no browser. Manter registo de alterações sem expor segredos e sem permitir apagar o histórico financeiro pela interface.

<!-- page -->

## 22. Continuidade, rascunhos e backups

Quando a internet ou a gravação falhar, conservar o formulário e mostrar o estado pendente. Um rascunho não é pagamento confirmado. Ao recuperar ligação, rever o estado do comando e a distribuição antes de concluir; não reenviar automaticamente com outro ID.

O utilizador pode retomar um rascunho, mas a confirmação exige acção explícita. Diferenciar pendente de envio, confirmação conhecida e resultado ainda incerto. No último caso, consultar o servidor pelo ID original para evitar duplicação.

Os dados centrais ficam disponíveis ao voltar a entrar e em computadores autorizados. Preferências e rascunhos podem ficar no dispositivo, com minimização de dados e limpeza adequada ao sair. Não prometer PWA, arranque offline completo ou operações financeiras confirmadas sem servidor.

Implementar cópias de segurança automáticas e documentar frequência, retenção, acesso e restauro antes do piloto com dados reais. Definir os parâmetros operacionais com o responsável; não inventar uma política de retenção definitiva. Executar um ensaio de restauro numa base isolada e registar o resultado. Exportar JSON manualmente não substitui backup de produção.

Na demo, carregar e validar antes de activar escrita. Se o armazenamento estiver bloqueado, cheio, ilegível ou com versão desconhecida, preservar o original e mostrar erro; não semear de novo nem apagar para prosseguir. Gravar um próximo snapshot completo antes de mostrar sucesso. O mesmo vale para falha na importação.

Comparar `revision` detecta alteração já ocorrida noutra aba local. Isso não garante escrita simultânea; a demo assume uma aba de escrita por vez. O sistema central, por sua vez, tem de tratar concorrência no servidor.

<!-- page -->

## 23. Exemplos, exportação e transição dos dados

| Operação | Requisito |
| --- | --- |
| Primeiro arranque | Se não houver dados reconhecidos, oferecer escola de exemplo ou configuração vazia; nunca sobrepor dados existentes. |
| Exemplos | Duas contas fictícias, pelo menos dois níveis/preços, várias turmas/meses, ano activo e próximo em preparação. |
| Exportação demo | Snapshot completo, versão, data, revisão, entidades/relações e metadados; filtros de relatório ficam separados. |
| Importação demo | Validar versão, estrutura, IDs, relações e saldos; mostrar resumo e confirmar substituição, sem fusão automática. |
| Reposição demo | Explicar a substituição, oferecer exportação e pedir confirmação; nunca executar ao recarregar. |
| Transição para base central | Preservar original, mapear campos conhecidos, ensaiar importação, comparar contagens/saldos e preparar reversão antes de activar. |

Preservar IDs, versões de multas, benefícios, recibos e datas disponíveis. Campo ausente fica identificado como indisponível; conversão ambígua conserva o original e assinala pendência. Não preencher história por adivinhação.

Guardar data-base dos exemplos e relógio fixo dos testes. Recarregar ou trocar conta não semeia novamente nem altera o cenário por acaso. Importar duas vezes o mesmo snapshot por substituição mantém contagens/saldos; não anexar cópias.

Cenários: inscrição pendente, pagamento completo/parcial, atraso, multa simples, segunda etapa opcional, bolsa integral/parcial, isenção, crédito, prova tardia, entrada durante o ano, transferência e dívida anterior.

Medir pesquisa e planilha com 100 a 300 alunos sintéticos. Evitar recalcular a escola a cada tecla; paginar quando necessário e virtualizar apenas após medição. Rever mobile e impressão. Manter cenários fictícios separados dos dados do piloto; importação não prova autenticidade de dados externos.

<!-- page -->

## 24. Execução: fases 0 a 3

As fases são sequenciais e têm resultado verificável. A numeração mantém continuidade com o PDF v2, mas o âmbito foi actualizado para esta v3. Conservar o diagnóstico anterior e rever apenas os pontos alterados.

**Fase 0 - Confirmar base e rever o plano.** Ler `AGENTS.md`, documentação local e esta especificação. Confirmar branch, alterações existentes, dependências e testes. Mapear código útil, dados locais, domínio e acessos. Registar diferenças entre o estado actual e os requisitos, incluindo a infraestrutura agora incluída.

Aceitação: diagnóstico curto com base real, componentes, persistência, limitações e plano. Usar o commit histórico apenas como referência, sem repor código antigo ou apagar trabalho do utilizador.

**Fase 1 - Dados e serviços locais fiáveis.** Preservar a demo e organizar o domínio, os comandos e o adaptador local. Implementar validação, revisão do cenário, IDs de comando, invariantes e histórico. Manter snapshots versionados, leitura segura, exemplos reproduzíveis, exportação/importação, recuperação e reposição confirmada. A base real e os serviços centrais serão feitos separadamente na API dedicada, por decisão posterior do utilizador.

Aceitação actual: falha local não confirma nem deixa operação parcial; repetição do comando não duplica; dados antigos preservados; exportar/importar reproduz contagens/saldos. Não exigir nem criar base central para concluir esta fase local. A aceitação de servidor fica registada para a API posterior.

**Fase 2 - Entrada, MUI e navegação.** Preparar a entrada única e a separação da demo para integração posterior com a API. Implementar shell, cinco áreas, sidebar 256/64, drawer, vista expandida e componentes comuns. Contas, sessões, recuperação e autorização reais dependem da API dedicada; não simular essa segurança como concluída.

Aceitação: conta abre painel correcto, Director não escreve mesmo por pedido directo; menu liberta largura; teclado/foco/fecho funcionam; contexto e preferência recuperáveis.

**Fase 3 - Alunos e estrutura.** Configuração guiada, anos, níveis, classes, salas, turmas, vagas e conflitos; ficha, matrícula em três passos, duplicados, números, renovação, transferência e saída.

Aceitação: pessoa não duplicada, vaga validada no servidor, Guardar permite pagar depois, Guardar e pagar abre a inscrição correcta, histórico preservado.

<!-- page -->

## 25. Execução: fases 4 a 7

**Fase 4 - Regras e cobranças.** Implementar valores/vigências, calendário individual, emissão automática, benefícios, precisão decimal, multas simples e segunda etapa opcional, mantendo versões antigas. Tratar datas efectivas e ajustes por prova tardia.

Aceitação: bolsa integral cobre inscrição/mensalidades; entradas respeitam mês inicial; sincronização não duplica; novo preço não reescreve cobranças; cálculos F01-F08, F14 e F17 correctos.

**Fase 5 - Atendimento, crédito e recibos.** Completar planilha adaptável, filtros, Mês/Trimestre/Ano e pagamento no Dialog. Parciais, antecipação, comprovativos, conferência, crédito, correcção, devolução e recibos actualizam ficha, planilha e histórico.

Aceitação: célula > confirmar > recibo > mesma célula; sem formulário permanente; duplicação/repetição protegidas; falha conserva rascunho; impressão limpa e reimpressão estável; crédito não gera recebimento novo.

**Fase 6 - Relatórios, caixa e continuidade.** Painéis por papel, totais com listas, filtros, CSV/PDF, conferência, caixa diário por funcionário/forma, diferenças, saídas, devoluções e fechos. Prévia/cópia de mensagens, backups configurados e ensaio de restauro.

Aceitação: recebido, liquidado, dívida, benefício e crédito têm definições distintas; exportações explicam os totais; fecho é preservado; backup restaurado e comparado numa base isolada.

**Fase 7 - Validar, apresentar e preparar piloto.** Executar testes de domínio, servidor, permissões, concorrência e uso; rever desktop/mobile; ensaiar casos fictícios; corrigir bloqueios; escrever guias de arranque, apresentação, configuração, recuperação e operação. Iniciar piloto com uma turma e um funcionário da Secretaria depois da revisão do resultado e da configuração do ambiente.

Aceitação: os casos essenciais, parciais, bolsa e prova tardia são atendidos no LSS sem uma planilha paralela para corrigir resultados. Registar observações antes de expandir.

Em cada fase, actualizar no repositório estado, comandos/resultados reais, decisões e pendências. Não marcar operações ou rotas incompletas como concluídas. Credenciais ausentes são dependências concretas a registar, nunca motivo para declarar pronta uma função simulada.

<!-- page -->

## 26. Aceitação financeira: F01 a F09

Automatizar com relógio fixo e dinheiro exacto. Os montantes são exemplos de teste, não preços oficiais.

| ID | Preparação / acção | Resultado obrigatório |
| --- | --- | --- |
| F01 | Base 1 000,10 MT; benefício 15%. | Desconto 150,02; devido 850,08; half-up por parcela. |
| F02 | Inscrição 500 e mensalidade 1 000, ambas cobertas a 100%. | Devido zero; Bolseiro; sem pagamento fictício nem multa. |
| F03 | Base 1 000; benefícios elegíveis de 50% e 20%. | Desconto 500; devido 500; não somar 70%. |
| F04 | Vence dia 10; taxas acumuladas 5% dia 11 e 10% dia 21; sem pagamento. | Incrementos 50 + 50; total 1 100. |
| F05 | Pagamento integral efectivo dia 10 ou dia 11. | Dia 10 sem multa; dia 11 com primeira etapa de 50. |
| F06 | Pago dia 8; registado dia 14; multa 50 já emitida. | Principal liquidado; multa neutralizada por ajustamento, mantendo original e prova. |
| F07 | Base 1 000; pagar 600 dia 9 e 200 dia 15; etapas do F04. | Dia 21: principal 200; multas 20 + 10; saldo 230. |
| F08 | Base 1 000; multa 50; receber 1 000 dia 15 para principal. | Só multa 50 em aberto; segunda etapa não acrescenta multa com principal zero. |
| F09 | Receber 1 200 para cobrança 1 000, sem seleccionar outro item. | Aplicação 1 000; crédito 200; não liquidar outro mês automaticamente. |

Ficha, planilha, modal, recibo e relatórios devem concordar com os mesmos cálculos. Confirmar não se limita a mostrar uma mensagem: o movimento, o saldo e o histórico têm de ficar persistidos.

Nos casos de datas, testar limites no fuso da escola, incluindo o primeiro dia da multa e o pagamento apresentado posteriormente. A nova regra não altera saldos de snapshots legados.

<!-- page -->

## 27. Aceitação financeira: F10 a F17

| ID | Preparação / acção | Resultado obrigatório |
| --- | --- | --- |
| F10 | Aplicar crédito 200 do F09 à próxima cobrança de 1 000. | Saldo 800; crédito zero; nenhum novo recebimento. |
| F11 | Cobrança de 1 000 já paga; benefício retroactivo de 50%. | Ajustamento 500 e crédito 500; recebimento e recibo originais preservados. |
| F12 | Crédito 200; tentar devolver 250 e depois 150. | 250 rejeitado; 150 deixa crédito 50, com relação à origem. |
| F13 | Seleccionar uma mensalidade futura Prevista e pagar. | Emissão e liquidação numa transacção; sincronização posterior não duplica. |
| F14 | Alterar preço futuro de 1 000 para 1 200 com nova vigência. | Emitidas conservam snapshot; novas elegíveis usam 1 200; recibos preservados. |
| F15 | Corrigir aluno de recebimento confirmado de 1 000. | Original estornado logicamente e substituto ligado; caixa tem uma entrada física de 1 000. |
| F16 | Receber em Março 300 de dívida antiga e 700 do ano actual. | Recebimento de Março 1 000; aplicações 300 no ano antigo e 700 no actual. |
| F17 | Nova regra 5% uma vez, segunda etapa desligada; 60 dias sem pagar. | Uma multa 50; total 1 050; reabrir/sincronizar não aumenta. |

Cobrir extras não abrangidos por bolsa, vencimento no último dia do mês, intervalos de multa que cruzam o mês e viragem do ano. Repetições não duplicam cobranças, etapas, recibos ou aplicações.

Testar descontos com cêntimos, zero legítimo e configuração ausente, datas inválidas, valores negativos e tentativa de aplicar mais que o recebido/devido. Crédito aplicado e devolvido nunca fica negativo.

Snapshots históricos são comparados com o algoritmo legado. A migração preserva valores, versões e a origem do que não puder ser automaticamente interpretado.

<!-- page -->

## 28. Aceitação de uso e persistência

| ID | Cenário / resultado obrigatório |
| --- | --- |
| U01 | Sidebar 256/64: conteúdo ganha 192 px onde houver espaço; filtros e posição mantidos. |
| U02 | Larguras 320/360/390/768/1024/1280/1440/1920: sem overflow da página; scroll lateral contido na tabela. |
| U03 | Drawer: foco contido, fundo inactivo, Escape/destino/fora fecham; devolve foco e preserva preferência desktop. |
| U04 | Filtrar, rolar, abrir célula, pagar e fechar recibo: mesmo aluno/mês, filtros, scroll e selecção. |
| U05 | Mês/Trimestre/Ano, ficha, Voltar e recarregar: contexto recuperado e números estáveis. |
| U06 | Mobile, teclado virtual, zoom e vista expandida: campos e confirmação alcançáveis; sair restaura layout. |
| U07 | Bolsa integral e principal pago com multa pendente: condição/saldo coerentes em ficha, matrícula e planilha. |
| U08 | Imprimir/reimprimir recibo: sem menu, mesmos valores/número e marca de demo quando aplicável. |
| U09 | Matrícula inválida e depois Guardar e pagar: erro no campo, dados mantidos e inscrição do aluno correcto. |
| A01 | Director tenta escrita pela UI, rota ou serviço: negada no servidor, sem alterar dados; teste local adicional na demo. |
| A02 | Sair/trocar conta conserva dados; conta real abre o papel atribuído sem escolha manual. |
| I01 | Duplo clique/mesmo ID: um pagamento, conjunto de aplicações e recibo; conteúdo diferente com ID igual rejeitado. |
| I02 | Outra aba/posto altera antes de confirmar: detectar conflito e rever, sem aplicar prévia obsoleta. |
| I03 | Repetir sincronização/emissão/recarregamento: nenhum item/etapa extra ou reposição dos exemplos. |
| M01 | Renovar, transferir e entrar durante o ano: pessoa única, histórico anual, números e meses correctos. |
| M02 | Exportar/importar duas vezes: contagens/saldos iguais; JSON/versão/IDs/relações inválidos não substituem estado. |
| M03 | Recarregar, falha de gravação e reposição cancelada: original e rascunho mantidos, sem sucesso falso. |
| R01 | Abrir total, filtrar, exportar e aplicar crédito: lista explica total, filtros respeitados e recebido sem duplicação. |

Complementar automação com ensaio de atendimento. Não declarar teclado virtual, restauro, impressão ou mobile verificados se apenas foram inspeccionados no código.

<!-- page -->

## 29. Aceitação de servidor e produção

Estes critérios são adicionados pela proposta posterior e não estavam cobertos pelos testes locais da v2.

| ID | Resultado obrigatório |
| --- | --- |
| P01 - Login | Contas distintas entram pelo mesmo formulário; papel/painel vêm do servidor; desactivação e saída impedem acesso. |
| P02 - Permissões | Pedidos directos de escrita como Director e tentativas de alterar papel/âmbito são recusados; consultas respeitam acesso. |
| P03 - Atomicidade | Falha induzida em qualquer etapa de confirmação não deixa pagamento, aplicação, crédito ou recibo parcial. |
| P04 - Resposta perdida | Pagamento confirmado sem resposta ao cliente é recuperado pelo mesmo ID; não há novo recebimento ao tentar de novo. |
| P05 - Concorrência | Dois pedidos disputando última vaga, crédito ou mesma cobrança respeitam os limites e as restrições únicas. |
| P06 - Continuidade | Dados persistem após nova sessão/dispositivo autorizado; rascunho offline é distinto de confirmação no servidor. |
| P07 - Backup/restauro | Backup automático configurado; restauro isolado recupera contagens, relações, saldos e recibos; evidência registada. |
| P08 - Migração | Ensaio preserva original, IDs/versões e reconciliação; ambiguidades impedem activação automática dos dados afectados. |
| P09 - Caixa | Fecho por funcionário/forma explica movimentos; banco não aumenta numerário; correcção posterior preserva retrato. |
| P10 - Publicação | Preview e produção usam configuração/segredos próprios; build/checks passam e percursos são verificados na Vercel. |
| P11 - Recuperação de acesso | Fluxo escolhido funciona sem expor credenciais e não permite elevar papel; limita tentativas e invalida acessos conforme política. |
| P12 - Piloto | Uma turma e um funcionário completam atendimento, parcial, bolsa e prova tardia sem planilha paralela para corrigir o sistema. |

Os 29 testes encontrados na base de Setembro não substituem esta matriz. Acrescentar testes significativos conforme cada fase, mantendo os financeiros úteis e relatando resultados reais.

<!-- page -->

## 30. Marcos, piloto, main e Vercel

| Marco | O que permite afirmar |
| --- | --- |
| Especificação revista | Requisitos e conflitos resolvidos; não significa código implementado. |
| Apresentação com dados fictícios | Percursos demonstráveis e valores coerentes no ambiente identificado; não significa autenticação/base reais prontas. |
| Pronto para piloto | Contas, servidor, base central, operações, backups, recuperação e critérios aplicáveis verificados. |
| Produção | Configuração e operação do ambiente final verificadas; limitações e responsabilidades documentadas. |

Desenvolver numa branch de trabalho, preservando alterações do utilizador. Manter commits revistos, registo de fases e testes; abrir PR quando a implementação estiver concreta. Não integrar em `main` apenas porque compila ou porque um documento declara conclusão.

Depois da revisão do resultado, integrar em `main` e acompanhar o deploy ligado à Vercel. Verificar estado da publicação, entrada, autorização, matrícula, pagamento, recibo e relatórios com dados apropriados. Segredos de PostgreSQL/autenticação ficam no ambiente, sem aparecer em commits, URLs ou screenshots.

Publicar a aplicação não cria por si só a base, os utilizadores, os backups ou as migrações. Preparar a sequência de migração, configuração, compatibilidade e reversão. Tratar uma necessidade concreta de credencial/acesso quando surgir, sem inventar que foi validada.

O piloto começa com uma turma e um funcionário da Secretaria. Antes de expandir, observar casos reais, incluindo parcial, bolsa e comprovativo tardio. Se precisar de uma planilha paralela para corrigir o sistema, resolver a lacuna antes de ampliar.

Nesta tarefa de revisão, a autorização é para preparar a instrução mesclada. A publicação e a operação com dinheiro/dados reais não são executadas pela simples criação deste documento.

<!-- page -->

## 31. Instrução pronta para o Codex

Implementa o LSS em `biishare/lss` conforme esta especificação mesclada v3.0. Ela substitui a v2; nos conflitos incorpora a proposta posterior do utilizador. O objectivo é um sistema pequeno e fiável de atendimento escolar centrado no aluno, com matrícula, pagamentos, pendências e acompanhamento.

Começa por confirmar Git, `AGENTS.md`, documentação instalada, estado do código e registo de progresso. Preserva o trabalho útil, os dados locais, os IDs e os algoritmos históricos. O diagnóstico de 08/11/2026 é a base de análise; não restaurar o commit antigo citado no PDF.

Segue as fases 0 a 7, com resultado verificável e registo de comandos, testes, decisões e pendências. Faz escolhas técnicas correntes de forma autónoma. Ao retomar, confirma o estado e continua a fase pendente. Não confundir planeado, implementado, demo funcional e produção verificada.

Nesta etapa, implementa os percursos com dados locais fictícios, validação, revisão, IDs estáveis de comando e histórico. Mantém Secretaria operativa e Director de consulta na demo. **Não cries base de dados real, SQL/ORM, endpoints financeiros ou backend neste repositório agora.** Login real com contas individuais, autorização de servidor, base central, transacções e backups serão desenvolvidos depois numa API dedicada. Preserva esse contrato futuro e a separação de camadas, sem afirmar que já está pronto.

Mantém Next.js, React e TypeScript, MUI nos componentes/tema e Tailwind no layout. Entrega cinco áreas, cadastro único, ficha do aluno, matrícula simples, sidebar recolhível, Drawer móvel, planilha com períodos e pagamento concluído no mesmo modal, com recibo e regresso à célula.

Implementa emissão automática, benefícios, multa simples por defeito, segunda etapa opcional, datas efectivas, parciais, crédito, conferência, correcções, devoluções, relatórios detalháveis, CSV/PDF e caixa diário por funcionário/forma. Preserva rascunhos em falha e confirma apenas o que ficou gravado.

Valida F01-F17, U01-U09, A01-A02, I01-I03, M01-M03, R01 e P01-P12. Reutiliza testes existentes, acrescenta cobertura significativa e regista limitações observadas. Escreve guia de arranque, demonstração, operação, backup/restauro e piloto.

Desenvolve e valida numa branch. Depois da revisão, integra em `main` e verifica o resultado na Vercel. Não marcar autenticação, base central ou backups como prontos se forem apenas simulados ou documentados. Adia IA, app nativa, portal dos encarregados, notas e presenças para expansão.

<!-- page -->

## 32. Rastreabilidade da proposta posterior

Cada ponto da última proposta foi incorporado; as alterações de âmbito são explícitas.

| Ponto enviado pelo utilizador | Onde está nesta v3 |
| --- | --- |
| Quatro tarefas e atendimento centrado no aluno | 02, 05, 11 e 17. |
| Login único e painel automático | 03, fases 1/2, P01/P02/P11. |
| Secretaria opera; Director acompanha histórico | 03, 18, A01/A02. |
| Cinco áreas e contas em Configurações | 02 e 03. |
| Eliminar menus e cadastro repetido de classe/sala | 02, 04 e fase 3. |
| Pagamentos abre com pesquisa e planilha | 11, 14 e 16. |
| Sem formulário permanente, indicadores grandes e atalhos repetidos | 11 e 14. |
| Quatro passos de atendimento, campos preenchidos e detalhes progressivos | 11, 15 e 17. |
| Retirar Gerar propinas e automatizar calendário | 07 e 08. |
| Matrícula pode pagar depois; preços por nível/ano e vigência | 06 e 08. |
| Bolsa inclui inscrição; descontos não acumulam; parcial/crédito | 09, 11 e 12. |
| Data efectiva e correcções preservando o original | 10 a 13. |
| Multa simples e segunda etapa desligada; retirar Ponderação vaga | 09 e 10. |
| Ficha única, pessoa permanente e matrícula anual | 05 a 07. |
| Pesquisa, duplicados, vagas e conflitos de sala | 04 a 06. |
| PDF/impressão, fecho diário por funcionário/forma, totais detalháveis | 13, 18 e 19. |
| Dívida separada da situação académica | 05 e 07. |
| Next.js, Tailwind, PostgreSQL e validação no servidor | 20 e 21. |
| Contas, backups, histórico, duplicados e rascunho em falha | 03 e 21 a 23. |
| Adiar IA, app, portal, notas e presenças | 02 e 31. |
| Piloto com turma e funcionário, incluindo parcial/bolsa/prova tardia | 25, 29 e 30. |

<!-- page -->

## 33. Rastreabilidade do PDF v2 e estado actual

| Secções da v2 | Tratamento na v3 |
| --- | --- |
| 01-03: decisões, âmbito e entrada | Mantidas as tarefas/perfis; entrada e infraestrutura substituídas em 01-03. |
| 04-06: estrutura, ficha, matrícula e mudanças | Preservadas e detalhadas em 04-07. |
| 07-11: cobranças, benefícios, multas, pagamentos e recibos | Preservadas em 08-13; integridade central acrescentada em 21. |
| 12-16: layout, desenhos, planilha e percursos | Requisitos e propostas visuais preservados como referência em 14-17; login subordinado a 03. |
| 17: painel, relatórios e caixa | Preservado em 18-19; fecho diário por funcionário/forma acrescentado. |
| 18: produção futura | Revogada a exclusão de login real, PostgreSQL, servidor e backups; agora em 03 e 20-22. Expansões de produto continuam adiadas. |
| 19: MUI e organização técnica | Preservada em 20. |
| 20-22: integridade local, fiabilidade e exemplos | Preservadas para demo em 21-23; exigências centrais e transição acrescentadas. |
| 23-24: fases | Substituídas pelas fases actualizadas em 24-25. |
| 25-26: aceitação financeira e uso | F01-F17 e U/A/I/M/R preservados em 26-28; testes centrais acrescentados em 29. |
| 27: instrução pronta | Substituída pela secção 31. |
| 28: referências e leitura final | Fontes e contexto preservados nesta secção e em 34. |

**Estado verificado no diagnóstico de 08/11/2026:** base `28faa2bd3b7c6a6efeb132d086d0e149a784e385`; Next.js 16.3.0, React 19.2.8, MUI 9.4.0 e Tailwind 4.3.3. Os 29 testes antigos, build e TypeScript passaram; lint tinha dois avisos.

O diagnóstico confirmou diferenças em persistência, pagamento fora do modal e casos F01/F06/F07. Autenticação real, base central e prontidão de produção não foram demonstradas. Estes factos descrevem a base anterior, não a execução desta v3.

O código de aplicação não é alterado pela emissão desta especificação. A fase 1 deve ser retomada com o âmbito actualizado, sem reaproveitar uma marcação histórica de concluída como prova de aceitação.

<!-- page -->

## 34. Fontes e regra de conclusão

**Fontes da mescla**

1. `LSS_Upgrade_Demo_Especificacao_Codex_v2_2026-09-02.pdf`, 30 páginas, versão 2.0 de 02/09/2026, lido integralmente nesta conversa.
2. Proposta posterior enviada pelo utilizador com seis pontos: login único; cinco áreas; pagamento rápido; política financeira; ficha única; aplicação pequena e fiável com PostgreSQL/servidor e piloto.
3. Decisão expressa do utilizador de incluir tudo da proposta posterior e substituir os pontos anteriores em conflito.
4. Diagnóstico do repositório registado em `docs/diagnostico-demo-v2-2026-11-08.md` e histórico de progresso, como evidência do estado inicial.

**Referências técnicas de implementação**

Consultar documentação oficial compatível com as versões instaladas: Next.js App Router, autenticação e validação no servidor; MUI Drawer/Dialog/Table e integração Next.js/Tailwind; PostgreSQL para transacções e restrições; W3C ARIA para foco, teclado e comportamento modal. A divulgação progressiva é o princípio de interface referido na proposta posterior; não é dependência de software.

Este documento define requisitos de produto e engenharia. Configuração operacional concreta, credenciais e evidência de restauro/publicação são registadas durante a implementação, sem presumir que já existem.

**A entrega final está concluída quando:** os percursos académicos/financeiros funcionam de ponta a ponta; todos os valores partilham o mesmo domínio; dados, contas e permissões centrais são reais e testados; duplicações e falhas são tratadas; recibos/exportações e fechos são coerentes; backups foram restaurados em ensaio; desktop/mobile foram revistos; e o piloto demonstrou atendimento sem planilha paralela para corrigir o sistema.

O relatório final deve distinguir o que mudou, testes executados, evidências, limitações e dependências. Uma apresentação local pode ser entregue antes, com o seu marco claramente identificado, mas não encerra os requisitos de produção agora incluídos.

**v3.0 | 08/11/2026 | Instrução mesclada vigente**
