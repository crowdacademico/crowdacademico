# 🔗 Matriz de Rastreabilidade - Requisitos Funcionais × Implementação

Resolve o item 33 de `PENDENCIAS e correcoes.md` ("a fala mais importante do WhatsApp inteiro" - a Alexia pediu pra "passar as tabelas mais uma vez e ver se cobrem as necessidades"). Refeita em 04-09-2026 contra `informacoes/REQUISITOS_V4.md` (Etapa 3, v8 do `.docx`, considerada fechada) - substitui a versão anterior (01-09-2026), que rastreava contra a numeração antiga de `REQUISITOS_3.md`.

⚠️ **A numeração dos RFs mudou entre as duas versões, não é só um acréscimo no final.** Um mesmo número pode apontar pra requisitos diferentes nas duas versões - por exemplo, "RF-079" na numeração antiga era "encerrar campanha por moderação" (agora **RF-108**); na numeração nova, RF-079 é "valor mínimo de contribuição". Qualquer menção a "RF-XXX" em outro documento do projeto que ainda não foi conferida contra `REQUISITOS_V4.md` deve ser tratada com desconfiança até ser revisada - não presuma que o número antigo ainda vale.

## Como ler

Cada RF ganha duas colunas de status:

| Símbolo | Banco (schema/RLS/trigger) | Nest (endpoint/service) |
|---|---|---|
| ✅ | Estrutura existe e foi testada/documentada em `DOCUMENTACAO_BD.md` | Módulo com código real cobre isso, comportamento específico confirmado |
| 🟡 | Estrutura existe mas incompleta, ou depende de outra peça (ex.: gateway de pagamento) | Módulo existe mas o comportamento específico deste RF não foi conferido linha a linha, ou depende de outro módulo ainda vazio |
| ❌ | Não existe estrutura para isso | Módulo não existe (pasta vazia) ou não há caminho de código nenhum |
| ➖ | Não se aplica ao banco (regra é só de front/aplicação) | Não se aplica ao Nest (regra é só de banco, infraestrutura, ou "não fazer algo") |

**Metodologia:** a coluna Banco foi conferida contra `DOCUMENTACAO_BD.md`. A coluna Nest foi conferida principalmente pela EXISTÊNCIA de módulo com código real (mesma lista que o próprio `REQUISITOS_V4.md` já traz no cabeçalho, conferida em 04-09-2026) - módulo vazio = ❌ automático para tudo que depende dele, sem exceção. Para módulos que já têm código, o comportamento específico de cada RF nem sempre foi lido linha a linha - nesses casos o símbolo é 🟡 com nota, não um ✅ inventado. **Qualquer 🟡 marcado "não conferido a fundo" merece uma conferência de verdade antes de ser tratado como fato definitivo.**

**Módulos Nest vazios (04-09-2026), afetam toda a matriz abaixo:** `4-mail`, `18-recompensa`, `19-denuncia`, `20-solicitacao-encerramento`, `21-historico-rejeicao`, `22-contribuicao`, `23-repasse`, `24-auditoria-financeira`, `26-notificacao`, `27-resources`. `29-dashboard` está parcial (só `GET /dashboard/resumo`). Ver `PROXIMOS_MODULOS.md` para o que falta em cada um.

---

## RU/RS - não têm rastreabilidade individual aqui

Requisitos de Usuário (RU) e de Sistema (RS) são amplos demais para uma linha de matriz cada - eles se decompõem nos RFs abaixo, que é o nível certo de granularidade pra rastrear contra código. Nesta versão, `RU-18A` e `RU-19` são RUs novos (avaliar solicitação de encerramento antecipado é um julgamento do Administrador diferente de avaliar campanha nova), e `RU-11`/`RU-20`/`RU-21` foram ampliados pra cobrir também perfil de pesquisador, não só campanha.

RS-04 (gateway de pagamento) e RS-07 (sandbox) merecem nota à parte: **nenhuma decisão de gateway foi tomada ainda** - é a razão por trás de quase todo ❌ Nest no Grupo Contribuições, mais abaixo.

---

## Grupo: Usuário (RF-001 a RF-017)

- **RF-001** (cadastro nome/e-mail/senha) - Banco ✅ (`usuario.email UNIQUE`, `senha_hash NOT NULL`) · Nest ✅ (`1-usuario` + `3-auth`).
- **RF-002** (validar formato e-mail, senha ≥8) - Banco ➖ (validação de entrada, não é regra de schema) · Nest 🟡 (`class-validator` é o padrão do projeto nos DTOs; a regra exata de 8 caracteres não foi conferida linha a linha).
- **RF-003** (confirmação de e-mail por token, conta nasce não verificada, independente do bloqueio por tentativas) - Banco ✅ (`verificacao_email`, `usuario.email_verificado` independente, `confirmar_email_por_token()` - `[03-O]`) · Nest 🟡 (a função de confirmar existe e a tela `verificar-email-page.jsx` está construída; **enviar** o token por e-mail de verdade depende de `4-mail`, vazio - hoje o link sai por `window.alert()` de dev).
- **RF-004** (login e/senha, mensagem sem revelar campo errado) - Banco ➖ · Nest ✅ (`3-auth`).
- **RF-005** (bloqueio após tentativas, 5/15min configurável, contador zera em sucesso) - Banco ✅ (`registrar_falha_login`/`liberar_bloqueio_login`, `configuracoes.limite_tentativas_login`/`bloqueio_login_minutos` - `[03-O]`) · Nest ✅ (`3-auth`, mais o botão "Desbloquear login" no painel).
- **RF-006** (recuperar senha por e-mail com link) - Banco ✅ (`recuperacao_senha`) · Nest ❌ (depende de `4-mail`, vazio).
- **RF-007** (link válido no máx. 1h, uso único) - Banco ✅ (implementado com expiração de 15-30min, dentro do teto de 1h do RF) · Nest ❌ (mesmo motivo do RF-006).
- **RF-008** (editar nome/senha, exige senha atual, e-mail imutável) - Banco ✅ (`GRANT UPDATE` de `usuario` restrito a `nome`/`id_imagem_perfil`/`senha_hash`, e-mail fora - `[03-O]`) · Nest 🟡 (módulo existe; exigência de "confirmar senha atual" antes de trocar não foi conferida linha a linha).
- **RF-009** (histórico de contribuições com status) - Banco ✅ (`contribuicao`) · Nest ❌ (`22-contribuicao` vazio).
- **RF-010** (seguir campanha, notificação por e-mail) - Banco ✅ (`seguir_campanha`) · Nest 🟡 (seguir funciona via `16-seguir-campanha`; a notificação por e-mail depende de `4-mail`/`26-notificacao`, ambos vazios).
- **RF-011** (deixar de seguir, cessa notificação) - Banco ✅ (`pol_seg_campanha_delete`) · Nest ✅ (`16-seguir-campanha`).
- **RF-012** (logout seguro, invalida token) - Banco ✅ (`sessao`, revogação) · Nest ✅ (`3-auth`).
- **RF-013** (sessões protegidas, distingue login/refresh, histórico no painel, revogar) - Banco ✅ (`sessao.origem` - `[01-D]`) · Nest ✅ (`GET`/`DELETE /auth/sessoes`, consumido pela aba Segurança de Minha Conta - ver `DOCUMENTACAO_FRONTEND.md`, seção 16).
- **RF-014** (checkbox de termos obrigatório, versão/data imutável, conteúdo cobre regras+moderação+notificações) - Banco ✅ (`termos_de_uso`, `usuario_termo`, `registrar_aceite_termo()` - `[03-D-1]`) · Nest ✅ (`5-termo-uso` + `cadastro-page.jsx`, modal de termo lido ao vivo - ver `DOCUMENTACAO_FRONTEND.md`, seção 15).
- **RF-015** (exclusão de conta LGPD, lógica, preserva log/financeiro) - Banco ✅ (`excluir_conta_usuario()`, `deletado_em`/`deletado_por` - `[03-O]`) · Nest ✅ (aba Privacidade de Minha Conta, confirmação por digitação - ver `DOCUMENTACAO_FRONTEND.md`, seção 16).
- **RF-016** (imagem de perfil opcional, avatar por iniciais) - Banco ✅ (`usuario.id_imagem_perfil`) · Nest ✅ (`SeletorFotoPerfil` + `confirmar-upload` contexto `avatar` + `AvatarUsuario` com fallback de iniciais).
- **RF-017** (upload restrito a JPEG/PNG/WebP/PDF, valida conteúdo real não só o tipo declarado, limite por tipo, remove órfãos nunca vinculados) - Banco ➖ (é feature de `25-arquivo`, não de schema) · Nest 🟡 (tipo/tamanho e verificação de assinatura real dos bytes confirmados em `arquivo.service.confirmar-upload`; a limpeza automática de arquivo enviado a `pendente/` e nunca confirmado não foi encontrada - não há job/rotina de limpeza de órfãos confirmado).

## Grupo: Perfil Pesquisador (RF-018 a RF-031)

- **RF-018/RF-019** ("Projetos Criados" desabilitado + mensagem orientando completar cadastro) - Banco ➖ · Nest ❌ (é comportamento de painel do usuário comum/público, que ainda não existe no React - só o painel admin genérico existe).
- **RF-020** (upgrade pra Pesquisador: CPF, título, vínculo, até 5 links com validação de domínio automática) - Banco ✅ (`perfil_pesquisador`, `cpf_criptografado`/`cpf_hash` - `[01-D]`; `link_academico.rotulo` + limite de 5; `tipo_link.regex`/`dominio`) · Nest ✅ (`6-perfil-pesquisador`, `7-link-academico`).
- **RF-021** (pesquisador independente, sem vínculo institucional) - Banco ✅ (`tipo_vinculo` ENUM, `CK_PERFIL_VINCULO`) · Nest ✅ (testado nos dois tipos de vínculo, ver `Como testar perfil_pesquisador.md`).
- **RF-022** (CPF criptografado, só p/ verificação) - Banco ✅ (decisão de cifrar no Node via AES-256-GCM, não no Postgres - `[01-D]`) · Nest ✅ (cifra/decifra é responsabilidade do próprio `6-perfil-pesquisador`, por desenho).
- **RF-023** (editar perfil, CPF imutável pelo usuário, links reordenáveis, não afeta campanhas já aprovadas) - Banco ✅ (CPF fora do `GRANT UPDATE` do próprio usuário) · Nest 🟡 (reordenação de links especificamente não conferida a fundo).
- **RF-024** (link principal = primeiro da lista, exibido na campanha) - Banco ✅ (links são ordenáveis) · Nest ❌ (depende da página pública de campanha, que não existe no React).
- **RF-025** (página pública `/pesquisador/{id}`) - Banco ✅ (dados existem) · Nest ❌ (página pública não existe, só painel admin).
- **RF-026** (seguir pesquisador pela página pública, sem duplicar/auto-seguir, contagem exibida) - Banco ✅ (`seguir_pesquisador`, `UK`, `contar_seguidores_pesquisador()` - `[03-E]`) · Nest ❌ (não há módulo/endpoint dedicado - só existe `16-seguir-campanha`; sem a página pública também não há onde clicar).
- **RF-027** (denunciar perfil de pesquisador) - Banco ✅ (`motivo_denuncia.tipo='perfil'`, `denuncia`) · Nest ❌ (`19-denuncia` vazio).
- **RF-028** (score, 4 dimensões, pesos configuráveis, recalculado a cada evento) - Banco ✅ (`[05-I]` completo, pesos padrão 30/25/20/25 em `score_config`) · Nest ✅ (`6-perfil-pesquisador` expõe consulta de score - `perfil-pesquisador.service.findone-score.ts`).
- **RF-029** (faixas: Atenção/Em Construção/Confiável/Referência, configuráveis) - Banco ✅ (`score_rotulo`) · Nest ✅ (mesma exposição do RF-028).
- **RF-030** (score nunca bloqueia automaticamente, só sinaliza fila de revisão) - Banco ✅ (`fn_precisa_revisao_score`, decisão consciente sem trigger de bloqueio - `[05-I-1]`) · Nest ➖ (é uma não-ação).
- **RF-031** (pesquisador solicita revisão de score, mesmo fluxo das denúncias) - Banco ❌ (não encontrei função/fluxo dedicado pra isso especificamente) · Nest ❌.

## Grupo: Campanha All-or-Nothing (RF-032 a RF-035)

- **RF-032** (criar campanha AoN) - Banco ✅ · Nest ✅ (`12-campanha`).
- **RF-033** (impedir repasse sem meta atingida) - Banco ✅ (regra de negócio bem coberta) · Nest 🟡 (a regra em si está pronta no banco; o repasse/pagamento de verdade depende de `23-repasse`/`22-contribuicao`, ambos vazios).
- **RF-034** (PIX exclusivo, QR dinâmico, cancelamento automático sem cobrança, aviso claro antes de gerar QR) - Banco ✅ (fluxo de devolução documentado - `parte 9`/`[05-K-2]`) · Nest ❌ (nenhuma integração de pagamento existe ainda - RS-04/RS-07 confirmam que o gateway nem foi escolhido).
- **RF-035** (repasse automático via API de split ao atingir meta) - Banco ✅ (regra pronta) · Nest ❌ (mesmo motivo do RF-034).

## Grupo: Campanha Flexível (RF-036 a RF-038)

- **RF-036** (criar campanha flexível) - Banco ✅ · Nest ✅ (`12-campanha` cobre os dois modelos).
- **RF-037** (repasse independente da meta) - Banco ✅ · Nest ❌ (depende de `23-repasse`, vazio).
- **RF-038** (aviso de cobrança imediata antes de contribuir, doador confirma ciência) - Banco ➖ (é UI) · Nest ❌ (página pública de campanha, onde esse aviso apareceria, não existe).

## Grupo: Campanha Geral (RF-039 a RF-057)

- **RF-039** (orçamento estruturado, soma = meta, mín. na aprovação/máx. no cadastro, configuráveis) - Banco ✅ (`orcamento_campanha`, `fn_valida_completude_campanha_aprovacao`, `fn_valida_limite_max_orcamento_campanha` - `[01-E]`) · Nest ✅ (`13-orcamento-campanha`).
- **RF-040** (orçamento congela na aprovação, sem exceção nem Admin) - Banco ✅ (`fn_congela_orcamento_campanha`) · Nest ✅ (regra é 100% trigger de banco, vale sempre).
- **RF-041** (cronograma com marcos, mín./máx. configuráveis) - Banco ✅ (`marco_cronograma`) · Nest ✅ (`14-marco-cronograma`).
- **RF-042** (marco não pode ser antes do início) - Banco ✅ (`fn_valida_data_marco_cronograma` - `[05-K-2]`) · Nest ✅ (validação de banco vale sempre).
- **RF-043** (cronograma editável até o início efetivo) - Banco ✅ (`fn_congela_marco_cronograma`, congela só quando `status` aprovado **e** `data_inicio <= NOW()`) · Nest ✅ (trigger de banco).
- **RF-044** (orçamento como gráfico, cronograma como linha do tempo) - Banco ➖ (é apresentação) · Nest ❌ (página pública de campanha não existe).
- **RF-045** (campanha nasce "aguardando aprovação", não exibida publicamente antes) - Banco ✅ (`status_campanha` ENUM, default) · Nest ✅ (`12-campanha`).
- **RF-046** (áreas do conhecimento 2 níveis, CNPq, ~81 áreas seedadas, código sem dígito verificador) - Banco ✅ (`[01-C]`) · Nest ✅ (`8-area-conhecimento`).
- **RF-047** (limite de campanhas simultâneas por pesquisador, padrão 2, status possíveis listados) - Banco ✅ (`configuracoes` + trigger, `status_campanha` ENUM completo) · Nest 🟡 (regra vale no banco independente do Nest; mensagem informativa amigável no front não conferida).
- **RF-048** (atualizações só em campanha ativa/sucesso/não-atingida) - Banco ✅ (`[04-E]`) · Nest ✅ (`15-atualizacao-campanha`).
- **RF-049** (atualização com fase + formato + anexo, Admin oculta sem apagar) - Banco ✅ (`arquivo_atualizacao`, `link_atualizacao`) · Nest ✅ (`25-arquivo` existe e o vínculo já é testável).
- **RF-050** (notificar seguidores por e-mail em nova atualização) - Banco ✅ (dado existe pra isso) · Nest ❌ (`4-mail`/`26-notificacao` vazios).
- **RF-051** (percentual/valor/prazo em tempo real após cada pagamento) - Banco ✅ (triggers de sincronização) · Nest ❌ (depende de `22-contribuicao` pra ter valor real entrando).
- **RF-052** (vídeo de apresentação, URL só, sem armazenar arquivo) - Banco ✅ (`video_apresentacao_url`) · Nest 🟡 (coluna pronta, campo no DTO de `12-campanha` não conferido a fundo).
- **RF-053** (editar campanha não aprovada ou rejeitada) - Banco ✅ (`GRANT UPDATE` + status) · Nest ✅ (`12-campanha`).
- **RF-054** (congela título/descrição/meta/modelo/taxa/orçamento na aprovação; datas/marcos ficam editáveis até "Em breve" acabar) - Banco ✅ (`fn_congela_regras_campanha`) · Nest ✅ (trigger de banco, vale sempre).
- **RF-055** (data de início futura, "Em breve", contagem regressiva, reagendável até começar) - Banco ✅ (feature completa - `[01-E]`) · Nest 🟡 (regra de negócio no banco; contagem regressiva é UI, que não existe na página pública ainda).
- **RF-056** (taxa configurável, padrão 5%, carimbada na aprovação, vale pro cálculo mesmo se a taxa mudar depois) - Banco ✅ (`fn_carimba_taxa_plataforma_aprovacao`) · Nest ✅ (`11-configuracoes` + trigger de banco).
- **RF-057** (encerramento automático por prazo expirado, bloqueia contribuições, status sucesso/não-atingida) - Banco 🟡 (existe `encerrar_campanhas_vencidas()`, mas **quem dispara** periodicamente - cron/scheduler - não foi confirmado) · Nest ❌ (não encontrei nenhum job/scheduler no Nest - precisa conferir se roda via `pg_cron` do Supabase ou se ainda falta).

### Encerramento e Cancelamento Antecipado (RF-058 a RF-062)

- **RF-058** (AoN sem meta: devolve tudo, status individual por transação, `reembolso_manual` se não puder devolver) - Banco ✅ (`[05-K-2]`, muito detalhado) · Nest ❌ (depende de `23-repasse`/`22-contribuicao`, API de pagamento).
- **RF-059** (Flexível: registra repasse "repassado" com bruto/taxa/líquido/indicação de meta) - Banco ✅ · Nest ❌ (mesmo motivo).
- **RF-060** (pesquisador solicita encerramento antecipado; direto se sem contribuição confirmada, formal com Admin se houver, campanha continua ativa durante análise, cancelável enquanto pendente) - Banco ✅ (`solicitacao_encerramento`, `fn_valida_transicao_solicitacao`) · Nest ❌ (`20-solicitacao-encerramento` vazio).
- **RF-061** (Admin lista e decide solicitações, rejeição exige justificativa, aprovação aciona fluxo, rejeição notifica por e-mail) - Banco ✅ · Nest ❌ (mesmo módulo vazio + `4-mail`).
- **RF-062** (aprovação aplica regra do modelo - AoN devolve tudo, Flexível mantém repassado -, notifica por e-mail) - Banco ✅ · Nest ❌ (módulo vazio + `4-mail` vazio).

### Campanha Geral, continuação (RF-063 a RF-067)

- **RF-063** (listagem pública com filtros) - Banco ✅ (índices `[02-E]` prontos pra isso) · Nest ❌ (página pública não existe).
- **RF-064** (página de detalhes pública) - Banco ✅ · Nest ❌ (mesmo motivo).
- **RF-065** (prazo 15-60 dias configurável, medido entre início e fim, sugestão de 30 dias no formulário) - Banco ✅ (`[01-E]`, decisão final 60 dias) · Nest 🟡 (regra vale sempre no banco; validação espelhada no DTO e sugestão de 30 dias no formulário não conferidas).
- **RF-066** (meta mínima configurável, R$500 padrão) - Banco ✅ (`configuracoes.meta_minima_campanha`) · Nest 🟡 (mesma nota do RF-065).
- **RF-067** (limite de caracteres configurável por campo) - Banco ✅ (`fn_valida_limite_texto_livre`, vários `CK_*_TAMANHO`) · Nest 🟡 (regra vale sempre no banco; espelhamento client-side não conferido).

## Grupo: Contribuições (RF-068 a RF-079)

Todo este grupo depende de `22-contribuicao` (vazio) e de uma decisão de gateway de pagamento ainda não tomada (RS-04). Banco majoritariamente pronto; Nest ❌ quase uniforme.

- **RF-068** (contribuição anônima via PIX, plataforma não guarda dados do pagador) - Banco ✅ (`contribuicao`, `token_sessao`) · Nest ❌.
- **RF-069** (identificador de sessão anônima, sem PII, sem enumeração) - Banco ✅ (`gen_random_uuid()`) · Nest ❌.
- **RF-070** (visitante só PIX; cadastrado pode cartão/débito/boleto) - Banco ➖ (regra de fluxo, não schema) · Nest ❌.
- **RF-071** (AoN só PIX; Flexível todos os meios) - Banco ➖ · Nest ❌.
- **RF-072** (redirecionar pro fluxo certo por meio de pagamento) - Banco ➖ · Nest ❌.
- **RF-073** (confirmar pagamento via webhook, atualizar em tempo real) - Banco ✅ (triggers de sincronização já existem, só falta o gatilho externo) · Nest ❌ (não existe endpoint de webhook).
- **RF-074** (status individual da transação, ciclo de vida completo, distingue devolvido de reembolsado) - Banco ✅ (ENUM `status_contribuicao` completo, bem documentado) · Nest ❌.
- **RF-075** (notificar doador identificado em 3 eventos; anônimo não recebe) - Banco ➖ · Nest ❌ (`4-mail` vazio).
- **RF-076** (QR Code válido 30min, expira, permite novo) - Banco ➖ (é regra de aplicação/gateway) · Nest ❌.
- **RF-077** (checkbox de termos de pagamento antes de contribuir, específico por transação) - Banco ✅ (`aceite_termo_contribuicao`) · Nest ❌.
- **RF-078** (registrar data/hora/versão do termo, imutável, anti-chargeback) - Banco ✅ (`aceite_termo_contribuicao`) · Nest ❌.
- **RF-079** (valor mínimo de contribuição configurável, R$5 padrão) - Banco ✅ (`configuracoes.valor_minimo_contribuicao` + trigger) · Nest ❌.

## Grupo: Dashboard (RF-080 a RF-083)

- **RF-080** (painel do usuário: histórico + campanhas seguidas) - Banco ✅ (dados existem) · Nest 🟡 (seguir funciona; histórico de doação depende de `22-contribuicao`, vazio).
- **RF-081** (painel do pesquisador: campanhas + métricas + valor líquido real no encerramento) - Banco ✅ · Nest 🟡 (`12-campanha` cobre listagem; valor líquido real depende de `23-repasse`, vazio).
- **RF-082** (valor líquido estimado, com % da taxa, mesmo campanha ativa) - Banco ✅ (taxa carimbada) · Nest 🟡 (cálculo simples de fazer com o que já existe, mas não confirmei se está exposto).
- **RF-083** (painel do Admin: métricas gerais da plataforma) - Banco ✅ (`contar_metricas_dashboard()` - `[03-M]`) · Nest ✅ (`29-dashboard`, `GET /dashboard/resumo`).

## Grupo: Administração (RF-084 a RF-085)

- **RF-084** (matriz papel × permissão gerenciável, código imutável/nome editável, nova permissão auto-atribuída ao admin) - Banco ✅ (`papel.codigo` vs `papel.nome` - `[01-B]`, `trg_admin_recebe_toda_permissao`) · Nest ✅ (`2-papel-permissao`, incluindo `PATCH /papel/:id` pro nome).
- **RF-085** (parâmetros de negócio configuráveis em tabela, sem migração) - Banco ✅ (`configuracoes`, cobertura muito ampla - dezenas de chaves) · Nest ✅ (`11-configuracoes`).

## Grupo: Comentários (RF-086 a RF-092)

Módulo bem batalhado em ambas as camadas - ver o histórico extenso de bugs de endosso corrigidos em `[04-E-3]`/`[04-E-4]` do `DOCUMENTACAO_BD.md`.

- **RF-086** (pesquisador comenta em campanha de outro, até 500 caracteres, privado, bloqueado em rejeitada/encerrada-moderação sem retroagir) - Banco ✅ (`UNIQUE (id_campanha, id_pesquisador)`) · Nest ✅ (`17-comentario`).
- **RF-087** (dono vê comentários recebidos no painel privado, gerencia sem notificar autores) - Banco ✅ (`pol_comentario_select`) · Nest ✅.
- **RF-088** (endossar, limite configurável de 4, libera slot ao remover, vira público na seção de endossos) - Banco ✅ (`CK_COMENTARIO_ENDOSSO`, `[05-K-3]`) · Nest ✅.
- **RF-089** (seção pública só com endossados) - Banco ✅ (`[04-E-3]`) · Nest ❌ (página pública de campanha não existe).
- **RF-090** (1 comentário por pesquisador por campanha, editável até endossar, edição não restaura endosso removido) - Banco ✅ (`UNIQUE` + regra de endosso) · Nest ✅.
- **RF-091** (não pode comentar na própria campanha) - Banco ✅ (checagem documentada) · Nest ✅.
- **RF-092** (comentário/endosso sobrevive ao encerramento, some se moderação oculta a página) - Banco ✅ (`[04-E-4]`, muito bem coberto) · Nest 🟡 (regra de banco vale sempre; comportamento de "esconder junto com a página" na apresentação não conferido, já que a página pública não existe).

## Grupo: Recompensa Simbólica (RF-093 a RF-095)

- **RF-093** (3 tipos: reconhecimento, acesso antecipado, entrega digital - nunca física) - Banco ✅ (ENUM `tipo_recompensa` restrito, decisão documentada em `[01-E]`) · Nest ❌ (`18-recompensa` vazio, parado por pedido explícito do Lucas).
- **RF-094** (valor mínimo + quantidade, nunca abaixo do mínimo/esgotado, nunca exclui já adquirida) - Banco ✅ (`recompensa` constraints) · Nest ❌.
- **RF-095** (registrar recompensa escolhida na contribuição) - Banco ✅ (`contribuicao_recompensa`) · Nest ❌ (depende de `18-recompensa` E `22-contribuicao`, os dois vazios).

## Grupo: Moderação (RF-096 a RF-114)

- **RF-096** (Admin lista campanhas aguardando aprovação) - Banco ✅ · Nest ✅ (`12-campanha`).
- **RF-097** (aprovar/rejeitar, justificativa obrigatória na rejeição) - Banco ✅ (`justificativa_admin` - item 19(d) da Lista C, `[01-E]`) · Nest 🟡 (aprovar/rejeitar via `12-campanha` confirmado; notificação por e-mail depende de `4-mail`, vazio).
- **RF-098** (rejeitada → editável → reenviada, histórico de rejeições) - Banco ✅ (`historico_rejeicao`) · Nest 🟡 (`21-historico-rejeicao` está **vazio** - a tabela existe e é escrita por trigger, mas expor a consulta pelo Nest não está confirmado).
- **RF-099** (notificar pesquisador por e-mail sobre aprovação/rejeição) - Banco ➖ · Nest ❌ (`4-mail` vazio).
- **RF-100** (denunciar campanha, motivo + descrição opcional) - Banco ✅ (`denuncia`, `motivo_denuncia`) · Nest ❌ (`19-denuncia` vazio).
- **RF-101** (motivos de denúncia em catálogo, tipo campanha/perfil, ativo/inativo) - Banco ✅ (`motivo_denuncia`) · Nest ✅ (`10-motivo-denuncia`).
- **RF-102** (Admin gerencia motivos: criar/editar/ativar/desativar/excluir se não usado) - Banco ✅ (`pol_motivo_delete`, recusa se em uso) · Nest ✅ (`10-motivo-denuncia`).
- **RF-103** (impede denúncia duplicada do mesmo usuário na mesma campanha) - Banco ✅ · Nest ❌ (a regra está pronta no banco, mas o endpoint que dispararia isso é `19-denuncia`, vazio).
- **RF-104** (limite de denúncias por janela de tempo, configurável) - Banco ✅ (`configuracoes`) · Nest ❌ (mesmo motivo).
- **RF-105** (status de averiguação: pendente/em análise/resolvida/improcedente) - Banco ✅ (ENUM completo) · Nest ❌ (`19-denuncia` vazio).
- **RF-106** (autor da denúncia não pode julgar a própria) - Banco ✅ (confirmado - este é o achado que corrigiu a Origem do RF na versão anterior do documento) · Nest ❌ (mesmo motivo).
- **RF-107** (lista de campanhas denunciadas p/ Admin) - Banco ✅ · Nest ❌.
- **RF-108** (encerrar/ocultar campanha denunciada, aplica devolução do modelo, oculta página imediatamente, comentários somem junto) - Banco ✅ (`[05-K-2]`, muito detalhado) · Nest 🟡 (mudança de status é `12-campanha`, provável; devolução real depende de `23-repasse`, vazio).
- **RF-109** (notificar doadores por e-mail no encerramento por moderação flexível, log de auditoria) - Banco ✅ (`log_auditoria`) · Nest 🟡 (log via `28-log-auditoria` ✅; e-mail ❌ por `4-mail` vazio).
- **RF-110** (lista de denúncias contra perfil de pesquisador p/ Admin) - Banco ✅ · Nest ❌ (`19-denuncia` vazio).
- **RF-111** (suspender/desativar perfil de pesquisador, mantém como Usuário) - Banco ✅ (`suspender_pesquisador()` - `[03-P]`, muito bem coberto) · Nest 🟡 (função de banco pronta e testada; não confirmei se está ligada ao mesmo mecanismo de moderação de conta do RF-112, ou se são dois caminhos paralelos).
- **RF-112** (suspender conta ou papel específico, com motivo e prazo, expira sozinha, distinta do bloqueio automático de login) - Banco ✅ (`usuario.suspenso_ate`/`motivo_suspensao`/`suspenso_por`, `usuario_papel.suspenso_ate` - `[03-N]`) · Nest ✅ (`SecaoModeracao` em Alterar Usuário, opções de prazo configuráveis, motivo obrigatório - ver `DOCUMENTACAO_FRONTEND.md`, seção 16).
- **RF-113** (reativar pesquisador suspenso) - Banco ✅ (`reativar_pesquisador()`) · Nest 🟡 (função de banco pronta; endpoint Nest chamando ela não confirmado; notificação por e-mail depende de `4-mail`).
- **RF-114** (suspensão em cascata: encerra ativas, rejeita pendentes, notifica) - Banco ✅ (cascata dentro de `suspender_pesquisador()`, `log_auditoria`) · Nest 🟡 (cascata é 100% trigger de banco, vale sempre; notificação por e-mail ❌ por `4-mail` vazio).

## Grupo: Notificações (RF-115 a RF-116)

- **RF-115** (registrar notificação antes do envio, status, tentativas) - Banco ✅ (`notificacao`, `idx_notificacao_status`) · Nest ❌ (`26-notificacao` E `4-mail` vazios - a fila existe no banco, ninguém a processa ainda).
- **RF-116** (log de auditoria administrativa, somente-inclusão, sem senha/CPF) - Banco ✅ (`log_auditoria`, letra `L`, muito bem coberto) · Nest ✅ (`28-log-auditoria`).

---

## Requisitos Não Funcionais (RNF) - tratamento mais leve

RNFs são transversais por natureza - a maioria não mapeia pra uma tabela ou endpoint específico. Notas objetivas, sem forçar Banco/Nest onde não faz sentido:

- **RNF-001** (responsivo) - ➖/❌ (é do front público, que não existe ainda; o painel admin atual não foi auditado quanto a isso).
- **RNF-002** (100% pt-BR) - ➖/🟡 (parece ser o padrão em todo o código lido, não auditado exaustivamente).
- **RNF-003** (LGPD, exclusão a pedido, retenção legal) - ✅/🟡 (banco muito forte: `excluir_conta_usuario`, `cpf_criptografado`; ver também RNF-015 e o item 59 de `PENDENCIAS.md`, pendência real de base legal documentada pro score público).
- **RNF-004** (senha com hash+salt, ex. bcrypt) - ➖/✅ (algoritmo é decisão do Nest, não do schema; `bcrypt` confirmado em uso - ver seed `07_seed_dados.sql`, hash real gerado com `bcrypt.hash`).
- **RNF-005** (HTTPS obrigatório) - infraestrutura de deploy, fora do código-fonte em si.
- **RNF-006** (webhook PIX reflete em até 30s) - ❌ (sem gateway integrado ainda).
- **RNF-007** (logs financeiros imutáveis, 5 anos) - 🟡 (`auditoria_financeira` existe, mas a policy de escrita é `USING(true)` - **sem proteção real de quem grava**, ver item 9 de `PENDENCIAS.md`, gap de segurança real e ainda aberto) · Nest ❌ (`24-auditoria-financeira` vazio; a proteção sugerida - serviço interno isolado - nunca foi construída).
- **RNF-008** (credenciais como env var) - ✅ (confirmado: `STORAGE_*`/`DATABASE_URL`/`DATABASE_URL_MIGRATIONS` em `nest/.env`, nunca no código).
- **RNF-009** (sandbox de pagamento) - ➖ (não se aplica ainda, não há integração nenhuma).
- **RNF-010** (e-mail desacoplado em módulo próprio) - ❌ (`4-mail` vazio - a intenção arquitetural já está certa nos comentários do projeto, só falta construir).
- **RNF-011** (resposta média <3s) - não medido.
- **RNF-012** (disponibilidade 95%, hospedagem gratuita) - infraestrutura de hospedagem, fora do código.
- **RNF-013** (backend stateless) - ✅ (JWT sem sessão em memória do servidor; cada requisição abre sua própria transação via `GlobalDbInterceptor`/CLS - arquitetura já é stateless por desenho).
- **RNF-014** (proteção OWASP Top 10) - ✅ (RLS forçada em todas as tabelas, `class-validator` nos DTOs, Kysely faz consulta parametrizada - nunca concatenação de SQL).
- **RNF-015** (Termos explicam score automatizado, LGPD Art. 20) - ❌ (confirmado em aberto pelo item 59 de `PENDENCIAS.md` - decisão de manter score público foi tomada, mas a base legal nunca foi escrita nos Termos).
- **RNF-016** (processar toda imagem no servidor: reduzir resolução, converter formato, remover metadados; tamanho registrado é o do resultado final) - ✅ (`sharp`: `.rotate()` + `.resize()` + `.webp()`, `tamanhoFinal` calculado depois do processamento, não o declarado pelo cliente - confirmado em `arquivo.service.confirmar-upload.ts`).
- **RNF-017** (tamanho máximo por arquivo conforme tipo + volume acumulado por conta, verificado antes e depois do envio) - ✅ (`TAMANHO_MAXIMO_BYTES_POR_MIME` por tipo, `COTA_BYTES_POR_USUARIO` de 50MB, checados no início - `iniciar-upload` - e de novo com o tamanho final pós-processamento - `confirmar-upload`).

---

## Resumo executivo

Contagem aproximada por símbolo (RF-001 a RF-116, sem RNFs):

- **Banco ✅:** a grande maioria - o schema está muito à frente do Nest. Poucos ❌ reais no banco (RF-026, RF-031, e o scheduler do RF-057 é 🟡, não ❌).
- **Nest ✅:** concentrado em Usuário, Perfil Pesquisador (incluindo score, sessões e exclusão de conta), Campanha (núcleo + orçamento/cronograma/atualização), Comentários, Administração, Dashboard, Log de Auditoria, Termos, Moderação de conta (suspensão/desbloqueio) - os módulos que já têm código e foram documentados a fundo nesta rodada.
- **Nest ❌ quase uniforme em:** todo o Grupo Contribuições, Recompensa, Denúncia/Moderação-de-denúncia, Solicitação de Encerramento, Repasse, Auditoria Financeira, Notificações, e qualquer página pública (campanha, perfil de pesquisador) - ou seja, **dinheiro de verdade entrando/saindo, denúncia/moderação de conteúdo, comunicação por e-mail e a própria interface pública são as maiores lacunas do projeto hoje**, não modelagem de dado (essa parte já está pronta e testada há semanas).
- **Maior gap de segurança ainda aberto (não é falta de funcionalidade, é falta de proteção):** RNF-007/item 9 - escrita em `auditoria_financeira`/`repasse`/`historico_rejeicao` sem trava real de RLS, aguardando o serviço isolado do Nest que a `PENDENCIAS.md` já recomenda construir.

**Itens marcados 🟡 "não conferido a fundo" que merecem uma varredura futura, não tratados como fato aqui:** RF-002, RF-003, RF-008, RF-010, RF-017, RF-023, RF-033, RF-047, RF-052, RF-055, RF-057 (scheduler), RF-065/066/067, RF-080/081/082, RF-092, RF-097, RF-098, RF-108/109, RF-111, RF-113, RF-114. Nenhum destes é necessariamente um problema - só não foram lidos linha a linha nesta rodada, e "módulo existe" não é o mesmo que "cada regra específica confirmada".

**Pendente de decisão, fora do escopo desta matriz:** vários documentos do projeto (`PENDENCIAS e correcoes.md` em especial) ainda citam números de RF da numeração antiga - por exemplo, o item 57 de `PENDENCIAS` fala em "RF-079" pra se referir a encerrar campanha por moderação, que nesta versão é **RF-108**. Essas menções precisam ser revisadas uma a uma antes de serem tratadas como corretas.
