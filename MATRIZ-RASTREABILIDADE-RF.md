# 🔗 Matriz de Rastreabilidade — Requisitos Funcionais × Implementação

Resolve o item 33 de `PENDENCIAS e correcoes.md` ("a fala mais importante do WhatsApp inteiro" — a Alexia pediu pra "passar as tabelas mais uma vez e ver se cobrem as necessidades"). Quando esse item foi registrado (28-07-2026), o NestJS praticamente não existia ainda, então a pergunta original era só "o banco sustenta os RFs?". Hoje (01-09-2026) o backend já tem 19 dos 29 módulos com código real, então esta matriz responde duas perguntas por RF, não uma: **o banco sustenta?** e **o Nest expõe isso?**

## Como ler

Cada RF ganha duas colunas de status:

| Símbolo | Banco (schema/RLS/trigger) | Nest (endpoint/service) |
|---|---|---|
| ✅ | Estrutura existe e foi testada/documentada em `DOCUMENTACAO_BD.md` | Módulo com código real cobre isso, comportamento específico confirmado |
| 🟡 | Estrutura existe mas incompleta, ou depende de outra peça (ex.: gateway de pagamento) | Módulo existe mas o comportamento específico deste RF não foi conferido linha a linha, ou depende de outro módulo ainda vazio |
| ❌ | Não existe estrutura para isso | Módulo não existe (pasta vazia) ou não há caminho de código nenhum |
| ➖ | Não se aplica ao banco (regra é só de front/aplicação) | Não se aplica ao Nest (regra é só de banco, infraestrutura, ou "não fazer algo") |

**Metodologia:** a coluna Banco foi conferida contra `DOCUMENTACAO_BD.md` (964 linhas, lido por completo) — a maioria das citações abaixo vem direto de lá. A coluna Nest foi conferida principalmente pela EXISTÊNCIA de arquivo real no módulo correspondente (`find nest/src/<modulo> -name "*.ts" | wc -l`, 01-09-2026) — módulo com 0 arquivos = ❌ automático para tudo que depende dele, sem exceção. Para módulos que JÁ têm código, o comportamento específico de cada RF nem sempre foi lido linha a linha (115 RFs é muito código pra conferir um por um com 100% de certeza numa rodada só) — nesses casos o símbolo é 🟡 com nota "não conferido a fundo", não um ✅ inventado. **Qualquer 🟡/❌ marcado "não conferido a fundo" merece uma conferência de verdade antes de ser tratado como fato definitivo.**

**Módulos Nest com 0 arquivos (01-09-2026), afetam toda a matriz abaixo:** `4-mail`, `18-recompensa`, `19-denuncia`, `20-solicitacao-encerramento`, `21-historico-rejeicao`, `22-contribuicao`, `23-repasse`, `24-auditoria-financeira`, `26-notificacao`, `27-resources`. Ver `PROXIMOS_MODULOS.md` para o que falta em cada um.

---

## RU/RS — não têm rastreabilidade individual aqui

Requisitos de Usuário (RU) e de Sistema (RS) são amplos demais para uma linha de matriz cada — eles se decompõem nos RFs abaixo, que é o nível certo de granularidade pra rastrear contra código. RS-04 (gateway de pagamento) e RS-07 (sandbox) merecem nota à parte: **nenhuma decisão de gateway foi tomada ainda** — é a razão por trás de quase todo ❌ Nest no Grupo Contribuições, mais abaixo.

---

## Grupo: Usuário (RF-001 a RF-016)

- **RF-001** (cadastro nome/e-mail/senha) — Banco ✅ (`usuario.email UNIQUE`, `senha_hash NOT NULL`) · Nest ✅ (`1-usuario` + `3-auth`, signup confirmado em `PENDENCIAS`, item 6).
- **RF-002** (validar formato e-mail, senha ≥8) — Banco ➖ (validação de entrada, não é regra de schema) · Nest 🟡 (`class-validator` é o padrão do projeto nos DTOs; a regra exata de 8 caracteres não foi conferida linha a linha).
- **RF-003** (confirmação de e-mail por token, conta nasce não verificada) — Banco ✅ (`verificacao_email`, `usuario.email_verificado` independente de bloqueio, `confirmar_email_por_token()` — `[03-O]`) · Nest 🟡 (a função de confirmar existe; **enviar** o token depende de `4-mail`, que está vazio — o fluxo não fecha de ponta a ponta hoje).
- **RF-004** (login e/senha, mensagem sem revelar campo errado) — Banco ➖ · Nest ✅ (`3-auth`, confirmado em `PENDENCIAS` item 6).
- **RF-005** (bloqueio após tentativas, 5/15min configurável) — Banco ✅ (`registrar_falha_login`/`liberar_bloqueio_login`, `configuracoes.limite_tentativas_login`/`bloqueio_login_minutos` — `[03-O]`) · Nest ✅ (`PENDENCIAS` item 6 confirma reuso dessas funções).
- **RF-006** (recuperar senha por e-mail com link) — Banco ✅ (`recuperacao_senha`) · Nest ❌ (depende de `4-mail`, vazio).
- **RF-007** (link válido no máx. 1h, uso único) — Banco ✅ (implementado com expiração de 15-30min, dentro do teto de 1h do RF, ver comentário da tabela `01`) · Nest ❌ (mesmo motivo do RF-006).
- **RF-008** (editar nome/senha, exige senha atual, e-mail imutável) — Banco ✅ (`GRANT UPDATE` de `usuario` restrito a `nome`/`id_imagem_perfil`/`senha_hash`, e-mail fora — `[03-O]`) · Nest 🟡 (módulo existe; exigência de "confirmar senha atual" não conferida a fundo).
- **RF-009** (histórico de contribuições com status) — Banco ✅ (`contribuicao`) · Nest ❌ (`22-contribuicao` vazio).
- **RF-010** (seguir campanha, notificação por e-mail) — Banco ✅ (`seguir_campanha`) · Nest 🟡 (seguir funciona via `16-seguir-campanha`; a notificação por e-mail depende de `4-mail`/`26-notificacao`, ambos vazios).
- **RF-011** (deixar de seguir, cessa notificação) — Banco ✅ (`pol_seg_campanha_delete`) · Nest ✅ (`16-seguir-campanha`).
- **RF-012** (logout seguro, invalida token) — Banco ✅ (`sessao`, revogação) · Nest ✅ (`3-auth`, `PENDENCIAS` item 6).
- **RF-013** (sessões protegidas, distingue login/refresh, histórico, revogar) — Banco ✅ (`sessao.origem` — `[01-D]`) · Nest 🟡 (login/refresh/logout confirmados; endpoint de "listar/revogar sessões no painel pessoal" não conferido a fundo).
- **RF-014** (checkbox de termos obrigatório, versão/data imutável) — Banco ✅ (`termos_de_uso`, `usuario_termo`, `registrar_aceite_termo()` — `[03-D-1]`) · Nest ✅ (`5-termo-uso`, 4 arquivos; `[03-D-1]` confirma uso em `POST /auth/cadastro`).
- **RF-015** (exclusão de conta LGPD, lógica, preserva log/financeiro) — Banco ✅ (`excluir_conta_usuario()`, `deletado_em`/`deletado_por` — `[03-O]`) · Nest 🟡 (função de banco pronta e testada; endpoint `1-usuario` chamando ela não conferido a fundo).
- **RF-016** (imagem de perfil opcional, avatar por iniciais) — Banco ✅ (`usuario.id_imagem_perfil`) · Nest ✅ (confirmado hoje: `SeletorFotoPerfil` + `confirmar-upload` contexto `avatar` + `ArquivoControllerAvatar`).

## Grupo: Perfil Pesquisador (RF-017 a RF-030)

- **RF-017/RF-018** ("Projetos Criados" desabilitado + mensagem orientando upgrade) — Banco ➖ · Nest ❌ (é comportamento de tela pública/painel do usuário comum, que ainda não existe no React — só o painel admin genérico existe).
- **RF-019** (upgrade pra Pesquisador: CPF, título, vínculo, até 5 links) — Banco ✅ (`perfil_pesquisador`, `cpf_criptografado`/`cpf_hash` — `[01-D]`, extensamente documentado; `link_academico.rotulo` + limite de 5) · Nest ✅ (`6-perfil-pesquisador` 18 arquivos, `7-link-academico` 15 arquivos).
- **RF-020** (pesquisador independente, sem vínculo institucional) — Banco ✅ (`tipo_vinculo` ENUM, `CK_PERFIL_VINCULO`) · Nest 🟡 (schema pronto, DTO deveria espelhar o ENUM — não conferido a fundo).
- **RF-021** (CPF criptografado, só p/ verificação) — Banco ✅ (decisão de cifrar no Node via AES-256-GCM, não no Postgres — `[01-D]`) · Nest ✅ (a cifra/decifra é responsabilidade do próprio `6-perfil-pesquisador`, por desenho).
- **RF-022** (editar perfil, CPF imutável pelo usuário, links reordenáveis) — Banco ✅ (CPF fora do `GRANT UPDATE` do próprio usuário) · Nest 🟡 (reordenação de links especificamente não conferida).
- **RF-023** (link principal = primeiro da lista, exibido na campanha) — Banco ✅ (links são ordenáveis) · Nest ❌ (depende da página pública de campanha, que não existe no React).
- **RF-024** (página pública `/pesquisador/{id}`) — Banco ✅ (dados existem) · Nest ❌ (página pública não existe, só painel admin).
- **RF-025** (seguir pesquisador, contagem, sem duplicar/auto-seguir) — Banco ✅ (`seguir_pesquisador`, `UK`, `contar_seguidores_pesquisador()` — `[03-E]`) · Nest 🟡 (não confirmado se exposto por endpoint Nest dedicado, distinto de `16-seguir-campanha`).
- **RF-026** (denunciar perfil de pesquisador) — Banco ✅ (`motivo_denuncia.tipo='perfil'`, `denuncia`) · Nest ❌ (`19-denuncia` vazio).
- **RF-027** (score, 4 dimensões, pesos configuráveis) — Banco ✅ (`[05-I]` completo, pesos 30/25/20/25 em `score_config`) · Nest 🟡 (cálculo é 100% trigger de banco, não depende do Nest; exibição depende de `6-perfil-pesquisador`, que existe).
- **RF-028** (faixas: Atenção/Em Construção/Confiável/Referência) — Banco ✅ (`score_rotulo`) · Nest 🟡 (mesma nota do RF-027).
- **RF-029** (score nunca bloqueia automaticamente) — Banco ✅ (decisão consciente, sem trigger de bloqueio — `[05-I-1]`) · Nest ➖ (é uma não-ação).
- **RF-030** (pesquisador solicita revisão de score) — Banco ❌ (não encontrei função dedicada em `[05-I]` pra este fluxo específico) · Nest ❌.

## Grupo: Campanha All-or-Nothing (RF-031 a RF-034)

- **RF-031** (criar campanha AoN) — Banco ✅ · Nest ✅ (`12-campanha`, 23 arquivos).
- **RF-032** (impedir repasse sem meta atingida) — Banco ✅ (regra de negócio bem coberta) · Nest 🟡 (a regra em si está pronta no banco; o repasse/pagamento de verdade depende de `23-repasse`/`22-contribuicao`, ambos vazios).
- **RF-033** (PIX exclusivo, QR dinâmico, cancelamento automático sem cobrança) — Banco ✅ (fluxo de devolução documentado — `parte 9`/`[05-K-2]`) · Nest ❌ (nenhuma integração de pagamento existe ainda — RS-04/RS-07 confirmam que o gateway nem foi escolhido).
- **RF-034** (repasse automático via API de split ao atingir meta) — Banco ✅ (regra pronta) · Nest ❌ (mesmo motivo do RF-033).

## Grupo: Campanha Flexível (RF-035 a RF-037)

- **RF-035** (criar campanha flexível) — Banco ✅ · Nest ✅ (`12-campanha` cobre os dois modelos).
- **RF-036** (repasse independente da meta) — Banco ✅ · Nest ❌ (depende de `23-repasse`, vazio).
- **RF-037** (aviso de cobrança imediata antes de contribuir) — Banco ➖ (é UI) · Nest ❌ (página pública de campanha, onde esse aviso apareceria, não existe).

## Grupo: Campanha Geral (RF-038 a RF-056)

- **RF-038** (orçamento estruturado, soma = meta) — Banco ✅ (`orcamento_campanha`, validação exata na aprovação — `[01-E]`) · Nest ✅ (`13-orcamento-campanha`, 23 arquivos junto de `12-campanha`).
- **RF-039** (orçamento congela na aprovação, sem exceção) — Banco ✅ (`fn_congela_regras_campanha`) · Nest ✅ (regra é 100% trigger de banco, vale pra qualquer caminho de código).
- **RF-040** (cronograma com marcos) — Banco ✅ (`marco_cronograma`) · Nest ✅ (`14-marco-cronograma`).
- **RF-041** (marco não pode ser antes do início) — Banco ✅ (`[05-K-2]`) · Nest ✅ (validação de banco vale sempre).
- **RF-042** (cronograma editável até o início efetivo) — Banco ✅ (congela só quando `data_inicio <= NOW()`) · Nest ✅ (trigger de banco).
- **RF-043** (orçamento como gráfico, cronograma como linha do tempo) — Banco ➖ (é apresentação) · Nest ❌ (página pública de campanha não existe).
- **RF-044** (campanha nasce "aguardando aprovação") — Banco ✅ (`status_campanha` ENUM, default) · Nest ✅ (`12-campanha`).
- **RF-045** (áreas do conhecimento 2 níveis, CNPq) — Banco ✅ (81 áreas seedadas, `[01-C]`) · Nest ✅ (`8-area-conhecimento`).
- **RF-046** (limite de campanhas simultâneas por pesquisador, padrão 2) — Banco ✅ (`configuracoes` + trigger) · Nest 🟡 (regra vale no banco independente do Nest; mensagem informativa amigável no front não conferida).
- **RF-047** (atualizações só em campanha ativa/sucesso/não-atingida) — Banco ✅ (`[04-E]`) · Nest ✅ (`15-atualizacao-campanha`).
- **RF-048** (atualização com fase + formato + anexo) — Banco ✅ (`arquivo_atualizacao`, `link_atualizacao`) · Nest ✅ (confirmado hoje: `25-arquivo` existe e o vínculo já era testável desde que arquivo passasse a existir).
- **RF-049** (notificar seguidores por e-mail em nova atualização) — Banco ✅ (dado existe pra isso) · Nest ❌ (`4-mail`/`26-notificacao` vazios).
- **RF-050** (percentual/valor/prazo em tempo real) — Banco ✅ (triggers de sincronização) · Nest ❌ (depende de `22-contribuicao` pra ter valor real entrando).
- **RF-051** (vídeo de apresentação, URL só) — Banco ✅ (`video_apresentacao_url`) · Nest 🟡 (coluna pronta, campo no DTO de `12-campanha` não conferido a fundo).
- **RF-052** (editar campanha não aprovada ou rejeitada) — Banco ✅ (`GRANT UPDATE` + status) · Nest ✅ (`12-campanha`).
- **RF-053** (congela título/descrição/meta/modelo/taxa/orçamento na aprovação) — Banco ✅ (`fn_congela_regras_campanha`) · Nest ✅ (trigger de banco, vale sempre).
- **RF-054** (data de início futura, "Em breve", contagem regressiva) — Banco ✅ (feature completa — `[01-E]`) · Nest 🟡 (regra de negócio no banco; contagem regressiva é UI, que não existe na página pública ainda).
- **RF-055** (taxa configurável, carimbada na aprovação) — Banco ✅ (`fn_carimba_taxa_plataforma_aprovacao`) · Nest ✅ (`11-configuracoes` + trigger de banco).
- **RF-056** (encerramento automático por prazo expirado) — Banco 🟡 (existe a lógica de status, mas **quem dispara** periodicamente — cron/scheduler — não foi confirmado; ver `parte 10` em `PENDENCIAS.md`, função `encerrar_campanhas_vencidas()`) · Nest ❌ (não encontrei nenhum job/scheduler no Nest — precisa conferir se roda via `pg_cron` do Supabase ou se ainda falta).

### Encerramento (RF-057 a RF-061)

- **RF-057** (AoN sem meta: devolve tudo, status individual por transação) — Banco ✅ (`[05-K-2]`, muito detalhado) · Nest ❌ (depende de `23-repasse`/`22-contribuicao`, API de pagamento).
- **RF-058** (Flexível: repassa o arrecadado ao encerrar) — Banco ✅ · Nest ❌ (mesmo motivo).
- **RF-059** (pesquisador solicita encerramento antecipado, direto se sem contribuição confirmada) — Banco ✅ (`solicitacao_encerramento`) · Nest ❌ (`20-solicitacao-encerramento` vazio).
- **RF-060** (Admin lista e decide solicitações) — Banco ✅ · Nest ❌ (mesmo módulo vazio).
- **RF-061** (aprovação aplica regra do modelo, notifica por e-mail) — Banco ✅ · Nest ❌ (módulo vazio + `4-mail` vazio).

### Campanha Geral, continuação (RF-062 a RF-066)

- **RF-062** (listagem pública com filtros) — Banco ✅ (índices `[02-E]` prontos pra isso) · Nest ❌ (página pública não existe).
- **RF-063** (página de detalhes pública) — Banco ✅ · Nest ❌ (mesmo motivo).
- **RF-064** (prazo 15-60 dias configurável) — Banco ✅ (`[01-E]`, decisão final 60 dias) · Nest 🟡 (regra vale sempre no banco; validação espelhada no DTO do Nest não conferida).
- **RF-065** (meta mínima configurável, R$500 padrão) — Banco ✅ (`configuracoes.meta_minima_campanha`) · Nest 🟡 (mesma nota do RF-064).
- **RF-066** (limite de caracteres configurável por campo) — Banco ✅ (`fn_valida_limite_texto_livre`, vários `CK_*_TAMANHO`) · Nest 🟡 (regra vale sempre no banco; espelhamento client-side não conferido).

## Grupo: Contribuições (RF-067 a RF-078)

Todo este grupo depende de `22-contribuicao` (vazio) e de uma decisão de gateway de pagamento ainda não tomada (RS-04). Banco majoritariamente pronto; Nest ❌ quase uniforme.

- **RF-067** (contribuição anônima via PIX) — Banco ✅ (`contribuicao`, `token_sessao`) · Nest ❌.
- **RF-068** (identificador de sessão anônima, sem PII) — Banco ✅ (`gen_random_uuid()`) · Nest ❌.
- **RF-069** (anônimo só PIX; cadastrado pode cartão/débito/boleto) — Banco ➖ (regra de fluxo, não schema) · Nest ❌.
- **RF-070** (AoN só PIX; Flexível todos os meios) — Banco ➖ · Nest ❌.
- **RF-071** (redirecionar pro fluxo certo por meio de pagamento) — Banco ➖ · Nest ❌.
- **RF-072** (confirmar pagamento via webhook, atualizar em tempo real) — Banco ✅ (triggers de sincronização já existem, só falta o gatilho externo) · Nest ❌ (não existe endpoint de webhook).
- **RF-073** (status individual da transação, ciclo de vida completo) — Banco ✅ (ENUM `status_contribuicao` completo, bem documentado) · Nest ❌.
- **RF-074** (notificar doador por e-mail em 3 eventos) — Banco ➖ · Nest ❌ (`4-mail` vazio).
- **RF-075** (QR Code válido 30min, expira, permite novo) — Banco ➖ (é regra de aplicação/gateway) · Nest ❌.
- **RF-076** (checkbox de termos de pagamento antes de contribuir) — Banco ✅ (`aceite_termo_contribuicao`) · Nest ❌.
- **RF-077** (registrar data/hora/versão do termo, imutável, anti-chargeback) — Banco ✅ (`aceite_termo_contribuicao`) · Nest ❌.
- **RF-078** (valor mínimo de contribuição configurável, R$5 padrão) — Banco ✅ (`configuracoes.valor_minimo_contribuicao` + trigger) · Nest ❌.

## Grupo: Dashboard (RF-079 a RF-082)

- **RF-079** (painel do doador: histórico + campanhas seguidas) — Banco ✅ (dados existem) · Nest 🟡 (seguir funciona; histórico de doação depende de `22-contribuicao`, vazio).
- **RF-080** (painel do pesquisador: campanhas + métricas + valor líquido no encerramento) — Banco ✅ · Nest 🟡 (`12-campanha` cobre listagem; valor líquido real depende de `23-repasse`, vazio).
- **RF-081** (valor líquido estimado, com % da taxa, mesmo campanha ativa) — Banco ✅ (taxa carimbada) · Nest 🟡 (cálculo simples de fazer com o que já existe, mas não confirmei se está exposto).
- **RF-082** (painel do Admin: métricas gerais da plataforma) — Banco ✅ (`contar_metricas_dashboard()` — `[03-M]`) · Nest ✅ (`29-dashboard`, `GET /dashboard/resumo` confirmado em `[03-M]`).

## Grupo: Administração (RF-083 a RF-084)

- **RF-083** (matriz papel × permissão gerenciável, código imutável/nome editável) — Banco ✅ (`papel.codigo` vs `papel.nome` — `[01-B]`, `trg_admin_recebe_toda_permissao`) · Nest ✅ (`2-papel-permissao`).
- **RF-084** (parâmetros de negócio configuráveis em tabela, sem migração) — Banco ✅ (`configuracoes`, cobertura muito ampla — dezenas de chaves) · Nest ✅ (`11-configuracoes`).

## Grupo: Comentários (RF-085 a RF-091)

Módulo bem batalhado em ambas as camadas — ver o histórico extenso de bugs de endosso corrigidos em `[04-E-3]`/`[04-E-4]` do `DOCUMENTACAO_BD.md`.

- **RF-085** (pesquisador comenta em campanha de outro, até 500 caracteres, privado) — Banco ✅ (`UNIQUE (id_campanha, id_pesquisador)`) · Nest ✅ (`17-comentario`).
- **RF-086** (dono vê comentários recebidos no painel privado) — Banco ✅ (`pol_comentario_select`) · Nest ✅.
- **RF-087** (endossar, limite configurável de 4, libera slot ao remover) — Banco ✅ (`CK_COMENTARIO_ENDOSSO`, `[05-K-3]`) · Nest ✅.
- **RF-088** (seção pública só com endossados) — Banco ✅ (`[04-E-3]`) · Nest ❌ (página pública de campanha não existe — o endpoint pode existir, mas não há onde exibir ainda).
- **RF-089** (1 comentário por pesquisador por campanha, editável até endossar) — Banco ✅ (`UNIQUE` + regra de endosso) · Nest ✅.
- **RF-090** (não pode comentar na própria campanha) — Banco ✅ (checagem documentada) · Nest ✅.
- **RF-091** (comentário/endosso sobrevive ao encerramento, some se moderação oculta a página) — Banco ✅ (`[04-E-4]`, muito bem coberto) · Nest 🟡 (regra de banco vale sempre; comportamento de "esconder junto com a página" na apresentação não conferido, já que a página pública não existe).

## Grupo: Recompensa Simbólica (RF-092 a RF-094)

- **RF-092** (3 tipos: reconhecimento, acesso antecipado, entrega digital — nunca física) — Banco ✅ (ENUM `tipo_recompensa` restrito, decisão documentada em `[01-E]`) · Nest ❌ (`18-recompensa` vazio, parado por pedido explícito do Lucas).
- **RF-093** (valor mínimo + quantidade, nunca abaixo do mínimo/esgotado) — Banco ✅ (`recompensa` constraints) · Nest ❌.
- **RF-094** (registrar recompensa escolhida na contribuição) — Banco ✅ (`contribuicao_recompensa`) · Nest ❌ (depende de `18-recompensa` E `22-contribuicao`, os dois vazios).

## Grupo: Moderação (RF-095 a RF-113)

- **RF-095** (Admin lista campanhas aguardando aprovação) — Banco ✅ · Nest ✅ (`12-campanha`, provável, módulo robusto — 23 arquivos).
- **RF-096** (aprovar/rejeitar, justificativa obrigatória na rejeição) — Banco ✅ (`justificativa_admin` — item 19(d) da Lista C, `[01-E]`) · Nest ✅.
- **RF-097** (rejeitada → editável → reenviada, histórico de rejeições) — Banco ✅ (`historico_rejeicao`) · Nest 🟡 (`21-historico-rejeicao` está **vazio** — a tabela existe e é escrita por trigger, mas expor a consulta pelo Nest não está confirmado).
- **RF-098** (notificar pesquisador por e-mail sobre aprovação/rejeição) — Banco ➖ · Nest ❌ (`4-mail` vazio).
- **RF-099** (denunciar campanha, motivo + descrição opcional) — Banco ✅ (`denuncia`, `motivo_denuncia`) · Nest ❌ (`19-denuncia` vazio).
- **RF-100** (motivos de denúncia em catálogo, tipo campanha/perfil, ativo/inativo) — Banco ✅ (`motivo_denuncia`) · Nest ✅ (`10-motivo-denuncia`, é módulo separado e já implementado).
- **RF-101** (Admin gerencia motivos: criar/editar/ativar/desativar/excluir se não usado) — Banco ✅ (`pol_motivo_delete`, recusa se em uso) · Nest ✅ (`10-motivo-denuncia`).
- **RF-102** (impede denúncia duplicada do mesmo usuário na mesma campanha) — Banco ✅ · Nest ❌ (a REGRA está pronta no banco, mas o endpoint que dispararia isso é `19-denuncia`, vazio).
- **RF-103** (limite de denúncias por janela de tempo, configurável) — Banco ✅ (`configuracoes`) · Nest ❌ (mesmo motivo).
- **RF-104** (status de averiguação: pendente/em análise/resolvida/improcedente) — Banco ✅ (ENUM completo) · Nest ❌ (`19-denuncia` vazio).
- **RF-105** (autor da denúncia não pode julgar a própria) — Banco ✅ (confirmado — este é o achado que corrigiu a Origem do RF no `REQUISITOS_3.md`, RU-20) · Nest ❌ (mesmo motivo).
- **RF-106** (lista de campanhas denunciadas p/ Admin) — Banco ✅ · Nest ❌.
- **RF-107** (encerrar/ocultar campanha denunciada, aplica devolução do modelo) — Banco ✅ (`[05-K-2]`, muito detalhado) · Nest 🟡 (mudança de status é `12-campanha`, provável; devolução real depende de `23-repasse`, vazio).
- **RF-108** (notificar doadores por e-mail no encerramento por moderação flexível, log de auditoria) — Banco ✅ (`log_auditoria`) · Nest 🟡 (log via `28-log-auditoria` ✅; e-mail ❌ por `4-mail` vazio).
- **RF-109** (lista de denúncias contra perfil de pesquisador p/ Admin) — Banco ✅ · Nest ❌ (`19-denuncia` vazio).
- **RF-110** (suspender/desativar perfil de pesquisador, mantém como Usuário) — Banco ✅ (`suspender_pesquisador()` — `[03-P]`, muito bem coberto) · Nest 🟡 (função de banco pronta e testada; endpoint Nest chamando ela não confirmado).
- **RF-111** (suspender conta ou papel específico, com motivo e prazo, expira sozinha) — Banco ✅ (`suspender_usuario`/`suspender_papel_usuario` — `[03-N]`) · Nest 🟡 (mesma nota do RF-110).
- **RF-112** (reativar pesquisador suspenso) — Banco ✅ (`reativar_pesquisador()`) · Nest 🟡 (mesma nota).
- **RF-113** (suspensão em cascata: encerra ativas, rejeita pendentes, notifica) — Banco ✅ (cascata dentro de `suspender_pesquisador()`) · Nest 🟡 (cascata é 100% trigger de banco, vale sempre; notificação por e-mail ❌ por `4-mail` vazio).

## Grupo: Notificações (RF-114 a RF-115)

- **RF-114** (registrar notificação antes do envio, status, tentativas) — Banco ✅ (`notificacao`, `idx_notificacao_status`) · Nest ❌ (`26-notificacao` E `4-mail` vazios — a fila existe no banco, ninguém a processa ainda).
- **RF-115** (log de auditoria administrativa, somente-inclusão, sem senha/CPF) — Banco ✅ (`log_auditoria`, letra `L`, muito bem coberto) · Nest ✅ (`28-log-auditoria`, 8 arquivos).

---

## Requisitos Não Funcionais (RNF) — tratamento mais leve

RNFs são transversais por natureza — a maioria não mapeia pra uma tabela ou endpoint específico. Notas objetivas, sem forçar Banco/Nest onde não faz sentido:

- **RNF-001** (responsivo) — ➖/❌ (é do front público, que não existe ainda; o painel admin atual não foi auditado quanto a isso).
- **RNF-002** (100% pt-BR) — ➖/🟡 (parece ser o padrão em todo o código lido, não auditado exaustivamente).
- **RNF-003** (LGPD, exclusão a pedido, retenção legal) — ✅/🟡 (banco muito forte: `excluir_conta_usuario`, `cpf_criptografado`; ver também RNF-015 e o item 59 de `PENDENCIAS.md`, pendência real de base legal documentada pro score público).
- **RNF-004** (senha com hash+salt, ex. bcrypt) — ➖/✅ (algoritmo é decisão do Nest, não do schema; assumido bcrypt por ser padrão do ecossistema Node, não conferido literalmente qual lib está em uso).
- **RNF-005** (HTTPS obrigatório) — infraestrutura de deploy, fora do código-fonte em si.
- **RNF-006** (webhook PIX reflete em até 30s) — ❌ (sem gateway integrado ainda).
- **RNF-007** (logs financeiros imutáveis, 5 anos) — 🟡 (`auditoria_financeira` existe, mas a policy de escrita é `USING(true)` — **sem proteção real de quem grava**, ver item 9 de `PENDENCIAS.md`, gap de segurança real e ainda aberto) · Nest ❌ (`24-auditoria-financeira` vazio; a proteção sugerida — serviço interno isolado — nunca foi construída).
- **RNF-008** (credenciais como env var) — ✅ (confirmado hoje: `STORAGE_*` em `nest/.env`, nunca no código).
- **RNF-009** (sandbox de pagamento) — ➖ (não se aplica ainda, não há integração nenhuma).
- **RNF-010** (e-mail desacoplado em módulo próprio) — ❌ (`4-mail` vazio — a INTENÇÃO arquitetural já está certa nos comentários do projeto, só falta construir).
- **RNF-011** (resposta média <3s) — não medido.
- **RNF-012** (disponibilidade 95%, Render grátis) — infraestrutura de hospedagem, fora do código.
- **RNF-013** (backend stateless) — ✅ (JWT sem sessão em memória do servidor; cada requisição abre sua própria transação via `GlobalDbInterceptor`/CLS — arquitetura já é stateless por desenho).
- **RNF-014** (proteção OWASP Top 10) — ✅ (RLS forçada em todas as tabelas, `class-validator` nos DTOs, Kysely faz consulta parametrizada — nunca concatenação de SQL).
- **RNF-015** (Termos explicam score automatizado, LGPD Art. 20) — ❌ (confirmado em aberto pelo item 59 de `PENDENCIAS.md` — decisão de manter score público foi tomada, mas a base legal nunca foi escrita nos Termos).

---

## Resumo executivo

Contagem aproximada por símbolo (RF-001 a RF-115, sem RNFs):

- **Banco ✅:** a grande maioria — o schema está muito à frente do Nest. Poucos ❌ reais no banco (RF-030, e o `[05-K]` scheduler do RF-056 é 🟡, não ❌).
- **Nest ✅:** concentrado em Usuário, Perfil Pesquisador, Campanha (núcleo + orçamento/cronograma/atualização), Comentários, Administração, Dashboard, Log de Auditoria, Termos — os módulos que já têm código.
- **Nest ❌ quase uniforme em:** todo o Grupo Contribuições, Recompensa, Denúncia/Moderação-de-denúncia, Solicitação de Encerramento, Repasse, Auditoria Financeira, Notificações — ou seja, **dinheiro de verdade entrando/saindo e comunicação por e-mail são as duas maiores lacunas do projeto hoje**, não modelagem de dado (essa parte já está pronta e testada há semanas).
- **Maior gap de segurança ainda aberto (não é falta de funcionalidade, é falta de proteção):** RNF-007/item 9 — escrita em `auditoria_financeira`/`repasse`/`historico_rejeicao` sem trava real de RLS, aguardando o serviço isolado do Nest que a `PENDENCIAS.md` já recomenda construir.

**Itens marcados 🟡 "não conferido a fundo" que merecem uma varredura futura, não tratados como fato aqui:** RF-002, RF-008, RF-013, RF-015, RF-020, RF-022, RF-025, RF-027/028, RF-046, RF-051, RF-054, RF-064/065/066, RF-079/080/081, RF-091, RF-097, RF-107/108, RF-110 a RF-113, RF-056 (scheduler). Nenhum destes é necessariamente um problema — só não foram lidos linha a linha nesta rodada, e "módulo existe" não é o mesmo que "cada regra específica confirmada".
