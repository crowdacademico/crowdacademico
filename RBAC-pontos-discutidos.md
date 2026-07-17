# CrowdAcadêmico: pontos discutidos e decisões pendentes (RBAC e estrutura de link)

> Contexto: sistema em React + NestJS + Postgres (Supabase como infra de banco, sem Supabase Auth — autenticação própria via JWT do NestJS). RLS é usada como camada de defesa em profundidade; a autorização "de verdade" mora no NestJS.

---

## 1. Diagnóstico do RBAC atual

**O que já está certo:**
- Modelo de dados é o RBAC clássico e bem normalizado: `papel`, `permissao`, `papel_permissao` (N:N entre papel e permissão), `usuario_papel` (N:N entre usuário e papel).
- Seed já contempla 8 papéis (`admin`, `pesquisador`, `usuario`, `apoiador`, `moderador`, `revisor`, `curador`, `suporte`) e 7 permissões, com mapeamento parcial (`admin` → 5 permissões, `moderador` → `responder_denuncia`, `revisor` → `editar_score`).

**Problema identificado — "RBAC de enfeite":**
- A única função de verificação que existe é `eh_admin()`, que checa **o nome do papel** (`'admin'`), não uma permissão.
- Nenhuma policy de RLS, trigger ou regra de negócio (`04_rls_policies.sql`, `06b_regras_negocio.sql`) referencia `papel_permissao` ou os papéis `moderador`, `revisor`, `curador`, `suporte`, `apoiador`.
- Consequência prática: mesmo que o NestJS implemente corretamente "usuário com permissão X pode fazer Y", a RLS do banco vai **rejeitar a operação mesmo assim**, porque ela só sabe distinguir admin de não-admin. Exemplos concretos encontrados:
  - `pol_denuncia_update` → só `eh_admin()`, mas a permissão `responder_denuncia` já está atribuída a `moderador` na seed.
  - `pol_score_config_update` / `pol_score_rotulo_update` → só `eh_admin()`, mas `editar_score` já está atribuída a `revisor`.
  - `pol_usuario_update` → nem tem bypass de admin hoje; a permissão `suspender_usuario` não tem como ser exercida por ninguém.

**Decisão tomada:** manter o RBAC granular de verdade (não descartar `papel_permissao` em favor de um "só admin"). Todas as verificações — RLS **e** NestJS — devem checar **permissão**, nunca o nome do papel.

---

## 2. Solução técnica proposta para o enforcement

### 2.1 Função genérica de verificação (substitui o uso direto de `eh_admin()` nas policies)

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

### 2.2 Policies que precisam ser reescritas para usar `tem_permissao(...)` em vez de (ou além de) `eh_admin()`

| Policy atual | Situação | Ação |
|---|---|---|
| `pol_denuncia_update` | só `eh_admin()` | trocar/complementar por `tem_permissao('denuncia_responder')` |
| `pol_score_config_update` | só `eh_admin()` | trocar/complementar por `tem_permissao('score_config_update')` |
| `pol_score_rotulo_update` | só `eh_admin()` | trocar/complementar por `tem_permissao('score_config_update')` |
| `pol_usuario_update` | sem bypass de admin | adicionar `OR tem_permissao('usuario_suspender')` |
| `pol_usuariopapel_insert` | só `eh_admin()` | trocar por `tem_permissao('papel_atribuir')` |
| Demais bypasses "ver/mexer em tudo" (campanha, comentário, notificação, atualização de campanha etc.) | só `eh_admin()`, sem permissão granular equivalente ainda | **pendente de decisão** — ver seção 4 |

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

## 4. Lista de permissões

Ainda precisa ser levantada e definida em conjunto pela equipe, cobrindo todas as entidades e ações administrativas do sistema (moderação de campanha, denúncias, comentários, financeiro/repasse, score de reputação, catálogos de configuração, relatórios, gestão de papéis etc.), seguindo a convenção de nomenclatura que for definida na seção 3.

---

## 5. Pontos em aberto — precisam de decisão antes de fechar o SQL

1. **Convenção de nomenclatura das permissões** — validar (ou ajustar) as sugestões da seção 3 antes de nomear qualquer permissão.
2. **Lista completa de permissões** — ainda precisa ser levantada e escrita, entidade por entidade, seguindo a convenção que for definida.
3. **Papéis atuais podem mudar.** A lista de 8 papéis seedados não está confirmada. Decisão: fechar primeiro só a lista de **permissões** (vocabulário fixo); o mapeamento papel → permissão fica solto em `papel_permissao` e pode ser ajustado livremente depois, sem tocar em código ou policy.
4. **Papéis sem nenhuma permissão hoje** (`apoiador`, `curador`, `suporte`) — confirmar se são papéis reservados para o futuro ou se devem ser removidos da seed por ora.
5. **Bypasses genéricos de "ver/mexer em tudo"** (campanha, comentário, notificação, atualização de campanha) que hoje usam só `eh_admin()` sem permissão granular correspondente — decidir se criam uma permissão guarda-chuva ou permissões específicas por entidade.
6. **Ação de "endossar comentário"** — confirmar se é ação de curadoria (papel específico, viraria permissão) ou se continua sendo só o dono da campanha endossando o próprio comentário recebido (nesse caso não precisa de permissão, é RLS de posse).
7. Depois de fechar os pontos acima: gerar o SQL final de seed (`permissao` + `papel_permissao`), reescrever as policies do item 2.2, e implementar o guard equivalente no NestJS.

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
