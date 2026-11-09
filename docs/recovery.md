# Cópias, restauro e recuperação

Nesta etapa os dados e as cópias automáticas ficam no dispositivo. Descarregue
uma cópia para a conservar fora dele. Não são backups remotos da futura API.
Os comprovativos incluem metadados, não anexos binários.

## Rotina da Secretaria

1. Abra Relatórios → Cópias de segurança.
2. Confirme cópias activas, última cópia e limite. O padrão inicial é 3; pode
   configurar de 1 a 10. O limite é local, não uma política definitiva da escola.
3. Use Descarregar cópia actual antes de apresentações, alterações importantes
   ou recuperação. Guarde o ficheiro com data e identificação do cenário.
4. Use Verificar restauro numa cópia guardada e confira o resultado do ensaio.
5. Conserve o resultado e registe quem verificou e quando.

A operação financeira é gravada antes da cópia automática. Um aviso de cópia
falhada não significa que o pagamento falhou: consulte o recibo/histórico e
não registe outro recebimento. Se a operação não foi gravada, o preenchimento
fica disponível e não há recibo confirmado de uma operação inexistente.

## Restaurar uma cópia

Escolha Restaurar ficheiro ou Repor esta cópia. O sistema valida versão,
estrutura, IDs, relações, saldos e documentos, abre a cópia num repositório
isolado e compara o resultado. O ensaio não substitui os dados em utilização.

Reveja as contagens e valores de Actual e Restaurado e conferido. Se não forem
os esperados, feche a prévia. Não há fusão automática. Uma cópia antiga pode
retirar operações posteriores à data dessa cópia.

Antes de Confirmar substituição, pode descarregar o estado anterior. A
confirmação preserva uma cópia desse estado, separada do limite automático,
e substitui o conjunto. Se outra aba tiver mudado os dados, a prévia é recusada:
actualize e reveja. Falha em preservar o estado anterior impede o restauro.

Após concluir, confira pessoas/matrículas, recebimentos/crédito, recibos e
fechos. Reimprimir um recibo deve conservar número e montantes. Repetir uma
importação por substituição não anexa duplicados.

## Dados ou arquivo de cópias ilegíveis

O sistema conserva o original e apresenta um erro. Não limpar todo o browser,
não repor exemplos para ultrapassar o erro e não editar JSON financeiro à mão.
Se o arquivo de cópias estiver ilegível mas os dados actuais abrirem, descarregue
a cópia actual. A falha do arquivo não confirma nem altera movimentos.

Para dados principais ilegíveis, o responsável técnico pode activar as
ferramentas internas, descarregar o original e importar uma cópia válida.
Conserve o original separado mesmo depois de recuperar. O Director não
restaura nem repõe dados.

## Antes de um piloto real

Definir na API a frequência e retenção remotas, responsável, controlo de acesso,
local da cópia e sequência de reversão. Ensaiar restauro numa base central
isolada e comparar contagens, relações, saldos e recibos. Estes parâmetros têm
de ser aprovados pelo responsável; o limite de 3 cópias locais não os define.
