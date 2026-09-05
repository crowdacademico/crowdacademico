# 🗺️ Próximos Módulos - CrowdAcadêmico

**O que é este arquivo:** lista dos módulos do backend (Nest) que ainda faltam construir, em ordem sugerida, pra qualquer uma das duas pegar uma tarefa e começar sem precisar perguntar "o que falta fazer mesmo?". Cada módulo já tem a pasta criada (`nest/src/<numero>-<nome>/`) e o schema do banco já existe inteiro (tabelas, RLS, triggers) - o trabalho que falta é só o lado Nest (controllers/services/DTOs), seguindo o mesmo padrão dos módulos que já existem (`1-usuario`, `2-papel-permissao`, `3-auth`, `11-configuracoes` são bons exemplos pra copiar o estilo).

Ordem pensada por dependência de produto (o que precisa existir antes de outra coisa fazer sentido) - não é obrigatório seguir à risca, mas evita ficar bloqueada esperando algo que ainda não existe.

---

## Grupo 1 - Catálogos pequenos (bom ponto de partida)

Três módulos pequenos e parecidos entre si - todos seguem o mesmo formato (uma tabela de catálogo, `findall` público + `create`/`update` protegidos por permissão administrativa). Bons pra pegar o ritmo do padrão do projeto antes de encarar algo maior.

- ✅ **`8-area-conhecimento`** - grandes áreas e áreas do CNPq (hierarquia de 2 níveis). Necessário pra criar uma campanha (toda campanha precisa de uma área nível 2).
- ✅ **`9-tipo-link`** - catálogo de tipos de link externo (Lattes, ORCID, LinkedIn, GitHub, site institucional...).
- ✅ **`10-motivo-denuncia`** - catálogo de motivos de denúncia (campanha e perfil).

## Grupo 2 - Perfil do pesquisador

- ✅ **`6-perfil-pesquisador`** - o maior módulo pendente relacionado a usuário. Inclui: criar/editar perfil (vínculo institucional ou independente, título acadêmico), campo de CPF com validação de verdade (algoritmo com dígito verificador, não só formato), consulta do score e das dimensões.

## Grupo 3 - Upload de arquivo

- ✅ **`25-arquivo`** - upload de mídia (imagem de perfil, imagens de campanha, anexos), fluxo em 2 passos (URL pré-assinada + confirmação com verificação de assinatura de bytes). **01-09-2026:** ganhou processamento server-side com `sharp` na confirmação (redimensiona + converte pra WebP + remove EXIF, por `contexto`: avatar 512px/qualidade 80, campanha/atualização 1600px/qualidade 78), cota de 50MB por usuário, e tetos de tamanho por tipo baixados pra 8MB imagem / 5MB PDF (o plano grátis do Supabase Storage, provedor atual, só tem 1GB de espaço total). Front (`seletor-foto-perfil.jsx`) também reduz a imagem no navegador antes de subir (Canvas API), como otimização de UX, não de segurança - o `sharp` no backend continua sendo a autoridade final. Detalhe pra quem for construir o upload de campanha/atualização: **hoje só o avatar chama `contexto: 'avatar'`** - a tela de Criar Campanha ainda não existe no React, então `contexto: 'campanha'`/`'atualizacao'` não tem chamador real ainda, só o perfil implementado no backend.

## Grupo 4 - Núcleo da campanha (o mais importante do projeto)

- ✅ **`12-campanha`** - CRUD completo: criar, listar, consultar, aprovar/rejeitar (fluxo de moderação), editar. É o módulo do qual praticamente tudo mais depende.
- ✅ **`13-orcamento-campanha`** - itens de orçamento estruturado (categoria + valor), obrigatório pra aprovar uma campanha.
- ✅ **`14-marco-cronograma`** - cronograma estruturado (marcos com data prevista), também obrigatório pra aprovar.
- ✅ **`7-link-academico`** - links do pesquisador vinculados ao próprio perfil (Lattes, ORCID etc.), usando o catálogo do Grupo 1.

## Grupo 5 - Engajamento numa campanha já aprovada

- ✅ **`15-atualizacao-campanha`** - posts de acompanhamento do projeto (andamento, resultado preliminar, resultado final). Junto: `link_atualizacao` e `arquivo_atualizacao` (satélites sem pasta própria, dobrados neste módulo - ver `db.types.ts`). O vínculo de arquivo já funciona (INSERT normal), só não é testável de ponta a ponta até `25-arquivo` existir.
- ✅ **`16-seguir-campanha`** - seguir/deixar de seguir uma campanha.
- ✅ **`17-comentario`** - comentários e endosso, com moderação.
- **`18-recompensa`** - recompensas oferecidas por faixa de contribuição. Junto (mesmo raciocínio de `15`): `link_recompensa` e `arquivo_recompensa`. **Ainda não implementado** - 22-08-2026, escopo explicitamente parado em `17-comentario` nesta rodada, a pedido do Lucas.

## Grupo 6 - Moderação e encerramento

- **`19-denuncia`** - denúncia de campanha ou perfil, usando o catálogo de motivos (Grupo 1).
- **`20-solicitacao-encerramento`** - pedido de encerramento antecipado de campanha, com decisão do admin.
- **`21-historico-rejeicao`** - histórico de rejeições de campanha (consulta, majoritariamente).

## Grupo 7 - Comunicação

- **`4-mail`** - envio de e-mail (verificação de conta, recuperação de senha, notificações). Hoje nada disso é enviado de verdade - é o único módulo que bloqueia outros dois RFs já prontos no banco (verificação de e-mail e recuperação de senha, ver `PENDENCIAS e correcoes.md`, item 6).
- **`26-notificacao`** - fila/histórico de notificações (o que já existe na tabela `notificacao`, expor pelo Nest).
- ✅ **`5-termo-uso`** - versionamento de termos de uso e aceite pelo usuário. **(esta lista tinha ficado desatualizada aqui - o módulo já existia, 4 arquivos, conferido em 01-09-2026)**

## Grupo 8 - Pagamento (por último, de propósito)

Esta parte só começa depois que o resto do sistema - principalmente o painel administrativo e o núcleo de campanha - estiver funcionando perfeitamente. Também depende de uma decisão de negócio ainda não tomada (qual gateway de pagamento usar).

- **`22-contribuicao`** - registrar contribuição/doação, incluindo o recebimento da confirmação de pagamento do gateway escolhido.
- **`23-repasse`** - repasse do dinheiro arrecadado pro pesquisador, depois da campanha aprovada/bem-sucedida.
- **`24-auditoria-financeira`** - trilha de auditoria dos eventos financeiros (a tabela já existe e já é usada por trigger do banco; expor pelo Nest é o que falta).

## Grupo 9 - Painel administrativo (não estavam nesta lista, mas já existem)

Estes dois módulos ficaram de fora da lista original - construídos direto, sem passar por aqui como "próximo módulo" antes. Registrados agora (01-09-2026) só pra este documento não mentir sobre o que falta.

- ✅ **`27-log-auditoria`** - trilha de auditoria administrativa (quem alterou o quê, quando, valor antes/depois - letra `L` no `DOCUMENTACAO_BD.md`). Modo somente-inclusão, ninguém edita/apaga.
- ✅ **`28-dashboard`** - métricas agregadas do painel admin (`GET /dashboard/resumo`), usa `contar_metricas_dashboard()` (`[03-M]`, `DOCUMENTACAO_BD.md`) porque RLS normal não dá número confiável de "total do sistema".

## Já descartado

- 🗑️ **`27-resources`** - removido (04-09-2026). Era sobra do esqueleto de pastas herdado do modelo da disciplina, sem propósito real neste projeto - ver `DOCUMENTACAO_BACKEND.md`, seção 14, pra explicação completa.

---

## Fora do backend (Nest) - vale registrar também

- **Página pública de campanha (React)** - hoje só existe o painel administrativo; a página que um doador visita e compartilha ainda não foi construída. Faz mais sentido depois que `12-campanha` existir de verdade no backend.
- **Open Graph** (prévia de link ao compartilhar no WhatsApp) - depende da página pública existir primeiro.
