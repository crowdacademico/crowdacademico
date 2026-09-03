# ERRCODE customizado - `05_regras_negocio.sql`

Referência rápida das 42 `RAISE EXCEPTION` do arquivo `arquivos_banco_dados/05_regras_negocio.sql`, agora todas com `USING ERRCODE = '<código>'`. Antes desta mudança, todas caíam no SQLSTATE genérico do Postgres para qualquer `RAISE EXCEPTION` sem código explícito (`P0001`) - o que impedia o Nest de diferenciar "sem permissão" de "dado inválido" de "estado conflitante".

**Nada foi alterado além disso**: nenhuma mensagem, nenhuma lógica, nenhuma trigger foi tocada - só a cláusula `USING ERRCODE` foi adicionada ao final de cada `RAISE EXCEPTION`. O diff é puramente aditivo (conferido linha a linha).

Este documento **não altera nada no Nest/React** - a ideia é que vocês (você e seu colega) decidam juntos como consumir esses códigos em `postgres-exception.filter.ts` e nos services, sem eu mexer em código que já está em implementação.

---

## Esquema de faixas

Nenhuma faixa colide com os SQLSTATE nativos do Postgres já tratados em `postgres-exception.filter.ts` (`23505`, `23503`, `23502`, `23514`, `42501`, `P0001`).

| Faixa | Categoria | HTTP sugerido |
|---|---|---|
| `90001`–`90999` | **Validação de dado/negócio** - formato, limite de tamanho, mínimo, campo obrigatório fora do CHECK técnico. Nada de permissão envolvida. | `400 Bad Request` |
| `91001`–`91999` | **Conflito de estado/regra de negócio** - campanha "congelada" após aprovação, transição de status inválida, limite de recursos atingido, estoque insuficiente, ação incompatível com o status atual do registro. | `409 Conflict` |
| `92001`–`92999` | **Autorização negada (regra de negócio, não RLS)** - checagem feita via `tem_permissao()` dentro da trigger, ou restrição por identidade/conflito de interesse (dono, autor, denunciante agindo sobre o próprio registro). | `403 Forbidden` |
| `93001`–`93999` | **Limite de taxa (rate limit)** | `429 Too Many Requests` |

---

## 90xxx - Validação de dado/negócio (400)

| Código | Função | Tabela | Mensagem |
|---|---|---|---|
| 90001 | `trg_valida_contribuicao_recompensa` | `contribuicao_recompensa` | A recompensa não pertence à campanha da contribuição |
| 90002 | `trg_valida_escopo_tipolink` | `link_academico` / `link_atualizacao` / `link_recompensa` | Este tipo de link não é permitido para a tabela |
| 90003 | `fn_valida_limite_texto_livre` | `denuncia`, `campanha`, `atualizacao_campanha`, `solicitacao_encerramento`, `recompensa` (genérica via `TG_ARGV`) | Campo excede o limite de caracteres configurado |
| 90004 | `fn_valida_area_conhecimento_nivel2` | `campanha` | Área de conhecimento precisa ser nível 2 (não a grande área raiz) |
| 90005 | `trg_valida_tipo_motivo_denuncia` | `denuncia` | Motivo selecionado não é válido para denúncia de campanha |
| 90006 | `trg_valida_tipo_motivo_denuncia` | `denuncia` | Motivo selecionado não é válido para denúncia de perfil |
| 90007 | `validar_contribuicao_all_or_nothing` | `contribuicao` | Campanhas all-or-nothing aceitam apenas contribuições via PIX |
| 90008 | `fn_valida_data_marco_cronograma` | `marco_cronograma` | Data do marco anterior à data de início da campanha |
| 90009 | `fn_valida_completude_campanha_aprovacao` | `campanha` | Faltam itens de orçamento mínimos para aprovar |
| 90010 | `fn_valida_completude_campanha_aprovacao` | `campanha` | Faltam marcos de cronograma mínimos para aprovar |
| 90011 | `fn_valida_completude_campanha_aprovacao` | `campanha` | Soma dos itens de orçamento diferente da meta financeira |
| 90012 | `fn_valida_prazo_campanha_negocio` | `campanha` | Duração da campanha fora do intervalo mín/máx configurado |
| 90013 | `fn_valida_meta_campanha_negocio` | `campanha` | Meta financeira abaixo do mínimo configurado |
| 90014 | `fn_valida_contribuicao_valor_minimo` | `contribuicao` | Valor da contribuição abaixo do mínimo configurado |

## 91xxx - Conflito de estado/regra de negócio (409)

| Código | Função | Tabela | Mensagem |
|---|---|---|---|
| 91001 | `trg_valida_contribuicao_recompensa` | `contribuicao_recompensa` | Estoque insuficiente para a recompensa |
| 91002 | `fn_valida_limite_link_academico` | `link_academico` | Limite de links acadêmicos por perfil atingido |
| 91003 | `fn_valida_repasse_all_or_nothing` | `repasse` | Repasse bloqueado: meta financeira não atingida (all-or-nothing) |
| 91004 | `fn_congela_regras_campanha` | `campanha` | Meta financeira congelada após aprovação |
| 91005 | `fn_congela_regras_campanha` | `campanha` | Modelo de financiamento congelado após aprovação |
| 91006 | `fn_congela_regras_campanha` | `campanha` | Taxa da plataforma congelada |
| 91007 | `fn_congela_regras_campanha` | `campanha` | Título congelado após aprovação |
| 91008 | `fn_congela_regras_campanha` | `campanha` | Descrição congelada após aprovação |
| 91009 | `fn_congela_regras_campanha` | `campanha` | Prazo (data_fim) congelado após início real da campanha |
| 91010 | `fn_congela_regras_campanha` | `campanha` | Data de início congelada após início real da campanha |
| 91011 | `fn_congela_orcamento_campanha` | `orcamento_campanha` | Orçamento congelado após aprovação |
| 91012 | `fn_valida_limite_max_orcamento_campanha` | `orcamento_campanha` | Limite de itens de orçamento atingido |
| 91013 | `fn_congela_marco_cronograma` | `marco_cronograma` | Cronograma congelado após início real da campanha |
| 91014 | `fn_valida_limite_max_marco_cronograma` | `marco_cronograma` | Limite de marcos de cronograma atingido |
| 91015 | `fn_valida_contribuicao_campanha_ativa` | `contribuicao` | Campanha não está ativa no momento |
| 91016 | `fn_valida_contribuicao_campanha_ativa` | `contribuicao` | Campanha ainda não começou ("Em breve") |
| 91017 | `fn_valida_contribuicao_campanha_ativa` | `contribuicao` | Prazo da campanha já encerrado |
| 91018 | `validar_limite_campanhas_pesquisador` | `campanha` | Limite de campanhas ativas/aguardando aprovação atingido |
| 91019 | `validar_atualizacao_campanha` | `atualizacao_campanha` | Atualização só permitida em campanhas ativas/sucesso/não atingidas |
| 91020 | `fn_valida_comentario_campanha_ativa` | `comentario` | Não é possível comentar em campanha rejeitada/sob moderação |
| 91021 | `validar_comentario_endosso` | `comentario` | Limite de endossos ativos atingido |

## 92xxx - Autorização negada / conflito de interesse (403)

| Código | Função | Tabela | Mensagem |
|---|---|---|---|
| 92001 | `fn_valida_transicao_campanha` | `campanha` | Transição de status de campanha não autorizada (checa `tem_permissao()`) |
| 92002 | `fn_valida_transicao_solicitacao` | `solicitacao_encerramento` | Pesquisador só pode cancelar a própria solicitação, e só enquanto pendente |
| 92003 | `fn_valida_transicao_solicitacao` | `solicitacao_encerramento` | Sem a permissão, só é permitido alterar o status para cancelado |
| 92004 | `validar_comentario_autor` | `comentario` | Pesquisador não pode comentar na própria campanha |
| 92005 | `fn_bloqueia_reversao_moderacao_comentario` | `comentario` | Só quem tem `comentario_moderar` pode reverter comentário ocultado |
| 92006 | `fn_valida_denuncia_sem_autojulgamento` | `denuncia` | Quem registrou a denúncia não pode julgar a própria denúncia |

## 93xxx - Limite de taxa (429)

| Código | Função | Tabela | Mensagem |
|---|---|---|---|
| 93001 | `validar_denuncia_frequencia` | `denuncia` | Limite de denúncias nas últimas 24h atingido |

---

## Sobre o caso que motivou isso: `usuario.service.remove.ts`

`excluir_conta_usuario()` (em `03_funcoes_seguranca.sql`, **fora do escopo desta mudança** - esse arquivo não faz parte dos 40/42 apontados) ainda lança seu `RAISE EXCEPTION` de permissão sem ERRCODE customizado. Hoje ela só faz um `UPDATE` direto em `usuario`, e nenhuma trigger de `05_regras_negocio.sql` está ligada à tabela `usuario` - então, no estado atual do banco, o catch genérico do `remove.ts` não tem como pegar um erro de validação por engano.

Ainda assim, vale avisar seu colega: se algum dia uma trigger de `05_regras_negocio.sql` passar a existir em `usuario`, o `catch (erro) => ForbiddenException` do `remove.ts` voltaria a ficar impreciso, exatamente como ele descreveu - a essa altura, dá pra aplicar o mesmo padrão de `ERRCODE` também em `excluir_conta_usuario()` e trocar o catch por uma leitura de `erro.code` (por prefixo `90`/`91`/`92`/`93`), do mesmo jeito que este documento propõe para as regras de `05`.
