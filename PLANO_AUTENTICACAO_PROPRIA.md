# CrowdAcadêmico — Plano de Migração: Autenticação Própria (saindo do Supabase Auth)

**Contexto:** hoje o sistema usa o Supabase Auth (GoTrue) para login, cadastro e recuperação de senha. A decisão é implementar autenticação própria no backend NestJS, mantendo o Postgres como banco (por enquanto hospedado no Supabase, mas sem depender dos serviços de auth dele), para que uma futura migração de banco seja mais simples.

Arquitetura confirmada: **React → NestJS → Postgres**. O frontend nunca fala direto com o banco; o NestJS é o único client do Postgres. Isso muda a forma como pensamos RLS (ver seção 3).

---

## 1. O que já existe e pode ser aproveitado

| Item | Onde está | Situação |
|---|---|---|
| `usuario.senha_hash` | `01_extensoes_enums_tabelas.sql` | Já existe, `VARCHAR(255)`. Hoje está como opcional — precisa virar obrigatório (ver seção 2). |
| Extensão `pgcrypto` | `01_extensoes_enums_tabelas.sql` | Já habilitada. Pode ser usada no banco se quiser hash server-side, mas o recomendado é gerar o hash (bcrypt/argon2) no próprio NestJS antes de gravar. |
| Estrutura de papéis (`usuario_papel`, `papel`) | `01_extensoes_enums_tabelas.sql` | Não depende de auth, continua igual. |

---

## 2. Como a tabela `usuario` deveria ficar completa

Como o `01_extensoes_enums_tabelas.sql` ainda está sendo montado (nada rodou em banco ainda), o caminho mais simples é já entregar a `CREATE TABLE usuario` completa, com os campos novos marcados, em vez de `ALTER TABLE` depois:

```sql
CREATE TABLE usuario (
    id_usuario       SERIAL PRIMARY KEY,
    nome             VARCHAR(150) NOT NULL,
    email            VARCHAR(255) NOT NULL UNIQUE,
    senha_hash       VARCHAR(255) NOT NULL,     -- ALTERADO: era opcional [R10], agora obrigatório
    id_imagem_perfil INT,
    criado_em        TIMESTAMP    DEFAULT NOW(),
    deletado         BOOLEAN      DEFAULT FALSE,

    -- NOVO: controle de verificação de e-mail (ver seção 2.1)
    email_verificado         BOOLEAN   NOT NULL DEFAULT FALSE,

    -- NOVO: proteção contra brute-force (ver seção 2.4)
    tentativas_login_falhas  INT       NOT NULL DEFAULT 0,
    bloqueado_ate            TIMESTAMP,
    ultimo_login_em          TIMESTAMP,
    ultimo_login_ip          VARCHAR(45)
);
```

O que saiu e por quê, comparado ao que estava sendo montado:
- **`id_supabase UUID REFERENCES auth.users(id)` foi removida.** Essa coluna só faz sentido enquanto o Supabase Auth existe no fluxo (é ele quem popula `auth.users`). Como a autenticação passa a ser própria, não há mais nada para essa FK apontar — mantê-la travaria todo cadastro novo. Se um dia entrar um SSO/OAuth como método adicional (não substituindo o login por senha), a coluna pode voltar, sem FK e nullable.
- **`senha_hash` deixou de ser opcional.** Se o login por senha é o único método de autenticação do sistema, ele precisa existir sempre.

### 2.1 Verificação de e-mail

**Por quê:** hoje quem confirma o e-mail no cadastro é o GoTrue do Supabase (fluxo de "confirmar e-mail" embutido). Sem ele, essa confirmação precisa ser implementada e persistida por nós.

**Como:** a flag `email_verificado` já está na `usuario` acima. Os tokens de confirmação, porém, ficam em tabela própria (não uma coluna solta), porque pode haver mais de um pedido de confirmação (usuário perde o e-mail, pede de novo) e cada token velho precisa poder ser invalidado sem apagar histórico.

```sql
CREATE TABLE verificacao_email (
    id_verificacao SERIAL PRIMARY KEY,
    id_usuario     INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    token_hash     VARCHAR(255) NOT NULL,   -- nunca gravar o token em texto puro
    criado_em      TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_em      TIMESTAMP NOT NULL,
    confirmado_em  TIMESTAMP
);
```

### 2.2 Recuperação de senha

**Por quê:** é exatamente o mesmo problema do item anterior — hoje é o "esqueci minha senha" do Supabase que envia o e-mail e valida o token. Sem ele, esse fluxo (gerar token, enviar e-mail, validar, trocar senha, invalidar token) passa a ser responsabilidade do NestJS + banco.

```sql
CREATE TABLE recuperacao_senha (
    id_recuperacao SERIAL PRIMARY KEY,
    id_usuario     INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    token_hash     VARCHAR(255) NOT NULL,
    criado_em      TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_em      TIMESTAMP NOT NULL,     -- recomendado: expiração curta, 15-30 min
    usado_em       TIMESTAMP
);
```

### 2.3 Sessões / refresh tokens

**Por quê:** sem o Supabase Auth, quem emite e assina o JWT é o próprio NestJS. Se você quiser suportar "sair", "sair de todos os dispositivos" ou revogar um token comprometido, o JWT sozinho (stateless) não resolve — é preciso persistir os refresh tokens emitidos para poder invalidá-los.

```sql
CREATE TABLE sessao (
    id_sessao          SERIAL PRIMARY KEY,
    id_usuario         INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    criado_em          TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_em          TIMESTAMP NOT NULL,
    revogado_em        TIMESTAMP,
    ip                 VARCHAR(45),
    user_agent         TEXT
);
```

### 2.4 Proteção contra brute-force

**Por quê:** o Supabase Auth tem rate limiting embutido nas tentativas de login. Sem ele, isso precisa ser implementado — ou no NestJS (com Redis, por exemplo) ou, no mínimo, com um controle simples no próprio banco.

**Como:** os campos `tentativas_login_falhas`, `bloqueado_ate`, `ultimo_login_em` e `ultimo_login_ip` já estão marcados como **NOVO** na `CREATE TABLE usuario` completa, na seção 2 acima.

---

## 3. O que precisa mudar (não é "criar", é "trocar o mecanismo")

> A remoção da coluna `id_supabase` já foi tratada na seção 2 (ela nem chega a existir na `CREATE TABLE usuario` completa). Ficam aqui as duas peças de lógica que também precisam trocar.

### 3.1 Função `id_usuario_atual()`

**O que é hoje** (`03_funcoes_seguranca.sql`): usa `auth.uid()`, uma função que só existe porque o GoTrue do Supabase injeta o JWT dele diretamente na sessão do Postgres via PostgREST.

**Por que muda:** sem PostgREST/GoTrue, não existe mais esse JWT injetado automaticamente na conexão. Quem valida o JWT agora é o NestJS.

**Como:** o NestJS, depois de validar o JWT da request, define uma variável de sessão no início da transação:

```sql
SET LOCAL app.id_usuario_atual = '123';
```

E a função passa a ler essa variável:

```sql
CREATE OR REPLACE FUNCTION public.id_usuario_atual() RETURNS INT
LANGUAGE sql STABLE AS $$
    SELECT current_setting('app.id_usuario_atual', true)::INT;
$$;
```

`SET LOCAL` é escopado à transação atual — o valor some sozinho no `COMMIT`/`ROLLBACK`, então é seguro mesmo com pool de conexões compartilhado entre requests.

### 3.2 Trigger de signup (`08_trigger_signup_usuario.sql`)

**O que é hoje:** um trigger em `auth.users` (`AFTER INSERT`) que cria a linha correspondente em `usuario` automaticamente quando o Supabase Auth cria um novo usuário.

**Por que muda:** sem o Supabase Auth, nunca mais existe um INSERT em `auth.users` — esse trigger simplesmente para de disparar.

**Como:** a criação do `usuario` (com `senha_hash`, papel padrão, disparo do e-mail de verificação) passa a ser um passo explícito dentro do endpoint de signup do NestJS, dentro de uma transação. Isso é até uma vantagem: fica tudo num lugar só, mais fácil de testar e de logar erro.

---

## 4. RLS e Grants: é necessário manter? É possível sem o Supabase Auth?

### 4.1 É necessário?

**Estritamente, não.** Como o NestJS é o único client do Postgres (arquitetura confirmada: React nunca fala direto com o banco), toda a autorização já pode — e deve — ser aplicada no código antes da query chegar no banco (guards, interceptors, verificação de dono do recurso no service layer).

Isso é diferente do modelo atual do Supabase, onde o **frontend fala direto com o Postgres via PostgREST**, e nesse caso a RLS *é* a única barreira de segurança real (por isso os papéis `anon`/`authenticated` existem em `05_grants.sql`).

### 4.2 Por que manter mesmo assim (recomendação)

- **Defesa em profundidade:** se um dia um service do NestJS esquecer um filtro (`WHERE id_usuario = ...`), tiver uma falha de SQL injection, ou uma credencial de banco vazar, a RLS ainda impede um usuário de ler/alterar dado de outro usuário. Não é exclusividade do modelo Supabase — é prática comum mesmo em arquiteturas client-server tradicionais.
- **Custo baixo de manutenção:** a maior parte de `04_rls_policies.sql` já é regra de negócio pura (dono vê o próprio recurso, campanha aprovada é pública, etc.) e não depende de auth nenhuma — só a peça que identifica "quem é o usuário atual" precisa trocar (item 3.2 acima).

### 4.3 Ponto de atenção: portabilidade

RLS é sintaxe específica do Postgres — **não migra** se um dia vocês trocarem de banco. Por isso a recomendação é: **a autorização "de verdade" mora no NestJS** (isso sim é portável para qualquer banco). A RLS fica como uma camada extra de segurança no Postgres, não como algo que o sistema depende para funcionar corretamente. Se um dia trocar de banco, vocês não perdem nenhuma regra crítica — só perdem essa camada redundante, que pode ser recriada (ou não) na tecnologia nova.

### 4.4 O que muda em `04_rls_policies.sql`

Só a policy que hoje referencia `auth.uid()` diretamente:

```sql
-- Hoje:
CREATE POLICY pol_usuario_update ON usuario FOR UPDATE TO authenticated
    USING (id_supabase = auth.uid());

-- Depois:
CREATE POLICY pol_usuario_update ON usuario FOR UPDATE TO authenticated
    USING (id_usuario = id_usuario_atual());
```

As demais policies do arquivo já usam `id_usuario_atual()` e não precisam mudar.

### 4.5 O que muda em `05_grants.sql`

Os papéis `anon` e `authenticated` são conceito do PostgREST (mapeiam "visitante sem login" e "visitante logado" batendo direto na API REST do Supabase). Sem PostgREST no fluxo, eles deixam de fazer sentido.

**Como fica:** um único role de aplicação para as conexões do NestJS (ex: `app_nestjs`), com os `GRANT`s de tabela/coluna equivalentes aos que hoje estão em `authenticated`. Esse role:
- **não** pode ser dono das tabelas (RLS é ignorada por padrão para o dono da tabela);
- **não** deve ter o atributo `BYPASSRLS` (RLS também é ignorada para superusers e roles com esse atributo).

```sql
-- Exemplo de esqueleto (ajustar nomes de tabela/coluna conforme necessário):
GRANT USAGE ON SCHEMA public TO app_nestjs;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_nestjs;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.recalcular_score_pesquisador(INT) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.recalcular_todos_os_scores() TO app_nestjs;
```

O detalhe fino de "quem pode ver o quê" deixa de ser resolvido por dois roles diferentes (`anon` vs `authenticated`) e passa a ser resolvido pela RLS + pela própria lógica do NestJS (que já sabe se a request tem um usuário autenticado ou não antes mesmo de chegar no banco).

---

## 5. Checklist resumido

- [ ] Ajustar a `CREATE TABLE usuario` no `01_extensoes_enums_tabelas.sql` para a versão completa da seção 2 (campos novos + `senha_hash NOT NULL` + remoção de `id_supabase`)
- [ ] Criar tabela `verificacao_email`
- [ ] Criar tabela `recuperacao_senha`
- [ ] Criar tabela `sessao` (refresh tokens)
- [ ] Reescrever `id_usuario_atual()` para usar `current_setting('app.id_usuario_atual')` em vez de `auth.uid()`
- [ ] Implementar no NestJS o `SET LOCAL app.id_usuario_atual` por request/transação
- [ ] Substituir o trigger de signup (`08_trigger_signup_usuario.sql`) por lógica explícita no endpoint de signup do NestJS
- [ ] Ajustar a policy `pol_usuario_update` em `04_rls_policies.sql`
- [ ] Trocar os roles `anon`/`authenticated` por um role único de aplicação (`app_nestjs`) em `05_grants.sql`, sem `BYPASSRLS` e sem ownership das tabelas

---

*Documento gerado para discussão técnica — próximo passo, se aprovado, é a implementação dos scripts SQL (`09_auth_propria.sql`) e do módulo de auth no NestJS.*
