# Guia de operação da demo LSS

## Início rápido

1. Execute `npm ci` e `npm run dev`.
2. Abra `http://localhost:3000`.
3. Entre como **Secretaria** para demonstrar operações ou como **Director**
   para demonstrar consulta em modo de leitura.
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

- **Exportar JSON** descarrega um snapshot v2 com todos os dados locais.
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
