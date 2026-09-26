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

- ✅ **`12-campanha`** - CRUD completo: criar, listar, consultar, aprovar/rejeitar (fluxo de moderação), editar. É o módulo do qual praticamente tudo mais depende. **21-09-2026, ciclo de vida completo:** a campanha nasce **Rascunho** e só entra na fila por `POST /campanha/:id/enviar`; a rejeitada é corrigida e reenviada no mesmo endpoint (máximo de reenvios e prazo por rejeição, configuráveis; esgotada, vira só leitura); `POST /campanha/:id/deslizar-datas` reagenda mantendo a duração; 4 jobs agendados no sistema (2 são deste módulo: expirar rascunho e expirar rejeitada). Regras no banco, ver `DOCUMENTACAO_BD.md` [05-K-2-B].
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
- ✅ **`21-historico-rejeicao`** - histórico de rejeições de campanha, consulta pura (14-09-2026; desde 21-09-2026 sobrevive à exclusão da campanha e guarda dono e título, ver `DOCUMENTACAO_BD.md`). `GET /historico-rejeicao?idCampanha=` (nome do admin já resolvido via join, mais recente primeiro) - sem tela própria, virou seção "Histórico de Rejeições" dentro de Consultar Campanha (admin real e T2 do Campo de Testes), escondida quando a campanha nunca foi rejeitada.

## Grupo 7 - Comunicação

- **`4-mail`** - envio de e-mail (verificação de conta, recuperação de senha, notificações, **e-mail de rejeição de campanha com reenvios restantes e data limite**: os dados já são devolvidos por `GET /campanha/:id`, falta só o módulo). Hoje nada disso é enviado de verdade - é o único módulo que bloqueia outros dois RFs já prontos no banco (verificação de e-mail e recuperação de senha, ver `PENDENCIAS e correcoes.md`, item 6). **Textos de e-mail:** quando o módulo entrar, o conteúdo (aprovação, reprovação, meta atingida) não deveria nascer fixo num `.ts`: muda por decisão de produto e é candidato natural a uma tabela `template_email` editável pelo admin, sem risco, porque nenhuma regra do sistema depende do texto de um e-mail.
- **`26-notificacao`** - fila/histórico de notificações (o que já existe na tabela `notificacao`, expor pelo Nest).
- ✅ **`5-termo-uso`** - versionamento de termos de uso e aceite pelo usuário. **(esta lista tinha ficado desatualizada aqui - o módulo já existia, 4 arquivos, conferido em 01-09-2026)**

## Grupo 8 - Pagamento (por último, de propósito)

Esta parte só começa depois que o resto do sistema - principalmente o painel administrativo e o núcleo de campanha - estiver funcionando perfeitamente. Também depende de uma decisão de negócio ainda não tomada (qual gateway de pagamento usar).

**Regra do Lucas (24-09-2026):** é a última coisa do sistema, e os testes serão todos em sandbox, **mas sandbox não é desculpa para fazer mal feito**: quando chegar a hora, mesmo em sandbox, tem que funcionar perfeitamente (assinatura do webhook, idempotência, reconciliação, máquina de estados de contribuição e repasse).

**Escolha do gateway (levantamento de 03-08-2026; confirmar valores e regras no site de cada um antes de decidir).** Ela destrava três coisas de uma vez: verificação de assinatura HMAC do webhook, idempotência (gateways reenviam webhook "pelo menos uma vez") e reconciliação financeira (job comparando o extrato do gateway com `contribuicao`). O critério mais importante para este projeto: o dinheiro entra de vários doadores, fica em custódia até a campanha ser aprovada (ou até o prazo acabar, no all-or-nothing) e só depois é repassado ao pesquisador, ou devolvido a todos se a meta não foi batida. No mundo dos gateways isso se chama "split de pagamento" ou "marketplace", e nem todo gateway faz de forma automática; sem split o repasse vira processo manual (mais trabalho e mais chance de erro humano, mas não impede o TCC de funcionar).

- **Mercado Pago:** o mais usado no Brasil, documentação em português, PIX nativo, "Marketplace" com split automático. Atenção: habilitar o split costuma pedir CNPJ e um processo de aprovação; conferir se dá para testar em sandbox só com CPF.
- **Asaas:** brasileiro, pensado desde o início para plataformas, com "subcontas" que mapeiam bem o dinheiro em custódia. PIX nativo e ambiente de teste. Menos conhecido, com menos tutorial e comunidade.
- **Pagar.me (Stone):** split robusto (Pagar.me Connect), habilitação mais burocrática, geralmente pede CNPJ.
- **Stripe:** documentação excelente e Stripe Connect maduro para split. Atenção: o suporte a PIX no Brasil veio depois dos gateways brasileiros (checar se hoje é suficiente) e a documentação é em inglês.
- **Efí Bank (ex-Gerencianet):** focado em PIX direto, API simples. Não tem split automático: o repasse ao pesquisador seria uma transferência separada, manual ou por outra chamada de API.

Riscos de decidir mal ou tarde: escolher um sem split e descobrir depois que o repasse não é automático; escolher um que exige CNPJ para a funcionalidade necessária e ter de trocar no meio do caminho; decidir com pressa quando restar pouco tempo de TCC. Perguntas para decidir: existe CNPJ ou MEI disponível, ou os testes serão só com CPF pessoal (sandbox)? Vale a complexidade de um split automático, ou o repasse manual é simples o bastante para o tamanho deste TCC? **Status:** gateway ainda não escolhido.

- **`22-contribuicao`** - registrar contribuição/doação, incluindo o recebimento da confirmação de pagamento do gateway escolhido.
- **`23-repasse`** - repasse do dinheiro arrecadado pro pesquisador, depois da campanha aprovada/bem-sucedida.
- **`24-auditoria-financeira`** - trilha de auditoria dos eventos financeiros (a tabela já existe e já é usada por trigger do banco; expor pelo Nest é o que falta).

**Já conhecidos antes de construir o 22 e o 23** (achados da revisão de 24-09-2026, registrados aqui para ninguém depender de lembrar; nada disto foi feito ainda, porque só faz sentido junto com os módulos):

- **`22-contribuicao`:**
  - `UNIQUE` parcial em `contribuicao.id_transacao_api` (`WHERE id_transacao_api IS NOT NULL`). Sem ele, um webhook do gateway entregue duas vezes confirma a mesma contribuição duas vezes.
  - Máquina de estados para `status_contribuicao`. Hoje `atualizar_status_contribuicao()` (`SECURITY DEFINER`) aceita qualquer status a partir de qualquer status, para qualquer linha, sem checar permissão nem origem.
  - Quem chama `atualizar_status_contribuicao()` precisa ser só o webhook, com a assinatura do gateway verificada no Nest; ou a função checa permissão por dentro, ou o `EXECUTE` é revogado de `app_nestjs` e ela só roda por trigger.
  - Fundir as triggers de `contribuicao` (`trg_contribuicao_all_or_nothing_pix` e a de `UPDATE`, mais `trg_valida_status_contribuicao` e `trg_contribuicao_valida_valor_minimo`) numa função por evento.
  - Job para expirar contribuição pendente (`status_contribuicao = 'expirado'` existe no enum e nada o escreve).
  - Lembrar que, desde 24-09-2026, `app_nestjs` **não** atualiza `valor_bruto_arrecadado` (nem `taxa_plataforma` nem `encerrado_em`): o total é mantido pela trigger `trg_sincroniza_arrecadado_campanha`, que é `SECURITY DEFINER`. O service de contribuição só faz `INSERT` em `contribuicao`.
- **`23-repasse`:** `atualizar_status_repasse()` tem o mesmo problema de `atualizar_status_contribuicao()` (qualquer status, sem checagem). O modelo de campanha `flexivel` (repasse independente da meta) também espera este módulo; hoje o DTO só aceita `all-or-nothing`.

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
