# 🗺️ Próximos Módulos — CrowdAcadêmico

**O que é este arquivo:** lista dos módulos do backend (Nest) que ainda faltam construir, em ordem sugerida, pra qualquer uma das duas pegar uma tarefa e começar sem precisar perguntar "o que falta fazer mesmo?". Cada módulo já tem a pasta criada (`nest/src/<numero>-<nome>/`) e o schema do banco já existe inteiro (tabelas, RLS, triggers) — o trabalho que falta é só o lado Nest (controllers/services/DTOs), seguindo o mesmo padrão dos módulos que já existem (`1-usuario`, `2-papel-permissao`, `3-auth`, `11-configuracoes` são bons exemplos pra copiar o estilo).

Ordem pensada por dependência de produto (o que precisa existir antes de outra coisa fazer sentido) — não é obrigatório seguir à risca, mas evita ficar bloqueada esperando algo que ainda não existe.

---

## Grupo 1 — Catálogos pequenos (bom ponto de partida)

Três módulos pequenos e parecidos entre si — todos seguem o mesmo formato (uma tabela de catálogo, `findall` público + `create`/`update` protegidos por permissão administrativa). Bons pra pegar o ritmo do padrão do projeto antes de encarar algo maior.

- **`8-area-conhecimento`** — grandes áreas e áreas do CNPq (hierarquia de 2 níveis). Necessário pra criar uma campanha (toda campanha precisa de uma área nível 2).
- **`9-tipo-link`** — catálogo de tipos de link externo (Lattes, ORCID, LinkedIn, GitHub, site institucional...).
- **`10-motivo-denuncia`** — catálogo de motivos de denúncia (campanha e perfil).

## Grupo 2 — Perfil do pesquisador

- **`6-perfil-pesquisador`** — o maior módulo pendente relacionado a usuário. Inclui: criar/editar perfil (vínculo institucional ou independente, título acadêmico), campo de CPF com validação de verdade (algoritmo com dígito verificador, não só formato), consulta do score e das dimensões. Ainda não existe nada aqui — só a pasta.

## Grupo 3 — Upload de arquivo

- **`25-arquivo`** — upload de mídia (imagem de perfil, imagens de campanha, anexos). Vale vir cedo porque várias telas futuras (perfil, campanha, atualização de campanha) vão precisar disso pra funcionar de verdade, não só com texto.

## Grupo 4 — Núcleo da campanha (o mais importante do projeto)

- **`12-campanha`** — CRUD completo: criar, listar, consultar, aprovar/rejeitar (fluxo de moderação), editar. É o módulo do qual praticamente tudo mais depende.
- **`13-orcamento-campanha`** — itens de orçamento estruturado (categoria + valor), obrigatório pra aprovar uma campanha.
- **`14-marco-cronograma`** — cronograma estruturado (marcos com data prevista), também obrigatório pra aprovar.
- **`7-link-academico`** — links do pesquisador vinculados ao próprio perfil (Lattes, ORCID etc.), usando o catálogo do Grupo 1.

## Grupo 5 — Engajamento numa campanha já aprovada

- **`15-atualizacao-campanha`** — posts de acompanhamento do projeto (andamento, resultado preliminar, resultado final).
- **`16-seguir-campanha`** — seguir/deixar de seguir uma campanha.
- **`17-comentario`** — comentários e endosso, com moderação.
- **`18-recompensa`** — recompensas oferecidas por faixa de contribuição.

## Grupo 6 — Moderação e encerramento

- **`19-denuncia`** — denúncia de campanha ou perfil, usando o catálogo de motivos (Grupo 1).
- **`20-solicitacao-encerramento`** — pedido de encerramento antecipado de campanha, com decisão do admin.
- **`21-historico-rejeicao`** — histórico de rejeições de campanha (consulta, majoritariamente).

## Grupo 7 — Comunicação

- **`4-mail`** — envio de e-mail (verificação de conta, recuperação de senha, notificações). Hoje nada disso é enviado de verdade.
- **`26-notificacao`** — fila/histórico de notificações (o que já existe na tabela `notificacao`, expor pelo Nest).
- **`5-termo-uso`** — versionamento de termos de uso e aceite pelo usuário.

## Grupo 8 — Pagamento (por último, de propósito)

Esta parte só começa depois que o resto do sistema — principalmente o painel administrativo e o núcleo de campanha — estiver funcionando perfeitamente. Também depende de uma decisão de negócio ainda não tomada (qual gateway de pagamento usar).

- **`22-contribuicao`** — registrar contribuição/doação, incluindo o recebimento da confirmação de pagamento do gateway escolhido.
- **`23-repasse`** — repasse do dinheiro arrecadado pro pesquisador, depois da campanha aprovada/bem-sucedida.
- **`24-auditoria-financeira`** — trilha de auditoria dos eventos financeiros (a tabela já existe e já é usada por trigger do banco; expor pelo Nest é o que falta).

## Ainda a mapear

- **`27-resources`** — pasta existe, propósito ainda não definido. Decidir o que vai aqui antes de começar.

---

## Fora do backend (Nest) — vale registrar também

- **Página pública de campanha (React)** — hoje só existe o painel administrativo; a página que um doador visita e compartilha ainda não foi construída. Faz mais sentido depois que `12-campanha` existir de verdade no backend.
- **Open Graph** (prévia de link ao compartilhar no WhatsApp) — depende da página pública existir primeiro.
