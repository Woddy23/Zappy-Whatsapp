**WhatsApp na ficha Zappy — piloto 0.1.0**

Esta pasta contém a extensão pronta a instalar e o código-fonte. Não precisa de Node, npm, servidor, conta nova ou chave de API para instalar.

**Instalar no Brave ou Chrome**

1. Extraia o ZIP para uma pasta fixa no computador, por exemplo `Documentos\Zappy-WhatsApp`.
2. No Brave, escreva `brave://extensions` na barra de endereços. No Chrome, use `chrome://extensions`.
3. Ative **Modo de programador / Developer mode**.
4. Clique em **Carregar sem compactação / Load unpacked**.
5. Escolha a pasta **extension** dentro da pasta extraída. É a pasta que contém `manifest.json`. Não selecione o ZIP nem a pasta superior.
6. Atualize a página do Zappy. Abra uma ficha de cliente. O botão verde **WhatsApp ▾** deverá aparecer ao lado de **Enviar Acesso à App**.

Esta é uma instalação local para o piloto. Se o computador for gerido e não permitir extensões locais, use o procedimento autorizado pela organização. A extensão não se instala noutros computadores automaticamente.

**Primeiro teste, antes de ter o link da app**

Use uma ficha de teste com um número seu ou autorizado. Não substitua os dados de um cliente real para testar.

1. Abra a ficha e aguarde um segundo pelo carregamento.
2. Clique em **WhatsApp ▾**.
3. Confira nome e número no painel.
4. Selecione **Contactar cliente**. A opção da app fica bloqueada enquanto não configurar o link.
5. Clique em **Abrir WhatsApp**. Confirme a conta do salão e o destinatário. A extensão não envia a mensagem; o envio é manual.
6. Feche o painel, abra outra ficha de teste e confirme que o nome/número mudam. Teste também fechar e reabrir a ficha.

Não utilize o botão nativo **Enviar Acesso à App** neste teste: esse é um procedimento diferente, que pode enviar SMS.

**Configurar mensagens e imagem**

Clique em **Definições** no painel, ou no ícone da extensão no menu de extensões do navegador. A página de definições permite:

- Indicar o salão, opcionalmente.
- Guardar o link HTTPS de instalação da app, depois de verificar que pertence ao salão correto. Não coloque um link pessoal de autenticação.
- Editar as duas opções iniciais ou adicionar outras, até oito.
- Escolher uma imagem **PNG até 2 MB** (máximo 4096 × 4096 píxeis). Nenhuma imagem está incluída no pacote.

Clique em **Guardar definições**. Feche e volte a abrir o painel WhatsApp da ficha para usar as novas definições.

As variáveis disponíveis são `{nome}` (nome completo), `{primeiroNome}` (primeira palavra do nome), `{salao}` e `{linkApp}`. Uma mensagem que use uma variável sem valor fica bloqueada. Pode rever/editar o texto preparado antes de abrir a conversa.

**Enviar texto e imagem**

1. Escolha a mensagem e confira o destinatário.
2. Clique em **Copiar imagem**, se tiver configurado uma.
3. Clique em **Abrir WhatsApp** e envie o texto.
4. Clique no campo de escrita do WhatsApp, cole com **Ctrl+V**, confira a pré-visualização e envie a imagem.

O botão de copiar substitui o conteúdo atual da área de transferência. A imagem não é anexada automaticamente pelo link do WhatsApp. Se a cópia ou colagem não funcionar neste computador, anexe o ficheiro PNG diretamente no WhatsApp. O texto e a imagem são tratados como duas mensagens; a extensão não preenche automaticamente a legenda da imagem.

**O que foi verificado e o que falta**

Os campos foram identificados a partir dos excertos HTML fornecidos: `#telemovelttnc`, `.cust_name` e `#sendAppInviteBtn`. O código lê o valor atual do campo, não o placeholder. Usa o país selecionado apenas para interpretar números nacionais; respeita indicativos internacionais explícitos. Não lê `selectedCustomer` nem chama funções internas do Zappy.

A estrutura completa da janela não foi fornecida. A extensão procura o menor elemento que contém os três campos e recusa associá-los ao nível do documento inteiro. Se não conseguir identificar uma única ficha visível, impede a preparação em vez de adivinhar.

Os testes automáticos cobrem números, mensagens, configuração, cópia de bytes PNG, mudança de cliente, campos duplicados e ausência de número. Usam DOM e APIs do navegador simulados. **Ainda falta confirmar a instalação real no Brave/Chrome, o aspeto na ficha Zappy, a abertura da conversa e a colagem da imagem no WhatsApp.** A tentativa de verificação visual nesta sessão foi bloqueada pela política do ambiente para páginas locais. Nenhuma mensagem foi enviada e nenhum registo Zappy foi alterado.

Esta versão deve ser testada primeiro num computador. Não considere concluída a integração de produção apenas porque os testes automáticos passam.

**Se algo não funcionar**

- Botão ausente: confirme que a extensão está ativa, que atualizou a página depois de instalar, e que está em `https://zappysoftware.com/backoffice/…` com uma ficha aberta. Não corre noutros domínios.
- “A ficha está a atualizar”: feche o painel, aguarde um segundo e reabra.
- “A ficha foi alterada”: volte a abrir o painel para preparar uma mensagem com os dados atuais.
- “Não foi possível identificar a janela”: é necessário ajustar a estrutura do leitor à janela real. Envie a mensagem do erro e um pequeno excerto da estrutura envolvente dos campos, com os dados pessoais removidos.
- Número inválido: confira a ficha e o indicativo. O telemóvel alternativo não é usado automaticamente.
- App bloqueada: configure o link nas definições. “Contactar cliente” continua disponível.
- WhatsApp não abre: verifique se o navegador está a bloquear a abertura da nova janela e se a sessão WhatsApp está disponível.
- Imagem não cola: anexe o PNG manualmente. O comportamento da área de transferência depende do navegador e do WhatsApp utilizado.

**Privacidade, atualização e remoção**

A extensão guarda apenas as definições e a imagem neste perfil do navegador. Não guarda a lista de clientes nem o histórico de mensagens. Nome e número são lidos para a ação em curso; o link aberto no WhatsApp inclui o número e o texto e pode aparecer no histórico do navegador. Envie apenas mensagens autorizadas pelo cliente.

Permissões: acesso de conteúdo ao backoffice indicado, armazenamento local e escrita na área de transferência. Não lê a área de transferência, cookies ou credenciais. Não controla a página do WhatsApp e não tem servidor nem telemetria. A conta que envia é a conta aberta no WhatsApp; a extensão não a seleciona nem a valida.

Atualizações deste piloto são manuais: mantenha a pasta e substitua os ficheiros da extensão pela versão seguinte; clique em **Recarregar** na página de extensões e atualize o Zappy. Para remover, clique em **Remover** nessa página; as definições locais da extensão serão perdidas.

**Para desenvolver**

Requisitos de desenvolvimento: Node 22.12+ ou Node 24 e npm. Na pasta do projeto:

```sh
npm ci --ignore-scripts
npm run build
npm run check
npm test
```

O código-fonte está em `src/`. A pasta `extension/` contém a versão compilada. O processo de build preserva os avisos de licença da dependência de números de telefone. O ficheiro de lock fixa as dependências.

`tests/fixture.html` e `tests/settings-fixture.html` são simulações locais para desenvolvimento. A primeira captura os links de saída sem abrir o WhatsApp. A configuração de demonstração só existe nessa simulação, nunca na extensão instalada. Não incluem os excertos originais nem os dados pessoais fornecidos pelo utilizador.

Não acrescente permissões de outros sites, chamadas a APIs privadas, envios automáticos ou registos de dados de clientes para corrigir um problema de seletor. Concentre eventuais ajustes no leitor `src/adapter.ts`.
