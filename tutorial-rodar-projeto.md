# Tutorial: colocando o CrowdAcadêmico pra rodar na sua máquina

Este guia parte do zero: banco de dados, backend (NestJS) e frontend (React), tudo gratuito. A ideia aqui não é construir o sistema inteiro — é só chegar num ponto em que você **vê** o front e o back conversando, com dados reais vindos do banco na tela. Depois disso, o resto é ir adicionando telas e rotas aos poucos.

Siga na ordem. Não pule etapas mesmo que pareçam óbvias.

---

## 🏫 Se você vai rodar isso num computador que reseta todo dia (ex: escola)

Este tutorial foi escrito pra funcionar mesmo se você não guardar nada na cabeça de um dia pro outro, e mesmo se o computador apagar tudo (programas instalados, arquivos baixados, configurações) todo santo dia. Três coisas que resolvem isso de uma vez:

1. **Guarde os instaladores, não só os links.** Baixe o instalador do PostgreSQL, Node.js, Git e VS Code uma vez (pode ser em casa) e salve os arquivos `.exe`/`.msi` no Google Drive, OneDrive ou um pendrive. Na escola, é só copiar pro computador e instalar — bem mais rápido que baixar de novo (só o instalador do PostgreSQL já passa de 300 MB).
2. **Use sempre a mesma senha, em todo lugar.** Como o banco vai ser recriado do zero toda vez mesmo (nenhum dado real é guardado nele), não tem por que "escolher" uma senha diferente a cada dia. Este tutorial já usa sempre os mesmos dois valores fixos abaixo — só copie exatamente como está escrito, em qualquer computador, sempre:
   - Senha do usuário `postgres` (superusuário do banco): `postgres123`
   - Senha do usuário `app_nestjs` (o usuário que a aplicação usa): `app_nestjs123`
3. **O código do backend/frontend não pode nascer de novo todo dia — ele precisa vir do GitHub.** Os comandos `npx @nestjs/cli new backend` e `npm create vite@latest frontend` (Partes 4 e 5) criam um projeto **em branco**. Rode-os **uma única vez**, na primeira vez que seguir este tutorial, e logo depois suba esse projeto pro GitHub (`git init`, `git add`, `git commit`, `git push` — ver `README.md`). A partir da segunda vez (inclusive na escola), o passo é `git clone` do seu próprio repositório, nunca recriar o projeto do zero — senão qualquer tela/rota que você já tiver escrito seria substituída por um projeto vazio de novo.

Depois de rodar este tutorial pela primeira vez com sucesso, use a **Checklist Rápida** logo abaixo nas próximas vezes — ela resume os mesmos passos, sem as explicações completas, só pra riscar item por item sem precisar reler tudo.

---

## ✅ Checklist rápido (pra quando você já rodou este tutorial pelo menos uma vez)

Se travar em algum item, procure a parte correspondente mais abaixo — ela tem a explicação completa.

- [ ] Instalar PostgreSQL (senha do `postgres`: `postgres123`, porta `5432` — ver Parte 1)
- [ ] Instalar Node.js LTS, Git e (opcional) VS Code
- [ ] Abrir DBeaver → conectar em `localhost:5432`, usuário `postgres`, senha `postgres123`
- [ ] Criar o banco `crowdacademico` (Parte 2)
- [ ] Rodar os 8 arquivos `.sql`, **um de cada vez**, nesta ordem, como "Execute SQL Script": `01 → 02 → 03 → 04 → 05 → 06 → 07 → 08` (Parte 3)
- [ ] `ALTER ROLE app_nestjs LOGIN PASSWORD 'app_nestjs123';` — **obrigatório, não opcional** (o `01` cria a role sem conseguir logar; sem este passo o backend não conecta de jeito nenhum)
- [ ] `git clone` do seu próprio repositório (backend e frontend) — **nunca** `npx @nestjs/cli new` / `npm create vite` de novo depois da primeira vez
- [ ] Backend: `cd backend` → `npm install` → criar o `.env` (ele não vem do `git clone`, precisa recriar todo dia) com `DATABASE_URL=postgresql://app_nestjs:app_nestjs123@localhost:5432/crowdacademico` → `npm run start:dev`
- [ ] Frontend: `cd frontend` → `npm install` → `npm run dev`
- [ ] Testar: `http://localhost:3000/areas` (backend) e o link que o Vite mostrar, geralmente `http://localhost:5173` (frontend)
- [ ] Se mexeu em algo novo, `git add` / `git commit` / `git push` antes de sair — o computador não vai lembrar de nada sozinho

---

## Parte 0 — o que você vai instalar (tudo grátis)

| Ferramenta | Pra quê | Link |
|---|---|---|
| PostgreSQL | o banco de dados de verdade (não é o do XAMPP) | https://www.postgresql.org/download/ |
| DBeaver | você já tem — cliente para rodar os `.sql` | (já instalado) |
| Node.js (versão LTS) | roda tanto o backend quanto o frontend | https://nodejs.org |
| Git | controla versões e facilita o fluxo de trabalho | https://git-scm.com |
| VS Code (opcional, mas recomendo) | editor de código | https://code.visualstudio.com |

**Esqueça o XAMPP para este projeto.** Ele instala MySQL/MariaDB, e todo o seu schema (`CREATE EXTENSION`, `ENUM`, `ROW LEVEL SECURITY`, funções `plpgsql`) é PostgreSQL puro. São bancos incompatíveis — não dá pra rodar seus `.sql` nele.

---

## 🌐 Alternativa: usar o Supabase em vez de instalar Postgres/DBeaver (substitui as Partes 1, 2 e 3)

Se preferir não instalar o PostgreSQL nem o DBeaver, dá pra fazer tudo isso pelo navegador, no plano gratuito do Supabase (https://supabase.com) — é um Postgres de verdade, só hospedado por eles; todo o `.sql` do projeto (extensões, `ENUM`, RLS, funções `plpgsql`) roda igual, sem adaptação nenhuma. Depois de terminar esta seção, pule direto pra **Parte 4** — o resto do tutorial funciona igual, só o `DATABASE_URL` do `.env` muda.

1. Crie uma conta grátis em supabase.com e um projeto novo (ele vai pedir uma senha pro banco — anote em algum lugar, é a senha do usuário `postgres` lá, o superusuário deles).
2. No painel do projeto, abra o **SQL Editor** (menu lateral) — é o substituto do DBeaver: cole o conteúdo de cada `.sql` e rode como script, na mesma ordem da Parte 3 (`01 → 02 → 03 → 04 → 05 → 06 → 07 → 08`, um arquivo de cada vez, conferindo que não deu erro antes de ir pro próximo).
3. Depois de rodar o `01`, rode também o passo "Depois de rodar tudo" da Parte 3 (`ALTER ROLE app_nestjs LOGIN PASSWORD '...'`) — escolha sua própria senha aqui; o valor fixo `app_nestjs123` deste tutorial existe só pra facilitar decorar no Postgres local, no Supabase guarde a senha real que você escolher em algum lugar seguro.
4. Pegue a connection string em **Project Settings → Database → Connection string** (modo "URI"). Troque o usuário `postgres` por `app_nestjs` e a senha pela que você definiu no passo 3 — o nome do banco continua `postgres` (não `crowdacademico`; no Supabase o banco do projeto já nasce com esse nome, não precisa criar um novo).
5. Acrescente `?sslmode=require` no final da URL — o Supabase exige conexão criptografada; sem isso a conexão é recusada. Fica assim:
   ```
   DATABASE_URL=postgresql://app_nestjs:SUA-SENHA-AQUI@db.xxxxxxxxxxxx.supabase.co:5432/postgres?sslmode=require
   ```
6. Use essa linha no `.env` do backend (Parte 4) no lugar de `postgresql://app_nestjs:app_nestjs123@localhost:5432/crowdacademico`. Nada mais muda — Parte 4 em diante segue idêntico.

Duas coisas que só existem nesse caminho, e não no Postgres local (Partes 1-3):

- **Sem internet, o backend não conecta em lugar nenhum**, mesmo com tudo certo no código — o oposto do cuidado que já tomamos com o Tailwind (tirar a dependência de rede pro build funcionar offline). Pra rede de escola bloqueada ou dia de apresentação sem internet garantida, o Postgres local continua sendo o caminho mais seguro; o Supabase é ótimo pra praticidade no dia a dia, não pra esse cenário específico.
- **Projeto gratuito "dorme" depois de ~1 semana sem uso** — a próxima conexão depois disso demora mais ou falha até você reativar manualmente (botão "Resume" no painel do Supabase). Vale abrir o painel de vez em quando, mesmo sem mexer em nada, principalmente perto de datas importantes.

---

## Parte 1 — instalar o PostgreSQL

1. Baixe o instalador em postgresql.org (escolha a versão mais recente estável, ex. 16 ou 17).
2. Durante a instalação, ele vai pedir uma senha do superusuário `postgres`. Use `postgres123` (a mesma senha usada em todo este tutorial, ver a caixa no topo do documento) — assim você nunca precisa lembrar de uma senha diferente.
3. Deixe a porta padrão (`5432`).
4. Ao final, o instalador pode oferecer o "Stack Builder" — pode fechar, você não precisa disso.

Pronto, o Postgres já fica rodando sozinho em segundo plano (como um serviço do Windows/Mac), você não precisa "abrir" nada todo dia.

---

## Parte 2 — criar o banco e conectar o DBeaver

1. Abra o **DBeaver** → **Nova Conexão** → escolha **PostgreSQL**.
2. Host: `localhost`, Porta: `5432`, Usuário: `postgres`, Senha: `postgres123`.
3. Teste a conexão ("Test Connection") — se der certo, finalize.
4. Com a conexão aberta, clique com o botão direito em "Databases" → **Create New Database** → nomeie de `crowdacademico`.
5. Abra uma nova conexão (ou edite a atual) apontando para o banco `crowdacademico` especificamente, não o banco padrão `postgres`.

---

## Parte 3 — rodar os arquivos SQL (ordem corrigida)

Abra o **SQL Editor** do DBeaver conectado ao banco `crowdacademico` e rode os arquivos **nesta ordem exata**:

```
1. 01_extensoes_enums_tabelas.sql
2. 02_indices.sql
3. 03_funcoes_seguranca.sql
4. 04_rls_policies.sql
5. 05_regras_negocio.sql
6. 06_grants.sql
7. 07_seed_dados.sql
8. 08_trigger_signup_usuario.sql
```

Essa é a ordem atual do projeto e já foi consolidada no repositório. A criação da role `app_nestjs` foi antecipada no início do arquivo `01`, então a sequência `01 → 02 → 03 → 04 → 05 → 06 → 07 → 08` já pode ser executada sem esse workaround manual.

Depois disso, siga normalmente com os arquivos `04`, `05`, `06`, `07` e `08`.

**Como rodar cada um:** abra o arquivo `.sql`, selecione todo o conteúdo (Ctrl+A), e execute como script (no DBeaver geralmente é o botão de "Execute SQL Script", ou `Alt+X` — não use "Execute SQL Statement", que roda só um comando por vez). Faça um arquivo de cada vez, confira se não deu erro vermelho no log antes de ir pro próximo.

Se algum arquivo der erro na primeira linha por já existir algo (ex. rodou duas vezes sem querer), o mais simples é apagar o banco `crowdacademico` inteiro e criar de novo (Parte 2, passo 4) e recomeçar a sequência.

### Depois de rodar tudo, dê login e senha pro usuário da aplicação (passo obrigatório)

O `01_extensoes_enums_tabelas.sql` cria a role `app_nestjs` como `NOLOGIN` — de propósito, é mais seguro que nascer com uma senha provisória conhecida (ver `Como dropar o sistema-todas-as-formas.md`/`PENDENCIAS e correcoes.md` se quiser o motivo completo). Isso significa que, sem este passo, **ninguém consegue conectar como `app_nestjs`, nem você** — não é uma senha fraca esperando ser trocada, é uma role que literalmente não sabe fazer login ainda. Rode isto no SQL Editor:

```sql
ALTER ROLE app_nestjs LOGIN PASSWORD 'app_nestjs123';
```

Use `app_nestjs123` (a mesma senha usada em todo este tutorial) — é ela que o backend vai usar pra se conectar (não a senha do `postgres`). Se esquecer este passo, o sintoma é claro: o backend não sobe, e o erro do Postgres diz literalmente `FATAL: role "app_nestjs" is not permitted to log in`.

---

## Parte 4 — criar o backend (NestJS)

> ⚠️ **Isto é só para a primeira vez.** O comando abaixo cria um projeto NestJS em branco. Depois de rodá-lo uma vez e subir o resultado pro GitHub (`git init` / `git add` / `git commit` / `git push`), **nunca mais rode este comando de novo** — nas próximas vezes (inclusive na escola), o passo é `git clone <link-do-seu-repositório>` seguido de `npm install`. Rodar `npx @nestjs/cli new backend` de novo sobrescreve qualquer rota/tela que você já tenha escrito com um projeto vazio.

Abra um terminal (pode ser o do VS Code: menu **Terminal → New Terminal**) numa pasta onde você quer guardar o projeto, e rode:

```bash
npx @nestjs/cli new backend
```

Escolha `npm` como gerenciador de pacotes quando ele perguntar. Isso cria uma pasta `backend` com um projeto Nest funcionando (mesmo sem banco, ele já sobe). Se você estiver no Windows/PowerShell e tiver erro de política de execução, prefira esse comando com `npx` em vez de instalar o CLI globalmente.

Entre na pasta e instale o driver do Postgres:

```bash
cd backend
npm install pg
npm install @types/pg --save-dev
```

### Arquivo de configuração da conexão

Crie um arquivo `.env` na raiz da pasta `backend`:  ... app_nestjs:escolha-uma-senha-aqui@local ...

```
DATABASE_URL=postgresql://app_nestjs:app_nestjs123@localhost:5432/crowdacademico
JWT_SECRET=segredo-dev-tcc-trocar-antes-de-producao
JWT_ACCESS_EXPIRES_IN=15m
```

`JWT_SECRET`/`JWT_ACCESS_EXPIRES_IN` só existem a partir de quando o módulo `3-auth` (login/token) foi implementado — sem eles o backend nem sobe (o `JwtModule` exige `JWT_SECRET`). Qualquer valor serve em dev; troque por algo gerado (`openssl rand -hex 32`) antes de qualquer coisa que se pareça com produção de verdade.

O `.env` normalmente **não vem** de um `git clone` (fica de fora do repositório de propósito, mesmo sendo uma senha de teste) — então esse arquivo precisa ser recriado à mão toda vez que você clonar o projeto num computador novo, inclusive na escola. Copiar a linha acima exatamente como está resolve isso em 10 segundos.

Instale também o pacote pra ler o `.env`:

```bash
npm install @nestjs/config
```

Depois de editar o `.env`, reinicie o backend. O Nest não recarrega as variáveis automaticamente só porque você salvou o arquivo.

### Um endpoint simples, só pra provar que está tudo ligado

Antes de abrir o endpoint no navegador, faça um teste isolado de conexão no banco para separar “o banco conecta” de “o endpoint funciona”. No DBeaver ou no terminal do PostgreSQL, rode:

```sql
SELECT NOW();
```

Se isso retornar a data/hora, o banco está acessível. Depois disso, vamos criar uma rota bem simples que busca as áreas de conhecimento (uma tabela que já é pública, sem exigir login — ótimo pra um primeiro teste, porque evita mexer em RLS por enquanto).

Edite `src/app.module.ts` para ficar assim:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

Edite `src/app.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class AppService {
  private pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async getAreas() {
    try {
      const result = await this.pool.query(
        'SELECT id_area_conhecimento, nome FROM area_conhecimento WHERE ativo = TRUE ORDER BY nome',
      );
      return result.rows;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao buscar áreas de conhecimento: ${message}`);
    }
  }
}
```

Edite `src/app.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('areas')
  getAreas() {
    return this.appService.getAreas();
  }
}
```

Antes de subir o backend, adicione CORS no `src/main.ts`, logo após a criação do app:

```typescript
app.enableCors();
```

Suba o backend:

```bash
npm run start:dev
```

Abra o navegador em **http://localhost:3000/areas** — se aparecer uma lista em JSON com as 9 áreas de conhecimento (Ciências Exatas, Engenharias, etc.), o backend está conversando com o banco de verdade. 🎉

Se der erro de conexão, confira: senha certa no `.env`, Postgres rodando, nome do banco `crowdacademico` certo.

---

## Parte 5 — criar o frontend (React + Vite)

> ⚠️ **Mesmo aviso da Parte 4: isto é só para a primeira vez.** Depois de criar o projeto e subir pro GitHub, as próximas vezes são `git clone` + `npm install`, nunca `npm create vite` de novo.

Em outro terminal (deixe o backend rodando no anterior), na pasta onde você guarda seus projetos:

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

Edite `src/App.jsx` para algo bem simples, só pra mostrar os dados vindos do backend:

```jsx
import { useEffect, useState } from 'react';

function App() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    fetch('http://localhost:3000/areas')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setAreas(data))
      .catch((err) => setErro(err.message || 'Não foi possível carregar as áreas'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Áreas de Conhecimento — CrowdAcadêmico</h1>
      {loading && <p>Carregando...</p>}
      {erro && <p role="alert">{erro}</p>}
      {!loading && !erro && (
        <ul>
          {areas.map((a) => (
            <li key={a.id_area_conhecimento}>{a.nome}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
```

Suba o frontend:

```bash
npm run dev
```

Abra o link que aparecer no terminal (geralmente **http://localhost:5173**). Se a lista de áreas de conhecimento aparecer na tela, front e back estão funcionando juntos, com dados reais do Postgres. Esse é o ponto que você pediu — a partir daqui, é ir criando novas telas e rotas por cima dessa base.

> Se o navegador bloquear a chamada por causa de CORS (erro no console mencionando "CORS policy"), volte no backend e adicione em `src/main.ts`, logo após criar o app:
> ```typescript
> app.enableCors();
> ```

---

---

## Parte 6 — testando os módulos novos (usuário + login + RBAC + configurações)

Depois da Parte 5, com backend (`npm run start:dev`) e frontend (`npm run dev`) rodando, o React não mostra mais a página de exemplo do Vite — ele abre direto numa tela de devtools (login + 5 blocos de CRUD: usuários, papéis, permissões, papel×permissão, papéis-de-um-usuário, configurações). Essa tela é **só uma ferramenta interna** pra testar o backend, não a tela de admin de verdade (essa vem bem mais na frente).

### Criar o primeiro usuário e logar

1. Ainda não tem tela de cadastro na devtools — use o próprio bloco "Usuários" da tela: preencha nome/email/senha no formulário "Criar" e clique. Isso já chama `POST /usuario`, que já atribui o papel `usuario` sozinho (`atribuir_papel_padrao`).
2. Saia e volte pra tela — ela vai pedir login. Entre com o e-mail/senha que você acabou de criar.
3. Se aparecer erro de RLS tentando editar/criar configuração, é esperado: seu usuário novo só tem o papel `usuario`, sem `configuracao_gerenciar`. Pra testar como admin, dê o papel `admin` a ele direto no banco (SQL Editor, como `postgres`):
   ```sql
   INSERT INTO usuario_papel (id_usuario, id_papel)
   VALUES (<id_usuario>, (SELECT id_papel FROM papel WHERE nome = 'admin'));
   ```
   Depois disso, é só deslogar e logar de novo na devtools (o token antigo não sabe do papel novo).

### O teste que realmente prova que a Pendência 5 (SET LOCAL) está resolvida

Não é só "ver o CRUD funcionando" — é provar que duas sessões, ao mesmo tempo, continuam isoladas uma da outra (ver "Probleminha-chan.md" e `PENDENCIAS e correcoes.md`, parte mais recente):

1. Crie 2 usuários (ex.: um comum, um com papel `admin` pelo passo acima).
2. Abra duas abas do navegador (uma pode ser anônima/privada, pra não compartilhar `localStorage`) e logue com um usuário em cada.
3. Na aba do usuário comum, tente criar uma configuração global (marque a chave sem preencher nada especial — o service decide `id_usuario = NULL` só quando você mandar `global: true`; a tela de devtools atual sempre cria como pessoal, então pra este teste específico é mais fácil testar direto via `curl`/Postman com `"global": true` no corpo). Deve vir 403.
4. Na aba do admin, a mesma operação deve funcionar.
5. Alterne rápido entre as duas abas fazendo requisições intercaladas (listar, criar, editar) — é esse padrão de uso concorrente que expõe um bug de pool/SET LOCAL, se ele ainda existisse. Se as permissões continuarem certas mesmo intercalando (comum nunca consegue o que só admin pode, e vice-versa nunca é bloqueado por engano), a fundação está sólida.

Isso não foi testado ao vivo pelo Claude Code (o ambiente onde ele roda não tem Postgres nem Docker) — mas o Claude Web tinha Postgres disponível e rodou exatamente este cenário no mesmo dia: 15 requisições concorrentes de cada usuário contra a mesma rota protegida, isolamento perfeito (ver `PENDENCIAS e correcoes.md`, item 5). Ainda assim, vale repetir aqui na sua máquina antes de confiar de olhos fechados — ambiente diferente, sempre bom conferir de novo.

---

## O que fica pendente pra depois (não esqueça)

Isso aqui te deixa com o "hello world" rodando, mas os problemas que já te avisei antes continuam valendo conforme o projeto crescer:

1. ~~**Login/autenticação real** vai exigir...~~ **RESOLVIDO (01-08-2026, módulo `3-auth`):** existe `GlobalDbInterceptor` (`commons/database/`), registrado globalmente, que abre um `Client` dedicado por requisição (nunca `pool.query()` solto), roda `BEGIN`, seta `app.id_usuario_atual` via `set_config()` parametrizado e só então libera a query — commit/rollback automático no fim. `POST /auth/login` (email+senha) devolve um access token JWT (15min) + refresh token (30 dias, guardado em `sessao`); `POST /auth/refresh` renova os dois (rotação); `POST /auth/logout` revoga. Ver `PENDENCIAS e correcoes.md` pra prova mecânica completa desta rodada.
2. ~~Confirme sempre que o backend conecta como `app_nestjs`...~~ **RESOLVIDO:** `DatabaseModule.onModuleInit()` roda `SELECT current_user` na subida e derruba a aplicação (erro alto, não silencioso) se a conexão não for exatamente `app_nestjs`.
3. O modelo ainda tem algumas permissões seedadas que merecem revisão de clareza e uso no RBAC/RLS, principalmente: `perfil_pesquisador_visualizar_sensivel`, `sessao_revogar`, `recuperacao_senha_revogar` e `verificacao_email_reenviar`. Essas não são um bloqueio imediato para o tutorial, mas convém revisar antes de usar esse conjunto de permissões em fluxos mais complexos do admin.
4. **`SELECT *` em `usuario` ou `perfil_pesquisador` vai dar erro de permissão.** O `GRANT` (`06_grants.sql`) libera só um conjunto específico de colunas nessas duas tabelas (proteção de dado sensível, ex.: `cpf_criptografado` fica de fora) — sempre liste as colunas explicitamente na query em vez de pedir todas.
5. **Números (`DECIMAL`) chegam como texto no Node, não como number.** O driver `pg` devolve colunas tipo `meta_financeira`, `valor`, `taxa_plataforma` como string (ex.: `"50000.00"`) por padrão — somar sem converter primeiro vira concatenação de texto ou `NaN`. Configure o `types.setTypeParser` do `pg`, ou converta (`Number(...)`/`parseFloat(...)`) antes de fazer conta.
6. **Cadastro de usuário não é só um `INSERT`.** Depois de inserir em `usuario`, o backend precisa chamar `public.atribuir_papel_padrao(id_usuario)` (ver `08_trigger_signup_usuario.sql`) na mesma transação, pra o usuário novo receber o papel `'usuario'`. O papel `'admin'` nunca é atribuído automaticamente — sempre manual.
7. **Doação sem conta (anônima)** usa uma segunda variável de sessão, `app.token_sessao_atual` (mesma ideia do `SET LOCAL` do item 1, só que pra identificar quem doou sem login, via `contribuicao.token_sessao`).
8. **Manutenção manual e trabalhos de fundo (cron/worker) também precisam de identidade — achado na 6ª auditoria do Claude Web.** Depois que `pol_campanha_update` (RLS) passou a exigir dono ou permissão real, um `UPDATE` rodado **sem** `SET LOCAL app.id_usuario_atual` definido — por exemplo, você corrigindo um dado manualmente no SQL Editor, logado como `postgres` — simplesmente não afeta nenhuma linha (`UPDATE 0`, **sem erro nenhum**). É o comportamento correto (toda aprovação/rejeição de campanha precisa ser atribuível a alguém), mas o jeito de errar aqui é silencioso, então documentando: antes de qualquer `UPDATE` manual em `campanha` (ou em qualquer tabela protegida por RLS), rode antes, na mesma sessão:
   ```sql
   SET app.id_usuario_atual = '<id de um usuário com a permissão necessária, ex.: o admin>';
   ```
   O mesmo vale pro **worker de notificação** (`notificacao`) e pro **job de encerramento automático de campanha vencida** (RF-037) — este último já tem uma função pronta pra isso, `public.encerrar_campanhas_vencidas()` (`05_regras_negocio.sql`), que já é `SECURITY DEFINER` (bypassa a RLS por dentro) — o job só precisa chamá-la (ex.: via `@Cron` do NestJS), sem precisar montar nenhum `SET LOCAL` manualmente pra esse caso específico.

---

### Atualização (26/07/2026) — decisão tomada sobre `campanha_encerrar`

A permissão `campanha_encerrar`, que aparecia na lista acima, foi **removida do banco** (não existe mais em `07_seed_dados.sql`). Ela nunca tinha sido usada por nenhuma regra de acesso (RLS) — ou seja, não fazia nada na prática, só ficava "no papel".

Existiam duas opções: (a) implementar de verdade, criando um atalho pra admin encerrar campanha direto, sem passar por nenhuma aprovação formal; ou (b) remover, já que o sistema já tem um jeito de encerrar campanha antes do prazo — o fluxo de `solicitacao_encerramento` (o pesquisador pede, um admin decide, e fica registrado o motivo).

Decidimos remover, olhando como plataformas de referência do projeto (Catarse, Experiment) fazem isso: nenhuma delas dá a um admin um botão de "encerrar na marra" sem justificativa, porque tem dinheiro de apoiador envolvido.

**Benefícios da decisão:**
- **Menos confusão:** não fica uma permissão "fantasma" no sistema, que existe mas não faz nada — quem olhar o banco não perde tempo tentando descobrir onde ela é usada.
- **Mais segurança e rastreabilidade:** todo encerramento antecipado de campanha continua exigindo justificativa registrada (via `solicitacao_encerramento`), sem atalho que pule essa etapa.
- **Menos trabalho no RBAC:** uma permissão a menos pra manter, documentar e lembrar de testar.
