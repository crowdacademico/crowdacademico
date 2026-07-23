# CrowdAcadêmico: pontos discutidos e decisões pendentes (RBAC e estrutura de link)

> Contexto: sistema em React + NestJS + Postgres (Supabase como infra de banco, sem Supabase Auth — autenticação própria via JWT do NestJS). RLS é usada como camada de defesa em profundidade; a autorização "de verdade" mora no NestJS.

---

## 1. Diagnóstico do RBAC atual — RESOLVIDO

**O que já está certo:**
- Modelo de dados é o RBAC clássico e bem normalizado: `papel`, `permissao`, `papel_permissao` (N:N entre papel e permissão), `usuario_papel` (N:N entre usuário e papel).
- Seed contempla 7 papéis (`admin`, `pesquisador`, `usuario`, `moderador`, `revisor`, `curador`, `suporte`) e a lista de permissões da seção 4, com mapeamento completo em `papel_permissao`.

**Problema que existia — "RBAC de enfeite" (agora corrigido):**
- Existia uma função `eh_admin()` que checava **o nome do papel** (`'admin'`), não uma permissão, e era usada em 35 lugares de `04_rls_policies.sql` como bypass genérico "admin vê/mexe em tudo".
- Isso dava ao sistema **dois vocabulários de autorização diferentes ao mesmo tempo** (nome de papel vs. permissão): nenhuma policy de RLS que usasse `eh_admin()` respeitava `papel_permissao` nem os papéis `moderador`, `revisor`, `curador`, `suporte`.
- Consequência prática: mesmo que o NestJS implementasse corretamente "usuário com permissão X pode fazer Y", a RLS do banco rejeitava a operação mesmo assim, porque só sabia distinguir admin de não-admin.

**Decisão tomada e já aplicada:** `eh_admin()` foi **removida por completo** (`DROP FUNCTION`, ver `03_funcoes_seguranca.sql`) e todas as 35 ocorrências em `04_rls_policies.sql` foram migradas para `tem_permissao(...)`. `tem_permissao(...)` é hoje o único mecanismo de autorização em RLS — nenhuma policy referencia nome de papel. A rede de segurança contra "admin perder acesso ao esquecer de atribuir uma permissão nova" é a trigger `trg_permissao_auto_admin` (`06b_regras_negocio.sql`): toda permissão inserida em `permissao` já nasce atribuída ao papel `admin` automaticamente.

**Mapeamento aplicado (bypasses antigos → permissão):** a maioria dos 35 usos já tinha uma permissão equivalente na seed (ex.: `pol_denuncia_select/update` → `denuncia_responder`; `pol_auditoria_select` → `auditoria_financeira_visualizar`; `pol_repasse_select` → `repasse_aprovar`; `pol_atualizacao_*` e arquivos ligados a ela → `atualizacao_moderar`; recompensa e seus arquivos/links → `campanha_editar`; dados sensíveis de usuário/notificação/termo → `usuario_visualizar_sensivel`; visibilidade de contribuição/aceite → `contribuicao_visualizar_sensivel`; visibilidade de status não-público de campanha → `relatorio_visualizar`; gestão de atribuição de papéis → `papel_gerenciar`; histórico de rejeição → `campanha_rejeitar`). Só duas permissões novas precisaram ser criadas, exatamente como esperado (ver seção 5, item antigo): `link_academico_gerenciar` (edição/remoção administrativa de link de perfil de terceiro) e `arquivo_gerenciar` (edição administrativa de arquivo fora do contexto de atualização/recompensa, ex. foto de perfil).

---

## 2. Solução técnica aplicada para o enforcement

### 2.1 Função genérica de verificação (hoje é o único mecanismo usado nas policies)

```sql
CREATE OR REPLACE FUNCTION public.tem_permissao(p_permissao TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM usuario_papel up
        JOIN papel_permissao pp ON pp.id_papel = up.id_papel
        JOIN permissao pm ON pm.id_permissao = pp.id_permissao
        WHERE up.id_usuario = public.id_usuario_atual()
          AND pm.nome = p_permissao
    );
$$;
```

- Nenhuma referência a nome de papel dentro da função ou das policies daqui pra frente.
- Papel vira puramente um "pacote de permissões" guardado em dado (`papel_permissao`), nunca hardcoded em código/SQL.
- Se um papel for renomeado, dividido ou removido no futuro, só a tabela muda — nenhuma policy, guard ou deploy é necessário.

### 2.2 Todas as policies que usavam `eh_admin()` — já migradas para `tem_permissao(...)`

| Policy(s) | Permissão aplicada |
|---|---|
| `pol_usuario_select` | `usuario_visualizar_sensivel` |
| `pol_usuario_update` | `usuario_suspender` |
| `pol_campanha_select` | `relatorio_visualizar` |
| `pol_campanha_update` | `campanha_editar` |
| `pol_contribuicao_select` | `contribuicao_visualizar_sensivel` |
| `pol_comentario_select` / `pol_comentario_update` | `comentario_moderar` |
| `pol_denuncia_select` / `pol_denuncia_update` | `denuncia_responder` |
| `pol_link_update` / `pol_link_delete` (link_academico) | `link_academico_gerenciar` *(nova)* |
| `pol_arquivo_update` (bypass geral) | `arquivo_gerenciar` *(nova)* |
| `pol_arquivo_update` (contexto arquivo_atualizacao) | `atualizacao_moderar` |
| `pol_arquivo_update` (contexto arquivo_recompensa) | `campanha_editar` |
| `pol_usuariopapel_select` | `papel_gerenciar` |
| `pol_usuariopapel_insert` | `papel_atribuir` |
| `pol_atualizacao_select` / `pol_atualizacao_update` | `atualizacao_moderar` |
| `pol_arqatu_insert` / `pol_arqatu_update` | `atualizacao_moderar` |
| `pol_auditoria_select` | `auditoria_financeira_visualizar` |
| `pol_historicorej_select` | `campanha_rejeitar` |
| `pol_repasse_select` | `repasse_aprovar` |
| `pol_solicitacao_select` / `pol_solicitacao_update` | `solicitacao_encerramento_decidir` |
| `pol_usuario_termo_select` | `usuario_visualizar_sensivel` |
| `pol_aceite_termo_contribuicao_select` | `contribuicao_visualizar_sensivel` |
| `pol_notificacao_select` | `usuario_visualizar_sensivel` |
| `pol_recompensa_update`, `pol_arqrecompensa_*`, `pol_link_recompensa_*` | `campanha_editar` |
| `pol_contrib_recompensa_select` | `contribuicao_visualizar_sensivel` |
| `pol_link_atualizacao_*` | `atualizacao_moderar` |
| `pol_score_config_update` / `pol_score_rotulo_update` | `score_editar` *(já estava migrada antes desta rodada)* |

Critério usado para escolher a permissão em cada caso: reaproveitar uma permissão já seedada e semanticamente equivalente sempre que existia uma (ex.: `denuncia_responder`, `repasse_aprovar`); quando o bypass cobria uma entidade filha de outra já coberta (arquivo/link de atualização ou de recompensa), reaproveitar a permissão da entidade-mãe (`atualizacao_moderar`, `campanha_editar`) em vez de criar permissão nova por tabela; e só criar permissão nova quando não havia nenhuma equivalente razoável (`link_academico_gerenciar`, `arquivo_gerenciar`).

### 2.3 Espelhar no NestJS
- Guard de permissão (ex: `@RequerPermissao('campanha_aprovar')`) fazendo a mesma junção `usuario_papel → papel_permissao → permissao`.
- RLS e NestJS devem sempre checar a **mesma permissão**, nunca nomes de papel — as duas camadas falam o mesmo vocabulário.

---

## 3. Convenção de nomenclatura das permissões (sugestão, não definido)

**Ideia sugerida:** `entidade_acao`, tudo minúsculo, sem acento, entidade no singular.

Essa é uma proposta para debate, não uma regra fechada — segue o raciocínio por trás dela:

**Sugestão 1 — idioma por tipo de ação:**
- **CRUD genérico** (`create`, `read`, `update`, `delete`) ficaria em **inglês**, porque mapeia 1:1 com os métodos HTTP (POST/GET/PUT-PATCH/DELETE) — permitiria um guard genérico no NestJS que deriva a ação a partir do verbo HTTP da rota, sem tradução manual.
- **Ação de negócio específica** (que não corresponde a um verbo HTTP, ex: "aprovar") ficaria em **português**, com o mesmo nome usado no segmento da rota (`POST /campanhas/:id/aprovar` → `campanha_aprovar`). Facilitaria auditoria porque o nome da permissão bateria literalmente com a URL.

**Sugestão 2 — CRUD do próprio dono não precisaria virar permissão:**
- Ações que o dono do recurso já pode fazer sobre o próprio recurso (ex: pesquisador edita a própria campanha) continuariam resolvidas só pela RLS de posse (`id_usuario = id_usuario_atual()`), **sem** entrada correspondente em `permissao`.
- Só virariam permissão as ações **administrativas sobre recurso de terceiro** (admin edita campanha de outra pessoa) ou ações que não pertencem ao dono de forma alguma (aprovar, moderar, estornar, atribuir papel etc.).

**Sugestão 3 — nome de permissão como string opaca:**
- Mesmo com entidades compostas (ex: `score_config`), o código não deveria dar `split('_')` na string para inferir entidade/ação em runtime. A comparação seria sempre contra uma constante fixa (seed no SQL de um lado, enum/constante no NestJS do outro).

Essas três sugestões precisam ser validadas pela equipe antes de virarem padrão definitivo.

---

## 4. Lista de permissões — fechada e seedada

A lista está em `07_seed_dados.sql` (`INSERT INTO permissao`), cobrindo campanha, usuário, perfil de pesquisador, contribuição, denúncia, score, solicitação de encerramento, termos de uso, papel, catálogos (tipo de link, área de conhecimento, motivo de denúncia), comentário, atualização de campanha, repasse, auditoria financeira, sessão/recuperação de senha/verificação de e-mail, link acadêmico e arquivo. Cada permissão nova criada a partir de agora já é automaticamente atribuída ao papel `admin` pela trigger `trg_permissao_auto_admin` (seção 1) — não é mais necessário editar `papel_permissao` manualmente por causa do admin ao adicionar uma permissão.

---

## 5. Pontos em aberto

Resolvidos nesta rodada (mantidos aqui só para histórico):
- ~~Convenção de nomenclatura das permissões~~ — em uso: `entidade_acao`, minúsculo, sem acento (Sugestão 1 da seção 3).
- ~~Lista completa de permissões~~ — fechada e seedada (seção 4).
- ~~Bypasses genéricos de "ver/mexer em tudo" só com `eh_admin()`~~ — todos migrados para `tem_permissao(...)`, reaproveitando permissão da entidade-mãe onde fazia sentido em vez de criar uma permissão guarda-chuva (seção 2.2).

Ainda genuinamente em aberto:
1. **Papéis atuais podem mudar.** A lista de 7 papéis seedados não está fechada — o mapeamento papel → permissão fica solto em `papel_permissao` e pode ser ajustado livremente depois, sem tocar em código ou policy.
2. **Papel `suporte` com poucas permissões hoje** (só `sessao_revogar`, `recuperacao_senha_revogar`, `verificacao_email_reenviar`) — confirmar se é intencional (suporte só de conta, sem acesso a dado sensível/financeiro) ou se falta atribuir mais alguma.
3. **Ação de "endossar comentário"** — confirmar se é ação de curadoria (papel específico, viraria permissão) ou se continua sendo só o dono da campanha endossando o próprio comentário recebido (nesse caso não precisa de permissão, é RLS de posse).
4. **Guard equivalente no NestJS** — a RLS já fala só `tem_permissao(...)`; falta confirmar que o guard da aplicação (`@RequerPermissao(...)`, seção 2.3) checa exatamente as mesmas strings de permissão usadas no banco, para as duas camadas não divergirem.

---

---

## 6. Estrutura de `link` — pontos discutidos

> Tabelas envolvidas: `tipo_link` (catálogo compartilhado), `link_academico` (perfil), `link_atualizacao` (atualização de campanha), `link_recompensa` (recompensa).

### 6.1 O que já está bem resolvido
- `tipo_link` é compartilhado pelos 3 contextos via flags booleanas (`permite_perfil`, `permite_atualizacao`, `permite_recompensa`), evitando catálogos duplicados (Lattes/Orcid não se repetem por contexto).
- Existe uma trigger única (`trg_valida_escopo_tipolink()`) que impede associar um tipo de link ao contexto errado (ex: usar "Orcid" numa recompensa), usando `TG_TABLE_NAME` para descobrir dinamicamente qual coluna checar — uma função só, reaproveitada nas 3 tabelas.

### 6.2 Problema encontrado — falta `UPDATE`/`DELETE` nas policies de RLS
- As 3 tabelas de link (`link_academico`, `link_atualizacao`, `link_recompensa`) só têm policy de `SELECT` e `INSERT`. Não existe policy de `UPDATE` nem `DELETE` em nenhuma delas.
- Como RLS nega por padrão quando habilitada e não há policy cobrindo a ação, **hoje não é possível editar nem apagar um link já cadastrado** — nem o dono, nem o admin.
- Isso contradiz o próprio design existente: a trigger de validação já está declarada como `BEFORE INSERT OR UPDATE`, ou seja, o `UPDATE` já foi previsto — só faltou a policy de RLS que libera a operação até a trigger.
- **A fazer:** adicionar `UPDATE`/`DELETE` nas 3 tabelas, seguindo a mesma regra de posse já usada no `INSERT` (dono do perfil / dono da campanha via `atualizacao_campanha` ou `recompensa` / admin).

### 6.3 Problema encontrado — `tipo_link` sem gestão via aplicação
- `tipo_link` só tem policy de `SELECT`. Não há `INSERT`/`UPDATE`/`DELETE` — ou seja, hoje nem um admin consegue adicionar um novo tipo de link (ex: "TikTok") ou desativar um tipo antigo pela aplicação (`app_nestjs`).
- **A fazer:** decidir a permissão que vai amarrar essa gestão (ligado à discussão de permissões da seção 4, ex: `tipolink_create`/`tipolink_update`) e criar as policies correspondentes.

### 6.4 Colunas `regex` e `dominio` aparentemente não usadas
- `tipo_link` tem colunas `regex` e `dominio`, preenchidas no seed, sugerindo validação do formato da URL (ex: URL de Orcid bater com o domínio `orcid.org`).
- Não foi encontrada nenhuma trigger/função que valide a `url` inserida contra essas colunas — hoje qualquer URL passa, desde que o tipo de link seja permitido no contexto.
- **A decidir:** essa validação é planejada para o NestJS (nesse caso as colunas servem só de fonte de verdade para o backend buscar o padrão), ou deveria ser feita no banco também (reaproveitando o padrão dinâmico da trigger de escopo)? Se for ficar só no NestJS, vale deixar isso comentado no SQL para não parecer esquecido.

### 6.5 Proposta em discussão — tabela `contexto_link` no lugar das 3 flags booleanas

**Motivação:** o próprio histórico do arquivo mostra que os contextos já cresceram uma vez (`link_atualizacao` e `link_recompensa` foram acrescentadas em julho/2026, depois de `link_academico` já existir com as 3 flags). Isso indica que "quais entidades podem ter link" é uma dimensão que muda ao longo do tempo — e hoje essa mudança exige alterar schema (`ALTER TABLE tipo_link ADD COLUMN`) e código (o `CASE` dentro da trigger), não só dado.

**Modelo proposto:**
```sql
CREATE TABLE contexto_link (
    id_contexto SERIAL PRIMARY KEY,
    nome        VARCHAR(50) NOT NULL UNIQUE,  -- 'perfil', 'atualizacao', 'recompensa'
    tabela      VARCHAR(63) NOT NULL UNIQUE   -- nome real da tabela alvo: 'link_academico', etc.
);

CREATE TABLE tipolink_contexto (
    id_tipolink INT NOT NULL REFERENCES tipo_link(id_tipolink)     ON DELETE CASCADE,
    id_contexto INT NOT NULL REFERENCES contexto_link(id_contexto) ON DELETE CASCADE,
    PRIMARY KEY (id_tipolink, id_contexto)
);
```
A trigger de validação deixaria de ter qualquer `CASE`/nome de contexto hardcoded, virando um `EXISTS` genérico contra `tipolink_contexto` + `contexto_link`, filtrando por `TG_TABLE_NAME`.

**Prós:**
- Adicionar um novo contexto no futuro (ex: link em denúncia, ou em perfil de instituição) vira **só dado** — inserir linha em `contexto_link` e popular `tipolink_contexto` — sem `ALTER TABLE` em `tipo_link` e sem editar a função da trigger.
- Abre espaço para regras por contexto que um booleano não consegue expressar (ex: uma coluna extra em `tipolink_contexto` tipo `obrigatorio` ou `regex_override`, caso um tipo de link precise de validação diferente dependendo de onde é usado).
- Elimina o hardcode de nomes de contexto dentro da função da trigger (mesmo princípio do RBAC: comportamento guiado por dado, não por string fixa em código).

**Contras:**
- Mais uma junção (`JOIN`) para validar cada insert/update de link — custo desprezível dado o tamanho das tabelas envolvidas, mas é uma indireção a mais para quem lê o schema pela primeira vez.
- Com só 3 contextos conhecidos hoje, o ganho imediato é menor do que parece — 3 booleanos também são fáceis de ler direto num `SELECT * FROM tipo_link`.
- É trabalho de migração agora (ainda que bem mais barato fazer isso agora, sem dados em produção, do que depois).

**A decidir:** se a equipe têm expectativa razoável de mais contextos de link aparecerem (perfil de instituição, denúncia, outra entidade futura), vale migrar agora. Se o modelo do sistema for considerado fechado nesses 3 contextos, manter os booleanos é aceitável e mais simples.

---

*Documento gerado para alinhamento entre a equipe antes de fechar a implementação do RBAC granular no banco e no NestJS.*
