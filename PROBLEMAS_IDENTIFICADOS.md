
# PROBLEMAS RESOLVIDOS JÁ DIA 08-07-2026

# Duas inconsistências reais que encontrei, verificar com seu Claude:

usuario.criado_em foi criada com esse nome no DDL (arquivo 01), mas tanto o INSERT do seed (arquivo 07) quanto o GRANT SELECT (arquivo 05) usam data_cadastro enquanto que na coluna que não existe. Isso quebraria na hora de rodar.

perfil_pesquisador.score_atual é INTEGER no DDL, mas o seed insere valores decimais (85.50, 72.00 etc.). O Postgres vai truncar/arredondar silenciosamente.

# Outros:

1. Colunas que faltam no schema (a regra existe no RF, mas não tem onde guardar o dado)

link_academico não tem coluna de rótulo. RF-014, RF-016 e RF-018 exigem que cada link tenha um "rótulo personalizável" (obrigatório para o tipo Outro, até 60 caracteres). Mas a tabela só tem id_usuario, id_tipolink, ordem, url. Falta uma coluna tipo rotulo VARCHAR(60).

motivo_denuncia não tem indicador ativo/inativo. RF-073 e RF-074 dizem explicitamente que o Administrador deve poder ativar/desativar motivos sem excluir. A tabela só tem id_motivo, codigo, descricao, tipo. Falta ativo BOOLEAN.


2. ENUMs incompletos ou divergentes do requisito

status_contribuicao está faltando o valor 'expirado' (RF-053: QR Code PIX expira em 30 min então status "expirado") e 'reembolso_manual' (RF-038/051: fallback quando a devolução automática falha). O enum atual tem 'reembolsado', que não é a mesma coisa semanticamente, "reembolsado" soa como devolução concluída, "reembolso_manual" é um estado intermediário pra intervenção do admin.

tipo_link do seed não bate com a lista fechada do RF-014. O requisito pede: Lattes, ORCID, ResearchGate, LinkedIn, GitHub, Site Institucional, Outro. O seed (arquivo 07) tem: Lattes, ORCID, LinkedIn, ResearchGate, Academia.edu, Google Scholar, Site Pessoal Faltam GitHub e Outro, e sobram Academia.edu/Google Scholar/Site Pessoal que não estão no requisito.


3. Regras de negócio do RF sem CHECK/trigger correspondente no banco

- Nenhuma dessas quebra o schema hoje, mas são regras explícitas do documento que o banco atual deixaria alguém violar via INSERT direto:

RF-021/022/047/048: campanhas all-or-nothing só podem receber PIX (de qualquer contribuinte); cartão/débito/boleto só para usuário cadastrado, nada impede hoje um INSERT com meio_pagamento = 'boleto' numa campanha all-or-nothing.
RF-029: máximo de 2 campanhas simultâneas (status aguardando_aprovacao ou ativo) por pesquisador. Sem constraint.
RF-030: atualização de progresso só em campanhas com status ativo, sucesso ou nao_atingido. Sem constraint.
RF-045: prazo da campanha entre 15 e 90 dias (a própria etapa 3 já sinaliza, em destaque no texto, uma dúvida não resolvida entre os autores sobre reduzir para 60 dias por causa da janela de estorno do PIX/BCB. Isso é uma decisão que vocês ainda precisam bater o martelo antes de eu desenhar o CHECK). Sem constraint.
RF-056: valor mínimo de contribuição de R$ 5,00. Sem constraint (contribuicao.valor só tem NOT NULL).
RF-063: máximo de 4 endossos ativos simultâneos por campanha. Sem constraint.
RF-065/066: pesquisador só pode comentar 1 vez por campanha, e não pode comentar na própria campanha. Sem UNIQUE (id_campanha, id_pesquisador) e sem trigger para bloquear autor = dono da campanha.
RF-075/076 e RF-019 (perfil): impedir denúncia duplicada do mesmo usuário contra a mesma campanha/perfil, e limitar a 5 denúncias por usuário a cada 24h. Sem UNIQUE nem trigger de rate-limit.

4. Dado de seed incompleto

area_conhecimento está faltando "Multidisciplinar". RF-028 lista explicitamente 9 áreas pré-cadastradas (alinhadas ao CNPq), incluindo "Multidisciplinar". O seed (arquivo 07) só insere 8, essa área não aparece.


# Coisas interessante que a IA detectou, precisamso conversar depois no meet, dei ctrl+c e ctrl+v abaixo:

5. Coisas que precisamos decidir (não são bugs, são ambiguidades de modelagem)

- Sobre o DELETE ON CASCADE.
- Problemas que podemos ter com DELETE ON CASCADE: 
Exemplo: RNF-007: logs financeiros retidos por 5 anos. Um ON DELETE CASCADE mal colocado numa tabela de auditoria pode apagar exatamente o que a LGPD/regulação exige manter.

⚠️ Ponto pra revisar: perfil_pesquisador tem ON DELETE CASCADE em usuario, e comentario.id_pesquisador tem ON DELETE CASCADE em perfil_pesquisador. Isso forma uma cadeia: apagar um usuario → apaga o perfil_pesquisador → apaga todos os comentários que essa pessoa deixou em campanhas de outras pessoas, inclusive endossos já publicados (RF-064). Se um pesquisador excluir a conta, o histórico de conversa nas campanhas de terceiros some junto — pode não ser o comportamento que vocês querem.

⚠️ Detalhe curioso: denuncia.id_usuario (o denunciante) não tem ON DELETE nenhum especificado, então cai no padrão do Postgres, que é RESTRICT. Isso significa que hoje não dá pra excluir a conta de alguém que já denunciou algo, o banco bloqueia o DELETE até a denúncia ser removida antes. Mas repare que vocês já têm usuario.deletado BOOLEAN — ou seja, o plano provavelmente sempre foi soft delete (marcar como excluído via UPDATE, nunca DELETE de verdade), e nesse caso esse RESTRICT nunca chega a incomodar na prática. Vale só confirmar que ninguém no backend vai tentar um DELETE FROM usuario de verdade.

- Minha recomendação de regra prática (não é dogma, é o que a maioria dos times usa): CASCADE só em tabela que é pura composição — o filho não tem sentido sem o pai e ninguém precisa dele depois (tabela de junção tipo usuario_papel, link_academico). Em qualquer tabela que carregue histórico, dinheiro, moderação ou prova de algo (contribuição, denúncia, repasse, auditoria), usar RESTRICT ou SET NULL.



Status "encerrado por moderação" (RF-079/084) vs. "encerrado" comum (encerramento antecipado normal, RF-040) parecem ser conceitos diferentes na narrativa, mas o enum status_campanha só tem um valor genérico 'encerrado' pros dois casos. Vale decidir se precisa de um status novo (ex: encerrado_moderacao) ou se um campo auxiliar (ex: motivo do encerramento) resolve.

configuracoes já tem a chave score_minimo_campanha (score mínimo pra criar campanha), mas nenhum RF que eu li menciona essa regra, e não existe trigger aplicando esse mínimo antes de permitir INSERT em campanha. Pode ser regra planejada mas ainda não formalizada nos RFs, ou pode ser um resquício de versão anterior. Vale confirmar se ainda é regra válida.

Papéis extras no seed (apoiador, moderador, revisor, curador, suporte) além dos 4 perfis documentados em RS-03 (Anônimo, Cadastrado, Pesquisador, Administrador). Não é erro, mas não está descrito em nenhum RF/RU que eu vi. Vale confirmar se são papéis internos da equipe administrativa (faz sentido pra RBAC) ou sobrou de um rascunho.

RS-05 e a Etapa 1 (Planejamento) dizem "MySQL" como banco de dados, mas o schema real é Postgres/Supabase. Isso não afeta o banco em si, só é uma inconsistência textual entre o relatório do TCC e a implementação real. Se a banca ler os dois documentos, pode estranhar. Vale atualizar o texto do TCC pra "PostgreSQL (via Supabase)" antes da entrega.



6. Investigação: índices
Rodando os índices do arquivo 02 contra as consultas que os RFs pedem, achei algumas lacunas reais (não são erros que quebram nada, são gargalos de performance conforme o banco crescer):

Tabela              Índice que falta    Por que importa

comentario          (id_campanha)       RF-044/064: toda página pública de campanha busca comentários por campanha — hoje é table scan completo.

repasse             (id_campanha)       Painel do pesquisador (RF-058/059) busca repasse por campanha.

historico_rejeicao  (id_campanha)       RF-070: histórico de rejeições exibido por campanha.solicitacao_encerramento(id_campanha)RF-041: fila de solicitações, geralmente filtrada/junta por campanha.

seguir_campanha     (id_campanha)       Só existe UNIQUE(id_usuario, id_campanha), cujo índice implícito começa por id_usuario — não ajuda em "notificar todos que seguem a campanha X" (RF-031).

arquivo_atualizacao (id_atualizacao)    Mesmo caso: UNIQUE(id_arquivo, id_atualizacao) não serve pra buscar arquivos de uma atualização específica.

campanha            (status, data_fim)  compostoO job que encerra campanha vencida (RF-037) faz WHERE status='ativo' AND data_fim < NOW() toda hora — um índice composto acelera isso bastante conforme o volume cresce.








# NOVOS PROBLEMAS IDENTIFICADOS:

2. Novos achados da releitura (schema pós-fix vs. requisitos)
Boa notícia: a maior parte do que os requisitos pedem já está coberta (status_denuncia, status_encerramento, notificacao — bateram certinho com RF-077, RF-040/041 e RF-085). Mas essa segunda passada, cruzando o texto final e mais detalhado do requisitos em formato.md com o .sql já corrigido, achou 3 coisas novas que meu texto anterior não tinha pego (os .docx que eu li antes eram menos explícitos nesses pontos):
a) status_campanha — a "ambiguidade" virou fato concreto, não é mais decisão em aberto
O RF-029 agora deixa isso explícito, é literal no texto: "Os status possíveis de uma campanha são: aguardando aprovação, ativa, sucesso, não atingida, rejeitada e encerrada por moderação." Isso são 6 valores nomeados — e nenhum deles é o genérico 'encerrado' que está no enum hoje. Reli todos os RFs de encerramento (RF-037 a RF-040) e nenhum deles usa a palavra "encerrado" sozinha como status final — só usam sucesso/nao_atingido (mesmo no encerramento antecipado do RF-040). Ou seja: o 'encerrado' do enum atual não corresponde a nada nos requisitos, e falta o valor que RF-079/RF-084 realmente pedem (encerrado_moderacao ou nome parecido). Isso não é mais "vocês decidam depois" — o próprio documento já decidiu, só o .sql que ainda não foi atualizado.
b) Falta uma tabela/registro pra aceite de termos por transação (RF-054/RF-055)
Esses dois RFs pedem, com bastante ênfase (inclusive citando proteção contra chargeback), um registro imutável de aceite de termos vinculado ao ID da transação, separado do aceite geral de cadastro — e que precisa funcionar até para contribuinte anônimo (que não tem id_usuario). Hoje só existe usuario_termo, que exige id_usuario NOT NULL — não serve pra isso. Falta algo como uma tabela aceite_termo_contribuicao (id_contribuicao, id_termo, aceito_em) .
c) auditoria_financeira está sem duas colunas que o RNF-007 exige por nome
O RNF-007 lista textualmente o que cada log financeiro precisa conter: "timestamp, identificador da transação, valor, meio de pagamento, status anterior e novo status." A tabela atual tem id_contribuicao, status_anterior, status_novo, evento, timestamp — mas não tem valor nem meio_pagamento. Como é log de auditoria imutável (retenção de 5 anos), o valor da transação precisa estar congelado ali também, não só referenciado via id_contribuicao (que pode mudar de status depois).
d) (menor) comentario.endossado e comentario.ordem_endosso não têm nenhuma trava entre si
Reparei que o trigger novo do limite de 4 endossos (que a IA implementou certinho) conta usando ordem_endosso IS NOT NULL, mas quem sinaliza "isso é um endosso" pro resto do sistema é o campo booleano endossado. Nada impede hoje endossado = TRUE com ordem_endosso = NULL (furando o limite) ou o inverso. Um CHECK simples resolve:
sqlCHECK ((endossado = TRUE AND ordem_endosso IS NOT NULL) OR (endossado = FALSE AND ordem_endosso IS NULL))

