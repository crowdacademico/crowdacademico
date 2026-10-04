-- ============================================================================
--  CROWDACADÊMICO - SISTEMA DE CROWDFUNDING PARA PESQUISA CIENTÍFICA
-- ============================================================================
--  Arquivo:     06_grants.sql
--  Módulo:      Grants (Permissões de Schema/Tabela/Coluna/Função)
--  Depende de:  01_extensoes_enums_tabelas.sql, 04_rls_policies.sql,
--               05_regras_negocio.sql (GRANT EXECUTE nas funções do motor de score)
--  Próximo:     07_seed_dados.sql
-- ----------------------------------------------------------------------------
--  Descrição:
--  Concede à role de aplicação (app_nestjs, criada em 01) exatamente os
--  privilégios que a camada de RLS (04) pressupõe - RLS e GRANT são duas
--  checagens independentes que o Postgres exige em conjunto: sem o GRANT
--  correto, uma policy que libera acesso nunca chega a ser avaliada, e a
--  operação falha antes com "permission denied". Segue a mesma ordem de
--  blocos de domínio do arquivo 01.
--
--  Tem, nesta ordem: os GRANTs gerais (schema e sequências), os de tabela e de coluna por bloco de domínio, e os
--  de EXECUTE nas funções que o Nest chama direto, cada um junto do bloco da sua tabela.
-- ----------------------------------------------------------------------------
--  SUMÁRIO DOS BLOCOS DE CÓDIGO
-- ----------------------------------------------------------------------------
--  [06-A] GERAL (schema, sequências)
--  [06-B] RBAC
--  [06-C] CONFIG
--  [06-D] USUÁRIO
--  [06-E] CAMPANHA
--  [06-F] LINK
--  [06-G] ARQUIVO
--  [06-H] CONTRIBUIÇÃO
--  [06-I] SCORE
--  [06-L] LOG DE AUDITORIA (só SELECT)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Todos os GRANTs ficam neste arquivo (schema, sequências, tabela, coluna e EXECUTE em funções), para nenhum ficar esquecido em outro.
-- ----------------------------------------------------------------------------

-- ============================================================================
--  [06-A] GERAL (schema, sequências)
-- ============================================================================
GRANT USAGE ON SCHEMA public TO app_nestjs;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_nestjs;

-- [06-A-1] GRANT nas sequências: por que é necessário além do GRANT INSERT (ver DOCUMENTACAO_BD.md)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_nestjs;

-- ============================================================================
--  [06-B] RBAC
--  permissao continua só-leitura (GRANT SELECT ON ALL TABLES já cobre): criar uma permissão nova é via
--  seed/migração direta, de propósito. papel_permissao tem INSERT/DELETE (ver [04-B-1] em 04_rls_policies.sql):
--  o admin concede ou revoga uma permissão de um papel já existente pelo Painel Admin (matriz Papel × Permissão).
--  papel tem UPDATE só na coluna `nome` (ver [04-B-1b] em 04_rls_policies.sql): renomear um papel é seguro
--  porque as 3 triggers de RBAC que reconhecem papel especial leem `codigo` (01_extensoes_enums_tabelas.sql
--  [01-B]), que não tem GRANT nenhum aqui; só `nome` (o rótulo) é coluna que a API pode escrever. CRIAR um
--  papel novo do zero continua fora de escopo.
-- ============================================================================
GRANT INSERT, DELETE ON papel_permissao TO app_nestjs;
GRANT UPDATE (nome) ON papel TO app_nestjs;

-- listar_papeis_usuario (03, [03-B]): usada por login/refresh (03-auth) para saber se mostra "Painel Admin"
-- no dropdown do cabeçalho.
GRANT EXECUTE ON FUNCTION public.listar_papeis_usuario(INT) TO app_nestjs;

-- ============================================================================
--  [06-C] CONFIG
-- ============================================================================
-- DELETE só vale para configuração pessoal: pol_config_delete (04) não deixa apagar chave global (ver [06-C] no DOCUMENTACAO_BD.md).
GRANT INSERT, UPDATE, DELETE ON configuracoes TO app_nestjs;
GRANT INSERT, UPDATE ON arquivo TO app_nestjs;

-- [06-C-1] area_conhecimento / motivo_denuncia / tipo_link: INSERT/UPDATE/DELETE (botão Excluir no painel; ver
-- pol_area_delete/pol_motivo_delete/pol_tipolink_delete em 04_rls_policies.sql). A FK sem CASCADE que aponta
-- para cada uma continua de pé, então DELETE só funciona de fato quando o registro não está em uso; a RLS + o
-- service.remove de cada módulo tratam o resto.
GRANT INSERT, UPDATE, DELETE ON area_conhecimento, motivo_denuncia, tipo_link TO app_nestjs;

-- ============================================================================
--  [06-D] USUÁRIO
-- ============================================================================
-- [06-D-1] usuario / perfil_pesquisador: por que o SELECT geral foi revogado (ver DOCUMENTACAO_BD.md)
REVOKE SELECT ON public.usuario FROM app_nestjs;
REVOKE SELECT ON public.perfil_pesquisador FROM app_nestjs;

-- [06-D-2] usuario: por que estas colunas específicas de auth precisam estar no GRANT (ver DOCUMENTACAO_BD.md)
-- deletado_em/deletado_por: só leitura aqui (não estão no GRANT UPDATE, [06-D-9] abaixo; só mudam via
-- excluir_conta_usuario, 03, [03-O]), para o Admin ver quem excluiu e quando (Art. 37 da LGPD).
-- suspenso_ate/motivo_suspensao/suspenso_por ([03-N]): leitura liberada para Consultar Usuário mostrar o estado
-- de suspensão e para o login (3-auth) checar suspenso_ate antes de emitir token. Escrita só via
-- suspender_usuario()/revogar_suspensao_usuario() (SECURITY DEFINER), nunca por este GRANT: mesma proteção das
-- outras colunas de moderação.
GRANT SELECT (
    id_usuario, nome, email, id_imagem_perfil, criado_em, deletado,
    deletado_em, deletado_por,
    email_verificado, senha_hash, tentativas_login_falhas, bloqueado_ate,
    ultimo_login_em, ultimo_login_ip,
    suspenso_ate, motivo_suspensao, suspenso_por
) ON public.usuario TO app_nestjs;

-- perfil_pesquisador: o backend precisa LER cpf_criptografado (a API de pagamento usa o CPF para configurar o
-- recebimento do pesquisador, RF-015) e cpf_hash (índice cego: checar duplicidade, RF-017, e o suporte localizar
-- conta por CPF). A proteção real é a permissão perfil_pesquisador_visualizar_sensivel gateando a leitura no
-- NestJS, e o cpf_hash nunca vai na resposta HTTP (regra de DTO/converter no Nest).
-- score_atual/score_atualizado_em estão na lista por conveniência (o score é público, ver pol_score_select em 04;
-- evita join com score_pesquisador na página pública do perfil); o GRANT UPDATE continua sem essas 2 colunas
-- ([06-D-2b] abaixo): é integridade de escrita, não privacidade.
-- suspenso_ate/motivo_suspensao/suspenso_por ([03-P]): leitura liberada para Consultar/Alterar Pesquisador
-- mostrarem o estado de suspensão; escrita só via suspender_pesquisador()/reativar_pesquisador() (SECURITY
-- DEFINER), nunca por este GRANT.
GRANT SELECT (
    id_usuario, cpf_criptografado, cpf_hash, tipo_vinculo, vinculo_institucional,
    titulo_academico, status_pesquisador, ativado_em,
    score_atual, score_atualizado_em,
    suspenso_ate, motivo_suspensao, suspenso_por
) ON public.perfil_pesquisador TO app_nestjs;

-- Sem DELETE em usuario, perfil_pesquisador e usuario_termo (não há policy de DELETE; ver [06-D] no
-- DOCUMENTACAO_BD.md). O DELETE de termos_de_uso está logo abaixo.
GRANT INSERT ON perfil_pesquisador, termos_de_uso TO app_nestjs;
-- [06-D-10] usuario: INSERT só nas 4 colunas que o cadastro envia; o resto (email_verificado, deletado, bloqueio, suspensão, id) nasce do DEFAULT.
GRANT INSERT (nome, email, senha_hash, id_imagem_perfil) ON public.usuario TO app_nestjs;
GRANT UPDATE ON termos_de_uso TO app_nestjs;
-- DELETE em termos_de_uso: tem a policy pol_termos_delete (04_rls_policies.sql), gateada por
-- 'termos_uso_gerenciar' (ícone de lixeira em Termos de Uso). GRANT de DELETE só existe junto com a policy
-- correspondente.
GRANT DELETE ON termos_de_uso TO app_nestjs;

-- GRANT UPDATE por coluna, não de tabela inteira: o GRANT SELECT já é restrito por coluna ([06-D-2] acima), e o
-- UPDATE também precisa ser, porque é o MESMO app_nestjs que atende o endpoint genérico de "editar meu perfil"
-- e o fluxo de autenticação. Com UPDATE de tabela inteira, um usuário comum forjaria o próprio score_atual,
-- auto-marcaria email_verificado = TRUE (bypass permanente da verificação de e-mail), limparia o próprio
-- bloqueio de login e "ressuscitaria" a própria conta excluída (deletado = FALSE).
--
-- perfil_pesquisador: mesma lista do SELECT ([06-D-2] acima) MENOS: score_atual/score_atualizado_em (só mudam
-- via recalcular_score_pesquisador(), SECURITY DEFINER, 05); status_pesquisador (só muda via
-- suspender_pesquisador(), 03, [03-P]: pol_perfil_update libera UPDATE só ao próprio dono, e o pesquisador não
-- deve se auto-suspender/reativar); cpf_criptografado e cpf_hash (só mudam via corrigir_cpf_pesquisador(),
-- SECURITY DEFINER, 03: RF-017, correção de CPF só via suporte; cpf_hash nunca entrou aqui porque muda sempre em
-- conjunto com cpf_criptografado); e suspenso_ate/motivo_suspensao/suspenso_por (só via
-- suspender_pesquisador()/reativar_pesquisador()).
GRANT UPDATE (
    tipo_vinculo, vinculo_institucional,
    titulo_academico, ativado_em
) ON public.perfil_pesquisador TO app_nestjs;

-- usuario: email_verificado, tentativas_login_falhas, bloqueado_ate, ultimo_login_em, ultimo_login_ip e deletado
-- são escritos pelo mesmo app_nestjs que atende a edição de perfil, então nenhuma lista de colunas separaria
-- "editar perfil" de "operação de autenticação". Por isso essas 6 ficam fora do GRANT e só mudam por função
-- SECURITY DEFINER ([03-O] em 03_funcoes_seguranca.sql). O GRANT direto é só do que é edição de perfil.
GRANT UPDATE (nome, id_imagem_perfil, senha_hash) ON public.usuario TO app_nestjs;

-- [06-D-2b] Funções de autenticação e de moderação (ver [03-O], [03-N], [03-P] a [03-U] em 03_funcoes_seguranca.sql):
-- o único jeito de mudar as colunas que ficaram fora do GRANT direto acima.
-- HIGIENE (vale para todo REVOKE ... FROM PUBLIC deste arquivo): função nova no Postgres nasce com EXECUTE
-- liberado para PUBLIC. Para função que apaga conta, muda estado de autenticação, escreve em nome de outra pessoa
-- ou roda sem sessão (@Cron), isso é folga desnecessária; por isso o REVOKE explícito antes do GRANT só para o
-- app_nestjs, mesmo não sendo explorável hoje (só o app_nestjs conecta ao banco).
REVOKE EXECUTE ON FUNCTION public.confirmar_email_por_token(TEXT)         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redefinir_senha_por_token(TEXT, TEXT)   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.registrar_falha_login(INT)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.liberar_bloqueio_login(INT)             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.registrar_login_sucesso(INT, TEXT)      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.excluir_conta_usuario(INT)              FROM PUBLIC;
-- registrar_aceite_termo(INT, INT, TEXT) - ver [03-D-1], usada pelo cadastro
-- público (POST /auth/cadastro, 3-auth) pra gravar o aceite de termo no
-- mesmo instante em que a conta é criada, sem sessão ainda existindo.
REVOKE EXECUTE ON FUNCTION public.registrar_aceite_termo(INT, INT, TEXT)  FROM PUBLIC;
-- suspender_pesquisador(INT, TIMESTAMPTZ, TEXT): ver [03-P].
REVOKE EXECUTE ON FUNCTION public.suspender_pesquisador(INT, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reativar_pesquisador(INT)               FROM PUBLIC;
-- reativar_pesquisadores_vencidos(): ver 05_regras_negocio.sql (@Cron, sem sessão).
REVOKE EXECUTE ON FUNCTION public.reativar_pesquisadores_vencidos()       FROM PUBLIC;
-- corrigir_cpf_pesquisador(INT, TEXT, TEXT): ver [03-Q] e o comentário do GRANT UPDATE de perfil_pesquisador acima.
REVOKE EXECUTE ON FUNCTION public.corrigir_cpf_pesquisador(INT, TEXT, TEXT) FROM PUBLIC;
-- criar_perfil_pesquisador_para_outro(...): ver [03-R].
REVOKE EXECUTE ON FUNCTION public.criar_perfil_pesquisador_para_outro(INT, TEXT, TEXT, tipo_vinculo, TEXT, titulo_academico) FROM PUBLIC;
-- alterar_perfil_pesquisador_de_outro(...): ver [03-U].
REVOKE EXECUTE ON FUNCTION public.alterar_perfil_pesquisador_de_outro(INT, tipo_vinculo, TEXT, titulo_academico) FROM PUBLIC;
-- criar_campanha_para_outro(...) / forcar_exclusao_campanha(INT): ver [03-S] e [03-T].
REVOKE EXECUTE ON FUNCTION public.criar_campanha_para_outro(INT, INT, TEXT, modelo_campanha, DECIMAL, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.forcar_exclusao_campanha(INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.comentar_campanha_para_outro(INT, INT, TEXT) FROM PUBLIC;
-- suspender_usuario / revogar_suspensao_usuario / suspender_papel_usuario / revogar_suspensao_papel_usuario: ver [03-N].
REVOKE EXECUTE ON FUNCTION public.suspender_usuario(INT, TIMESTAMPTZ, TEXT)         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revogar_suspensao_usuario(INT)                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.suspender_papel_usuario(INT, INT, TIMESTAMPTZ, TEXT) FROM PUBLIC;
-- fn_eh_ultimo_admin_ativo: usada dentro das funções acima e da trigger de usuario_papel (roda como quem apaga).
REVOKE EXECUTE ON FUNCTION public.fn_eh_ultimo_admin_ativo(INT)                   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revogar_suspensao_papel_usuario(INT, INT)         FROM PUBLIC;
-- registrar_exportacao_dados(INT): ver [03-O].
REVOKE EXECUTE ON FUNCTION public.registrar_exportacao_dados(INT)                   FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_email_por_token(TEXT)          TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.redefinir_senha_por_token(TEXT, TEXT)    TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.registrar_falha_login(INT)               TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.liberar_bloqueio_login(INT)              TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.registrar_login_sucesso(INT, TEXT)       TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.excluir_conta_usuario(INT)               TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.registrar_aceite_termo(INT, INT, TEXT)   TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.suspender_pesquisador(INT, TIMESTAMPTZ, TEXT) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.reativar_pesquisador(INT)                TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.reativar_pesquisadores_vencidos()        TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.corrigir_cpf_pesquisador(INT, TEXT, TEXT) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.criar_perfil_pesquisador_para_outro(INT, TEXT, TEXT, tipo_vinculo, TEXT, titulo_academico) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.alterar_perfil_pesquisador_de_outro(INT, tipo_vinculo, TEXT, titulo_academico) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.criar_campanha_para_outro(INT, INT, TEXT, modelo_campanha, DECIMAL, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.forcar_exclusao_campanha(INT) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.comentar_campanha_para_outro(INT, INT, TEXT) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.suspender_usuario(INT, TIMESTAMPTZ, TEXT)      TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.revogar_suspensao_usuario(INT)                 TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.suspender_papel_usuario(INT, INT, TIMESTAMPTZ, TEXT) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.fn_eh_ultimo_admin_ativo(INT)                  TO app_nestjs;
-- fn_termo_uso_pendente: RF-015, chamada pelo login e pela renovação de sessão.
REVOKE EXECUTE ON FUNCTION public.fn_termo_uso_pendente(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_termo_uso_pendente(INT) TO app_nestjs;
-- contar_aceites_termo: RF-091, a lista de Termos sabe quais versões já foram aceitas (só o número).
REVOKE EXECUTE ON FUNCTION public.contar_aceites_termo(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contar_aceites_termo(INT) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.revogar_suspensao_papel_usuario(INT, INT)      TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.registrar_exportacao_dados(INT)               TO app_nestjs;
-- usuario_termo sem UPDATE: é registro de aceite de termo, nunca deveria ser editável depois de criado (não há
-- policy de UPDATE).
GRANT INSERT ON usuario_termo TO app_nestjs;
-- usuario_papel e seguir_pesquisador sem UPDATE: só têm operação de inserir/apagar, não existe "editar" nelas
-- (não há policy de UPDATE).
GRANT INSERT, DELETE ON usuario_papel, seguir_pesquisador TO app_nestjs;

-- [06-D-3] notificacao: por que precisou de GRANT de INSERT/UPDATE (ver DOCUMENTACAO_BD.md)
GRANT INSERT, UPDATE ON notificacao TO app_nestjs;

-- [06-D-4] verificacao_email / recuperacao_senha / sessao: por que têm GRANT próprio (ver DOCUMENTACAO_BD.md)
-- DELETE: mesmo com a policy das 3 sendo FOR ALL, o GRANT precisa dele. Sem ele, um token de recuperação de
-- senha expirado nunca sai da tabela, e o índice parcial uq_recuperacao_senha_ativo_por_usuario (02) só permite 1
-- token não usado por vez: quem pede recuperação, não usa o link e pede de novo travaria com erro de unicidade,
-- sem nenhum jeito de o app limpar o token velho antes. Dois usos previstos: (1) apagar o token de recuperação
-- anterior no ato, quando um novo é pedido (não marcar usado_em à força: a coluna mentiria sobre o que de fato
-- aconteceu); (2) expurgo periódico por retenção (RNF-003: dado pessoal só pelo tempo necessário; sessao guarda
-- IP/user-agent). Como as policies são USING (true), o DELETE vale para qualquer linha de qualquer usuário: o
-- expurgo do NestJS precisa ser sempre uma consulta fixa com WHERE explícito em data (nunca um filtro
-- dinâmico). Janela sugerida: verificacao_email/recuperacao_senha, 30 dias após confirmado/usado/expirado;
-- sessao, 90 dias após revogado/expirado (margem para investigar incidente de segurança).
GRANT SELECT, INSERT, UPDATE, DELETE ON verificacao_email, recuperacao_senha, sessao TO app_nestjs;

-- ============================================================================
--  [06-E] CAMPANHA
-- ============================================================================
-- Só seguir_campanha e comentario têm policy de DELETE nesse bloco; as demais não têm DELETE concedido (ver [06-E] no
-- DOCUMENTACAO_BD.md). repasse não tem UPDATE aqui: é dinheiro saindo (mesmo raciocínio de contribuicao,
-- [06-H]) e pol_repasse_update (04) é USING(true); status/repassado_em só mudam via
-- atualizar_status_repasse() (05, SECURITY DEFINER, [05-K-2]).
GRANT INSERT, UPDATE ON
    atualizacao_campanha,
    comentario,
    recompensa
TO app_nestjs;
-- solicitacao_encerramento: o dono cria o pedido só com a campanha e a justificativa, e só muda o status (para
-- cancelar, fn_valida_transicao_solicitacao, 05). Aprovar, rejeitar e o encerramento direto são funções (03).
GRANT INSERT (id_campanha, justificativa_pesquisador) ON solicitacao_encerramento TO app_nestjs;
GRANT UPDATE (status) ON solicitacao_encerramento TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.encerrar_campanha_sem_contribuicao(INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.encerrar_campanha_sem_contribuicao(INT, TEXT) TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.decidir_solicitacao_encerramento(INT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decidir_solicitacao_encerramento(INT, BOOLEAN, TEXT) TO app_nestjs;
-- denuncia: quem denuncia grava só autor, alvo, motivo e relato (a denúncia nasce pendente, sem contestação); quem
-- julga só muda o status e a justificativa (pol_denuncia_update, 04). A contestação só pelas funções (03).
GRANT INSERT (id_usuario, id_campanha_alvo, id_pesquisador_alvo, id_motivo, relato) ON denuncia TO app_nestjs;
GRANT UPDATE (status, justificativa_moderacao) ON denuncia TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.encerrar_campanha_por_denuncia(INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.encerrar_campanha_por_denuncia(INT, TEXT) TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.contestar_denuncia(INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contestar_denuncia(INT, TEXT) TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.decidir_contestacao(INT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decidir_contestacao(INT, BOOLEAN, TEXT) TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.denuncias_contra_mim() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.denuncias_contra_mim() TO app_nestjs;
-- comentario tem DELETE: pol_comentario_delete (04) restringe ao dono da campanha e a comentário ativo.
GRANT DELETE ON comentario TO app_nestjs;
-- historico_rejeicao: só INSERT. Histórico de moderação é imutável, e nenhum código faz UPDATE nele (a policy de
-- UPDATE também não existe em 04).
GRANT INSERT ON historico_rejeicao TO app_nestjs;
-- campanha tem DELETE: pol_campanha_delete (04) restringe a 'rascunho' + dono/campanha_editar; sem este GRANT a
-- policy nunca chega a ser avaliada (mesmo padrão do comentário de orcamento_campanha/marco_cronograma logo
-- abaixo).
GRANT DELETE ON campanha TO app_nestjs;
-- INSERT por coluna: só o que o pesquisador preenche ao criar. Status, aprovação, valores calculados e datas de
-- carimbo ficam de fora, então toda campanha nasce 'rascunho' (o DEFAULT) e só chega à fila ou ao ar pelas
-- transições que fn_valida_transicao_campanha e fn_valida_completude_campanha (05) conferem.
GRANT INSERT (
    id_usuario, id_area_conhecimento, titulo, modelo, meta_financeira,
    descricao, data_inicio, data_fim, video_apresentacao_url
) ON campanha TO app_nestjs;
-- UPDATE por coluna: campo calculado (valor_bruto_arrecadado, taxa_plataforma, encerrado_em, enviado_aprovacao_em) e imutável (modelo,
-- id_usuario) só mudam por função SECURITY DEFINER ou trigger. Ver DOCUMENTACAO_BD.md [05-K-2-C].
GRANT UPDATE (
    titulo, descricao, id_area_conhecimento, meta_financeira,
    data_inicio, data_fim, video_apresentacao_url,
    status, aprovado_em, id_admin
) ON campanha TO app_nestjs;
GRANT INSERT ON repasse TO app_nestjs;

-- orcamento_campanha/marco_cronograma (01, [01-E]) ganham DELETE também: o pesquisador precisa poder remover um
-- item de orçamento/marco antes de reenviar a campanha para aprovação (as policies de DELETE em 04 existem; sem
-- este GRANT a policy nunca chega a ser avaliada e o DELETE falha com "permission denied").
GRANT INSERT, UPDATE, DELETE ON orcamento_campanha, marco_cronograma TO app_nestjs;

REVOKE EXECUTE ON FUNCTION public.atualizar_status_repasse(INT, VARCHAR, TIMESTAMP) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.atualizar_status_repasse(INT, VARCHAR, TIMESTAMP) TO app_nestjs;

-- Funções chamadas por agendamento (@Cron no NestJS), sem sessão de usuário: encerrar_campanhas_vencidas(),
-- expirar_campanhas_rascunho(), expirar_campanhas_rejeitadas() e limpar_log_auditoria(). Mesma higiene de [06-D-2b].
REVOKE EXECUTE ON FUNCTION public.encerrar_campanhas_vencidas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.encerrar_campanhas_vencidas() TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.expirar_contribuicoes_pendentes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expirar_contribuicoes_pendentes() TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.expirar_campanhas_rascunho() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expirar_campanhas_rascunho() TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.expirar_campanhas_rejeitadas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expirar_campanhas_rejeitadas() TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.limpar_ip_aceite_contribuicao() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.limpar_ip_aceite_contribuicao() TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.limpar_log_auditoria() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.limpar_log_auditoria() TO app_nestjs;
-- deslizar_datas_campanha(): chamada pelo pesquisador pelo Nest. Quem pode usar é decidido DENTRO da função
-- (dono + status).
REVOKE EXECUTE ON FUNCTION public.deslizar_datas_campanha(INT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deslizar_datas_campanha(INT, TIMESTAMPTZ) TO app_nestjs;
-- fn_campanha_reenvios_esgotados(): chamada de dentro de triggers que rodam como quem fez a escrita (dono ou
-- admin), por isso o app_nestjs precisa de EXECUTE. SECURITY DEFINER: enxerga o histórico independente da RLS de
-- quem chama.
REVOKE EXECUTE ON FUNCTION public.fn_campanha_reenvios_esgotados(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_campanha_reenvios_esgotados(INT) TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.fn_campanha_situacao_reenvio(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_campanha_situacao_reenvio(INT) TO app_nestjs;
-- fn_campanha_campos_bloqueados / fn_campanha_erro_congelamento: chamadas pela trigger de congelamento (roda como
-- quem escreve) e por GET /campanha/:id.
REVOKE EXECUTE ON FUNCTION public.fn_campanha_campos_bloqueados(public.campanha) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_campanha_campos_bloqueados(public.campanha) TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.fn_campanha_erro_congelamento(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_campanha_erro_congelamento(TEXT, BOOLEAN) TO app_nestjs;
-- fn_usuario_excluido: chamada pela trigger de transição de campanha (roda como quem escreve).
REVOKE EXECUTE ON FUNCTION public.fn_usuario_excluido(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_usuario_excluido(INT) TO app_nestjs;
-- seguir_campanha sem UPDATE: só existe inserir/apagar "seguir campanha", não faz sentido "editar" essa linha
-- (não há policy de UPDATE).
GRANT INSERT, DELETE ON seguir_campanha TO app_nestjs;

-- ============================================================================
--  [06-F] LINK
-- ============================================================================
GRANT INSERT, UPDATE, DELETE ON
    link_academico, link_atualizacao, link_recompensa
TO app_nestjs;

-- ============================================================================
--  [06-G] ARQUIVO
-- ============================================================================
-- Nenhuma das duas tem policy de DELETE (ver [06-G] no DOCUMENTACAO_BD.md).
GRANT INSERT, UPDATE ON
    arquivo_atualizacao, arquivo_recompensa
TO app_nestjs;

-- ============================================================================
--  [06-H] CONTRIBUIÇÃO
-- ============================================================================
-- Nenhuma das quatro tem policy de DELETE (ver [06-H] no DOCUMENTACAO_BD.md). contribuicao não tem UPDATE aqui:
-- GRANT UPDATE de tabela inteira + pol_contribuicao_update USING(true) (04) deixava qualquer usuário confirmar a
-- própria doação (ou a de qualquer um) direto por UPDATE, e a página pública passaria a exibir arrecadação sem
-- pagamento real. status/id_transacao_api só mudam via atualizar_status_contribuicao() (05, SECURITY DEFINER,
-- [05-K-2]); ver GRANT EXECUTE mais abaixo.
-- auditoria_financeira continua com GRANT UPDATE de tabela inteira, de propósito: a escrita financeira fica para o
-- módulo de pagamento (ver PENDENCIAS, "Validação de escrevibilidade financeira").
GRANT INSERT ON contribuicao TO app_nestjs;
GRANT INSERT, UPDATE ON auditoria_financeira TO app_nestjs;

REVOKE EXECUTE ON FUNCTION public.atualizar_status_contribuicao(INT, status_contribuicao, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.atualizar_status_contribuicao(INT, status_contribuicao, VARCHAR) TO app_nestjs;
-- contribuicao_recompensa e aceite_termo_contribuicao sem UPDATE: são registro de auditoria/aquisição, não
-- deveriam ser editáveis depois de criados (04 não tem policy de UPDATE para elas).
GRANT INSERT ON contribuicao_recompensa, aceite_termo_contribuicao TO app_nestjs;

-- ============================================================================
--  [06-I] SCORE
-- ============================================================================
-- Nenhuma das duas tem policy de DELETE (ver [06-I] no DOCUMENTACAO_BD.md).
-- A tela do score edita só peso e ativo dos itens (nome e id_pai são a estrutura que o motor lê) e o texto e os
-- limites das faixas.
GRANT INSERT ON score_config, score_rotulo TO app_nestjs;
GRANT UPDATE (peso, ativo) ON score_config TO app_nestjs;
GRANT UPDATE (rotulo, descricao, score_minimo, score_maximo) ON score_rotulo TO app_nestjs;

-- NOTA: score_pesquisador não recebe GRANT de tabela direto - toda escrita
-- passa pela função recalcular_score_pesquisador() (SECURITY DEFINER, ver
-- 05_regras_negocio.sql), que grava com os privilégios de quem criou a
-- função, não com os de app_nestjs.

-- [06-I-1] Funções do motor de score: por que precisam de GRANT EXECUTE (ver DOCUMENTACAO_BD.md)
-- As duas escrevem (score_pesquisador/perfil_pesquisador): recalcular_todos_os_scores() em especial, sem custo
-- nenhum para quem chama, seria negação de serviço barata se ficasse aberta a PUBLIC (percorre todos os
-- pesquisadores a cada chamada). REVOKE explícito, mesma higiene de [06-D-2b] e de atribuir_papel_padrao (08).
REVOKE EXECUTE ON FUNCTION public.recalcular_score_pesquisador(INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalcular_todos_os_scores()     FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalcular_score_pesquisador(INT) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.recalcular_todos_os_scores()     TO app_nestjs;

-- contar_seguidores_pesquisador: contagem agregada de seguidores, chamada diretamente pelo NestJS para exibir "N
-- seguidores" sem expor quem segue (ver [03-E]). Tecnicamente redundante com o padrão default do Postgres (EXECUTE
-- em função nova já é PUBLIC por padrão, por isso usuario_visivel/tem_permissao não aparecem aqui), mas mantido
-- explícito pelo mesmo motivo do GRANT acima: são funções chamadas diretamente como RPC pela aplicação, não só
-- usadas dentro de policy.
GRANT EXECUTE ON FUNCTION public.contar_seguidores_pesquisador(INT) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.contar_seguidores_campanha(INT)    TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.fn_precisa_revisao_score(INT)      TO app_nestjs;

-- contar_metricas_dashboard() ([03-M]): mesmo motivo do GRANT acima, RPC chamada direto pelo GET
-- /dashboard/resumo.
GRANT EXECUTE ON FUNCTION public.contar_metricas_dashboard() TO app_nestjs;

-- NOTA: o GRANT EXECUTE de atribuir_papel_padrao() fica junto da
-- própria função em 08_trigger_signup_usuario.sql, não aqui - esse
-- arquivo roda ANTES do 08 (ver ordem de dependência no cabeçalho),
-- e a função ainda não existiria neste ponto da execução.

-- ============================================================
-- [06-L] LOG DE AUDITORIA
-- ============================================================
-- Só SELECT, de propósito: sem GRANT INSERT/UPDATE/DELETE para ninguém, nunca (nem admin). Quem grava é a trigger
-- SECURITY DEFINER fn_log_auditoria() (05_regras_negocio.sql [05-L]), que não precisa de GRANT para app_nestjs
-- porque roda com o privilégio de quem CRIOU a função. Um log que a própria aplicação consegue alterar ou apagar
-- não serve como prova de nada: a proteção real está em NÃO EXISTIR o caminho, não em a RLS bloquear um caminho
-- que existe. Ver 01_extensoes_enums_tabelas.sql [01-L].
GRANT SELECT ON log_auditoria TO app_nestjs;

-- fn_fator_subitem: EXECUTE só para app_nestjs (higiene de [06-D-2b]).
REVOKE EXECUTE ON FUNCTION public.fn_fator_subitem(INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_fator_subitem(INT, TEXT) TO app_nestjs;

-- desativar_arquivos_orfaos() (05, [05-G]): @Cron diário, sem sessão (higiene de [06-D-2b]).
REVOKE EXECUTE ON FUNCTION public.desativar_arquivos_orfaos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.desativar_arquivos_orfaos() TO app_nestjs;
