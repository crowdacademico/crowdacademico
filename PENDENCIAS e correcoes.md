#### Pendências reais do sistema (só o que falta)

*(Atualizado após a reorganização + revisão completa de `01` a `04` com o Claude Code)*

No .sql:

1. Permissão `campanha_encerrar` sem policy de RLS — única pendente de verdade de um grupo original de 5 (as outras 4 já são consideradas resolvidas por design, ver discussão abaixo). Falta decidir: ela é redundante com `solicitacao_encerramento_decidir` (que já existe e já funciona), ou deveria liberar um encerramento direto de campanha via `UPDATE`, sem passar pela solicitação formal?
2. Senha placeholder `'TROCAR_NO_AMBIENTE_REAL'` na criação da role `app_nestjs` em `01_extensoes_enums_tabelas.sql` (só risco fora do ambiente local).
3. `tipo_link` com só 5 de 7 tipos seedados (faltam "Site Institucional" e "Outro") em `07_seed_dados.sql`.
4. Debate `tipo_link`/`contexto_link` (2 tabelas novas) — adiado, não mexer sem pedir.
5. **[novo]** Três índices redundantes em `02_indices.sql` (também registrado em `CLAUDE-CODE-DESCOBERTAS.md`):
   - `idx_seguir_pesquisador_usuario` — redundante, `id_usuario` já é a 1ª coluna do `UNIQUE(id_usuario, id_pesquisador)`.
   - `idx_score_pesq_usuario` — redundante pelo mesmo motivo (`UNIQUE(id_usuario, id_score_config)`); se a intenção era acelerar consulta por critério de score, o índice certo seria em `id_score_config`.
   - `idx_aceite_termo_contribuicao_contribuicao` — duplicado puro do índice que o `UNIQUE (id_contribuicao)` já cria sozinho.
   Não quebram nada, só ocupam espaço à toa. Decisão de remover é sua.
6. **[novo]** Comentários internos de `05_regras_negocio.sql`, `06_grants.sql`, `07_seed_dados.sql` e `08_trigger_signup_usuario.sql` citam nomes de arquivo que não existem no disco (`05_grants.sql`, `06_score_engine_triggers.sql`, `06b_regras_negocio.sql`) — parecem sobra de uma reorganização de ordem (GRANTs antes do motor de score) que foi cogitada e nunca terminada. **Testado e confirmado que a ordem real no disco está certa** — `06_grants.sql` faz `GRANT EXECUTE` em funções que só existem depois que `05_regras_negocio.sql` roda, então invertê-los quebraria o script. Só os comentários precisam de higienização (ver discussão abaixo).

### EU TIREI AS ASPAS, depois quando for revisar as pendencias, tem que apagar este 7, vamos padronizar para ficar sem aspas
7. **[novo]** Nomes de policy com aspas inconsistentes em `04_rls_policies.sql`: `"pol_score_config_select"` e `"pol_score_rotulo_select"` usam aspas duplas, as outras ~103 policies não. Cosmético, sem efeito funcional.
### EU TIREI AS ASPAS, depois quando for revisar as pendencias, tem que apagar este 7, vamos padronizar para ficar sem aspas

8. Reorganização de comentários — **atualizado**: `01`, `02` (parcial) `03` e `04` já migrados para o `DOCUMENTACAO_BD.md`, com prova mecânica de que nenhuma linha de SQL foi alterada no processo. Faltam `05`, `06`, `07` e `08`.

Só resolve em código Nest/React (ainda não existem):
9. `SET LOCAL app.id_usuario_atual` por requisição (dentro de uma transação, usando um `Client` específico da pool).
10. Fluxo de autenticação completo (signup, login, verificação de e-mail, recuperação de senha, refresh token).
11. Guards/interceptors no NestJS espelhando `tem_permissao()`.
12. Garantir que a conexão do backend use sempre `app_nestjs`, nunca superusuário.
13. Validação de escrevibilidade financeira: `auditoria_financeira` e `repasse` têm policies de escrita `USING (true)` — a RLS não valida quem grava aí, fica 100% a cargo do serviço do NestJS.

Decisões suas, não bugs:
14. React em JavaScript ou TypeScript.
15. Pool direto no Service (só nota de melhoria futura, não urgente).


## Sobre a 1.

Sobre o item 1: 5 permissões sem policy de RLS: campanha_encerrar, perfil_pesquisador_visualizar_sensivel, sessao_revogar, recuperacao_senha_revogar, verificacao_email_reenviar.

 - Eu perguntei pro CLAUDE: Vc acha que pode mandar a IA do VSCode consertar agora? ia quebrar alguma coisa? é simples?

Não é tão simples quanto parece — não é "esqueceu de escrever a policy", é que ninguém decidiu ainda o que cada permissão deveria liberar. Mandar a IA "consertar" sem isso é arriscado: ela vai ter que adivinhar a regra, e pode acertar errado.

Separando as 5:

sessao_revogar, recuperacao_senha_revogar, verificacao_email_reenviar — essas 3 tabelas já têm policy FOR ALL USING (true) de propósito (o próprio projeto decidiu que a autorização desses fluxos fica no NestJS, não na RLS, porque acontecem antes do login existir). Criar uma policy pra essas permissões seria redundante, não quebra nada, mas também não muda nada — a USING(true) já libera geral. Não vale a pena mexer.
perfil_pesquisador_visualizar_sensivel — já está resolvida: o cpf_criptografado já foi excluído do GRANT SELECT geral (`06_grants.sql`, linhas 63-66 — confirmado nesta revisão). Criar uma policy de RLS pra isso não encaixa bem (é proteção de coluna, não de linha) — mexer aqui de novo é mais risco que benefício agora.
campanha_encerrar — essa sim é a única em aberto de verdade, mas exige uma decisão sua antes: ela é redundante com solicitacao_encerramento_decidir (que já existe e já funciona), ou deveria liberar um encerramento direto, sem passar pela solicitação? Sem essa resposta, a IA vai ter que chutar.

Minha recomendação: não mande "consertar" agora. As 3 primeiras eu deixaria como estão (funcionam por design). A perfil_pesquisador_visualizar_sensivel eu consideraria resolvida. Só a campanha_encerrar precisa de uma resposta sua — aí sim vira uma tarefa de 1 linha pra IA.


## Sobre o item 6 (bagunça de nomes de arquivo em 05/06/07/08)

Alguém (provavelmente outra sessão de IA) parece ter cogitado inverter a ordem de execução — rodar os GRANTs antes do motor de score/triggers — e atualizou só os comentários dos 4 arquivos pra refletir essa ideia nova, sem nunca renomear os arquivos de fato nem terminar a mudança. As pistas exatas:

- `05_regras_negocio.sql` (linha 2) se autodenomina "06b: MOTOR DE SCORE...", diz que depende de `05_grants.sql` e que o próximo é `06_grants.sql`.
- `06_grants.sql` (linha 2) se autodenomina "05: GRANTS", diz que o próximo é `06_score_engine_triggers.sql`.
- `07_seed_dados.sql` (linhas 61 e 131) cita "06b_regras_negocio.sql".
- `08_trigger_signup_usuario.sql` (linha 54) cita "05_grants.sql".

Nenhum desses nomes existe no disco. Testei tecnicamente se a inversão sugerida pelos comentários funcionaria: não funciona. `06_grants.sql` faz `GRANT EXECUTE ON FUNCTION public.recalcular_score_pesquisador(INT)` e `GRANT EXECUTE ON FUNCTION public.recalcular_todos_os_scores()` — essas duas funções só existem depois que `05_regras_negocio.sql` roda e as cria. Se os GRANTs rodassem antes (como os comentários sugerem), essas duas linhas dariam erro de "função não existe". Confirmei também que `05_regras_negocio.sql` não tem nenhuma referência a `app_nestjs` ou `GRANT` — ou seja, não precisa dos grants pra rodar.

**Conclusão: a ordem real no disco (`05_regras_negocio` → `06_grants`) está certa e não deve mudar.** Só os comentários dentro de 4 arquivos diferentes contam uma história diferente da que realmente acontece — fica pra higienizar quando formos mexer no `05`.
