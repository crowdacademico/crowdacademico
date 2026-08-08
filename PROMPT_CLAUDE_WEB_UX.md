Isto é o CrowdAcadêmico (repo já conectado). Leia DOCUMENTACAO_BD.md e temp_Nest_React.md pra entender os detalhes técnicos de cada item abaixo — não vou descrever nada aqui de propósito.

Contexto: ainda estamos nos primeiros módulos do sistema (nada de campanha/contribuição implementado ainda), mas já investimos bastante em deixar o painel admin polido, legível e sem atrito de uso. Quero que você entenda o TAMANHO desse investimento antes de continuarmos — é uma lista só de itens já feitos no React, sem descrição, cada um representa um pedido meu que vocês (você e o Claude Code) resolveram:

**Feedback visual / toasts**
- Toast de sucesso (título + descrição)
- Toast de erro (não existia, só sucesso)
- Estilo do toast de erro (translúcido, não compete com a mensagem já na tela)
- Tamanho/posição/transparência/duração do toast de erro ajustados
- Bug de toast duplicado (corrida de renovação de token)
- Bug de toast duplicado (StrictMode disparando requisição 2x)

**Legibilidade**
- Texto e bordas escurecidos no sistema inteiro (rótulos, texto auxiliar, erro, bordas de tabela, ícone de ajuda, badges, sidebar) — problema de monitor não calibrado

**Papéis e permissões**
- Renomear papel pelo painel (coluna "Ações")
- Log de auditoria ao renomear papel (quem, quando, nome antigo/novo)
- Bug na matriz Papel × Permissão (coluna bagunçava ao renomear papel)
- Dropdown de login rápido com os 7 papéis (era só admin)
- Coluna "papel" na listagem de Usuários
- Widget "Papéis de um usuário" removido (confuso, redundante)

**Usuários**
- Botão "Desbloquear login"
- Campo "Último login em" em Consultar Usuário
- Setinha com histórico completo de logins anteriores
- Bug: atribuir papel não funcionava
- Mensagem explicativa quando não há papel pra atribuir (antes sumia sem explicação)

**Organização**
- Tabelas (Usuários, Papéis, Permissões, Configurações) ordenadas por ID, não por nome
- Mensagem de erro de login mais clara
- Ordem dos registros no banco (admin=1, papéis e permissões agrupados por domínio) — só cosmético, mas pensado

**Estrutura geral (rodadas anteriores)**
- Uma página por operação de CRUD (Criar/Alterar/Consultar/Excluir), não formulário embutido na tabela
- Botão "Ver log" embaixo de cada tabela
- Breadcrumb que acompanha o scroll
- Botão `<dev>` de login rápido
- Consultar mostra todos os campos, somente leitura

Isso é só o que já ficou pronto. Quero sua opinião: pelo tanto de atenção que já demos ao painel admin tão cedo, faz sentido continuar assim, ou estamos investindo polish demais antes da hora?
