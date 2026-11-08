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
