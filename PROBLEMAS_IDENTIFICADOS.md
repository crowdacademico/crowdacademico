
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

Status "encerrado por moderação" (RF-079/084) vs. "encerrado" comum (encerramento antecipado normal, RF-040) parecem ser conceitos diferentes na narrativa, mas o enum status_campanha só tem um valor genérico 'encerrado' pros dois casos. Vale decidir se precisa de um status novo (ex: encerrado_moderacao) ou se um campo auxiliar (ex: motivo do encerramento) resolve.

configuracoes já tem a chave score_minimo_campanha (score mínimo pra criar campanha), mas nenhum RF que eu li menciona essa regra, e não existe trigger aplicando esse mínimo antes de permitir INSERT em campanha. Pode ser regra planejada mas ainda não formalizada nos RFs, ou pode ser um resquício de versão anterior. Vale confirmar se ainda é regra válida.

Papéis extras no seed (apoiador, moderador, revisor, curador, suporte) além dos 4 perfis documentados em RS-03 (Anônimo, Cadastrado, Pesquisador, Administrador). Não é erro, mas não está descrito em nenhum RF/RU que eu vi. Vale confirmar se são papéis internos da equipe administrativa (faz sentido pra RBAC) ou sobrou de um rascunho.

RS-05 e a Etapa 1 (Planejamento) dizem "MySQL" como banco de dados, mas o schema real é Postgres/Supabase. Isso não afeta o banco em si, só é uma inconsistência textual entre o relatório do TCC e a implementação real. Se a banca ler os dois documentos, pode estranhar. Vale atualizar o texto do TCC pra "PostgreSQL (via Supabase)" antes da entrega.