# CrowdAcadêmico — modificações desta rodada (branch `auth` vs. `main`)

> Este arquivo documenta o que foi **efetivamente alterado** no SQL nesta rodada,
> comparado ao branch `main`. Substitui a versão anterior deste documento, que
> era só uma cópia do `RBAC-pontos-discutidos.md` (um plano, não um changelog) —
> por isso parecia ter "pontos pendentes" que já estavam implementados no SQL.
> O plano original de RBAC/link segue em `RBAC-pontos-discutidos.md`; aqui é
> só o que dele virou código de fato, mais os bugs encontrados e corrigidos
> durante a revisão.

---

## 1. RBAC granular de verdade (`03_funcoes_seguranca.sql`, `04_rls_policies.sql`, `07_seed_dados.sql`)

**Problema que existia no `main`:** a única checagem de autorização no banco era
`eh_admin()` (nome de papel = `'admin'`). Papéis como `moderador`, `revisor`,
`curador`, `suporte` já existiam na seed e já tinham permissões atribuídas em
`papel_permissao`, mas nenhuma RLS policy usava isso — na prática, só admin
conseguia fazer qualquer ação administrativa, mesmo quando a permissão já
tinha sido delegada a outro papel.

**O que foi feito:**
- Nova função `public.tem_permissao(p_permissao TEXT)` — mesmo princípio do
  `eh_admin()`, mas resolvendo por permissão (`usuario_papel → papel_permissao
  → permissao`), nunca por nome de papel.
- Policies reescritas para usar `tem_permissao(...)` em vez de `eh_admin()`:
  `pol_usuario_update` (+ `usuario_suspender`), `pol_campanha_update`
  (+ `campanha_editar`), `pol_denuncia_update` (`denuncia_responder`),
  `pol_score_config_update`/`pol_score_rotulo_update` (`score_editar`),
  `pol_usuariopapel_insert` (`papel_atribuir`), `pol_atualizacao_update`
  (`atualizacao_moderar`), `pol_solicitacao_update`
  (`solicitacao_encerramento_decidir`), `pol_termos_insert`/`pol_termos_update`
  (`termos_uso_gerenciar`).
- Lista de permissões expandida na seed (de 7 para ~24), cobrindo entidades que
  antes não tinham permissão nenhuma associada (campanha, comentário,
  atualização, catálogos, sessão/recuperação de senha etc.), com convenção de
  nome `entidade_acao`. Permissões antigas são renomeadas via `UPDATE` antes do
  `INSERT` (`aprovar_campanha` → `campanha_aprovar`, etc.) para não colidir com
  a `UNIQUE` em bancos já populados.
- Mapeamento `papel_permissao` completo por papel (admin tem todas; moderador
  cuida de denúncia/comentário/atualização; revisor só de score; curador dos
  catálogos; suporte de conta/sessão).
- Papel `apoiador` removido da seed: contribuir financeiramente não é ação de
  papel específico, qualquer usuário autenticado pode fazer.

---

## 2. Soft delete de comentário e de atualização de campanha (`01`, `04`, `06b`)

**O que foi feito:**
- Novas colunas `ativo BOOLEAN NOT NULL DEFAULT TRUE` em `comentario` e em
  `atualizacao_campanha`. Moderação passa a ocultar (não apagar), preservando
  histórico/auditoria.
- `pol_comentario_select`/`pol_atualizacao_select`: conteúdo inativo só
  continua visível para o autor/dono da campanha/admin; o público só vê o que
  está ativo.
- `pol_comentario_update`/`pol_atualizacao_update`: autor pode desativar o
  próprio conteúdo; quem tem `comentario_moderar`/`atualizacao_moderar` pode
  desativar qualquer um.
- Nova coluna `titulo` em `atualizacao_campanha` (exibida em listagens antes do
  conteúdo completo) — seed de exemplo atualizada com um título por atualização.

**Bug encontrado e corrigido nesta revisão:** as colunas `ativo` foram
adicionadas ao schema, mas não propagadas para o motor de score/regras de
negócio em `06b_regras_negocio.sql`:
- O cálculo de regularidade de atualizações contava `atualizacao_campanha` sem
  filtrar `ativo = TRUE` — uma atualização ocultada por moderação continuava
  inflando o score de reputação do pesquisador. **Corrigido**, adicionado o
  filtro.
- A checagem de limite de 4 comentários endossados por campanha
  (`validar_comentario_endosso`) contava comentários sem filtrar
  `ativo = TRUE` — um comentário endossado removido por moderação continuava
  ocupando permanentemente uma das 4 vagas. **Corrigido**, adicionado o filtro.

---

## 3. CRUD completo para as tabelas de `link` (`04`, `05`)

**Problema que existia no `main` (RBAC-pontos-discutidos.md, seção 6.2/6.3):**
`link_academico`, `link_atualizacao` e `link_recompensa` só tinham policy de
`SELECT`/`INSERT` — sem `UPDATE`/`DELETE`, RLS negava por padrão e **não era
possível editar nem apagar um link já cadastrado**, nem o dono nem o admin.
`tipo_link` só tinha `SELECT` — nem um admin conseguia cadastrar um tipo de
link novo (ex. "TikTok").

**O que foi feito:**
- `pol_link_update`/`pol_link_delete` em `link_academico`: dono do perfil ou
  admin.
- `pol_link_atualizacao_update`/`pol_link_atualizacao_delete`: dono da
  campanha (via `atualizacao_campanha`) ou admin.
- `pol_link_recompensa_update`/`pol_link_recompensa_delete`: dono da campanha
  (via `recompensa`) — de propósito **sem** o comprador, que só lê.
- `pol_tipolink_insert`/`pol_tipolink_update` em `tipo_link`, gated pela nova
  permissão `tipolink_gerenciar` (admin e curador).
- Também removida uma `pol_contrib_recompensa_update` que tinha sido
  adicionada contradizendo o próprio comentário de design da tabela
  (`contribuicao_recompensa` é registro de auditoria, deveria ser imutável
  após a criação — sem `UPDATE`/`DELETE` para `app_nestjs`).

**Bug encontrado e corrigido nesta revisão:** os `GRANT`s de tabela não
acompanharam as policies novas de `tipo_link`. RLS e `GRANT` são exigidos
juntos pelo Postgres — mesmo com a permissão certa, `INSERT`/`UPDATE` em
`tipo_link` continuava caindo em "permission denied for table tipo_link" antes
mesmo de a RLS ser avaliada. **Corrigido:** adicionado
`GRANT INSERT, UPDATE ON tipo_link TO app_nestjs` em `05_grants.sql` (sem
`DELETE` de propósito — a tabela já tem coluna `ativo` para desativação).

---

## 4. Bug crítico corrigido: login não conseguia ler as próprias colunas de autenticação (`05_grants.sql`)

A tabela `usuario` já tinha, desde o `main`, as colunas de autenticação própria
(`senha_hash`, `tentativas_login_falhas`, `bloqueado_ate`, `ultimo_login_em`,
`ultimo_login_ip`). Mas o `GRANT SELECT` por coluna para `app_nestjs` só
incluía `(id_usuario, nome, email, id_imagem_perfil, criado_em, deletado)` —
faltavam justamente as colunas que o próprio fluxo de login precisa ler
(checar hash da senha, aplicar proteção de brute-force, registrar último
login). Sem elas, qualquer `SELECT senha_hash FROM usuario WHERE email = ...`
no login falharia com "permission denied", **antes mesmo de a RLS entrar em
jogo** (GRANT de coluna é checado antes de RLS). **Corrigido:** as 5 colunas
foram incluídas no `GRANT SELECT (...)`.

---

## 5. Limpeza de documentação/comentários obsoletos (`07_seed_dados.sql`)

Achados nesta revisão, sem relação com a rodada de RBAC, mas corrigidos por
estarem ativamente desatualizados e confusos:
- Havia dois blocos `INSERT INTO papel (...)` separados no arquivo (um deles
  citando `AuthContext.tsx`, resquício do desenho antigo com Supabase Auth), um
  parcialmente sobreposto ao outro. Consolidados em um único bloco com os 7
  papéis (`admin`, `pesquisador`, `usuario`, `moderador`, `revisor`, `curador`,
  `suporte`).
- Uma nota no fim do arquivo ainda instruía criar o usuário administrador via
  "Supabase → Authentication → Users" e citava um trigger
  `on_auth_user_created` — o próprio `08_trigger_signup_usuario.sql` já
  documenta esse caminho como obsoleto desde a migração para autenticação
  própria. Nota reescrita para refletir o fluxo atual (signup do NestJS +
  `atribuir_papel_padrao()` + atribuição manual do papel `admin`).
- Cabeçalho duplicado no topo do arquivo (dois blocos de título idênticos)
  unificado em um só; referência ao "próximo arquivo" corrigida de
  `08_passo_manual_admin.sql` (nome que não existe no projeto) para
  `08_trigger_signup_usuario.sql`.

---

## 6. Bug corrigido: endosso de comentário nunca teve caminho de RLS (`04_rls_policies.sql`)

Já no `main`, `comentario` não tinha **nenhuma** policy de `UPDATE` — ou seja,
endossar um comentário (setar `endossado`/`ordem_endosso`), ação feita pelo
**dono da campanha** sobre um comentário de outra pessoa, já era impossível na
prática. O `UPDATE` adicionado nesta rodada (item 2, para soft delete) resolveu
a desativação, mas continuava sem cobrir o endosso: só liberava o próprio
autor do comentário ou quem tem `comentario_moderar`, nunca o dono da
campanha. **Corrigido:** adicionada a condição de dono da campanha em
`pol_comentario_update` (`USING`/`WITH CHECK`). A responsabilidade de garantir
que o dono da campanha só altere `endossado`/`ordem_endosso` (e não o
conteúdo do comentário) fica no endpoint específico de endosso do NestJS, não
na RLS — consistente com o resto do projeto, onde a RLS é defesa em
profundidade e a autorização "de verdade" mora na aplicação.


## 8. Pontos do `RBAC-pontos-discutidos.md` que seguem em aberto

Não foram resolvidos nesta rodada (permanecem como decisão da equipe, não como
bug):
- **Convenção de nomenclatura das permissões** — o SQL já adotou
  `entidade_acao` em português na prática, mas isso nunca foi formalmente
  ratificado pela equipe (seção 3 do plano).
- **Colunas `regex`/`dominio` de `tipo_link`** — continuam sem nenhuma
  trigger/função que valide a `url` contra elas; decisão de ficar só no
  NestJS ou também no banco segue em aberto (seção 6.4).
- **Proposta de tabela `contexto_link`** no lugar das 3 flags booleanas em
  `tipo_link` — segue como proposta, não implementada (seção 6.5).
