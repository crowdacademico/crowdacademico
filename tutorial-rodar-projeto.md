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
- [ ] `ALTER ROLE app_nestjs PASSWORD 'app_nestjs123';`
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

### Depois de rodar tudo, troque a senha do usuário da aplicação

O `06_grants.sql` trabalha com o role `app_nestjs` já criado no início do processo. Troque a senha provisória, rodando isso no SQL Editor:

```sql
ALTER ROLE app_nestjs PASSWORD 'app_nestjs123';
```

Use `app_nestjs123` (a mesma senha usada em todo este tutorial) — é ela que o backend vai usar pra se conectar (não a senha do `postgres`).

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
```

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

## O que fica pendente pra depois (não esqueça)

Isso aqui te deixa com o "hello world" rodando, mas os problemas que já te avisei antes continuam valendo conforme o projeto crescer:

1. **Login/autenticação real** vai exigir que, a cada requisição de um usuário logado, o backend rode `SET LOCAL app.id_usuario_atual = '<id>'` dentro de uma transação antes de consultar tabelas protegidas por RLS (tudo que não seja tabela de leitura pública como `area_conhecimento`). Isso é código a mais que ainda não existe — quando for fazer login/cadastro, avise que a gente monta esse pedaço com calma.
   - Detalhe técnico que vai importar nessa hora: isso **não** funciona com um `pool.query(...)` solto igual o `getAreas()` da Parte 4 — precisa ser um `Client` retirado do pool, dentro de uma transação, porque o `SET LOCAL` só vale pra transação que o define. O jeito certo é um interceptor/middleware global do NestJS que abre a transação, roda o `SET LOCAL` e só depois passa a query adiante — não algo repetido rota por rota (fácil de esquecer numa rota nova).
2. Confirme sempre que o backend conecta como `app_nestjs`, nunca como `postgres` — senão a RLS é ignorada silenciosamente e parece que "está tudo funcionando" sem estar de verdade protegido.
   - Vale um health-check simples na subida do NestJS (`SELECT current_user`) que impede a aplicação de subir se a conexão não for exatamente `app_nestjs` — evita descobrir isso tarde demais.
3. O modelo ainda tem algumas permissões seedadas que merecem revisão de clareza e uso no RBAC/RLS, principalmente: `perfil_pesquisador_visualizar_sensivel`, `sessao_revogar`, `recuperacao_senha_revogar` e `verificacao_email_reenviar`. Essas não são um bloqueio imediato para o tutorial, mas convém revisar antes de usar esse conjunto de permissões em fluxos mais complexos do admin.
4. **`SELECT *` em `usuario` ou `perfil_pesquisador` vai dar erro de permissão.** O `GRANT` (`06_grants.sql`) libera só um conjunto específico de colunas nessas duas tabelas (proteção de dado sensível, ex.: `cpf_criptografado` fica de fora) — sempre liste as colunas explicitamente na query em vez de pedir todas.
5. **Números (`DECIMAL`) chegam como texto no Node, não como number.** O driver `pg` devolve colunas tipo `meta_financeira`, `valor`, `taxa_plataforma` como string (ex.: `"50000.00"`) por padrão — somar sem converter primeiro vira concatenação de texto ou `NaN`. Configure o `types.setTypeParser` do `pg`, ou converta (`Number(...)`/`parseFloat(...)`) antes de fazer conta.
6. **Cadastro de usuário não é só um `INSERT`.** Depois de inserir em `usuario`, o backend precisa chamar `public.atribuir_papel_padrao(id_usuario)` (ver `08_trigger_signup_usuario.sql`) na mesma transação, pra o usuário novo receber o papel `'usuario'`. O papel `'admin'` nunca é atribuído automaticamente — sempre manual.
7. **Doação sem conta (anônima)** usa uma segunda variável de sessão, `app.token_sessao_atual` (mesma ideia do `SET LOCAL` do item 1, só que pra identificar quem doou sem login, via `contribuicao.token_sessao`).

---

### Atualização (26/07/2026) — decisão tomada sobre `campanha_encerrar`

A permissão `campanha_encerrar`, que aparecia na lista acima, foi **removida do banco** (não existe mais em `07_seed_dados.sql`). Ela nunca tinha sido usada por nenhuma regra de acesso (RLS) — ou seja, não fazia nada na prática, só ficava "no papel".

Existiam duas opções: (a) implementar de verdade, criando um atalho pra admin encerrar campanha direto, sem passar por nenhuma aprovação formal; ou (b) remover, já que o sistema já tem um jeito de encerrar campanha antes do prazo — o fluxo de `solicitacao_encerramento` (o pesquisador pede, um admin decide, e fica registrado o motivo).

Decidimos remover, olhando como plataformas de referência do projeto (Catarse, Experiment) fazem isso: nenhuma delas dá a um admin um botão de "encerrar na marra" sem justificativa, porque tem dinheiro de apoiador envolvido.

**Benefícios da decisão:**
- **Menos confusão:** não fica uma permissão "fantasma" no sistema, que existe mas não faz nada — quem olhar o banco não perde tempo tentando descobrir onde ela é usada.
- **Mais segurança e rastreabilidade:** todo encerramento antecipado de campanha continua exigindo justificativa registrada (via `solicitacao_encerramento`), sem atalho que pule essa etapa.
- **Menos trabalho no RBAC:** uma permissão a menos pra manter, documentar e lembrar de testar.
