

## 14-07-2026

O que eu concordo com o Claude
arquivo e arquivo_atualizacao sem escrita liberada
Verifiquei que em 05_grants.sql a lista de GRANT INSERT, UPDATE, DELETE não inclui arquivo nem arquivo_atualizacao.
Em 04_rls_policies.sql, existe apenas pol_arquivo_select para arquivo.
Isso é um problema real de fluxo, principalmente para upload/foto/anexo.
contribuicao e contribuicao_recompensa sem UPDATE/DELETE via RLS
Verifiquei que em 04_rls_policies.sql existem políticas de SELECT e INSERT, mas não de UPDATE/DELETE.
O grant existe em 05_grants.sql, mas no Postgres isso não basta sozinho porque RLS também precisa ser liberada.
Este é o achado mais importante da lista.
request.headers na policy anônima
Verifiquei que a policy ainda usa current_setting('request.headers', true) em 04_rls_policies.sql.
Isso realmente parece um resíduo do modelo antigo do Supabase/PostgREST, então é um ponto legítimo de revisão.
O que o Claude acertou parcialmente
Cabeçalhos/observações desatualizados
Isso é real, mas o local exato não é 06b_regras_negocio.sql.
Os trechos desatualizados aparecem em 05_grants.sql e 07_seed_dados.sql.
O que eu não acho um problema real
SECURITY DEFINER em id_usuario_atual() e eh_admin()
Não vejo isso como um bug aqui. O padrão atual está consistente e não parece um ponto de falha.
SQL dinâmico no trigger de tipo_link
Também não vejo isso como risco real no código atual.
Resumo curto
A análise do Claude está bem perto do que eu vejo no repositório:

3 pontos realmente relevantes: arquivo, contribuicao/contribuicao_recompensa e request.headers.
1 ponto real, mas só de documentação: cabeçalhos desatualizados.
2 pontos que parecem ruído/alarme exagerado.