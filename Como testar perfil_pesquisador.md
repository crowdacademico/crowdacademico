# Como testar `perfil-pesquisador` / `link-academico` na mão

Escrito em 22-08-2026, depois da primeira rodada de teste manual (que funcionou de ponta a ponta). Isto existe porque **não tem tela pronta ainda** - ninguém construiu a aba "virar pesquisador" no React (ela mora dentro de Minha Conta, mas a aba em si ainda não foi feita; combinamos isso com o Claude Web/Opus 5, é trabalho futuro). Enquanto isso, testar é falar direto com a API do backend (Nest), sem passar por tela nenhuma.

## Preparar o ambiente (uma vez só, no início da sessão)

1. **Suba o backend.** Abra um terminal dentro da pasta `nest/` e rode:
   ```
   npm run start:dev
   ```
   Deixe essa janela de terminal aberta e rodando - se você fechar, o servidor cai e as requisições passam a falhar com erro de conexão recusada.

2. **Instale o Thunder Client no VS Code** (se ainda não tiver): aba de Extensões (ícone de blocos no canto esquerdo) → busque "Thunder Client" → Instalar. É um formulário visual pra fazer requisição HTTP - bem mais simples que digitar comando de terminal, e fica dentro do próprio VS Code.

3. Todo endpoint abaixo começa com `http://localhost:3000` (a porta padrão do backend local).

## Contas de teste disponíveis (senha de todas: `DevTcc123!`)

| id_usuario | Nome | E-mail | Situação |
|---|---|---|---|
| 1 | Admin Sistema | admin@crowdacademico.com.br | admin |
| 3 | Moderador Sistema | moderador@crowdacademico.com.br | moderador |
| 12-21 | Ana, Carlos, Beatriz... (pesquisadores "de história") | ex.: ana.santos@usp.br | **já são pesquisadoras E donas de campanha no seed** - não mexa nelas pra teste de criação, senão embaralha os dados calibrados de score |
| 19-22 | Bruno, Renata, Eduardo, Vinícius | ex.: bruno.tavares@ufrgs.br | pesquisadores desenhados a dedo pras 4 faixas de `score_rotulo` (Referência/Confiável/Em Construção/Atenção) - **não mexer** |
| 23 | Fernanda Souza Lima | fernanda.souza@gmail.com | usuário comum, **zerada**, já usada no teste abaixo |
| 24 | Marina Alves Torres | marina.torres@gmail.com | usuário comum, **zerada**, reserva |
| 25 | Gabriel Souza Martins | gabriel.martins@gmail.com | usuário comum, **zerado**, reserva |
| 26 | Camila Rocha Pereira | camila.rocha@gmail.com | usuário comum, **zerada**, reserva |
| 27 | Rafael Costa Andrade | rafael.costa.andrade@gmail.com | usuário comum, **zerado**, reserva |
| 28 | Larissa Mendes Cunha | larissa.mendes@gmail.com | usuário comum, **zerada**, reserva |

Pra qualquer teste novo de "virar pesquisador do zero", use 23 a 28 - nunca 12-22, essas já têm história (todas são donas de campanha, e 19-22 também são as 4 faixas de `score_rotulo` calibradas a dedo).

## Passo 1 - Login (pegar o token)

**POST** `http://localhost:3000/auth/login`

Aba "Body" → JSON:
```json
{ "email": "fernanda.souza@gmail.com", "senha": "DevTcc123!" }
```

Resposta esperada (200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "1.d07cd3f0...",
  "usuario": { "idUsuario": 23, "nome": "Fernanda Souza Lima", "...": "..." },
  "papeis": ["usuario"]
}
```

**Copie o valor de `accessToken`** (só ele, sem aspas) - vai ser usado no header de todo passo protegido daqui pra frente. Ele expira em 15 minutos (`JWT_ACCESS_EXPIRES_IN` no `.env`); se passar desse tempo, refaça este passo 1 pra pegar um novo.

## Passo 2 - Criar o perfil de pesquisador

**POST** `http://localhost:3000/perfil-pesquisador`

Aba "Headers": adicione `Authorization` = `Bearer SEU_TOKEN_AQUI` (cole o token do passo 1, sem as aspas, mantendo a palavra `Bearer` e um espaço antes do token).

Aba "Body" → JSON:
```json
{
  "cpf": "45612398719",
  "tipoVinculo": "institucional",
  "vinculoInstitucional": "Universidade de Teste",
  "tituloAcademico": "mestre"
}
```

`cpf` precisa ser um CPF com dígito verificador válido (o de cima já é), mas **nunca pode repetir** um CPF já usado por outra conta - a segunda tentativa com o mesmo número dá erro de propósito (ver Passo 6). `tipoVinculo` é `"institucional"` ou `"independente"` - se for `"independente"`, **não mande** o campo `vinculoInstitucional` (nem vazio). `tituloAcademico` é um de: `"graduado"`, `"especialista"`, `"mestre"`, `"doutor"`.

Resposta esperada (**201 Created**):
```json
{
  "idUsuario": 23,
  "cpf": "45612398719",
  "tipoVinculo": "institucional",
  "vinculoInstitucional": "Universidade de Teste",
  "tituloAcademico": "mestre",
  "statusPesquisador": "ativo",
  "ativadoEm": null,
  "scoreAtual": 0,
  "scoreAtualizadoEm": null
}
```

O CPF volta em texto puro na resposta porque quem pediu é a própria dona do perfil - isso é esperado, não é bug (ver Passo 4/5 pra comparar com a visão pública).

## Passo 3 - Ver o perfil (visão pública, sem login)

**GET** `http://localhost:3000/perfil-pesquisador/23` (troque `23` pelo `idUsuario` que você usou)

**Sem** nenhum header de `Authorization` - é assim que qualquer visitante anônimo veria essa página.

Resposta esperada: o mesmo perfil do Passo 2, **mas com `"cpf": null`** - é a proteção funcionando, ninguém de fora vê o CPF de ninguém.

## Passo 4 - Ver o perfil de novo, agora logado como a própria dona

Mesma requisição do Passo 3, mas desta vez **com** o header `Authorization: Bearer SEU_TOKEN`.

Resposta esperada: `"cpf"` volta a aparecer em texto puro - porque agora é a própria dona olhando.

## Passo 5 - Score e dimensões

**GET** `http://localhost:3000/perfil-pesquisador/23/score`

Não precisa de header nenhum - score é público de propósito (é a base do "Serasa do Pesquisador", decisão de produto já tomada, ver `DOCUMENTACAO_BD.md`).

Resposta real, do teste que já rodamos:
```json
{
  "idUsuario": 23,
  "scoreTotal": 35,
  "rotulo": "Em Construção",
  "dimensoes": [
    { "nomeDimensao": "perfil_academico",      "pontosObtidos": 10, "peso": "30.00", "motivo": "recalculo_automatico" },
    { "nomeDimensao": "historico_plataforma",  "pontosObtidos": 0,  "peso": "25.00", "motivo": "recalculo_automatico" },
    { "nomeDimensao": "atualizacao_campanha",  "pontosObtidos": 0,  "peso": "20.00", "motivo": "recalculo_automatico" },
    { "nomeDimensao": "reputacao_comunidade",  "pontosObtidos": 25, "peso": "25.00", "motivo": "recalculo_automatico" }
  ]
}
```

**Importante entender por que isso já funciona sem eu ter escrito nenhum código de cálculo:** o motor de score inteiro já existia no banco (trigger `trg_perfil_recalcula_score`, disparada `AFTER INSERT` em `perfil_pesquisador`) - o módulo `6-perfil-pesquisador` só criou a LINHA que disparou o cálculo; quem calculou foi o Postgres sozinho, no mesmo instante do Passo 2.

## Passo 6 - Testar a trava de CPF duplicado (precisa de 2 contas)

Repita o Passo 1 e o Passo 2 inteiros, mas logando com **outra** conta zerada (Marina - `marina.torres@gmail.com`/`DevTcc123!`, ou Gabriel) e usando **o mesmo CPF** que já foi usado no Passo 2 (`45612398719`).

Resposta esperada: erro **409 Conflict**, algo como `"Já existe um registro com estes dados."` - é a coluna `cpf_hash` (o índice cego) barrando duas contas com o mesmo CPF, exatamente pra isso que ela existe.

*(Se você usar a mesma conta da Fernanda de novo em vez de uma conta nova, o erro também aparece, mas por um motivo diferente - ela já TEM perfil, a PK é quem barra dessa vez. Os dois erros voltam parecidos por fora; se precisar diferenciar de verdade um dia, é um ponto já registrado como pendência em `perfil-pesquisador.service.create.ts`.)*

## Extra - Link acadêmico

**POST** `http://localhost:3000/link-academico`, com `Authorization: Bearer` de uma conta que já tenha perfil de pesquisador:
```json
{ "idTipoLink": 1, "url": "https://lattes.cnpq.br/1234567890123456" }
```
`idTipoLink` 1 é Lattes (o seed cria 5 tipos, na ordem Lattes/ORCID/ResearchGate/LinkedIn/GitHub - 1 a 5). A URL precisa bater com o formato daquele tipo (Lattes exige `https://lattes.cnpq.br/` seguido de números) - é o banco que valida isso, não o Nest, então uma URL fora do padrão dá erro 400 vindo direto da trigger `trg_link_academico_valida_tipo`.

**GET** `http://localhost:3000/link-academico?idUsuario=23` - lista os links daquela pessoa, público, sem header.

## Se algo der errado

- **401 no Passo 2 em diante:** o token expirou (15 min) ou você esqueceu a palavra `Bearer` antes dele no header - refaça o Passo 1.
- **Erro de conexão recusada:** o `npm run start:dev` não está rodando, ou caiu - olhe o terminal.
- **400 com mensagem sobre CPF:** o CPF não passou no dígito verificador, ou tem 11 dígitos repetidos (`111.111.111-11` e afins são barrados de propósito).
