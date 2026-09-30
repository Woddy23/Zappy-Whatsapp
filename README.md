# WhatsApp na ficha Zappy

Extensão local para preparar mensagens a partir da ficha do cliente. Clique em **WhatsApp ▾**, escolha uma mensagem e reveja o envio no WhatsApp. O envio é sempre manual.

## Instalar ou atualizar

1. Guarde esta pasta num local fixo no computador.
2. Abra `brave://extensions` ou `chrome://extensions` e ative **Modo de programador**.
3. Clique em **Carregar sem compactação** e escolha a pasta **extension**, onde está `manifest.json`.
4. Para atualizar uma instalação existente, clique em **Recarregar** no cartão da extensão.
5. **Atualize também a página do Zappy.** Uma ficha já aberta pode continuar a usar a versão anterior.

Não precisa de Node, servidor, conta nova ou chave de API para instalar. Teste primeiro numa ficha fictícia ou autorizada. O botão nativo **Enviar Acesso à App** é um procedimento diferente, que pode enviar SMS.

## Usar na ficha

O botão verde com o símbolo WhatsApp aparece à direita de **Ler C. Cidadão**. Se esse botão não existir ou estiver oculto, aparece junto de **Enviar Acesso à App**. As opções mostram o título, um excerto da mensagem e um ícone para distinguir texto, link e imagem.

- **Destinatário:** nome e telemóvel principal da ficha, com indicativo internacional. Confira-os no topo das opções.
- **Mensagem sem imagem:** clique no título para abrir o WhatsApp com o texto preparado. Pode editar antes de enviar no próprio WhatsApp.
- **Escrever mensagem…:** abre um campo para uma mensagem pontual; depois clique em **Abrir WhatsApp**.
- **Mensagem com imagem:** permite rever o texto e **Preparar imagem no WhatsApp Web**. A extensão prepara a imagem e o texto como legenda; confirme a pré-visualização e clique em **Enviar** uma vez. **Copiar imagem** e **Guardar imagem** ficam disponíveis como alternativas.
- **Configurar mensagens:** abre as opções da extensão num separador. O ícone da extensão abre a mesma página.

A ficha em carregamento fica disponível automaticamente quando os dados estabilizam. Se mudar de cliente ou de número com as opções abertas, o rascunho anterior é limpo. Clique em **Atualizar destinatário**, confira os novos dados e escolha novamente.

O painel fecha ao clicar fora, ao clicar novamente em **WhatsApp ▾** ou com **Escape**. Os controlos podem ser usados com o teclado.

## Configurar mensagens

Na página **Mensagens do WhatsApp**:

1. Preencha **Nome do salão** e **Link da app** no topo da página. Estes campos ficam sempre visíveis.
2. Escolha uma mensagem no seletor e preencha **Título** e **Mensagem**. O título é a opção mostrada na ficha.
3. Use **Inserir dado do cliente…** para inserir primeiro nome, nome completo, salão ou link na posição do cursor.
4. Opcionalmente, adicione uma imagem PNG a essa mensagem.
5. Confira a pré-visualização com o nome fictício Ana Silva. Nas mensagens com imagem, o texto será a legenda no WhatsApp Web; os restantes valores vêm das suas definições.
6. Clique em **Guardar alterações** no topo da página e confirme **Alterações guardadas.** Mudar a mensagem selecionada preserva as edições por guardar.

Pode guardar até **8 mensagens**, com títulos até 60 caracteres e textos até 3000 caracteres. O rascunho pontual admite até 4000 caracteres. Mensagens sem dados necessários continuam visíveis na ficha, com a indicação do que falta configurar.

As variáveis são `{primeiroNome}`, `{nome}`, `{salao}` e `{linkApp}`. O link deve usar HTTPS e não incluir credenciais. Não coloque links pessoais de autenticação.

**Remover mensagem** permite **Desfazer** a última remoção enquanto esta página permanecer aberta. Mensagens apagadas não voltam ao recarregar. Alterações por guardar têm aviso ao sair. Se outra página guardar primeiro, o editor impede a substituição silenciosa e pede para recarregar.

Definições antigas mantêm títulos, textos e ordem. A imagem global antiga fica associada às mensagens que já a usavam; a partir daí cada associação é explícita, sem depender do título. O formato novo é gravado ao guardar as alterações.

As duas mensagens iniciais da app usam agora uma saudação sem emoji. Cópias antigas desses modelos, com o restante texto intacto, perdem apenas o emoji inicial ou o caráter corrompido que o substituiu. Mensagens personalizadas conservam os seus emojis válidos.

## Imagens

Cada mensagem pode ter uma imagem diferente ou nenhuma. **PNG até 2 MB**, com máximo de **4096 × 4096 píxeis**. Imagens iguais partilham armazenamento. O conjunto das definições tem limite de 9 MB; se exceder, reduza ou remova imagens. Uma tentativa de guardar inválida não substitui as definições anteriores.

1. Escolha uma mensagem com imagem e reveja o texto personalizado. A preparação admite legendas até **1024 caracteres**, incluindo os dados do cliente.
2. Clique em **Preparar imagem no WhatsApp Web**. Abre um novo separador em `web.whatsapp.com`, sem enviar texto separado.
3. Aguarde o aviso **Imagem e legenda preparadas**. Não mude de conversa nem escreva durante a preparação.
4. Confirme o destinatário, a conta, a imagem e a legenda na pré-visualização do WhatsApp. Clique em **Enviar** uma vez: o cliente recebe uma imagem com legenda.

É necessário ter sessão iniciada no WhatsApp Web. A integração usa o editor visível, sem APIs privadas, e nunca clica em Enviar. Não prepara anexos no WhatsApp Desktop. Se o editor mudar, houver um rascunho existente ou a preparação falhar, aparece um erro com a imagem para guardar e a legenda para copiar. Pode também usar **Copiar imagem** no Zappy; essa alternativa substitui a área de transferência.

## Qual conta envia?

O número na ficha determina **quem recebe**. **Quem envia é a conta com sessão iniciada no WhatsApp Web ou na aplicação que abrir o link.** Confirme a conta do salão antes de enviar. Guardar um número do salão na extensão não selecionaria essa conta.

## Se algo não funcionar

- **Botão ausente:** confirme a extensão ativa, recarregue a extensão e atualize o Zappy. Só corre em `https://zappysoftware.com/backoffice/*`, com uma única ficha visível.
- **Número inválido:** corrija o telemóvel principal e o indicativo na ficha. O número alternativo nunca é usado automaticamente.
- **“Não foi possível identificar a janela”:** o leitor precisa de corresponder à estrutura real da ficha. Para análise, forneça apenas um excerto HTML sem dados pessoais.
- **Mensagem indisponível:** configure o link ou o nome do salão indicado na explicação, ou remova a variável do texto.
- **Caráter inválido (�):** abra **Configurar mensagens**, escolha a mensagem e apague/escreva novamente o caráter assinalado. Não é possível recuperar automaticamente o caráter original perdido num texto personalizado. O envio desse texto fica bloqueado até à correção; acentos e emojis válidos continuam suportados.
- **WhatsApp não abre:** permita novas janelas para o Zappy e confirme que o WhatsApp está disponível.
- **Definições não abrem:** use o ícone da extensão ou as suas opções na página de extensões do navegador.
- **Erro ao carregar definições:** tente **Recarregar definições**. **Repor mensagens iniciais** exige confirmação e só substitui os dados anteriores quando guardar.

## Privacidade e limites

A extensão guarda definições e imagens neste perfil do navegador. Para preparar um anexo, guarda temporariamente número, legenda e imagem na memória de sessão da extensão, com validade de dois minutos; o rascunho é consumido uma vez e removido ao fechar o separador. Não guarda histórico de mensagens. O link de texto contém o número e texto preparados e pode aparecer no histórico do navegador; o link de imagem contém o número e um identificador aleatório, sem legenda ou imagem.

Permissões: armazenamento, escrita na área de transferência e execução no backoffice indicado e em `https://web.whatsapp.com/*`. Não lê credenciais, cookies nem área de transferência. Prepara anexos no editor do WhatsApp Web apenas quando solicitado no Zappy; não tem servidor, telemetria ou envio automático.

O leitor usa `#telemovelttnc`, `.cust_name` e `#sendAppInviteBtn`. Lê o valor atual do campo, não o placeholder. Interpreta números nacionais pelo país selecionado e respeita indicativos explícitos. Campos ambíguos, duplicados ou indisponíveis impedem a preparação.

A estrutura completa da janela real não foi fornecida. A validação usa uma simulação com dados fictícios e uma extensão instalada num perfil Brave isolado. Consulte `VALIDATION.txt` para resultados e limites. A ficha Zappy real e a colagem final no WhatsApp ainda precisam de confirmação no computador de utilização.

Remover a extensão apaga as suas definições locais. Atualizações são manuais.

## Desenvolvimento

Node 22.12+ ou Node 24 e npm:

```sh
npm ci --ignore-scripts
npm run build
npm run check
npm test
```

Código em `src/`; extensão pronta a carregar em `extension/`. O build preserva as licenças da biblioteca de números e gera `tests/settings-fixture.html` a partir da página real, evitando uma segunda interface desatualizada.

`tests/fixture.html` e `tests/settings-fixture.html` usam dados fictícios e APIs simuladas. Para uso interativo, sirva o repositório num servidor HTTP local. Os links de saída da ficha são capturados sem abrir o WhatsApp.

`tests/browser-check.mjs` valida a extensão real num perfil descartável. Usa uma instalação existente de Playwright. Configure `PLAYWRIGHT_MODULE` com o caminho absoluto de `playwright/index.mjs`, `BROWSER_PATH` com Brave/Chromium e, opcionalmente, `VALIDATION_TEMP` com uma pasta temporária existente. Execute:

```sh
node tests/browser-check.mjs
```

O teste interceta o Zappy e os links WhatsApp com páginas sintéticas. Guarda capturas e o perfil isolado na pasta temporária indicada no resultado. Não usa o perfil pessoal, não envia mensagens e não altera registos Zappy.

Ícone WhatsApp incorporado de [Simple Icons](https://github.com/simple-icons/simple-icons/blob/develop/icons/whatsapp.svg), obtido em 2026-09-26, sob [CC0 1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md). WhatsApp é marca da respetiva entidade; a extensão não é afiliada. Os restantes ícones são SVG simples desenhados para esta interface. Nenhum ícone é carregado da rede durante a utilização.

Não acrescente permissões de outros sites, APIs privadas ou envio automático para resolver problemas de seletores. Ajustes do leitor pertencem a `src/adapter.ts`.
