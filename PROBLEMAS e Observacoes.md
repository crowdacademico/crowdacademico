
- Detalhes que meu Claude achou, ainda não corrigi

# Lista completa e atual (nada mudou, nada foi corrigido ainda)

# CORRIGIDOS na branch AUTH:

🔴 1. Condição de corrida em fn_sincroniza_arrecadado_campanha (novo, achado do Gemini nesta última rodada)

Precisa de SELECT ... FOR UPDATE na linha da campanha antes de recalcular o SUM, senão duas contribuições confirmadas ao mesmo tempo podem "sumir" uma com a outra no total.
🔴 2. Migração de 04_rls_policies.sql/05_grants.sql de anon/authenticated para app_nestjs (pendência antiga, continua aberta)

🔴 3. Políticas RLS ausentes em verificacao_email, recuperacao_senha, sessao (pendência antiga, continua aberta)

🔴 4. atribuir_papel_padrao(INT) sem GRANT EXECUTE (pendência antiga, continua aberta)

🟡 5. Faltam índices em token_hash/refresh_token_hash (pendência antiga, continua aberta)

# PENDENTES

🟡 6. Comentários fantasmas, como o referenciando 09_auth_propria.sql, arquivo que não existe (pendência antiga, continua aberta)

💡 7. Melhorias opcionais, não bloqueiam nada:

CHECK (expira_em > criado_em) nas 3 tabelas novas
Índice parcial garantindo só 1 token de recuperação "ativo" por usuário