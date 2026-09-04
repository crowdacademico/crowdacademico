# 🗣️ Achados pra discutir - rodada de documentação (01-09-2026)

Achados pelos agentes que escreveram `DOCUMENTACAO_BACKEND.md`/`DOCUMENTACAO_FRONTEND.md` e pela matriz de rastreabilidade, na mesma rodada. Nenhum foi decidido nem corrigido - só registrados aqui pra discutir com calma depois. Ordem não é prioridade, é só a ordem que saíram no relatório.

---

## 1. 🟢 DECIDIDO (04-09-2026) - `GET /dashboard/resumo` continua público, de propósito

`SECURITY DEFINER` sem guard de autenticação na frente - os números agregados (total de usuários, sessões ativas etc.) ficam acessíveis sem login. Chegou a ser corrigido com `@UseGuards(RequireAuthGuard)`, mas o Lucas decidiu reverter: a exigência de login atrapalha mais que ajuda durante o desenvolvimento agora, e a decisão de arquitetura de longo prazo é que o painel admin inteiro vai ficar fora do alcance do usuário comum de outra forma (não é este guard específico que vai sustentar essa fronteira). Não é esquecimento - é decisão consciente de deixar como está.

## 2. 🟢 RESOLVIDO (04-09-2026) - `DevLoginRapido` protegido por `import.meta.env.DEV`

O Campo de Testes já usava esse padrão em 3 lugares (só existe no build de desenvolvimento, some do build de produção). O `DevLoginRapido` não usava - ia pro bundle de produção carregando as 7 contas de seed com a senha `DevTcc123!` literal no código. Decisão do Lucas: proteger, mesma lógica do Campo de Testes (a conveniência em `npm run dev` não muda; só deixa de ir pro build de produção). Corrigido em `header.jsx`.

## 3. 🟢 RESOLVIDO (04-09-2026) - Comentários desatualizados dizendo que upload "ainda não existe"

Em `avatar-usuario.jsx` e `dashboard-identidade-visual.jsx` - os dois ainda justificavam um placeholder dizendo que `25-arquivo`/upload não existia. Já existia e funcionava (é o que `SeletorFotoPerfil` usa) - não era decisão nenhuma, só comentário desatualizado. Corrigidos os dois: `avatar-usuario.jsx` agora descreve o upload como existente; `dashboard-identidade-visual.jsx` deixa claro que o que falta não é mais o upload em si, é construir a tela de gerenciar logo/favicon (ninguém pediu ainda).

## 4. 🟢 RESOLVIDO (04-09-2026) - `27-resources` era sobra do modelo da disciplina, removida

O Lucas perguntou pra Alexia, ela lembrou que vinha do sistema modelo da disciplina (Programação para Web 2). Investigado nos dois repositórios de referência do curso: `resources`, lá, é um catálogo estático de rota (`GET /rest/resources`) que o React consulta pra montar URL sem hardcode - só faz sentido porque aquele sistema segue uma convenção rígida de 5 endpoints por entidade. O CrowdAcadêmico já resolve o mesmo problema de origem de outro jeito (`<modulo>.api.js` por módulo), e as rotas daqui não são uniformes o bastante pra caber nesse molde. Pasta vazia removida - detalhe completo em `DOCUMENTACAO_BACKEND.md`, seção 14 (nota 🗑️).

## 5. Constantes duplicadas à mão entre `nest/` e `react/`

Exemplos concretos: teto de 8MB por imagem, lista de tipos MIME aceitos, os perfis de redução (512px/80 avatar, 1600px/78 campanha). Hoje cada lado tem sua própria cópia, sincronizada só de boa vontade - não existe import cruzado entre os dois repositórios. É consequência direta de uma pendência mais antiga e já conhecida (item 10 do `PENDENCIAS e correcoes.md`: React em JS ou TS nunca foi decidido - TS abriria a porta pra compartilhar tipos/constantes entre as duas pontas).

**Não é uma decisão nova**, só reaparecendo com um exemplo concreto agora que existe mais coisa duplicada (antes era só uma preocupação teórica).

## 6. `notificacoesPendentes: null` no dashboard não vai se resolver sozinho

Quando `26-notificacao` for construído, não basta o módulo existir - `contar_metricas_dashboard()` (a função SQL que alimenta o card do dashboard) também precisa ganhar essa contagem. Existe um precedente idêntico já comentado no próprio código pra `totalCampanhas` (mesma situação, resolvida do mesmo jeito quando `12-campanha` foi construído) - então o caminho já é conhecido, só não é automático.

---

## Onde ficam os achados "menores" (não estão aqui de propósito)

Cada documento novo tem sua própria seção final ("o que não consegui confirmar com confiança") com uma lista mais longa e mais técnica de detalhes que os agentes não verificaram linha a linha - esses ficam nos próprios documentos (`DOCUMENTACAO_BACKEND.md` e `DOCUMENTACAO_FRONTEND.md`, seções finais), não duplicados aqui. Este arquivo é só pros achados que pareceram merecer uma conversa, não uma checagem técnica.
