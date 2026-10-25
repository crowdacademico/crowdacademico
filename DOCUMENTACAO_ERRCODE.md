# ERRCODE customizado - `05_regras_negocio.sql`

> 📌 **Numeração de RF:** citações de RF por número podem estar numa numeração anterior. A `MATRIZ-RASTREABILIDADE-RF.md` está inteira na numeração vigente e traz a conversão. Confira pelo texto do requisito antes de confiar no número.

Referência rápida dos códigos de erro próprios do banco. Toda recusa de regra nos arquivos `arquivos_banco_dados/03_funcoes_seguranca.sql` e `05_regras_negocio.sql` sai com `RAISE EXCEPTION ... USING ERRCODE = '<código>'`, nunca com o SQLSTATE genérico do Postgres (`P0001`): é o código que deixa o Nest diferenciar "sem permissão" de "dado inválido" de "estado conflitante".

Este documento traz a tabela de códigos e o **contrato do corpo de erro da API** (seção no fim): o Nest devolve `codigo` (o SQLSTATE) junto de `statusCode` e `message`, ver `postgres-exception.filter.ts`. Para saber quantos códigos existem, conte pelas tabelas abaixo.

---

## 📑 Índice

1. [Esquema de faixas](#esquema-de-faixas)
2. [90xxx - Validação de dado/negócio (400)](#90xxx---validação-de-dadonegócio-400)
3. [91xxx - Conflito de estado/regra de negócio (409)](#91xxx---conflito-de-estadoregra-de-negócio-409)
4. [92xxx - Autorização negada / conflito de interesse (403)](#92xxx---autorização-negada--conflito-de-interesse-403)
5. [93xxx - Limite de taxa (429)](#93xxx---limite-de-taxa-429)
6. [Contrato do corpo de erro da API](#contrato-do-corpo-de-erro-da-api)

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
| 90002 | `trg_valida_escopo_tipolink` | `link_academico` / `link_atualizacao` / `link_recompensa` | Este tipo de link não pode ser usado no perfil do pesquisador / em atualização de campanha / em recompensa |
| 90003 | `fn_valida_limite_texto_livre` | `denuncia`, `campanha`, `atualizacao_campanha`, `solicitacao_encerramento`, `recompensa`, `orcamento_campanha`, `marco_cronograma` (genérica via `TG_ARGV`) | Campo excede o limite de caracteres configurado (só quando o texto muda; a mensagem não cita o nome da chave) |
| 90004 | `fn_valida_area_conhecimento_nivel2` | `campanha` | Área de conhecimento precisa ser nível 2 (não a grande área raiz) |
| 90005 | `trg_valida_tipo_motivo_denuncia` | `denuncia` | Motivo selecionado não é válido para denúncia de campanha |
| 90006 | `trg_valida_tipo_motivo_denuncia` | `denuncia` | Motivo selecionado não é válido para denúncia de perfil |
| 90007 | `validar_contribuicao_all_or_nothing` | `contribuicao` | Meio de pagamento não aceito: campanha all-or-nothing só aceita PIX, e quem contribui sem conta só usa PIX em qualquer modelo |
| 90008 | `fn_valida_data_marco_cronograma` | `marco_cronograma` | Data do marco anterior à data de início da campanha |
| 90009 | `fn_valida_completude_campanha` | `campanha` | Faltam itens de orçamento mínimos para aprovar |
| 90010 | `fn_valida_completude_campanha` | `campanha` | Faltam marcos de cronograma mínimos para aprovar |
| 90011 | `fn_valida_completude_campanha` | `campanha` | Soma dos itens de orçamento diferente da meta financeira |
| 90012 | `fn_valida_prazo_campanha_negocio` | `campanha` | Duração da campanha fora do intervalo mín/máx configurado |
| 90013 | `fn_valida_meta_campanha_negocio` | `campanha` | Meta financeira abaixo do mínimo configurado |
| 90014 | `fn_valida_contribuicao_valor_minimo` | `contribuicao` | Valor da contribuição abaixo do mínimo configurado |
| 90015 | `fn_valida_completude_campanha` | `campanha` | Prazo da campanha já vencido no envio/aprovação - atualize as datas antes de enviar |
| 90016 | `deslizar_datas_campanha` | `campanha` | Campanha sem data de início não pode ter as datas reagendadas |
| 90017 | `fn_valida_soma_pesos_score_config` | `score_config` | Soma dos pesos das dimensões ativas precisa ser exatamente 100 |
| 90018 | `fn_valida_cobertura_score_rotulo` | `score_rotulo` | Faixas ativas precisam cobrir 0-100 sem buraco nem sobreposição |
| 90019 | `fn_valida_pares_min_max_configuracoes` | `configuracoes` | O mínimo de um par (prazo, orçamento, cronograma, tamanho de arquivo) não pode ser maior que o máximo (constraint trigger, roda no `COMMIT`). Leva `dados` no corpo: `chaveMinimo`, `valorMinimo`, `chaveMaximo`, `valorMaximo` |
| 90020 | `suspender_usuario` / `suspender_pesquisador` | `usuario` / `perfil_pesquisador` | Motivo da suspensão é obrigatório |
| 90021 | `criar_campanha_para_outro` | `campanha` | O usuário escolhido não é um pesquisador ativo |
| 90022 | `fn_valida_posse_imagem_perfil` / `fn_valida_posse_anexo` | `usuario` / `arquivo_atualizacao`, `arquivo_recompensa` | O arquivo escolhido (foto ou anexo) não existe mais ou foi removido |
| 90023 | `suspender_usuario` / `suspender_papel_usuario` / `suspender_pesquisador` | `usuario` / `usuario_papel` / `perfil_pesquisador` | A data final da suspensão precisa estar no futuro |
| 90024 | `trg_valida_escopo_tipolink` | `link_academico` / `link_atualizacao` / `link_recompensa` | O endereço do link não é de nenhum dos domínios do tipo (ex.: Lattes fora de lattes.cnpq.br), RF-022 |
| 90025 | `trg_valida_escopo_tipolink` | `link_academico` / `link_atualizacao` / `link_recompensa` | O link não segue o formato (`regex`) do tipo |
| 90026 | `fn_valida_denuncia_alvo` | `denuncia` | O perfil denunciado não é de um pesquisador |
| 90027 | `encerrar_campanha_por_denuncia` | `denuncia`, `campanha` | Justificativa obrigatória para encerrar campanha por moderação |
| 90028 | `fn_valida_solicitacao_encerramento`, `encerrar_campanha_sem_contribuicao` | `solicitacao_encerramento` | Justificativa obrigatória para encerrar a campanha antes do prazo |
| 90029 | `decidir_solicitacao_encerramento` | `solicitacao_encerramento` | Justificativa obrigatória para rejeitar um pedido de encerramento |
| 90030 | `fn_valida_soma_pesos_score_config` | `score_config` | Peso não pode ser negativo |
| 90031 | `fn_valida_soma_pesos_score_config` | `score_config` | Dimensão ativa precisa de pelo menos um item ativo com peso maior que zero |
| 90032 | `contestar_denuncia` | `denuncia` | Contestação sem texto |
| 90033 | `decidir_contestacao` | `denuncia` | Decidir contestação sem justificativa |
| 90034 | `resolver_revisao_pagamento`, `concluir_reembolso_manual`, `reenfileirar_repasse`, `marcar_repasse_pago` | `evento_pagamento`, `contribuicao`, `repasse` | Toda ação manual sobre pagamento exige uma observação escrita do que foi feito |
| 90035 | `listar_revisoes_pagamento`, `concluir_reembolso_manual` | `evento_pagamento`, `contribuicao` | Filtro de situação inválido, ou valor devolvido à mão diferente do valor inteiro da contribuição |
| 90036 | `ajustar_tarifa_pagamento` | `contribuicao` | Tarifa real informada pelo provedor fora do esperado (negativa ou absurda): o ajuste automático não é feito |
| 90037 | `fn_valida_contribuicao_valor_minimo` | `contribuicao` | No cartão, a contribuição está abaixo do mínimo (`valor_minimo_contribuicao_cartao`) |
| 90038 | `fn_valida_contribuicao_valor_minimo` | `contribuicao` | No cartão, a contribuição está acima do máximo (`valor_maximo_contribuicao_cartao`): para mais, o Pix |
| 90039 | `reenviar_notificacao`, `cancelar_notificacao` | `notificacao` | E-mail não encontrado |

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
| 91018 | `validar_limite_campanhas_pesquisador` | `campanha` | Limite de campanhas em andamento (ativas ou aguardando aprovação) atingido. Aparece no ENVIO para aprovação, não na criação: rascunho não conta |
| 91019 | `validar_atualizacao_campanha` | `atualizacao_campanha` | Atualização só permitida em campanhas ativas/sucesso/não atingidas |
| 91020 | `fn_valida_comentario_campanha_ativa` | `comentario` | Não é possível comentar em campanha rejeitada/sob moderação |
| 91021 | `validar_comentario_endosso` | `comentario` | Limite de endossos ativos atingido |
| 91022 | `validar_comentario_edicao_conteudo` | `comentario` | Não é possível editar um comentário já endossado (RF-091) - remova o endosso antes |
| 91023 | `fn_congela_regras_campanha` | `campanha` | Vídeo de apresentação não pode ser alterado após a aprovação |
| 91024 | `fn_congela_regras_campanha` | `campanha` | Área do conhecimento não pode ser alterada após a aprovação |
| 91025 | `fn_valida_transicao_campanha` | `campanha` | Campanha rejeitada já usou todos os reenvios permitidos e não pode ser reenviada, para qualquer perfil, inclusive quem tem `campanha_editar`  |
| 91026 | `fn_valida_transicao_campanha` | `campanha` | Prazo para reenviar a campanha rejeitada já venceu |
| 91027 | `fn_congela_regras_campanha` / `fn_congela_orcamento_campanha` / `fn_congela_marco_cronograma` | `campanha` / `orcamento_campanha` / `marco_cronograma` | Campanha rejeitada sem reenvios restantes é somente leitura |
| 91028 | `fn_exige_historico_rejeicao` | `campanha` | Rejeição sem registro em `historico_rejeicao` na mesma transação (constraint trigger, roda no `COMMIT`) |
| 91029 | `fn_valida_posse_imagem_perfil` / `fn_valida_posse_anexo` | `usuario` / `arquivo_atualizacao`, `arquivo_recompensa` | O arquivo escolhido (foto ou anexo) já está em uso em outro lugar |
| 91030 | `suspender_usuario` / `suspender_papel_usuario` / `excluir_conta_usuario` / `fn_protege_ultimo_admin` | `usuario` / `usuario_papel` | Não é possível suspender, excluir ou tirar o papel do último administrador ativo do sistema |
| 91031 | `excluir_conta_usuario` | `usuario` | Não é possível excluir a conta enquanto houver campanha ativa |
| 91032 | `fn_protege_termo_aceito` | `termos_de_uso` | Versão do Termo já aceita não pode ser excluída, RF-091 |
| 91033 | `fn_protege_termo_aceito` | `termos_de_uso` | Versão do Termo já aceita não pode ter texto, tipo ou versão alterados, RF-091 |
| 91034 | `fn_valida_seguir_campanha_publicada` | `seguir_campanha` | Só é possível seguir uma campanha publicada |
| 91035 | `fn_valida_denuncia_alvo` | `denuncia` | Só é possível denunciar uma campanha ativa (RF-106) |
| 91036 | `encerrar_campanha_por_denuncia` | `denuncia` | A denúncia não é contra uma campanha |
| 91037 | `encerrar_campanha_por_denuncia` | `campanha` | Só campanha ativa pode ser encerrada por moderação |
| 91038 | `fn_valida_solicitacao_encerramento`, `encerrar_campanha_sem_contribuicao` | `solicitacao_encerramento` | Só campanha ativa pode ser encerrada antecipadamente (RF-064) |
| 91039 | `fn_valida_transicao_status_repasse`, `aplicar_evento_repasse` | `repasse` | Mudança de situação do repasse fora da máquina de estados (ex.: mexer num repasse já concluído) |
| 91041 | `fn_valida_transicao_solicitacao`, `decidir_solicitacao_encerramento` | `solicitacao_encerramento` | Só um pedido pendente muda de situação |
| 91042 | `decidir_solicitacao_encerramento` | `campanha` | A campanha já não está ativa: o pedido não pode ser aprovado |
| 91043 | `encerrar_campanha_sem_contribuicao` | `contribuicao` | Há contribuição pendente ou confirmada: com dinheiro em jogo, o encerramento é só por pedido ao administrador |
| 91044 | `contestar_denuncia` | `denuncia` | Só denúncia julgada procedente se contesta |
| 91045 | `contestar_denuncia` | `denuncia` | Denúncia já contestada: uma contestação por denúncia |
| 91046 | `contestar_denuncia` | `denuncia` | O pesquisador já tem uma contestação esperando análise |
| 91047 | `decidir_contestacao` | `denuncia` | Só contestação esperando análise se decide |
| 91048 | `fn_valida_contestacao_pendente` | `denuncia` | Com contestação esperando, a situação da denúncia só muda pela decisão dela |
| 91049 | `resolver_revisao_pagamento`, `concluir_reembolso_manual`, `reenfileirar_repasse`, `marcar_repasse_pago` | `evento_pagamento`, `contribuicao`, `repasse` | A ação manual só vale para o item na situação certa: evento ainda não processado, contribuição em reembolso manual, repasse em erro |
| 91050 | `fn_valida_transicao_status_contribuicao` | `contribuicao` | Mudança de situação da contribuição fora da máquina de estados (ex.: sair de "devolvido") |
| 91052 | `fn_valida_contribuicao_valor_minimo` | `contribuicao` | Pagamento com cartão desligado pelo administrador (`cartao_habilitado`) |
| 91053 | `fn_valida_contribuicao_valor_minimo` | `contribuicao` | Pagamento com boleto desligado (`boleto_habilitado`, desligado por padrão) |
| 91054 | `reenviar_notificacao`, `cancelar_notificacao` | `notificacao` | Só um e-mail que falhou pode ser reenviado; só um na fila ou que falhou pode ser cancelado |

## 92xxx - Autorização negada / conflito de interesse (403)

| Código | Função | Tabela | Mensagem |
|---|---|---|---|
| 92001 | `fn_valida_transicao_campanha` | `campanha` | Transição de status de campanha não autorizada (`origem -> destino`); cada permissão abre só a sua aresta, ver `[05-K-2-C]` em `DOCUMENTACAO_BD.md` |
| 92002 | `fn_valida_transicao_solicitacao` | `solicitacao_encerramento` | Pesquisador só pode cancelar a própria solicitação, e só enquanto pendente |
| 92003 | `fn_valida_transicao_solicitacao` | `solicitacao_encerramento` | Sem a permissão, só é permitido alterar o status para cancelado |
| 92004 | `validar_comentario_autor` | `comentario` | Pesquisador não pode comentar na própria campanha |
| 92005 | `fn_bloqueia_reversao_moderacao_comentario` | `comentario` | Só quem tem `comentario_moderar` pode reverter comentário ocultado |
| 92006 | `fn_valida_denuncia_sem_autojulgamento` | `denuncia` | Quem registrou a denúncia não pode julgar a própria denúncia |
| 92007 | `validar_comentario_edicao_conteudo` | `comentario` | Só o autor do comentário pode editar o próprio texto (RF-091) |
| 92008 | `validar_comentario_endosso_autor` | `comentario` | Só o dono da campanha (ou moderação) pode endossar/remover endosso (RF-089) |
| 92009 | `fn_valida_transicao_campanha` | `campanha` | Pesquisador suspenso não pode enviar nem reenviar campanha para aprovação |
| 92010 | `deslizar_datas_campanha` | `campanha` | Só o dono (ou quem tem `campanha_editar`) reagenda datas de campanha em rascunho ou rejeitada |
| 92011 | `contar_metricas_dashboard` | `dashboard` (várias tabelas) | Só quem tem `relatorio_visualizar` recebe as métricas do painel |
| 92012 | `liberar_bloqueio_login` | `usuario` | Sem permissão para desbloquear login |
| 92013 | `excluir_conta_usuario` | `usuario` | Sem permissão para excluir a conta de outro usuário |
| 92014 | `suspender_pesquisador` | `perfil_pesquisador` | Sem permissão para suspender pesquisador |
| 92015 | `reativar_pesquisador` | `perfil_pesquisador` | Sem permissão para reativar pesquisador |
| 92016 | `corrigir_cpf_pesquisador` | `perfil_pesquisador` | Sem permissão para corrigir CPF de pesquisador |
| 92017 | `criar_perfil_pesquisador_para_outro` | `perfil_pesquisador` | Sem permissão para criar perfil de pesquisador em nome de outro usuário |
| 92018 | `criar_campanha_para_outro` | `campanha` | Sem permissão para criar campanha em nome de outro pesquisador |
| 92019 | `forcar_exclusao_campanha` | `campanha` | Sem permissão para excluir campanha à força |
| 92020 | `suspender_usuario` | `usuario` | Sem permissão para suspender usuário |
| 92021 | `revogar_suspensao_usuario` | `usuario` | Sem permissão para revogar suspensão de usuário |
| 92022 | `suspender_papel_usuario` | `usuario_papel` | Sem permissão para suspender papel de usuário |
| 92023 | `revogar_suspensao_papel_usuario` | `usuario_papel` | Sem permissão para revogar suspensão de papel de usuário |
| 92024 | `alterar_perfil_pesquisador_de_outro` | `perfil_pesquisador` | Sem permissão para alterar perfil de pesquisador de outro usuário |
| 92025 | `fn_valida_posse_imagem_perfil` / `fn_valida_posse_anexo` | `usuario` / `arquivo_atualizacao`, `arquivo_recompensa` | Só é possível usar como foto ou anexar um arquivo que você mesmo enviou |
| 92026 | `trg_valida_escopo_tipolink` | `link_academico` | Só pesquisador tem links acadêmicos |
| 92027 | `suspender_usuario` | `usuario` | Ninguém suspende a própria conta |
| 92029 | `fn_valida_denuncia_alvo` | `denuncia` | Não é possível denunciar a própria campanha nem o próprio perfil |
| 92030 | `encerrar_campanha_por_denuncia` | `denuncia`, `campanha` | Sem permissão para julgar a denúncia e encerrar a campanha por moderação |
| 92031 | `encerrar_campanha_sem_contribuicao` | `campanha` | Só o dono da campanha pode encerrá-la antecipadamente |
| 92032 | `decidir_solicitacao_encerramento` | `solicitacao_encerramento` | Sem permissão para decidir pedidos de encerramento |
| 92033 | `fn_valida_transicao_solicitacao` | `solicitacao_encerramento` | Aprovar ou rejeitar só pela decisão do administrador, nunca por mudança direta de status |
| 92034 | `contestar_denuncia` | `denuncia` | Só o pesquisador penalizado pela denúncia a contesta |
| 92035 | `decidir_contestacao` | `denuncia` | Sem permissão (`denuncia_responder`) para decidir contestação |
| 92036 | `decidir_contestacao` | `denuncia` | Quem julgou a denúncia não decide a contestação contra a própria decisão |
| 92037 | `listar_revisoes_pagamento`, `resolver_revisao_pagamento`, `listar_reembolsos_manuais`, `concluir_reembolso_manual`, `listar_repasses_atencao`, `reenfileirar_repasse`, `marcar_repasse_pago` | `evento_pagamento`, `contribuicao`, `repasse` | Sem permissão para ver ou resolver as pendências de pagamento |
| 92038 | `resumo_contribuicoes_campanha` | `contribuicao` | Só o dono da campanha ou quem tem `contribuicao_visualizar_sensivel` vê o resumo das contribuições dela |
| 92039 | `reenviar_notificacao`, `cancelar_notificacao` | `notificacao` | Sem permissão (`notificacao_processar`) para reenviar ou cancelar e-mails |

## 93xxx - Limite de taxa (429)

| Código | Função | Tabela | Mensagem |
|---|---|---|---|
| 93001 | `validar_denuncia_frequencia` | `denuncia` | Limite de denúncias nas últimas 24h atingido |
| 93002 | `validar_comentario_frequencia` | `comentario` | Limite de comentários na última hora atingido |

---

## Contrato do corpo de erro da API

O corpo de uma recusa do banco traz o código junto da mensagem, para o front distinguir uma regra pelo **código**, e não pelo texto (um ajuste de redação não quebra nada). Quem monta é `postgres-exception.filter.ts`:

```json
{
  "statusCode": 409,
  "codigo": "91018",
  "message": "Você já possui 2 campanhas em andamento ...",
  "dados": { "limite": 2 }
}
```

* `statusCode` e `message` têm o formato padrão do Nest.
* `codigo` é o SQLSTATE do erro: `9xxxx` (regra de negócio, tabelas acima) ou os nativos que o filtro traduz (`23505`, `23503`, `23502`, `23514`, `42501`, `P0001`).
* `dados` é **opcional** e só aparece se o `RAISE` mandou um `DETAIL` em JSON (`RAISE EXCEPTION '...' USING ERRCODE = '90019', DETAIL = json_build_object(...)::text`), como o 90019 faz.
* O **nome da constraint violada não vai no corpo** (é detalhe interno).
* Erros que não são de Postgres continuam como o Nest já devolve (sem `codigo`).

No Nest, um `catch` que precise decidir algo lê `erro.code` (pelo prefixo `90`, `91`, `92` ou `93`), nunca captura tudo como se fosse um único tipo de recusa.

Observações: **91028** é a rejeição sem registro em `historico_rejeicao` (ver `[05-K-2-C]` em `DOCUMENTACAO_BD.md`); a mensagem do **92001** mostra `origem -> destino`; a do **90003** não cita o nome da chave de configuração.

