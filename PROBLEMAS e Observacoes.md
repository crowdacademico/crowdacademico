

## 14-07-2026

Lista consolidada — problemas reais confirmados por ambas as análises
1. arquivo e arquivo_atualizacao sem caminho de escrita (INSERT/UPDATE/DELETE)

Falta em 05_grants.sql: nenhum GRANT de INSERT/UPDATE/DELETE pra essas duas tabelas.
Falta em 04_rls_policies.sql: só existe pol_arquivo_select. Nenhuma policy de INSERT/UPDATE/DELETE pra arquivo, nem qualquer policy pra arquivo_atualizacao.
Impacto: upload de imagem de perfil, anexo de atualização de campanha e qualquer gravação de arquivo quebra hoje, mesmo com o restante do fluxo correto.

2. contribuicao e contribuicao_recompensa sem policy de UPDATE/DELETE (o mais crítico dos três)

GRANT de tabela existe em 05_grants.sql, mas falta a policy de RLS correspondente em 04_rls_policies.sql — e os dois níveis são exigidos juntos no Postgres.
Impacto: o próprio fluxo core do sistema (webhook confirma PIX → UPDATE contribuicao SET status='confirmado', RNF-006) fica bloqueado pela RLS.

3. pol_contribuicao_anon_select presa ao modelo antigo PostgREST

Usa current_setting('request.headers', true)::json->>'x-session-token', que só era populado automaticamente pelo PostgREST/GoTrue.
Depois da migração pra auth própria (padrão SET LOCAL app.id_usuario_atual documentado no PLANO_AUTENTICACAO_PROPRIA.md), essa policy específica ficou para trás e não foi adaptada ao novo padrão.
Impacto: contribuição anônima (RU-03/RU-04, um dos pilares do projeto) pode não conseguir ser consultada pelo próprio contribuinte anônimo depois.




Ponto real, mas só documentação (baixa prioridade)

4. Comentários de cabeçalho "Próximo arquivo" desatualizados

05_grants.sql aponta pra 06_score_engine_triggers.sql (não existe mais, virou 06b_regras_negocio.sql)
07_seed_dados.sql aponta pra 08_passo_manual_admin.sql (não existe, o real é 08_trigger_signup_usuario.sql)