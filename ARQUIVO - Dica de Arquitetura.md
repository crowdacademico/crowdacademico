> ⚠️ **Nota adicionada 01-09-2026, pra não confundir quem ler isto depois:** este documento é a recomendação ORIGINAL que guiou o desenho do módulo `25-arquivo` - a arquitetura (URL pré-assinada, fluxo de 2 passos, verificação de assinatura de bytes, pasta `pendente/`→`publico/`) foi seguida à risca. **Mas o provedor final não foi o R2.** O time decidiu rodar em **Supabase Storage** (confirmado no `.env` real e em `ARQUIVO_para_configurar_modulo-arquivo.md`), motivo não registrado em lugar nenhum que eu tenha achado - só a Alexia sabe por quê. A abstração `S3CompativelArmazenamentoService` torna a troca barata (variável de ambiente, sem mudar código) se um dia migrar pra R2 de verdade, ver `DOCUMENTACAO_BACKEND.md`. Os números/argumentos de R2 abaixo continuam corretos como ANÁLISE de R2 (conferidos de novo em 01-09-2026), só não descrevem o provedor em uso hoje.

# Primeiro, confirmando o R2 com número

O R2 cobra armazenamento (US$ 0,015 por GB/mês) e operações (escrita a US$ 4,50 por milhão, leitura a US$ 0,36 por milhão), nunca cobra egress, e tem uma camada gratuita permanente de 10 GB mais 1 milhão de operações de escrita e 10 milhões de leitura por mês. Essa camada gratuita é mensal e recorrente, não um teste de 12 meses. Na prática: o TCC de vocês vai custar zero, indefinidamente. A Alexia está certa e não precisa gastar mais tempo comparando provedor. 
Egresscost
Tech Insider

O ponto que muda o desenho: nenhum arquivo de vocês é secreto

Foto de perfil, imagem de campanha, anexo de atualização, imagem de recompensa - tudo isso é conteúdo público, feito para aparecer numa página que qualquer visitante anônimo pode abrir. Não existe no sistema um único arquivo que precise de controle de acesso na hora de baixar (o CPF, que é o dado realmente sensível, é coluna de banco, não arquivo).

Isso tem uma consequência grande: o bucket pode ser público, servido por um domínio próprio da Cloudflare (algo como arquivos.crowdacademico.com.br). O navegador do visitante busca a imagem direto no R2, pela CDN da Cloudflare. Não passa pelo Nest, não passa pelo Supabase, não custa nada, e não exige gerar link assinado com validade a cada vez que alguém abre uma página. A coluna arquivo.url guarda um endereço público e pronto.

Metade da complexidade que costuma existir num módulo de upload é justamente controle de acesso ao download. Vocês não precisam dela. Vale a Alexia saber disso antes de começar, para não construir o que não é necessário.

# Como o arquivo sobe: URL pré-assinada, direto pro R2

Entre as duas opções do prompt, eu recomendo a B (o navegador sobe direto), e a razão não é performance - com o volume de vocês, proxiar pelo Nest funcionaria bem. A razão é que o Nest de vocês vai rodar no plano gratuito do Render, que dorme e tem pouca memória: um upload de 10 MB atravessando esse processo é justamente o tipo de coisa que derruba ou trava o servidor inteiro em demonstração de banca. Mandar o binário direto pro R2 tira esse risco de cima do elo mais fraco da infraestrutura.

# O fluxo, em português:

O navegador pede permissão ao Nest: "quero subir uma foto JPEG de 800 KB".
O Nest verifica quem é a pessoa, se o tipo e o tamanho estão dentro do permitido, inventa um nome de arquivo aleatório e devolve uma URL pré-assinada - um endereço temporário que só serve para gravar aquele arquivo, com aquele tipo, até aquele tamanho, e que expira em uns 5 minutos.
O navegador sobe o arquivo direto pro R2 usando essa URL.
O navegador avisa o Nest: "terminei". Aí sim o Nest confere que o objeto existe mesmo, com o tamanho e o tipo prometidos, e só então cria a linha na tabela arquivo.

O detalhe que faz esse desenho ser seguro é que quem escolhe o nome e as regras da URL é o Nest, nunca o navegador. Se o front puder mandar o nome do arquivo ou o tamanho máximo, a validação toda vira decoração.

# Arquivos órfãos: resolver sem escrever código

- O prompt sugere um job periódico de limpeza. Dá para evitar isso inteiro com um truque de configuração:

O upload cai numa pasta pendente/ dentro do bucket.
No passo 4, quando o Nest confirma, ele move o arquivo para publico/ e cria a linha no banco.
No R2, configura-se uma regra de ciclo de vida que apaga sozinho qualquer coisa em pendente/ com mais de 24 horas.

Quem abandona o formulário no meio deixa lixo em pendente/, e a própria Cloudflare varre. Zero código, zero cron, zero servidor acordado de madrugada. É estritamente melhor que um job, porque um job depende do Nest estar de pé, e o de vocês dorme.

Sobra um caso menor: linha criada no banco e nunca vinculada a nada (a pessoa confirmou o upload e depois abandonou). Isso é uma linha órfã de metadado, sem custo real, e pode ficar para depois com tranquilidade.

# Validação: o navegador mente

O tipo que o navegador declara é uma afirmação da pessoa, não um fato. Alguém pode renomear virus.exe para foto.jpg e o navegador vai dizer "é JPEG". Por isso a checagem de verdade tem que ser depois, no passo 4: o Nest lê os primeiros bytes do objeto no R2 e confere a assinatura do formato (todo JPEG, PNG, PDF começa com uma sequência conhecida de bytes). É barato e é o único jeito de saber de fato o que subiu.

Sobre o precedente do projeto ("o banco valida, o Nest não duplica"): aqui ele não se aplica inteiro, e vale a Alexia saber por quê. O banco não enxerga o arquivo - ele só recebe o que o Nest afirma sobre ele. Dá para pôr no banco um CHECK limitando tipo_mime a uma lista permitida e tamanho_bytes a um teto, e isso vale a pena como segunda camada, coerente com o estilo do projeto. Mas isso valida o rótulo, não o conteúdo. O conteúdo só a aplicação valida.

# O risco de segurança de verdade desse módulo

Não é vazamento, é o contrário: arquivo enviado por usuário que executa no navegador de quem visita.

Bloquear SVG. SVG é um arquivo de imagem que pode conter JavaScript dentro. Aceitar SVG num site com login é entregar um vetor de roubo de sessão. Lista permitida fechada: JPEG, PNG, WebP e PDF. Nada mais.
Servir de um domínio separado do site principal (arquivos.crowdacademico.com.br, não crowdacademico.com.br/arquivos). Assim, mesmo que algo malicioso escape, ele não roda "de dentro" do site e não alcança o login de ninguém.
PDF configurado para baixar, não abrir na página.

# Esses três itens custam uma linha de configuração cada e são a diferença entre um módulo de upload correto e um buraco. Se a Alexia levar só uma coisa desta conversa, que seja essa.

Duas sugestões de banco, já que essa parte é dela
Guardar a chave do objeto, não só a URL inteira. Hoje arquivo.url guarda o endereço completo. Se um dia o domínio mudar, todas as linhas viram links quebrados e vira um UPDATE em massa. Guardar o caminho interno (publico/abc-123.jpg) e montar o endereço na hora de exibir, a partir de uma variável de ambiente, transforma essa troca numa mudança de configuração.
Falta a coluna de quem enviou. A tabela arquivo não tem dono, e a política de inserção está liberada para qualquer usuário autenticado. Hoje não dá para responder "quem subiu esse arquivo?", nem limitar quantos uploads uma pessoa pode fazer por hora, nem apagar o que uma conta banida enviou. Uma coluna id_usuario_upload resolve os três, e é muito mais barato adicionar agora, com a tabela vazia, do que depois.
Variáveis de ambiente que ela vai precisar

Endpoint do R2 (que inclui o ID da conta Cloudflare), chave de acesso, chave secreta, nome do bucket e o endereço público base do domínio de arquivos. Cinco no total. A biblioteca é a da AWS mesmo (@aws-sdk/client-s3 mais @aws-sdk/s3-request-presigner), apontada para o endereço do R2 - o R2 fala o mesmo protocolo do S3, então nada disso é gambiarra.

# Uma dica barata que economiza muito

Reduzir a imagem no próprio navegador antes de subir (limitar a 1600 pixels de largura). Uma foto de celular sai de 5 MB para uns 300 KB, o upload fica instantâneo, e as 10 GB gratuitas nunca chegam nem perto de encher. São umas 15 linhas no front e resolve mais problema de custo do que qualquer escolha de provedor.

# Em uma frase

R2 com bucket público e domínio próprio, upload direto do navegador por URL pré-assinada que o Nest emite, confirmação em dois passos com verificação real dos bytes, limpeza de órfãos por regra de ciclo de vida em vez de job, lista de tipos fechada sem SVG e domínio separado para servir. O que eu mudaria no banco antes de ela começar: guardar a chave do objeto em vez da URL inteira e adicionar a coluna de quem enviou.