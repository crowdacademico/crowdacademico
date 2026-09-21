# 🔗 Matriz de Rastreabilidade - Requisitos Funcionais × Implementação

Resolve o item 33 de `PENDENCIAS e correcoes.md` ("a fala mais importante do WhatsApp inteiro" - a Alexia pediu pra "passar as tabelas mais uma vez e ver se cobrem as necessidades"). Refeita em 04-09-2026 contra os Requisitos Funcionais então vigentes (Etapa 3, v8 do `.docx`, considerada fechada) - substitui a versão anterior (01-09-2026), que rastreava contra uma numeração de requisitos já superada.

📌 **21-09-2026: esta matriz foi REPROPAGADA para a numeração do `informacoes/REQUISITOS_V7.md`** (gerado do `.docx` versão 13, substitui o V6). Todos os números de RF do corpo abaixo (grupos, entradas, resumo) estão na numeração do V7: 120 RFs, com 3 novos (RF-047 expiração do rascunho, RF-056 exclusão só em rascunho, RF-069 prazo vencido) e as entradas dos RFs tocados pela rodada de 20 e 21-09-2026 (Rascunho, ciclo de rejeição e reenvio) reescritas. A conversão foi feita a partir da numeração anterior (pré-06-09-2026) somando 1 a partir do antigo RF-016, 2 a partir do antigo RF-046, 3 a partir do antigo RF-054 e 4 a partir do antigo RF-066. **As notas datadas logo abaixo (05-09 e 06-09) são histórico**: foram escritas antes desta repropagação e citam numerações antigas de propósito.

📌 **Atualizada em 05-09-2026, requisitos então na v9 do `.docx` (atualizados de novo desde então - ver nota 06-09-2026 abaixo).** Diferente da transição anterior de requisitos (que mudou a numeração inteira), **esta manteve os mesmos 116 RFs/17 RNFs, mesma numeração** - a mudança foi só de redação: vários RFs ganharam a frase explícita "parâmetro configurável pelo Administrador, com valor padrão de X", deixando formal o que antes só o código/`PENDENCIAS.md` documentava. Conferi todo "valor padrão" citado nos requisitos contra as chaves de verdade em `configuracoes` (seed) - **bateu em todos, com uma exceção**: ver nota no RF-039 (numeração desta rodada; **RF-040 na numeração atual**, ver nota abaixo), mais adiante nesta matriz. Nenhuma outra mudança de status foi necessária nesta rodada - o resto da matriz (símbolos ✅/🟡/❌/➖) continua válido.

📌 **06-09-2026: numeração mudou de verdade, e os requisitos foram atualizados de novo.** RF-015A (exportação de dados/portabilidade LGPD) foi promovido a **RF-016** no `.docx` oficial, empurrando +1 todo requisito de lá pra frente (o que era RF-016 virou RF-017, RF-039 virou RF-040, ..., RF-116 virou **RF-117**). **Esta matriz NÃO foi repropagada** - todo número de RF citado abaixo (inclusive no resumo executivo, ao final) ainda é da numeração ANTERIOR a esta atualização (pré-06-09-2026). Pra converter: qualquer número ≥016 citado aqui corresponde a `número + 1` na numeração atual dos Requisitos Funcionais. Decisão consciente do Lucas de propagar por conta própria, sem prazo - risco real (confirmado: existem comentários em `05_regras_negocio.sql`/`07_seed_dados.sql` citando RF específico como justificativa de regra de negócio, que agora apontam pro requisito errado) mas mitigado pela conversão simples (+1) e pelo fato de nenhuma citação aqui ser ambígua quanto a QUAL numeração ela usa.

⚠️ **A numeração dos RFs já mudou de forma reordenada (não só acréscimo no final) numa atualização de requisitos anterior a esta** (isso NÃO se repetiu na atualização seguinte - só a de 06-09-2026 trouxe deslocamento de novo, e esse foi um acréscimo simples de +1, não uma reordenação). Um mesmo número já apontou pra requisitos diferentes entre versões antigas - por exemplo, "RF-079" numa numeração já superada era "encerrar campanha por moderação" - **RF-108 antes de 06-09-2026, RF-109 na numeração atual**; na numeração pré-06-09-2026, RF-079 é "valor mínimo de contribuição" (**RF-080 na numeração atual**). Qualquer menção a "RF-XXX" em outro documento do projeto que ainda não foi conferida contra os Requisitos Funcionais atuais deve ser tratada com desconfiança até ser revisada - não presuma que o número já está na numeração atual.

## Como ler

Cada RF ganha duas colunas de status:

| Símbolo | Banco (schema/RLS/trigger) | Nest (endpoint/service) |
|---|---|---|
| ✅ | Estrutura existe e foi testada/documentada em `DOCUMENTACAO_BD.md` | Módulo com código real cobre isso, comportamento específico confirmado |
| 🟡 | Estrutura existe mas incompleta, ou depende de outra peça (ex.: gateway de pagamento) | Módulo existe mas o comportamento específico deste RF não foi conferido linha a linha, ou depende de outro módulo ainda vazio |
| ❌ | Não existe estrutura para isso | Módulo não existe (pasta vazia) ou não há caminho de código nenhum |
| ➖ | Não se aplica ao banco (regra é só de front/aplicação) | Não se aplica ao Nest (regra é só de banco, infraestrutura, ou "não fazer algo") |

**Metodologia:** a coluna Banco foi conferida contra `DOCUMENTACAO_BD.md`. A coluna Nest foi conferida principalmente pela EXISTÊNCIA de módulo com código real (mesma lista que os próprios Requisitos Funcionais já traziam no cabeçalho, conferida em 04-09-2026) - módulo vazio = ❌ automático para tudo que depende dele, sem exceção. Para módulos que já têm código, o comportamento específico de cada RF nem sempre foi lido linha a linha - nesses casos o símbolo é 🟡 com nota, não um ✅ inventado. **Qualquer 🟡 marcado "não conferido a fundo" merece uma conferência de verdade antes de ser tratado como fato definitivo.**

**Módulos Nest vazios (04-09-2026), afetam toda a matriz abaixo:** `4-mail`, `18-recompensa`, `19-denuncia`, `20-solicitacao-encerramento`, `21-historico-rejeicao`, `22-contribuicao`, `23-repasse`, `24-auditoria-financeira`, `26-notificacao`. `28-dashboard` está parcial (só `GET /dashboard/resumo`). (`27-resources` existia como pasta vazia até 04-09-2026, quando foi removida por não ter propósito real neste projeto - não aparece mais na lista de módulos.) Ver `PROXIMOS_MODULOS.md` para o que falta em cada um.

---

## RU/RS - não têm rastreabilidade individual aqui

Requisitos de Usuário (RU) e de Sistema (RS) são amplos demais para uma linha de matriz cada - eles se decompõem nos RFs abaixo, que é o nível certo de granularidade pra rastrear contra código. Nesta versão, `RU-18A` e `RU-19` são RUs novos (avaliar solicitação de encerramento antecipado é um julgamento do Administrador diferente de avaliar campanha nova), e `RU-11`/`RU-20`/`RU-21` foram ampliados pra cobrir também perfil de pesquisador, não só campanha.

RS-04 (gateway de pagamento) e RS-07 (sandbox) merecem nota à parte: **nenhuma decisão de gateway foi tomada ainda** - é a razão por trás de quase todo ❌ Nest no Grupo Contribuições, mais abaixo.

---

## Grupo: Usuário (RF-001 a RF-018)

- **RF-001** (cadastro nome/e-mail/senha) - Banco ✅ (`usuario.email UNIQUE`, `senha_hash NOT NULL`) · Nest ✅ (`1-usuario` + `3-auth`).
- **RF-002** (validar formato e-mail, senha ≥8) - Banco ➖ (validação de entrada, não é regra de schema) · Nest ✅ (conferido em 05-09-2026: `@IsEmail()` + `@MinLength(8)` em `auth.request-register.ts`, `usuario.request-create.ts` e `usuario.request-update.ts`).
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
- **RF-015** (exclusão de conta LGPD, lógica, preserva log/financeiro, dado pessoal anonimizado no registro preservado) - Banco ✅ (`excluir_conta_usuario()`, `deletado_em`/`deletado_por` - `[03-O]`; anonimização já coberta por `usuario_visivel()` - `[03-D]`) · Nest ✅ (aba Privacidade de Minha Conta, confirmação por digitação - ver `DOCUMENTACAO_FRONTEND.md`, seção 16).
- **RF-016** (exportação de dados pessoais, LGPD, inclui o histórico de rejeições das próprias campanhas, sem identificar o administrador) - Banco ✅ (`historico_rejeicao.id_usuario_dono`, `pol_historicorej_select`) · Nest ✅ (`usuario.service.exportar-dados`, seção `historico_rejeicoes`, sem `id_admin`).
- **RF-017** (imagem de perfil opcional, avatar por iniciais) - Banco ✅ (`usuario.id_imagem_perfil`) · Nest ✅ (`SeletorFotoPerfil` + `confirmar-upload` contexto `avatar` + `AvatarUsuario` com fallback de iniciais).
- **RF-018** (upload restrito a JPEG/PNG/WebP/PDF, valida conteúdo real não só o tipo declarado, limite por tipo, remove órfãos nunca vinculados) - Banco ➖ (é feature de `25-arquivo`, não de schema) · Nest 🟡 (tipo/tamanho e verificação de assinatura real dos bytes confirmados em `arquivo.service.confirmar-upload`; a limpeza automática de arquivo enviado a `pendente/` e nunca confirmado não foi encontrada - não há job/rotina de limpeza de órfãos confirmado).

## Grupo: Perfil Pesquisador (RF-019 a RF-032)

- **RF-018/RF-020** ("Projetos Criados" desabilitado + mensagem orientando completar cadastro) - Banco ➖ · Nest ❌ (é comportamento de painel do usuário comum/público, que ainda não existe no React - só o painel admin genérico existe).
- **RF-021** (upgrade pra Pesquisador: CPF, título, vínculo, até 5 links com validação de domínio automática) - Banco ✅ (`perfil_pesquisador`, `cpf_criptografado`/`cpf_hash` - `[01-D]`; `link_academico.rotulo` + limite de 5; `tipo_link.regex`/`dominio`) · Nest ✅ (`6-perfil-pesquisador`, `7-link-academico`).
- **RF-022** (pesquisador independente, sem vínculo institucional) - Banco ✅ (`tipo_vinculo` ENUM, `CK_PERFIL_VINCULO`) · Nest ✅ (testado nos dois tipos de vínculo, ver `Como testar perfil_pesquisador.md`).
- **RF-023** (CPF criptografado, só p/ verificação) - Banco ✅ (decisão de cifrar no Node via AES-256-GCM, não no Postgres - `[01-D]`) · Nest ✅ (cifra/decifra é responsabilidade do próprio `6-perfil-pesquisador`, por desenho).
- **RF-024** (editar perfil, CPF imutável pelo usuário, links reordenáveis, não afeta campanhas já aprovadas) - Banco ✅ (CPF fora do `GRANT UPDATE` do próprio usuário) · Nest 🟡 (reordenação de links especificamente não conferida a fundo).
- **RF-025** (link principal = primeiro da lista, exibido na campanha) - Banco ✅ (links são ordenáveis) · Nest ❌ (depende da página pública de campanha, que não existe no React).
- **RF-026** (página pública `/pesquisador/{id}`) - Banco ✅ (dados existem) · Nest ❌ (página pública não existe, só painel admin).
- **RF-027** (seguir pesquisador pela página pública, sem duplicar/auto-seguir, contagem exibida) - Banco ✅ (`seguir_pesquisador`, `UK`, `contar_seguidores_pesquisador()` - `[03-E]`) · Nest ❌ (não há módulo/endpoint dedicado - só existe `16-seguir-campanha`; sem a página pública também não há onde clicar).
- **RF-028** (denunciar perfil de pesquisador) - Banco ✅ (`motivo_denuncia.tipo='perfil'`, `denuncia`) · Nest ❌ (`19-denuncia` vazio).
- **RF-029** (pontuação de reputação; na taxa de aprovação conta como rejeitada só a campanha excluída sem nunca ter sido aprovada, rascunho fora do cálculo) - Banco ✅ (`calcular_score_historico`, `[05-I-2]`) · Nest ➖ (regra 100% de banco).
- **RF-030** (faixas: Atenção/Em Construção/Confiável/Referência, configuráveis) - Banco ✅ (`score_rotulo`) · Nest ✅ (mesma exposição do RF-029).
- **RF-031** (score nunca bloqueia automaticamente, só sinaliza fila de revisão) - Banco ✅ (`fn_precisa_revisao_score`, decisão consciente sem trigger de bloqueio - `[05-I-1]`) · Nest ➖ (é uma não-ação).
- **RF-032** (pesquisador solicita revisão de score, mesmo fluxo das denúncias) - Banco ❌ (não encontrei função/fluxo dedicado pra isso especificamente) · Nest ❌.

## Grupo: Campanha All-or-Nothing (RF-033 a RF-036)

- **RF-033** (criar campanha AoN) - Banco ✅ · Nest ✅ (`12-campanha`).
- **RF-034** (impedir repasse sem meta atingida) - Banco ✅ (regra de negócio bem coberta) · Nest 🟡 (a regra em si está pronta no banco; o repasse/pagamento de verdade depende de `23-repasse`/`22-contribuicao`, ambos vazios).
- **RF-035** (PIX exclusivo, QR dinâmico, cancelamento automático sem cobrança, aviso claro antes de gerar QR) - Banco ✅ (fluxo de devolução documentado - `parte 9`/`[05-K-2]`) · Nest ❌ (nenhuma integração de pagamento existe ainda - RS-04/RS-07 confirmam que o gateway nem foi escolhido).
- **RF-036** (repasse automático via API de split ao atingir meta) - Banco ✅ (regra pronta) · Nest ❌ (mesmo motivo do RF-035).

## Grupo: Campanha Flexível (RF-037 a RF-039)

- **RF-037** (criar campanha flexível) - Banco ✅ · Nest ✅ (`12-campanha` cobre os dois modelos).
- **RF-038** (repasse independente da meta) - Banco ✅ · Nest ❌ (depende de `23-repasse`, vazio).
- **RF-039** (aviso de cobrança imediata antes de contribuir, doador confirma ciência) - Banco ➖ (é UI) · Nest ❌ (página pública de campanha, onde esse aviso apareceria, não existe).

## Grupo: Campanha Geral (RF-040 a RF-060)

- **RF-040** (orçamento: soma igual à meta, mínimo verificado no envio E na aprovação) - Banco ✅ (`fn_valida_completude_campanha`, gatilho `trg_campanha_valida_completude`) · Nest ✅ (`POST /campanha/:id/enviar`; o erro chega traduzido).
- **RF-041** (orçamento congela na aprovação, sem exceção nem Admin) - Banco ✅ (`fn_congela_orcamento_campanha`) · Nest ✅ (regra é 100% trigger de banco, vale sempre).
- **RF-042** (cronograma: mínimo de marcos verificado no envio E na aprovação) - Banco ✅ (mesma função) · Nest ✅ (mesmo endpoint).
- **RF-043** (marco não pode ser antes do início) - Banco ✅ (`fn_valida_data_marco_cronograma` - `[05-K-2]`) · Nest ✅ (validação de banco vale sempre).
- **RF-044** (cronograma editável até o início efetivo) - Banco ✅ (`fn_congela_marco_cronograma`, congela só quando `status` aprovado **e** `data_inicio <= NOW()`) · Nest ✅ (trigger de banco).
- **RF-045** (orçamento como gráfico, cronograma como linha do tempo) - Banco ➖ (é apresentação) · Nest ❌ (página pública de campanha não existe).
- **RF-046** (campanha nasce em Rascunho, só vai a "aguardando aprovação" por envio explícito) - Banco ✅ (enum `rascunho`, `DEFAULT 'rascunho'`, regra de envio em `fn_valida_transicao_campanha`) · Nest ✅ (`POST /campanha/:id/enviar`) · React 🟡 (Campo de Testes T2; a tela real do pesquisador ainda não existe).
- **RF-047** (novo: rascunho expira sozinho, prazo configurável, padrão 336h contadas da criação) - Banco ✅ (`expirar_campanhas_rascunho()`, chave `campanha_rascunho_ttl_horas`) · Nest ✅ (`CampanhaServiceExpirarRascunho`, @Cron de hora em hora).
- **RF-048** (áreas do conhecimento 2 níveis, CNPq, ~81 áreas seedadas, código sem dígito verificador) - Banco ✅ (`[01-C]`) · Nest ✅ (`8-area-conhecimento`).
- **RF-049** (limite de campanhas simultâneas: rascunho não conta, cobrado no envio, mensagem no envio) - Banco ✅ (`validar_limite_campanhas_pesquisador`, ERRCODE 91018) · Nest ✅ (filtro de exceção por prefixo).
- **RF-050** (atualizações só em campanha ativa/sucesso/não-atingida) - Banco ✅ (`[04-E]`) · Nest ✅ (`15-atualizacao-campanha`).
- **RF-051** (atualização com fase + formato + anexo, Admin oculta sem apagar) - Banco ✅ (`arquivo_atualizacao`, `link_atualizacao`) · Nest ✅ (`25-arquivo` existe e o vínculo já é testável).
- **RF-052** (notificar seguidores por e-mail em nova atualização) - Banco ✅ (dado existe pra isso) · Nest ❌ (`4-mail`/`26-notificacao` vazios).
- **RF-053** (percentual/valor/prazo em tempo real após cada pagamento) - Banco ✅ (triggers de sincronização) · Nest ❌ (depende de `22-contribuicao` pra ter valor real entrando).
- **RF-054** (vídeo de apresentação, URL só, sem armazenar arquivo) - Banco ✅ (`video_apresentacao_url`) · Nest 🟡 (coluna pronta, campo no DTO de `12-campanha` não conferido a fundo).
- **RF-055** (edição em rascunho, aguardando aprovação ou rejeitada; rejeitada sem reenvios não edita) - Banco ✅ (`fn_campanha_reenvios_esgotados`, ERRCODE 91027 nas 3 funções de congelamento) · Nest ✅ (`GET /campanha/:id` devolve `reenviosRestantes`, `prazoReenvioAte`, `somenteLeitura`).
- **RF-056** (novo: pesquisador só exclui campanha em Rascunho) - Banco ✅ (`pol_campanha_delete` só `rascunho`) · Nest ✅ (`DELETE /campanha/:id`).
- **RF-057** (congelamento após a aprovação, agora inclui vídeo de apresentação e área do conhecimento) - Banco ✅ (`fn_congela_regras_campanha`, ERRCODE 91023 e 91024) · Nest ➖.
- **RF-058** (data de início futura, "Em breve", contagem regressiva, reagendável até começar) - Banco ✅ (feature completa - `[01-E]`) · Nest 🟡 (regra de negócio no banco; contagem regressiva é UI, que não existe na página pública ainda).
- **RF-059** (taxa configurável, padrão 5%, carimbada na aprovação, vale pro cálculo mesmo se a taxa mudar depois) - Banco ✅ (`fn_carimba_taxa_plataforma_aprovacao`) · Nest ✅ (`11-configuracoes` + trigger de banco).
- **RF-060** (encerramento automático por prazo expirado, bloqueia contribuições, status sucesso/não-atingida) - Banco ✅ (`encerrar_campanhas_vencidas()` - `SECURITY DEFINER`, bypassa a RLS certo, testada) · Nest ✅ **corrigido em 05-09-2026** - achado nesta mesma revisão que a função ficava inatingível (nenhum `@Cron`/`pg_cron` chamava ela). `CampanhaServiceEncerrarVencidas` (`12-campanha`) fecha o gap: `@nestjs/schedule` instalado, `@Cron('*/15 * * * *')` chamando a função via `PG_POOL` direto (não passa por `DatabaseService.getDb()` - job agendado não tem requisição HTTP por trás). Testado ao vivo: app sobe, conecta no Supabase real, sem erro. Ver `DOCUMENTACAO_BACKEND.md` §7.4 e `DOCUMENTACAO_BD.md` pro detalhamento completo. **Achado e corrigido separadamente em 07-09-2026:** mesmo com o `@Cron` ligado, a função em si quebrava com erro de tipo (`42804`, `CASE` sem `::status_campanha`) toda vez que rodava - nenhuma campanha vencida era encerrada de verdade entre 05-09 e 07-09-2026, apesar do ✅ acima já estar registrado. Corrigido em `05_regras_negocio.sql` (ver `PENDENCIAS e correcoes.md`); **pendente aplicar no Supabase de produção**, ainda não rodado lá.

### Encerramento e Cancelamento Antecipado (RF-061 a RF-065)

- **RF-061** (AoN sem meta: devolve tudo, status individual por transação, `reembolso_manual` se não puder devolver) - Banco ✅ (`[05-K-2]`, muito detalhado) · Nest ❌ (depende de `23-repasse`/`22-contribuicao`, API de pagamento).
- **RF-062** (Flexível: registra repasse "repassado" com bruto/taxa/líquido/indicação de meta) - Banco ✅ · Nest ❌ (mesmo motivo).
- **RF-063** (pesquisador solicita encerramento antecipado; direto se sem contribuição confirmada, formal com Admin se houver, campanha continua ativa durante análise, cancelável enquanto pendente) - Banco ✅ (`solicitacao_encerramento`, `fn_valida_transicao_solicitacao`) · Nest ❌ (`20-solicitacao-encerramento` vazio).
- **RF-064** (Admin lista e decide solicitações, rejeição exige justificativa, aprovação aciona fluxo, rejeição notifica por e-mail) - Banco ✅ · Nest ❌ (mesmo módulo vazio + `4-mail`).
- **RF-065** (aprovação aplica regra do modelo - AoN devolve tudo, Flexível mantém repassado -, notifica por e-mail) - Banco ✅ · Nest ❌ (módulo vazio + `4-mail` vazio).

### Campanha Geral, continuação (RF-066 a RF-071)

- **RF-066** (listagem pública com filtros) - Banco ✅ (índices `[02-E]` prontos pra isso) · Nest ❌ (página pública não existe).
- **RF-067** (página de detalhes pública) - Banco ✅ · Nest ❌ (mesmo motivo).
- **RF-068** (prazo 15-60 dias configurável, medido entre início e fim, sugestão de 30 dias no formulário) - Banco ✅ (`[01-E]`, decisão final 60 dias) · Nest 🟡 (regra vale sempre no banco; validação espelhada no DTO e sugestão de 30 dias no formulário não conferidas).
- **RF-069** (novo: sem envio nem aprovação com data final vencida, e oferta de reagendar mantendo a duração) - Banco ✅ (ERRCODE 90015; `deslizar_datas_campanha`) · Nest ✅ (`POST /campanha/:id/deslizar-datas`) · React 🟡 (oferta no modal Alterar Campanha de T2).
- **RF-070** (meta mínima configurável, R$500 padrão) - Banco ✅ (`configuracoes.meta_minima_campanha`) · Nest 🟡 (mesma nota do RF-068).
- **RF-071** (limite de caracteres configurável por campo) - Banco ✅ (`fn_valida_limite_texto_livre`, vários `CK_*_TAMANHO`) · Nest 🟡 (regra vale sempre no banco; espelhamento client-side não conferido).

## Grupo: Contribuições (RF-072 a RF-083)

Todo este grupo depende de `22-contribuicao` (vazio) e de uma decisão de gateway de pagamento ainda não tomada (RS-04). Banco majoritariamente pronto; Nest ❌ quase uniforme.

- **RF-072** (contribuição anônima via PIX, plataforma não guarda dados do pagador) - Banco ✅ (`contribuicao`, `token_sessao`) · Nest ❌.
- **RF-073** (identificador de sessão anônima, sem PII, sem enumeração) - Banco ✅ (`gen_random_uuid()`) · Nest ❌.
- **RF-074** (visitante só PIX; cadastrado pode cartão/débito/boleto) - Banco ➖ (regra de fluxo, não schema) · Nest ❌.
- **RF-075** (AoN só PIX; Flexível todos os meios) - Banco ➖ · Nest ❌.
- **RF-076** (redirecionar pro fluxo certo por meio de pagamento) - Banco ➖ · Nest ❌.
- **RF-077** (confirmar pagamento via webhook, atualizar em tempo real) - Banco ✅ (triggers de sincronização já existem, só falta o gatilho externo) · Nest ❌ (não existe endpoint de webhook).
- **RF-078** (status individual da transação, ciclo de vida completo, distingue devolvido de reembolsado) - Banco ✅ (ENUM `status_contribuicao` completo, bem documentado) · Nest ❌.
- **RF-079** (notificar doador identificado em 3 eventos; anônimo não recebe) - Banco ➖ · Nest ❌ (`4-mail` vazio).
- **RF-080** (QR Code válido 30min, expira, permite novo) - Banco ➖ (é regra de aplicação/gateway) · Nest ❌.
- **RF-081** (checkbox de termos de pagamento antes de contribuir, específico por transação) - Banco ✅ (`aceite_termo_contribuicao`) · Nest ❌.
- **RF-082** (registrar data/hora/versão do termo, imutável, anti-chargeback) - Banco ✅ (`aceite_termo_contribuicao`) · Nest ❌.
- **RF-083** (valor mínimo de contribuição configurável, R$5 padrão) - Banco ✅ (`configuracoes.valor_minimo_contribuicao` + trigger) · Nest ❌.

## Grupo: Dashboard (RF-084 a RF-087)

- **RF-084** (painel do usuário: histórico + campanhas seguidas) - Banco ✅ (dados existem) · Nest 🟡 (seguir funciona; histórico de doação depende de `22-contribuicao`, vazio).
- **RF-085** (painel do pesquisador: campanhas + métricas + valor líquido real no encerramento) - Banco ✅ · Nest 🟡 (`12-campanha` cobre listagem; valor líquido real depende de `23-repasse`, vazio).
- **RF-086** (valor líquido estimado, com % da taxa, mesmo campanha ativa) - Banco ✅ (taxa carimbada) · Nest 🟡 (cálculo simples de fazer com o que já existe, mas não confirmei se está exposto).
- **RF-087** (painel do Admin: métricas gerais da plataforma) - Banco ✅ (`contar_metricas_dashboard()` - `[03-M]`) · Nest ✅ (`28-dashboard`, `GET /dashboard/resumo`). 🔁 **Achado e corrigido (12-09-2026, auditoria RF x implementação):** a linha estava marcada ✅/✅ sem ressalva, mas até então a função só devolvia `total_campanhas` (um único count, sem quebra por status) e nada de valor arrecadado/denúncias pendentes - 4 das 5 partes do requisito (campanhas por status, valor total arrecadado, usuários cadastrados, denúncias pendentes) não tinham nenhum dado real. **Corrigido:** `contar_metricas_dashboard()` ganhou `campanhas_ativas`/`campanhas_sucesso`/`campanhas_nao_atingida`/`campanhas_aguardando_aprovacao`/`valor_total_arrecadado`/`denuncias_pendentes` (nenhum depende de módulo Nest vazio - `campanha`/`denuncia` já são tabela real), `DashboardResponseSummary` e o Dashboard (`views/admin/dashboard.tsx`) expostos com os novos cards. **Só a 5ª parte continua ❌ de propósito:** "campanhas sinalizadas por baixa pontuação de reputação" depende do motor de score estar fechado (ver `PENDENCIAS e correcoes.md`, pendência RF-032) - não implementado até essa decisão ser tomada.

## Grupo: Administração (RF-088 a RF-089)

- **RF-088** (matriz papel × permissão gerenciável, código imutável/nome editável, nova permissão auto-atribuída ao admin) - Banco ✅ (`papel.codigo` vs `papel.nome` - `[01-B]`, `trg_admin_recebe_toda_permissao`) · Nest ✅ (`2-papel-permissao`, incluindo `PATCH /papel/:id` pro nome).
- **RF-089** (parâmetros configuráveis, agora inclui expiração de rascunho, máximo de reenvios e prazo de permanência da rejeitada) - Banco ✅ (`campanha_rascunho_ttl_horas`, `campanha_rejeitada_max_reenvios`, `campanha_rejeitada_prazo_dias`) · Nest ✅ (tela de Configurações existente).

## Grupo: Comentários (RF-090 a RF-096)

Módulo bem batalhado em ambas as camadas - ver o histórico extenso de bugs de endosso corrigidos em `[04-E-3]`/`[04-E-4]` do `DOCUMENTACAO_BD.md`.

- **RF-090** (pesquisador comenta em campanha de outro, até 500 caracteres, privado, bloqueado em rejeitada/encerrada-moderação sem retroagir) - Banco ✅ (`UNIQUE (id_campanha, id_pesquisador)`) · Nest ✅ (`17-comentario`).
- **RF-091** (dono vê comentários recebidos no painel privado, gerencia sem notificar autores) - Banco ✅ (`pol_comentario_select`) · Nest ✅.
- **RF-092** (endossar, limite configurável de 4, libera slot ao remover, vira público na seção de endossos) - Banco ✅ (`CK_COMENTARIO_ENDOSSO`, `[05-K-3]`) · Nest ✅.
- **RF-093** (seção pública só com endossados) - Banco ✅ (`[04-E-3]`) · Nest ❌ (página pública de campanha não existe).
- **RF-094** (1 comentário por pesquisador por campanha, editável até endossar, edição não restaura endosso removido) - Banco ✅ (`UNIQUE` + regra de endosso) · Nest ✅.
- **RF-095** (não pode comentar na própria campanha) - Banco ✅ (checagem documentada) · Nest ✅.
- **RF-096** (comentário/endosso sobrevive ao encerramento, some se moderação oculta a página) - Banco ✅ (`[04-E-4]`, muito bem coberto) · Nest 🟡 (regra de banco vale sempre; comportamento de "esconder junto com a página" na apresentação não conferido, já que a página pública não existe).

## Grupo: Recompensa Simbólica (RF-097 a RF-099)

- **RF-097** (3 tipos: reconhecimento, acesso antecipado, entrega digital - nunca física) - Banco ✅ (ENUM `tipo_recompensa` restrito, decisão documentada em `[01-E]`) · Nest ❌ (`18-recompensa` vazio, parado por pedido explícito do Lucas).
- **RF-098** (valor mínimo + quantidade, nunca abaixo do mínimo/esgotado, nunca exclui já adquirida) - Banco ✅ (`recompensa` constraints) · Nest ❌.
- **RF-099** (registrar recompensa escolhida na contribuição) - Banco ✅ (`contribuicao_recompensa`) · Nest ❌ (depende de `18-recompensa` E `22-contribuicao`, os dois vazios).

## Grupo: Moderação (RF-100 a RF-118)

- **RF-100** (Admin lista campanhas aguardando aprovação) - Banco ✅ · Nest ✅ (`12-campanha`).
- **RF-101** (aprovar/rejeitar, justificativa obrigatória na rejeição) - Banco ✅ (`justificativa_admin` - item 19(d) da Lista C, `[01-E]`) · Nest 🟡 (aprovar/rejeitar via `12-campanha` confirmado; notificação por e-mail depende de `4-mail`, vazio).
- **RF-102** (rejeição e reenvio: máximo de reenvios, prazo por rejeição, só leitura quando esgotado, exclusão automática, histórico que sobrevive à exclusão, reenvios no log de auditoria) - Banco ✅ (`historico_rejeicao` sem FK para campanha e com dono/título; `expirar_campanhas_rejeitadas()`; ERRCODE 91025 e 91026) · Nest ✅ (`CampanhaServiceExpirarRejeitadas`, listagem de histórico com `tituloCampanha`) · React 🟡 (T2).
- **RF-103** (e-mail de rejeição com reenvios restantes e data limite) - Banco ➖ · Nest 🟡 (**os dados já estão expostos** em `GET /campanha/:id`; o envio do e-mail depende do módulo `26-notificacao`/`4-mail`, ainda vazio).
- **RF-104** (denunciar campanha, motivo + descrição opcional) - Banco ✅ (`denuncia`, `motivo_denuncia`) · Nest ❌ (`19-denuncia` vazio).
- **RF-105** (motivos de denúncia em catálogo, tipo campanha/perfil, ativo/inativo) - Banco ✅ (`motivo_denuncia`) · Nest ✅ (`10-motivo-denuncia`).
- **RF-106** (Admin gerencia motivos: criar/editar/ativar/desativar/excluir se não usado) - Banco ✅ (`pol_motivo_delete`, recusa se em uso) · Nest ✅ (`10-motivo-denuncia`).
- **RF-107** (impede denúncia duplicada do mesmo usuário na mesma campanha) - Banco ✅ · Nest ❌ (a regra está pronta no banco, mas o endpoint que dispararia isso é `19-denuncia`, vazio).
- **RF-108** (limite de denúncias por janela de tempo, configurável) - Banco ✅ (`configuracoes`) · Nest ❌ (mesmo motivo).
- **RF-109** (status de averiguação: pendente/em análise/resolvida/improcedente) - Banco ✅ (ENUM completo) · Nest ❌ (`19-denuncia` vazio).
- **RF-110** (autor da denúncia não pode julgar a própria) - Banco ✅ (confirmado - este é o achado que corrigiu a Origem do RF na versão anterior do documento) · Nest ❌ (mesmo motivo).
- **RF-111** (lista de campanhas denunciadas p/ Admin) - Banco ✅ · Nest ❌.
- **RF-112** (encerrar/ocultar campanha denunciada, aplica devolução do modelo, oculta página imediatamente, comentários somem junto) - Banco ✅ (`[05-K-2]`, muito detalhado; desde 04-09-2026 o `moderador` também tem a permissão pra executar isso, não só o `admin` - ver `PENDENCIAS`, item 57) · Nest 🟡 (mudança de status é `12-campanha`, provável, mas não existe hoje nenhum endpoint de "encerrar campanha por moderação" no Nest - nem pra admin, nem pra moderador; devolução real também depende de `23-repasse`, vazio).
- **RF-113** (notificar doadores por e-mail no encerramento por moderação flexível, log de auditoria) - Banco ✅ (`log_auditoria`) · Nest 🟡 (log via `27-log-auditoria` ✅; e-mail ❌ por `4-mail` vazio).
- **RF-114** (lista de denúncias contra perfil de pesquisador p/ Admin) - Banco ✅ · Nest ❌ (`19-denuncia` vazio).
- **RF-115** (suspensão: o pesquisador suspenso também não reenvia rejeitada nem envia rascunho; rascunhos e rejeitadas seguem seus prazos normais) - Banco ✅ (ERRCODE 92009 em `fn_valida_transicao_campanha`) · Nest ➖.
- **RF-116** (suspender conta ou papel específico, com motivo e prazo, expira sozinha, distinta do bloqueio automático de login) - Banco ✅ (`usuario.suspenso_ate`/`motivo_suspensao`/`suspenso_por`, `usuario_papel.suspenso_ate` - `[03-N]`) · Nest ✅ (`SecaoModeracao` em Alterar Usuário, opções de prazo configuráveis, motivo obrigatório - ver `DOCUMENTACAO_FRONTEND.md`, seção 16).
- **RF-117** (reativar pesquisador suspenso) - Banco ✅ (`reativar_pesquisador()`) · Nest 🟡 (função de banco pronta; endpoint Nest chamando ela não confirmado; notificação por e-mail depende de `4-mail`).
- **RF-118** (cascata de suspensão rejeita as campanhas aguardando aprovação e registra no histórico) - Banco ✅ (`suspender_pesquisador()` grava em `historico_rejeicao`, `id_admin` = quem suspendeu) · Nest ✅ (`PerfilPesquisadorServiceSuspender`).

## Grupo: Notificações (RF-119 a RF-120)

- **RF-119** (registrar notificação antes do envio, status, tentativas) - Banco ✅ (`notificacao`, `idx_notificacao_status`) · Nest ❌ (`26-notificacao` E `4-mail` vazios - a fila existe no banco, ninguém a processa ainda).
- **RF-120** (log de auditoria administrativa, somente-inclusão, sem senha/CPF) - Banco ✅ (`log_auditoria`, letra `L`, muito bem coberto) · Nest ✅ (`27-log-auditoria`).

---

## Requisitos Não Funcionais (RNF) - tratamento mais leve

RNFs são transversais por natureza - a maioria não mapeia pra uma tabela ou endpoint específico. Notas objetivas, sem forçar Banco/Nest onde não faz sentido:

- **RNF-001** (responsivo) - ➖/❌ (é do front público, que não existe ainda; o painel admin atual não foi auditado quanto a isso).
- **RNF-002** (100% pt-BR) - ➖/🟡 (parece ser o padrão em todo o código lido, não auditado exaustivamente).
- **RNF-003** (LGPD, exclusão a pedido, retenção legal) - ✅/🟡 (banco muito forte: `excluir_conta_usuario`, `cpf_criptografado`; ver também RNF-015 e o item 59 de `PENDENCIAS.md`, pendência real de base legal documentada pro score público). 🟢 **Portabilidade formalizada (06-09-2026):** o texto de RNF-003 falava só em "exclusão a pedido do titular" - a implementação de `GET /usuario/eu/exportar-dados` (05-09-2026) já cobria mais do que isso, e ficou sem RF numerado por um dia. Resolvido: o requisito nasceu como "RF-017" (entre RF-015 e RF-017 na numeração desta matriz) e foi promovido a **RF-017 de verdade na numeração atual dos Requisitos Funcionais** (ver nota no topo desta matriz); o texto de **RF-015** também ganhou a cláusula de anonimização (dado pessoal substituído por valor anonimizado no registro preservado). Ver as duas linhas no Grupo Usuário, acima.
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
- **RNF-017** (tamanho máximo por arquivo conforme tipo + volume acumulado por conta, verificado antes e depois do envio) - ✅ (tamanho por tipo e cota por usuário, configuráveis pelo Painel Admin desde 04-09-2026 - `ConfiguracaoValorService` lê `configuracoes`, com fallback pros padrões de 8MB/5MB/50MB se a chave não existir - checados no início - `iniciar-upload`, que também ganhou rate limit de uploads - e de novo com o tamanho final pós-processamento - `confirmar-upload`).

---

## Resumo executivo

Contagem aproximada por símbolo (RF-001 a RF-120, sem RNFs; numeração do `REQUISITOS_V7.md`, repropagada em 21-09-2026):

- **Banco ✅:** a grande maioria - o schema está muito à frente do Nest. Poucos ❌ reais no banco (RF-027, RF-032).
- **Nest ✅:** concentrado em Usuário, Perfil Pesquisador (incluindo score, sessões e exclusão de conta), Campanha (núcleo + orçamento/cronograma/atualização), Comentários, Administração, Dashboard, Log de Auditoria, Termos, Moderação de conta (suspensão/desbloqueio) - os módulos que já têm código e foram documentados a fundo nesta rodada.
- **Nest ❌ quase uniforme em:** todo o Grupo Contribuições, Recompensa, Denúncia/Moderação-de-denúncia, Solicitação de Encerramento, Repasse, Auditoria Financeira, Notificações, e qualquer página pública (campanha, perfil de pesquisador) - ou seja, **dinheiro de verdade entrando/saindo, denúncia/moderação de conteúdo, comunicação por e-mail e a própria interface pública são as maiores lacunas do projeto hoje**, não modelagem de dado (essa parte já está pronta e testada há semanas).
- **Maior gap de segurança ainda aberto (não é falta de funcionalidade, é falta de proteção):** RNF-007, item "Validação de escrevibilidade financeira" de `PENDENCIAS.md` - escrita em `auditoria_financeira`/`repasse`/`historico_rejeicao` sem trava real de RLS, travada até o gateway de pagamento ser escolhido (ver `PROXIMOS_PASSOS.md`).
- **Achado E corrigido nesta revisão (05-09-2026): RF-060 não era cumprido de verdade.** `encerrar_campanhas_vencidas()` existia e estava correta no banco, mas nada a chamava. Corrigido no mesmo dia com `@nestjs/schedule` (`CampanhaServiceEncerrarVencidas`, `@Cron` a cada 15 min) - ver a entrada do RF-060, acima.

**Itens marcados 🟡 "não conferido a fundo" que ainda merecem uma varredura futura, não tratados como fato aqui:** RF-003, RF-008, RF-010, RF-018, RF-024, RF-034, RF-049, RF-054, RF-058, RF-068/070/071, RF-084/085/086, RF-096, RF-101, RF-102, RF-112/113, RF-115, RF-117, RF-118. (RF-002 conferido e confirmado ✅ nesta rodada; RF-060 conferido e confirmado ❌ - os dois saíram desta lista.) Nenhum dos restantes é necessariamente um problema - só não foram lidos linha a linha ainda, e "módulo existe" não é o mesmo que "cada regra específica confirmada".

**Cuidado geral, fora do escopo desta matriz:** outros documentos do projeto (comentários em `.sql`, `PENDENCIAS e correcoes.md`, `DOCUMENTACAO_*.md`, código Nest/React) podem citar número de RF em qualquer uma das numerações anteriores, e não há como saber qual só pelo número. Esta matriz e o `REQUISITOS_V7.md` são a referência; onde precisar citar uma regra, prefira a descrição ao número, e confira qualquer citação por número contra o texto do requisito no V7 antes de tratá-la como certa.
