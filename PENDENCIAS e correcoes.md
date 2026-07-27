#### Pendências reais do sistema (só o que falta)

*(Atualizado após a reorganização + revisão completa de `01` a `08` com o Claude Code)*

No .sql:

1. **[RESOLVIDO]** Permissão `campanha_encerrar` sem policy de RLS — decidido remover a permissão (era órfã, nunca usada por nenhuma policy) em vez de implementar um atalho de encerramento direto. Detalhamento completo (como era, por que existia, por que essa foi a decisão) na seção "Sobre a 1." mais abaixo, e em `DOCUMENTACAO_BD.md` (`[04-E]`/`[07-B-2]`).
2. Senha placeholder `'TROCAR_NO_AMBIENTE_REAL'` na criação da role `app_nestjs` em `01_extensoes_enums_tabelas.sql` (só risco fora do ambiente local).
3. `tipo_link` com só 5 de 7 tipos seedados (faltam "Site Institucional" e "Outro") em `07_seed_dados.sql`.
4. Debate `tipo_link`/`contexto_link` (2 tabelas novas) — adiado, não mexer sem pedir.
5. **[CORRIGIDO]** Três índices redundantes em `02_indices.sql` foram removidos (`idx_seguir_pesquisador_usuario`, `idx_score_pesq_usuario`, `idx_aceite_termo_contribuicao_contribuicao`). Detalhamento completo — pensado especificamente pra explicar pra quem escreveu essa parte do arquivo (índices) o motivo de cada remoção — na seção **"Sobre o item 5 (índices redundantes removidos)"** mais abaixo.
6. **[CORRIGIDO]** Comentários internos de `05_regras_negocio.sql`, `06_grants.sql`, `07_seed_dados.sql` e `08_trigger_signup_usuario.sql` citavam nomes de arquivo que não existem no disco (`05_grants.sql`, `06_score_engine_triggers.sql`, `06b_regras_negocio.sql`) — sobra de uma reorganização de ordem (GRANTs antes do motor de score) que foi cogitada e nunca terminada. A ordem real no disco (`05_regras_negocio` → `06_grants`) foi testada e confirmada correta (ver discussão abaixo) — os 4 cabeçalhos já foram corrigidos para se autoidentificarem certo.

7. **[RESOLVIDO]** Nomes de policy com aspas inconsistentes em `04_rls_policies.sql` (`"pol_score_config_select"` e `"pol_score_rotulo_select"` usavam aspas duplas, diferente das outras ~103 policies) — já padronizado, confirmado que não sobra nenhuma policy com aspas no arquivo.

8. **[CONCLUÍDO]** Reorganização de comentários: `01` a `08` — todos os 8 arquivos já foram migrados para o `DOCUMENTACAO_BD.md` (blocos `[NN-Y]`/`[NN-Y-N]`), com prova mecânica de que nenhuma linha de SQL foi alterada no processo em nenhum deles. `05` e `08` também ganharam docstring padronizada (Função/Assinatura/Bloco/Regra) em cada função/trigger.
9. **[RESOLVIDO]** `comentario` — autor podia reverter a própria moderação: a policy `pol_comentario_update` (04) libera `UPDATE` pro próprio autor sem restringir coluna, então quem tinha um comentário ocultado (`ativo = FALSE`) por moderação conseguia religar sozinho com um `UPDATE ... SET ativo = TRUE`. Corrigido com uma trigger nova. Detalhamento completo (como era/como ficou/por quê) na seção "Sobre o item 9" mais abaixo, em `CLAUDE-CODE-DESCOBERTAS.md` (Achado 4) e em `DOCUMENTACAO_BD.md` (`[04-E-4]`/`[05-K-3]`).
10. **[CORRIGIDO]** `07_seed_dados.sql` não desligava a trigger `trg_sincroniza_arrecadado_campanha` ao inserir o histórico de `contribuicao` — ela recalculava e sobrescrevia os valores de `valor_bruto_arrecadado` digitados a mão no seed (ex.: campanha 1 caía de 52.300 pra 7.300). Detalhado em `CLAUDE-CODE-DESCOBERTAS.md` (Achado 5). Já corrigido: a trigger agora é desligada/religada junto das outras duas do mesmo bloco `[07-H-1]`.

Só resolve em código Nest/React (ainda não existem):
11. `SET LOCAL app.id_usuario_atual` por requisição (dentro de uma transação, usando um `Client` específico da pool).
12. Fluxo de autenticação completo (signup, login, verificação de e-mail, recuperação de senha, refresh token).
13. Guards/interceptors no NestJS espelhando `tem_permissao()`.
14. Garantir que a conexão do backend use sempre `app_nestjs`, nunca superusuário.
15. Validação de escrevibilidade financeira: `auditoria_financeira` e `repasse` têm policies de escrita `USING (true)` — a RLS não valida quem grava aí, fica 100% a cargo do serviço do NestJS.

Decisões suas, não bugs:
16. React em JavaScript ou TypeScript.
17. Pool direto no Service (só nota de melhoria futura, não urgente).


## Sobre a 1.

Sobre o item 1: 5 permissões sem policy de RLS: campanha_encerrar, perfil_pesquisador_visualizar_sensivel, sessao_revogar, recuperacao_senha_revogar, verificacao_email_reenviar.

 - Eu perguntei pro CLAUDE: Vc acha que pode mandar a IA do VSCode consertar agora? ia quebrar alguma coisa? é simples?

Não é tão simples quanto parece — não é "esqueceu de escrever a policy", é que ninguém decidiu ainda o que cada permissão deveria liberar. Mandar a IA "consertar" sem isso é arriscado: ela vai ter que adivinhar a regra, e pode acertar errado.

Separando as 5:

sessao_revogar, recuperacao_senha_revogar, verificacao_email_reenviar — essas 3 tabelas já têm policy FOR ALL USING (true) de propósito (o próprio projeto decidiu que a autorização desses fluxos fica no NestJS, não na RLS, porque acontecem antes do login existir). Criar uma policy pra essas permissões seria redundante, não quebra nada, mas também não muda nada — a USING(true) já libera geral. Não vale a pena mexer.
perfil_pesquisador_visualizar_sensivel — já está resolvida: o cpf_criptografado já foi excluído do GRANT SELECT geral (`06_grants.sql`, linhas 63-66 — confirmado nesta revisão). Criar uma policy de RLS pra isso não encaixa bem (é proteção de coluna, não de linha) — mexer aqui de novo é mais risco que benefício agora.
campanha_encerrar — essa era a única em aberto de verdade, e já foi decidida e resolvida.

**[RESOLVIDO] Decisão tomada sobre campanha_encerrar:** removida do seed, não implementada.

- **Como era:** a permissão existia (`07_seed_dados.sql`, atribuída ao papel `admin`), mas nenhuma policy de RLS a usava — não fazia nada na prática.
- **As duas opções que estavam na mesa:** (a) ela era redundante com `solicitacao_encerramento_decidir` (que já existe, já funciona, já registra justificativa) — nesse caso, só remover; (b) ela deveria virar um atalho de encerramento direto via `UPDATE`, sem passar pela solicitação formal — nesse caso, precisaria de uma policy nova.
- **Como decidimos:** olhando como Catarse e Experiment (referências do projeto) tratam encerramento de campanha — nenhuma das duas dá a um admin um botão de "encerrar na marra" sem justificativa, exatamente porque tem dinheiro de apoiador envolvido e isso precisa ser auditável. O projeto já tem o fluxo certo (`solicitacao_encerramento` + `historico_rejeicao`, com justificativa registrada); criar um atalho paralelo enfraqueceria esse rastro sem necessidade real.
- **O que foi feito:** `campanha_encerrar` foi removida de `07_seed_dados.sql` (do `INSERT INTO permissao` e do `INSERT INTO papel_permissao` que a dava ao admin). Como a permissão nunca era checada em nenhuma policy, essa remoção não muda nenhum comportamento do sistema hoje — só elimina uma permissão morta.
- **O que isso significa daqui pra frente:** encerrar uma campanha antes do prazo natural só é possível pelo caminho formal (`solicitacao_encerramento_decidir`). Não existe (e nunca existiu de fato) um atalho direto de admin.

Detalhamento técnico completo: `DOCUMENTACAO_BD.md`, seção `[04-E]` (nota "Permissão `campanha_encerrar` removida") e seção `[07-B-2]`.


## Sobre o item 6 (bagunça de nomes de arquivo em 05/06/07/08)

Alguém (provavelmente outra sessão de IA) parece ter cogitado inverter a ordem de execução — rodar os GRANTs antes do motor de score/triggers — e atualizou só os comentários dos 4 arquivos pra refletir essa ideia nova, sem nunca renomear os arquivos de fato nem terminar a mudança. As pistas exatas:

- `05_regras_negocio.sql` (linha 2) se autodenomina "06b: MOTOR DE SCORE...", diz que depende de `05_grants.sql` e que o próximo é `06_grants.sql`.
- `06_grants.sql` (linha 2) se autodenomina "05: GRANTS", diz que o próximo é `06_score_engine_triggers.sql`.
- `07_seed_dados.sql` (linhas 61 e 131) cita "06b_regras_negocio.sql".
- `08_trigger_signup_usuario.sql` (linha 54) cita "05_grants.sql".

Nenhum desses nomes existe no disco. Testei tecnicamente se a inversão sugerida pelos comentários funcionaria: não funciona. `06_grants.sql` faz `GRANT EXECUTE ON FUNCTION public.recalcular_score_pesquisador(INT)` e `GRANT EXECUTE ON FUNCTION public.recalcular_todos_os_scores()` — essas duas funções só existem depois que `05_regras_negocio.sql` roda e as cria. Se os GRANTs rodassem antes (como os comentários sugerem), essas duas linhas dariam erro de "função não existe". Confirmei também que `05_regras_negocio.sql` não tem nenhuma referência a `app_nestjs` ou `GRANT` — ou seja, não precisa dos grants pra rodar.

**Conclusão: a ordem real no disco (`05_regras_negocio` → `06_grants`) está certa e não deve mudar.** Os comentários dentro dos 4 arquivos já foram higienizados — cada cabeçalho hoje se autoidentifica com o nome de arquivo correto.


## Sobre o item 5 (índices redundantes removidos de `02_indices.sql`)

*(Esta seção é pra quem escreveu a parte de índices entender exatamente o que mudou e por quê — nada foi apagado por "achismo", é uma consequência mecânica de como o Postgres já lida com `UNIQUE`.)*

### O que é um índice, rapidinho

Um índice é uma estrutura auxiliar que o banco mantém pra achar linhas rápido sem varrer a tabela inteira — tipo o índice remissivo de um livro. Toda vez que você cria uma `UNIQUE (coluna_A, coluna_B)`, o Postgres **cria um índice sozinho, automaticamente**, por baixo dos panos, pra conseguir garantir essa unicidade. Esse índice automático já vem ordenado primeiro por `coluna_A`, depois por `coluna_B` — igual uma lista telefônica ordenada por sobrenome e, dentro do mesmo sobrenome, por nome.

### Por que um `CREATE INDEX` extra pode ser inútil

Se alguém cria manualmente um `CREATE INDEX` só em `coluna_A` (a primeira coluna do `UNIQUE`), esse índice novo não ajuda em nada — o índice automático do `UNIQUE` já cobre exatamente essa busca, porque uma lista ordenada por "sobrenome, nome" já serve perfeitamente pra quem só quer buscar por sobrenome. Só cria dois problemas:
- **Espaço em disco desperdiçado** (mantém uma cópia ordenada dos dados que já existe em outro lugar).
- **Todo `INSERT`/`UPDATE`/`DELETE` fica um pouco mais lento**, porque o Postgres precisa atualizar TODOS os índices daquela tabela a cada mudança — inclusive esse que não serve pra nada.

Isso só deixa de ser verdade se a busca for pela **segunda coluna sozinha** (ex.: só por `coluna_B`, sem filtrar por `coluna_A`) — aí sim o índice automático do `UNIQUE` não ajuda, e um índice dedicado na segunda coluna faz sentido. Foi exatamente esse padrão que já estava sendo seguido em outros lugares do arquivo (ex.: `seguir_campanha` só tem índice em `id_campanha`, nunca em `id_usuario`, porque `id_usuario` já é a 1ª coluna do `UNIQUE` daquela tabela) — só ficaram 3 pontos fora desse padrão.

### Os 3 casos, um por um

**1. `idx_seguir_pesquisador_usuario` (removido)**
```sql
CREATE INDEX idx_seguir_pesquisador_usuario ON seguir_pesquisador(id_usuario);
```
A tabela `seguir_pesquisador` já tem `UNIQUE (id_usuario, id_pesquisador)` (`01_extensoes_enums_tabelas.sql`, linha 187). Como `id_usuario` é a 1ª coluna dessa constraint, esse `CREATE INDEX` era 100% duplicado. O índice na 2ª coluna (`idx_seguir_pesquisador_alvo`, em `id_pesquisador`) continua no arquivo normalmente — esse sim é necessário.

**2. `idx_aceite_termo_contribuicao_contribuicao` (removido)**
```sql
CREATE INDEX idx_aceite_termo_contribuicao_contribuicao ON aceite_termo_contribuicao(id_contribuicao);
```
Esse era o caso mais direto: a tabela tem `UNIQUE (id_contribuicao)` sozinha (01, linha 466) — ou seja, o índice automático do `UNIQUE` já é *idêntico*, coluna por coluna, ao que esse `CREATE INDEX` criava. Era um índice clone.

**3. `idx_score_pesq_usuario` (removido)**
```sql
CREATE INDEX idx_score_pesq_usuario ON score_pesquisador(id_usuario);
```
A tabela `score_pesquisador` tem `UNIQUE (id_usuario, id_score_config)` (01, linha 505-506). Mesmo raciocínio: `id_usuario` é a 1ª coluna, então o índice manual era redundante.
- **Detalhe a mais pra esse aqui**, diferente dos outros dois: se no futuro o sistema precisar fazer consultas filtrando só por `id_score_config` (ex.: "me dá todo mundo que pontuou no critério X"), aí sim valeria criar um índice novo — mas em `id_score_config`, não em `id_usuario`. Isso **não foi feito agora** porque depende de saber que tipo de consulta o motor de score do `05_regras_negocio.sql` realmente vai fazer no dia a dia — é uma decisão de otimização futura, não uma correção.

### Prova de que nada quebrou

- Nenhuma tabela, coluna, `UNIQUE` ou `PRIMARY KEY` foi tocada — só as 3 linhas de `CREATE INDEX` extras foram apagadas.
- Contagem de índices no arquivo: era 39, agora é 36 (exatamente os 3 removidos).
- `git diff` do arquivo mostra só essas 3 linhas removidas mais o número no cabeçalho — nenhuma outra linha mudou.
- Qualquer consulta que antes usava esses 3 índices continua funcionando exatamente igual — só passa a usar o índice automático do `UNIQUE` por baixo, que já fazia o mesmo trabalho.


## Sobre o item 9 (autor revertia a própria moderação em `comentario`)

### O problema, em termos simples

Um comentário pode ser "desligado" (coluna `ativo` vira `FALSE`) quando a moderação decide ocultá-lo — por exemplo, um comentário ofensivo. O problema: a regra que permite ao **autor do comentário** editar o próprio comentário (`pol_comentario_update`, em `04_rls_policies.sql`) não tinha como saber *qual campo* estava sendo alterado — ela só sabia dizer "esse usuário pode mexer nessa linha", sem distinguir "mexer no texto" de "mexer no `ativo`". Isso é uma limitação de como o RLS (Row Level Security) do Postgres funciona, não um erro de digitação.

Na prática, isso significava que o próprio autor de um comentário ocultado por moderação podia rodar um comando tipo `UPDATE comentario SET ativo = TRUE WHERE id_comentario = 42` e reverter a moderação sozinho — a moderação virava decorativa.

### Por que precisava de uma trigger, e não dava pra resolver só na policy

O RLS do Postgres decide **antes** da alteração acontecer, olhando só "quem está mexendo" — ele não compara automaticamente o valor antigo (`OLD`) com o valor novo (`NEW`) coluna por coluna. Pra bloquear uma mudança **específica de uma coluna só**, é preciso uma trigger, que executa um pedaço de código toda vez que alguém tenta fazer `UPDATE` e pode comparar `OLD.ativo` com `NEW.ativo` antes de aceitar.

### O que foi criado

Em `05_regras_negocio.sql`, bloco `[05-K-3]`:

```sql
CREATE OR REPLACE FUNCTION fn_bloqueia_reversao_moderacao_comentario()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.ativo = FALSE AND NEW.ativo = TRUE AND NOT public.tem_permissao('comentario_moderar') THEN
        RAISE EXCEPTION 'Operação bloqueada: só a moderação pode reverter um comentário ocultado.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comentario_bloqueia_reversao_moderacao ON comentario;
CREATE TRIGGER trg_comentario_bloqueia_reversao_moderacao
BEFORE UPDATE ON comentario
FOR EACH ROW
EXECUTE FUNCTION fn_bloqueia_reversao_moderacao_comentario();
```

A regra é **cirúrgica**: só entra em ação exatamente na transição `ativo` de `FALSE` para `TRUE` (reverter uma moderação), e só bloqueia quem **não** tem a permissão `comentario_moderar`.

### O que continua igual (nada mais mudou)

- O autor continua podendo editar o texto do próprio comentário livremente.
- O autor continua podendo **ocultar** o próprio comentário (`ativo` de `TRUE` para `FALSE`) — isso nunca foi o problema, e continua liberado.
- Um moderador/admin (quem tem `comentario_moderar`) continua podendo reverter uma ocultação normalmente — a trigger só bloqueia quem não tem essa permissão.
- Nenhuma tabela, coluna ou policy foi alterada — só uma função e uma trigger novas foram adicionadas.

### Por que decidimos travar em vez de criar um "recurso" pro autor

Conversamos sobre como plataformas de referência do projeto (Catarse, Experiment) lidam com isso: nenhuma delas dá ao autor um botão de "contestar a moderação" dentro do próprio sistema — qualquer contestação acontece por fora (suporte, e-mail), não como uma feature codificada. Pra um projeto neste estágio (TCC/MVP), a solução mais simples e defensável é essa: travar a reversão, sem inventar um fluxo de recurso que ninguém pediu ainda. Se no futuro isso for necessário, vira uma feature nova (autor pede revisão, moderador decide), não uma correção de bug.

Detalhamento técnico completo (com a explicação de cada trecho de código): `DOCUMENTACAO_BD.md`, seção `[04-E-4]` e seção `[05-K-3]`.
