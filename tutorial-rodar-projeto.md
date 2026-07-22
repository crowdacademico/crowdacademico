# Tutorial: colocando o CrowdAcadêmico pra rodar na sua máquina

Este guia parte do zero: banco de dados, backend (NestJS) e frontend (React), tudo gratuito. A ideia aqui não é construir o sistema inteiro — é só chegar num ponto em que você **vê** o front e o back conversando, com dados reais vindos do banco na tela. Depois disso, o resto é ir adicionando telas e rotas aos poucos.

Siga na ordem. Não pule etapas mesmo que pareçam óbvias.

---

## Parte 0 — o que você vai instalar (tudo grátis)

| Ferramenta | Pra quê | Link |
|---|---|---|
| PostgreSQL | o banco de dados de verdade (não é o do XAMPP) | https://www.postgresql.org/download/ |
| DBeaver | você já tem — cliente para rodar os `.sql` | (já instalado) |
| Node.js (versão LTS) | roda tanto o backend quanto o frontend | https://nodejs.org |
| VS Code (opcional, mas recomendo) | editor de código | https://code.visualstudio.com |

**Esqueça o XAMPP para este projeto.** Ele instala MySQL/MariaDB, e todo o seu schema (`CREATE EXTENSION`, `ENUM`, `ROW LEVEL SECURITY`, funções `plpgsql`) é PostgreSQL puro. São bancos incompatíveis — não dá pra rodar seus `.sql` nele.

---

## Parte 1 — instalar o PostgreSQL

1. Baixe o instalador em postgresql.org (escolha a versão mais recente estável, ex. 16 ou 17).
2. Durante a instalação, ele vai pedir uma **senha do superusuário `postgres`**. Escolha uma senha simples só para uso local (ex. `postgres123`) e **anote em algum lugar** — vai precisar dela para conectar no DBeaver.
3. Deixe a porta padrão (`5432`).
4. Ao final, o instalador pode oferecer o "Stack Builder" — pode fechar, você não precisa disso.

Pronto, o Postgres já fica rodando sozinho em segundo plano (como um serviço do Windows/Mac), você não precisa "abrir" nada todo dia.

---

## Parte 2 — criar o banco e conectar o DBeaver

1. Abra o **DBeaver** → **Nova Conexão** → escolha **PostgreSQL**.
2. Host: `localhost`, Porta: `5432`, Usuário: `postgres`, Senha: a que você criou na Parte 1.
3. Teste a conexão ("Test Connection") — se der certo, finalize.
4. Com a conexão aberta, clique com o botão direito em "Databases" → **Create New Database** → nomeie de `crowdacademico`.
5. Abra uma nova conexão (ou edite a atual) apontando para o banco `crowdacademico` especificamente, não o banco padrão `postgres`.

---

## Parte 3 — rodar os arquivos SQL (ordem corrigida)

Abra o **SQL Editor** do DBeaver conectado ao banco `crowdacademico` e rode os arquivos **nesta ordem exata** — repare que a ordem numérica normal (01→08) tem um problema que expliquei antes: o `05` usa duas funções que só existem depois do `06b`. Por isso a ordem certa é:

```
1. 01_extensoes_enums_tabelas.sql
2. 02_indices.sql
3. 03_funcoes_seguranca.sql
4. 04_rls_policies.sql
5. 06b_regras_negocio.sql   ← rode ANTES do 05
6. 05_grants.sql            ← agora sim, as funções já existem
7. 07_seed_dados.sql
8. 08_trigger_signup_usuario.sql
```

**Como rodar cada um:** abra o arquivo `.sql`, selecione todo o conteúdo (Ctrl+A), e execute como script (no DBeaver geralmente é o botão de "Execute SQL Script", ou `Alt+X` — não use "Execute SQL Statement", que roda só um comando por vez). Faça um arquivo de cada vez, confira se não deu erro vermelho no log antes de ir pro próximo.

Se algum arquivo der erro na primeira linha por já existir algo (ex. rodou duas vezes sem querer), o mais simples é apagar o banco `crowdacademico` inteiro e criar de novo (Parte 2, passo 4) e recomeçar a sequência.

### Depois de rodar tudo, troque a senha do usuário da aplicação

O `05_grants.sql` cria um usuário chamado `app_nestjs` com uma senha provisória escrita no próprio arquivo. Troque por uma sua, rodando isso no SQL Editor:

```sql
ALTER ROLE app_nestjs PASSWORD 'escolha-uma-senha-aqui';
```

Anote essa senha — é ela que o backend vai usar pra se conectar (não a senha do `postgres`).

---

## Parte 4 — criar o backend (NestJS)

Abra um terminal (pode ser o do VS Code: menu **Terminal → New Terminal**) numa pasta onde você quer guardar o projeto, e rode:

```bash
npm install -g @nestjs/cli
nest new backend
```

Escolha `npm` como gerenciador de pacotes quando ele perguntar. Isso cria uma pasta `backend` com um projeto Nest funcionando (mesmo sem banco, ele já sobe).

Entre na pasta e instale o driver do Postgres:

```bash
cd backend
npm install pg
```

### Arquivo de configuração da conexão

Crie um arquivo `.env` na raiz da pasta `backend`:

```
DATABASE_URL=postgresql://app_nestjs:escolha-uma-senha-aqui@localhost:5432/crowdacademico
```

(troque `escolha-uma-senha-aqui` pela senha que você definiu na Parte 3).

Instale também o pacote pra ler o `.env`:

```bash
npm install @nestjs/config
```

### Um endpoint simples, só pra provar que está tudo ligado

Vamos criar uma rota bem simples que busca as áreas de conhecimento (uma tabela que já é pública, sem exigir login — ótimo pra um primeiro teste, porque evita mexer em RLS por enquanto).

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
    const result = await this.pool.query(
      'SELECT id_area_conhecimento, nome FROM area_conhecimento WHERE ativo = TRUE ORDER BY nome',
    );
    return result.rows;
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

Suba o backend:

```bash
npm run start:dev
```

Abra o navegador em **http://localhost:3000/areas** — se aparecer uma lista em JSON com as 9 áreas de conhecimento (Ciências Exatas, Engenharias, etc.), o backend está conversando com o banco de verdade. 🎉

Se der erro de conexão, confira: senha certa no `.env`, Postgres rodando, nome do banco `crowdacademico` certo.

---

## Parte 5 — criar o frontend (React + Vite)

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

  useEffect(() => {
    fetch('http://localhost:3000/areas')
      .then((res) => res.json())
      .then((data) => setAreas(data));
  }, []);

  return (
    <div>
      <h1>Áreas de Conhecimento — CrowdAcadêmico</h1>
      <ul>
        {areas.map((a) => (
          <li key={a.id_area_conhecimento}>{a.nome}</li>
        ))}
      </ul>
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
2. Confirme sempre que o backend conecta como `app_nestjs`, nunca como `postgres` — senão a RLS é ignorada silenciosamente e parece que "está tudo funcionando" sem estar de verdade protegido.
3. A branch `auth` tem permissões novas (`area_conhecimento_gerenciar`, `papel_gerenciar` etc.) seedadas mas ainda sem policy de RLS que as use — mencionei isso na análise anterior, ainda vale resolver antes de contar com elas no admin.
