# Guia de operação da demo LSS

## Início rápido

1. Execute `npm ci` e `npm run dev`.
2. Abra `http://localhost:3000`.
3. Entre como **Secretaria** para preparar/operar a demo. No primeiro arranque,
   escolha **Abrir escola de exemplo** ou **Configurar do início**. O Director
   consulta o mesmo cenário depois de preparado, em modo de leitura.
4. Use **Sair** para trocar de perfil. Os dados locais não são apagados.

## Roteiro sugerido

1. No **Início**, apresente os indicadores e alertas.
2. Em **Alunos e turmas**, seleccione classe/turma e faça uma matrícula fictícia.
3. Em **Pagamentos → Dados de pagamentos**, crie uma política, seleccione as
   classes abrangidas e mostre as cobranças diversas.
4. Na **Planilha financeira**, mostre geração de mensalidades, prévia e recibo.
5. Em **Relatórios**, compare previsto, recebido, descontos e dívida.
6. Em **Configurações**, exporte os dados e mostre o modo só de leitura do
   Director.

## Exportar, importar e repor

As ferramentas ficam em **Configurações** e só aparecem para Secretaria.

- **Exportar JSON** descarrega um snapshot v3 (também aceita exportações v2 e o formato anterior) com todos os dados locais.
- **Importar JSON** valida primeiro o ficheiro e só substitui o estado após
  confirmação. Ficheiros inválidos e versões desconhecidas são recusados.
- **Repor dados fictícios** pede confirmação e remove apenas as alterações da
  demo. Exporte antes se quiser conservar uma cópia.

## Recuperação

Se uma alteração indesejada for feita, importe a exportação mais recente. Se não
houver cópia, reponha os dados fictícios. Não limpe todo o armazenamento do
navegador: outras aplicações e as preferências do utilizador podem partilhar o
mesmo domínio.

## Limitações assumidas

- Dados apenas no navegador e no dispositivo actual.
- Sem utilizadores ou palavras-passe reais.
- Sem servidor, base de dados, concorrência multiutilizador ou cópias remotas.
- Sem validade fiscal, contabilística ou jurídica dos recibos.
- Sem comunicações ou integrações externas.

Esta demo serve para apresentar fluxos e decisões do produto. Não deve receber
dados pessoais reais nem ser tratada como sistema de produção.

## Dados ilegíveis e falha de gravação

O ecrã de recuperação conserva os dados existentes. Descarregue o original e,
como Secretaria, importe uma cópia válida. A importação pede confirmação, recusa
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
