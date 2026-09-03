# 🗣️ Achados pra discutir — rodada de documentação (01-09-2026)

Achados pelos agentes que escreveram `DOCUMENTACAO_BACKEND.md`/`DOCUMENTACAO_FRONTEND.md` e pela matriz de rastreabilidade, na mesma rodada. Nenhum foi decidido nem corrigido — só registrados aqui pra discutir com calma depois. Ordem não é prioridade, é só a ordem que saíram no relatório.

---

## 1. `GET /dashboard/resumo` é público e ignora a RLS

`SECURITY DEFINER` sem nenhum guard de autenticação na frente. Pode ser intencional (métricas agregadas gerais não são dado sensível de ninguém) ou pode ter sido um descuido — ninguém parece ter decidido isso conscientemente até onde os agentes conseguiram achar (nenhum comentário no código explicando a escolha). Ver `DOCUMENTACAO_BACKEND.md`, seção sobre `29-dashboard`.

**Pergunta a responder:** isso devia exigir login (mesmo que qualquer papel logado sirva), ou está certo do jeito que está?

## 2. `DevLoginRapido` (o `<dev>` de trocar de persona) não está protegido por `import.meta.env.DEV`

O Campo de Testes já usa esse padrão em 3 lugares (só existe no build de desenvolvimento, some do build de produção). O `DevLoginRapido` não — vai pro bundle de produção carregando as 7 contas de seed com a senha `DevTcc123!` literal no código.

**Pergunta a responder:** vale a mesma proteção (`import.meta.env.DEV`), ou esse atalho precisa continuar disponível em produção por algum motivo (ex.: demonstração pra banca sem senha de verdade)?

## 3. Comentários desatualizados dizendo que upload "ainda não existe"

Em `avatar-usuario.jsx` e `dashboard-identidade-visual.jsx` — os dois ainda justificam um placeholder dizendo que `25-arquivo`/upload não existe. Já existe e funciona (é o que `SeletorFotoPerfil` usa). Não é decisão nenhuma, é só atualizar o comentário — mas fica registrado aqui em vez de eu mexer sem avisar, já que a instrução da rodada era só `.md`.

## 4. `27-resources` continua sem propósito definido

Pasta existe (`nest/src/27-resources/`), vazia, nem código nem nenhum documento diz o que deveria morar ali.

**Pergunta a responder:** o que é isso? Vale decidir antes de alguém tropeçar nela tentando implementar "o próximo módulo" e não saber o que fazer.

## 5. Constantes duplicadas à mão entre `nest/` e `react/`

Exemplos concretos: teto de 8MB por imagem, lista de tipos MIME aceitos, os perfis de redução (512px/80 avatar, 1600px/78 campanha). Hoje cada lado tem sua própria cópia, sincronizada só de boa vontade — não existe import cruzado entre os dois repositórios. É consequência direta de uma pendência mais antiga e já conhecida (item 10 do `PENDENCIAS e correcoes.md`: React em JS ou TS nunca foi decidido — TS abriria a porta pra compartilhar tipos/constantes entre as duas pontas).

**Não é uma decisão nova**, só reaparecendo com um exemplo concreto agora que existe mais coisa duplicada (antes era só uma preocupação teórica).

## 6. `notificacoesPendentes: null` no dashboard não vai se resolver sozinho

Quando `26-notificacao` for construído, não basta o módulo existir — `contar_metricas_dashboard()` (a função SQL que alimenta o card do dashboard) também precisa ganhar essa contagem. Existe um precedente idêntico já comentado no próprio código pra `totalCampanhas` (mesma situação, resolvida do mesmo jeito quando `12-campanha` foi construído) — então o caminho já é conhecido, só não é automático.

---

## Onde ficam os achados "menores" (não estão aqui de propósito)

Cada documento novo tem sua própria seção final ("o que não consegui confirmar com confiança") com uma lista mais longa e mais técnica de detalhes que os agentes não verificaram linha a linha — esses ficam nos próprios documentos (`DOCUMENTACAO_BACKEND.md` e `DOCUMENTACAO_FRONTEND.md`, seções finais), não duplicados aqui. Este arquivo é só pros achados que pareceram merecer uma conversa, não uma checagem técnica.
