# Meu commit foi barrado. E agora?

Guia para quando o `git commit` falha com a mensagem **`husky - pre-commit script failed`**. Não é defeito: é a revisão automática fazendo o trabalho dela.

## O que está acontecendo

A cada commit, uma revisão automática confere o código antes de deixar gravar. Pense num **porteiro** (o **husky**) que, antes de deixar o commit entrar, chama um **revisor rápido** (o **lint-staged**). O revisor passa o **ESLint** (o corretor do código, como um corretor ortográfico) **só nos arquivos que vão entrar no commit**. Achou erro, o commit é recusado. Nada foi perdido: seus arquivos continuam do jeito que estavam.

## Passo a passo

### 1. Ache a lista de erros

Role a mensagem para **cima** a partir de `✖ N problems`. Os erros vêm agrupados por arquivo, assim:

```
C:\Users\...\nest\src\1-usuario\service\usuario.service.update.ts
  12:7   error  'resultado' is assigned a value but never used   @typescript-eslint/no-unused-vars
```

Como ler:

- **Primeira linha:** o arquivo com problema.
- **`12:7`:** linha 12, coluna 7 do arquivo. No VS Code, abra o arquivo e aperte `Ctrl+G` para ir direto à linha.
- **O texto do meio:** o problema, em inglês. Colar no tradutor ajuda.
- **O final (`no-unused-vars`):** o nome da regra. Pesquisar esse nome na internet explica a regra.

### 2. Descubra qual é o caso

**Caso A: muitos erros de uma vez (dezenas ou centenas), em arquivos que você nem mexeu.** Quase sempre é o **"carrinho" incompleto**. O commit só leva o que está no carrinho (o `git add`, também chamado de *staged*). Se uma parte das mudanças ficou fora, o revisor olha uma versão pela metade, que não funciona. Isso é comum depois de renomear arquivos: o nome novo foi para o carrinho, mas a correção dentro deles não. Mensagens típicas: *"Unable to resolve path"*, *"Cannot find module"* e muitos *"Unsafe ... any"*.

**Como resolver:** coloque tudo no carrinho e tente de novo.

- **No VS Code:** na aba de controle de código (o ícone de ramificação, na lateral), aparecem duas listas, **"Staged Changes"** (no carrinho) e **"Changes"** (fora dele). Passe o mouse sobre **"Changes"** e clique no **`+`** para mandar tudo para o carrinho. Depois faça o commit de novo.
- **No terminal**, na pasta do projeto: `git add -A` e depois o commit.

**Caso B: poucos erros, nos arquivos que você mudou.** É um problema de verdade no código, como uma variável criada e nunca usada, ou um tipo errado. Abra o arquivo na linha indicada e corrija. Se não souber como, veja o passo 4.

**Caso C: a mensagem não tem `C:\...` nem `error`, e fala em `npx`, `not found` ou `ENOENT`.** A ferramenta não está instalada neste computador. Rode `npm install` na **pasta raiz** do projeto e tente de novo.

### 3. Confira antes de tentar de novo (opcional)

Para rodar a mesma revisão **sem** fazer o commit, no terminal, na pasta raiz do projeto:

```
npx lint-staged
```

Terminar com `✔ Done running tasks` quer dizer que o commit vai passar.

Para revisar um lado inteiro, e não só o que está no carrinho: na pasta `nest`, rode `npx eslint src`; na pasta `react`, rode `npm run lint`.

### 4. Se não conseguir resolver

- Copie a mensagem inteira do erro (desde a primeira linha `C:\...` até `✖ N problems`) e mande para quem for ajudar. Com o nome do arquivo, a linha e a regra, dá para resolver sem precisar do seu computador.
- **Não apague nem desfaça nada para "fazer passar".** Os arquivos estão salvos; o commit só não foi gravado.

## Pular a revisão (só em emergência)

O comando `git commit --no-verify -m "mensagem"` grava sem passar pelo porteiro. **Use só se for urgente, e avise a outra pessoa.** Tudo o que o revisor barraria entra no projeto do mesmo jeito, e quem baixar depois pode receber código que não funciona.

## Para saber mais

A parte técnica (onde fica cada configuração e como desligar) está no `DOCUMENTACAO_LINT.md`, seção "Checagem no commit".
