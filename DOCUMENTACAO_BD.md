# Documentação de comentários do banco

Este arquivo centraliza os blocos de comentário que foram condensados no script SQL para reduzir ruído e preservar a leitura do código.

## [01-A] Contexto do script base e revisão
- O arquivo 01 concentra a criação dos enums, tabelas e estruturas iniciais do modelo.
- A explicação longa sobre a origem do script revisado foi condensada aqui para manter o SQL mais enxuto.

## [01-B] Role app_nestjs e autenticação do backend
- O projeto usa uma única credencial de aplicação para o NestJS, em vez do modelo de roles do Supabase Auth/PostgREST.
- A role app_nestjs precisa existir cedo para que as policies do arquivo 04 possam referenciá-la sem depender de ordem manual.
- O bloco de criação permanece no SQL, mas a justificativa extensa foi movida para esta documentação.

## [01-F] Ajuste de escopo do tipo_link
- O tipo_link passou a ser compartilhado por contexto de perfil acadêmico, atualização de campanha e recompensa.
- Os campos permite_perfil, permite_atualizacao e permite_recompensa registram em quais cenários cada link pode ser usado.

## [01-W] Reorganização defensiva do score
- O bloco abaixo do score foi mantido de forma defensiva para garantir a mesma constraint única em ambientes onde o script é reexecutado.
- A explicação sobre UPSERT e sobre o histórico dessa melhoria foi resumida aqui.

## [01-H] Autenticação própria
- As tabelas de verificacao_email, recuperacao_senha e sessao substituem parte do fluxo que antes era tratado pelo Supabase Auth.
- O controle de tokens, expiração e revogação passou a ser responsabilidade do NestJS e do PostgreSQL.

## [01-X] Novas tabelas de 2026-07
- As tabelas de termos_de_uso, usuario_termo, notificacao, recompensa, arquivo_recompensa, contribuicao_recompensa, link_atualizacao e link_recompensa foram adicionadas no fim do script para manter as dependências de chave estrangeira preservadas.
- A explicação sobre a posição dessas estruturas no arquivo foi condensada aqui para reduzir ruído no SQL.

## [01-AB] Aceite de termos em contribuições
- A tabela aceite_termo_contribuicao registra a concordância de termos para transações, inclusive em cenários anônimos.
- Esse fluxo passou a ser tratado de forma explícita no banco para manter rastreabilidade e consistência.

## [01-AC] Tabelas de suporte de autenticação própria
- As tabelas de verificacao_email, recuperacao_senha e sessao foram agrupadas aqui para documentar a mudança de responsabilidade da autenticação do Supabase para o NestJS + PostgreSQL.
- A explicação longa sobre tokens, expiração e revogação foi movida para esta documentação.

## [01-AD] Autenticação própria do usuário
- A tabela usuario passou a representar o fluxo de autenticação própria do projeto, sem depender do modelo do Supabase Auth.
- O contexto dessa mudança foi centralizado aqui para manter o SQL enxuto.

## [01-K] Cache do score em inteiro
- O campo score_atual passou a ser tratado como inteiro para simplificar o cálculo e a atualização do score do pesquisador.
- Essa decisão de modelagem ficou documentada aqui para evitar comentários longos no script.

## [01-Y] Contribuição_recompensa
- A tabela contribuicao_recompensa registra a associação entre uma contribuição e as recompensas adquiridas.
- A explicação do papel dessa tabela foi concentrada aqui para preservar a leitura do SQL.

## [01-AD] Verificacao_email
- A tabela verificacao_email centraliza o fluxo de confirmação de e-mail fora do modelo nativo do Supabase Auth.
- O contexto do processo de validação e expiração foi movido para esta documentação.

## [01-I] Placeholder de senha da role app_nestjs
- O bloco de criação da role app_nestjs usa uma senha placeholder apenas para permitir que o script funcione em ambientes novos antes de a configuração real.
- Em produção ou homologação, essa senha deve ser substituída por um valor seguro e gerenciado por variável de ambiente ou secret manager.

## [01-J] Tabela de links para atualizações de campanha
- A tabela link_atualizacao reaproveita o modelo de tipo_link para registrar URLs relacionadas a atualizações de campanha, como artigos, vídeos ou planilhas de resultado.
- Essa estrutura foi isolada aqui para explicar o propósito do relacionamento sem poluir o script SQL.

## [01-K] Tabela de links para recompensas
- A tabela link_recompensa conecta recompensas a URLs externas, como downloads digitais, lojas externas ou formulários de resgate.
- O uso do mesmo modelo de link da tabela link_atualizacao foi documentado aqui para manter o SQL mais limpo.

## [01-L] Status de campanha e contribuição
- Os enums status_campanha e status_contribuicao ganharam novos valores para cobrir cenários de moderação, expiração e reembolso manual.
- Essa mudança foi centralizada aqui para explicar a evolução do modelo sem inserir comentários longos no script.

## [01-M] Indicador ativo/inativo no motivo de denúncia
- O campo ativo em motivo_denuncia permite marcar motivos de denúncia como ativos ou inativos sem apagar o registro histórico.
- Esse ajuste foi documentado aqui para preservar o contexto sem poluir a definição da tabela.

## [01-N] Senha hash obrigatória no usuário
- A coluna senha_hash passou a ser obrigatória porque o projeto usa autenticação própria no NestJS, sem depender do fluxo nativo do Supabase Auth.
- A justificativa foi movida para esta documentação para reduzir o ruído no SQL.

## [01-O] Verificação de e-mail e brute-force
- Os campos email_verificado, tentativas_login_falhas, bloqueado_ate, ultimo_login_em e ultimo_login_ip foram adicionados para controlar validação de e-mail e proteção contra tentativas repetidas.
- A explicação detalhada de cada um desses mecanismos ficou aqui para facilitar a leitura do script.

## [01-P] Prazo mínimo e máximo da campanha
- A constraint chk_prazo_campanha define um intervalo de 15 a 90 dias entre data_inicio e data_fim, com exceções quando os valores são nulos.
- Essa regra de negócio foi documentada aqui para reduzir comentários longos na definição da tabela campanha.

## [01-Q] Valor mínimo da contribuição
- O valor mínimo de contribuição foi definido em R$ 5,00 para evitar entradas irreais ou muito pequenas.
- A regra de negócio foi centralizada aqui para manter o SQL enxuto.

## [01-R] Token de sessão para contribuição anônima
- O campo token_sessao foi adicionado para evitar que contribuições anônimas sejam enumeradas sequencialmente por terceiros.
- Esse mecanismo de proteção foi descrito aqui para não sobrecarregar o script com explicações internas.

## [01-S] Auditoria financeira
- A auditoria financeira congela valor e meio de pagamento no momento do evento para manter um histórico consistente.
- O contexto dessa regra foi movido para a documentação.

## [01-T] Responsável pelo evento na auditoria financeira
- A tabela registra também o usuário ou processo responsável pelo evento para permitir rastreabilidade administrativa.
- Essa informação foi documentada em vez de permanecer como comentário inline.

## [01-U] Título da atualização de campanha
- O campo titulo foi adicionado para exibir um resumo ou cabeçalho antes do conteúdo completo da atualização.
- Essa mudança foi descrita aqui para manter a definição da tabela mais limpa.

## [01-V] Soft delete/moderação das atualizações de campanha
- Atualizações ocultadas por moderação não são apagadas fisicamente, mas deixam de ser exibidas publicamente.
- Esse comportamento foi documentado aqui para preservar o histórico.

## [01-W] Soft delete dos comentários
- Comentários moderados ou removidos não são apagados de fato, preservando histórico e auditoria.
- Esse comportamento foi movido para a documentação central.

## [01-X] Unicidade de comentário por campanha e pesquisador
- A regra de unicidade garante que um mesmo pesquisador não tenha mais de um comentário ativo por campanha para a mesma entidade.
- A justificativa da regra ficou documentada aqui.

## [01-Y] Coerência entre endossado e ordem_endosso
- O check constraint garante que o campo endossado e a ordem_endosso fiquem coerentes entre si.
- Essa regra foi detalhada aqui para facilitar a manutenção.

## [01-Z] Unicidade e limite temporal das denúncias
- As denúncias passaram a ter unicidade por alvo e limitações temporais para evitar abuso ou duplicidade.
- O contexto dessa regra foi movido para a documentação central.

## [01-AE] Fluxo de recuperação de senha
- A tabela recuperacao_senha armazena o fluxo de recuperação por token, incluindo geração, validação, uso e invalidação.
- Antes da autenticação própria, esse fluxo era resolvido nativamente pelo Supabase Auth; agora ele passa a ser implementado no backend e no banco.

## [01-AF] Índice de recuperação de senha ativo por usuário
- O índice único garante que exista apenas um token de recuperação ativo por usuário ao mesmo tempo.
- Isso evita que dois pedidos de recuperação concorrentes coexistam e ajuda a manter a consistência mesmo se o backend esquecer de invalidar o anterior.

## [01-AG] Persistência de refresh tokens para sessões do NestJS
- A tabela sessao guarda refresh tokens para suportar logout, logout de todos os dispositivos e revogação de tokens comprometidos.
- Como o JWT é stateless, a persistência do refresh token é necessária para implementar revogação de forma confiável.
