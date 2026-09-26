# Achados para discutir: o que ainda falta (lista de 26-09-2026)

Lista montada a partir da resposta da revisão externa de 24-09-2026 (a pasta de contra-prompt de 24-09 dentro de `informacoes/`), conferida item por item contra o código. Os achados antigos (itens 1 a 20, quase todos resolvidos) estão em `informacoes/HISTORICO/HISTORICO_ACHADOS_PARA_DISCUTIR.md`; qualquer citação "`ACHADOS_PARA_DISCUTIR.md`, item N" em documento ou comentário antigo aponta para lá.

## A. Dá para fazer agora, sem decisão de negócio

1. **Tipos gerados do banco (B4).**
   - Situação: o `db.types.ts` continua escrito à mão, com 660 linhas, e os enums de status estão repetidos no React.
   - Revisão externa: rodar o `kysely-codegen` contra o PGlite e gerar um `enums.gerado.ts` para o React. Serve de resposta para a banca ("o código bate com o banco").
   - Sugestão: concordo. Risco baixo, mas os erros de tipo que aparecerem vão mostrar divergências reais. Precisa de OK para instalar `@electric-sql/pglite-socket` como dependência de desenvolvimento.
   - **Decisão do Lucas (26-09-2026): não instalar por enquanto.** O tópico será levado à revisão externa antes de qualquer instalação. Nada foi instalado.
   - **Análise da dependência `@electric-sql/pglite-socket` (26-09-2026):**
     - **O que é.** Adaptador que abre uma porta TCP local (por exemplo 5432) e a liga ao PGlite, o Postgres em WebAssembly usado nos testes. Com isso, qualquer programa que fale com um Postgres de verdade, como o `kysely-codegen`, conecta nele por uma URL comum. O PGlite sozinho só aceita chamadas de dentro do Node. A conexão local que ele abre não é aberta para a internet, e o banco do teste nasce dos arquivos 01 a 08 e some quando o processo termina.
     - **De onde veio.** Pacote oficial do mesmo repositório do PGlite (`electric-sql/pglite`), da ElectricSQL. Licença Apache-2.0, versão 0.2.11 (publicada em 26-08-2026). Exige exatamente o `@electric-sql/pglite@0.5.8`, a versão já usada em `informacoes/testes-banco`. Dados do registro do npm; não foi possível conferir quantas pessoas o usam nem os downloads.
     - **Quem usa e se é comum.** É o jeito documentado pelo projeto para ferramentas que exigem uma conexão Postgres de verdade (ORMs, geradores de tipos, `psql`, `pg_dump`). Fora dos testes é pouco conhecido, porque a maioria dos projetos gera tipos direto do Postgres que já roda. Gerar tipos a partir de um Postgres local é prática comum; usar o PGlite como esse Postgres é o que é menos usual.
     - **Benefícios.** (1) Os tipos passariam a ser gerados do banco montado pelos arquivos 01 a 08, sem tocar no Supabase e sem instalar um Postgres local. (2) Os erros de tipo que aparecerem vão mostrar divergências reais entre o `db.types.ts` escrito à mão (660 linhas) e o banco. (3) Resposta pronta para a banca: "o código bate com o banco". (4) Um `enums.gerado.ts` para o React elimina os enums repetidos à mão.
     - **Problemas possíveis.** (1) O PGlite aceita uma conexão por vez; o `kysely-codegen` pode abrir mais de uma, e aí trava ou dá erro (é preciso testar na prática). (2) Diferenças de catálogo: o PGlite é um Postgres real em WebAssembly, mas o `kysely-codegen` lê as tabelas de sistema, e um detalhe delas que o PGlite não tenha, ou tenha diferente, pode gerar um tipo errado. (3) Versão presa: o pacote exige exatamente a 0.5.8, então atualizar o PGlite exige atualizar os dois juntos. (4) Muitos erros de tipo de uma vez: trocar o arquivo escrito à mão pelo gerado deve produzir uma leva de erros de compilação (tipos `Generated`, `null`, enums); é o ganho, mas dá trabalho, e o caminho seria em etapas (gerar ao lado, comparar, só depois trocar). (5) Manutenção: mais um passo a repetir sempre que o banco mudar (`npm run db:tipos`), que só vale se ficar num script único e documentado. (6) Não é dependência de produção: iria como `devDependency` no `nest/` ou em `informacoes/testes-banco` (ignorada pelo git), e não vai para o servidor. Como a Alexia não vê `informacoes/`, o lugar certo para ela poder repetir o processo é o `nest/`.
     - **Riscos da instalação em si:** baixos. Pacote pequeno, de mantenedores conhecidos, licença permissiva, e pode ser desinstalado sem deixar rastro. Se o problema (1) ou o (2) se mostrarem inviáveis, desistir e remover o pacote.
     - **Recomendação registrada.** Instalar em `nest/` como `devDependency` e fazer a primeira geração ao lado do arquivo atual, sem trocar nada, para ver a diferença antes de decidir.
2. ✅ **FEITO (26-09-2026, banco, Nest e tela de teste): campos bloqueados vindos do banco (D4).** Funções `fn_campanha_campos_bloqueados` e `fn_campanha_erro_congelamento`, trigger de congelamento refatorada com os mesmos códigos e mensagens, `camposBloqueados` em `GET /campanha/:id`; Grupo L do `ATUALIZAR` (colar depois do K); suíte 14. Falta só a tela real de "Minhas campanhas" usar isso (B.1). Descrição original:
   - Situação: não existe. A trigger de congelamento e o `findOne` de campanha calculam cada um por conta própria.
   - Revisão externa: uma função SQL única que os dois usam. Resolve a tensão com Nielsen sem duplicar regra.
   - Sugestão: concordo. Também é pré-requisito para Alterar campanha na tela real.
3. ✅ **FEITO (26-09-2026): `ordem_endosso` para o banco (A6.3).** Trigger `validar_comentario_endosso_autor` calcula sob lock por campanha; Grupo K do `ATUALIZAR` (colar depois do J); suíte 13. Descrição original:
   - Situação: o Nest ainda calcula `MAX + 1` num SELECT separado. Dois cliques rápidos geram ordem repetida.
   - Revisão externa: mover para a trigger com `pg_advisory_xact_lock`, junto do dispatcher.
   - Sugestão: dá para fazer antes e sozinho, é pequeno e testável no PGlite. Também simplifica o D2.
4. ✅ **FEITO (26-09-2026): `GRANT INSERT` por coluna em `usuario` (F3.7).** Só nome, email, senha_hash e id_imagem_perfil; Grupo J do `ATUALIZAR` (colar depois do I); suíte 12. Descrição original:
   - Situação: o grant é da tabela inteira, então o banco aceitaria um INSERT com `email_verificado = true`. Só o DTO impede.
   - Revisão externa: GRANT por coluna, como já foi feito em `campanha`.
   - Sugestão: concordo. Pequeno, mas precisa listar as colunas que o cadastro e o trigger de signup usam.
5. ✅ **FEITO (26-09-2026): fila de aprovação do admin (B1.3 e E5).** Menu MODERAÇÃO > Aprovar Campanhas, tela e modal de revisão, provada ao vivo. Descrição original:
   - Situação: os endpoints, o sinal de score baixo e a coluna "atenção" existem. O item "Aprovar Campanhas" no menu ainda está desabilitado.
   - Revisão externa: é o 2º passo do fluxo principal.
   - Sugestão: dá para fazer sem decisão: ativar o menu e montar a tela.
6. ➡️ **MOVIDO PARA `PENDENCIAS e correcoes.md` (26-09-2026, decisão do Lucas: sem urgência até o deploy).** Bloco SQL "modo produção" (E3). Descrição original:
   - Situação: não existe.
   - Revisão externa: a barreira real das ferramentas do Campo de Testes é o banco (tirar essas permissões do admin), não `NODE_ENV`.
   - Sugestão: deixar o arquivo pronto e testado no PGlite, sem rodar nunca. É para o dia do deploy.
7. ✅ **FEITO (26-09-2026): caso do 92009 no PGlite (pesquisador suspenso).** Suíte 15, 7 casos; o banco já barrava, faltava o teste.
8. ✅ **FEITO (26-09-2026): jobs linha a linha (F4.5).** Grupo M do `ATUALIZAR` (colar depois do L), suíte 16. Descrição original:
   - Situação: só o job de rascunho é assim.
   - Revisão externa: só se aparecer problema.
   - Sugestão: baixa prioridade.
9. ➡️ **MOVIDO PARA `PENDENCIAS e correcoes.md` (26-09-2026, decisão do Lucas: deixar parado).** Remover `aplicar-migrations.script.ts` (A7, passo 8). Descrição original:
   - Situação: ninguém usa.
   - Revisão externa: trocar o `ATUALIZAR` por uma pasta de migrações registradas.
   - Sugestão: discordo, porque a Alexia recria o banco do zero com os arquivos 01 a 08. Recomendo apagar o script. Precisa de OK.
10. **Colar o Grupo I no Supabase (depois do H).** Sem ele, `/usuario-papel` e o dashboard continuam abertos à pesquisadora. Os Grupos F, G e H já foram colados; o E foi confirmado ao vivo pelo Playwright (o 5º envio foi recusado até para o admin).

## B. Precisam de decisão

1. **"Minhas campanhas" do pesquisador, com o wizard extraído do Campo de Testes.**
   - Revisão externa: é o maior risco do TCC. Numa banca pedem "me mostra o pesquisador criando uma campanha", e hoje só existe a bancada de testes.
   - Sugestão: concordo. A decisão é onde mora: área própria ou dentro do painel.
2. **Hook `useErrosFormulario`.** Revisão externa: umas 60 linhas, aplicar primeiro no wizard. Sugestão: só faz sentido junto com o item 1.
3. **Alterar e Excluir campanha na tela real.** Revisão externa: dentro de "Minhas campanhas", com D4, e Excluir só em rascunho. Sugestão: concordo, depende do item 1 e do D4 (A.2).
4. **Página pública da campanha.** Revisão externa: não depende do gateway, com o botão "Contribuir em breve". Sugestão: concordo. A decisão é o escopo.
5. **Score, Parte C.** Adiada. Patch pronto; precisa de tela de admin, dos números (10, 15 e 3 denúncias) e do texto dos Termos de Uso.
6. **Dispatcher de triggers** (`campanha` de 17 para 5, `comentario` de 8 para 2).
   - Revisão externa: só depois de ter os testes no repositório.
   - Sugestão: o ganho é ordem explícita e mensagens previsíveis, não velocidade; risco médio. As suítes 8 e 9 já são a rede de segurança. Fazer depois do item 1, se sobrar tempo.
7. **Log de auditoria só com diff (A5).**
   - Revisão externa: sim, é barato.
   - Sugestão: recomendo não mudar. O UPDATE perde o estado completo, e o espaço não pesa (uns 5 MB por ano).
8. **Comentários dos `.sql`.** Revisão externa: fazer junto do dispatcher. Já houve a primeira passada em `03` e `05`; `02` e `06` seguem com uns 63% de comentário.
9. **Verde do tema escuro (#2fbf71) e borda de campo com 1,48:1.** Decidir olhando o Guia de Estilo, com a Alexia.
10. **Guarda de login em `/admin/*`.** Pendência: hoje o painel abre sem login depois de sair. Vale fazer (o refresh token salvo e o botão `<dev> Entrar como Admin` deixam o custo baixo), fica para depois.
11. **Moderados do axe** (sem h1, ordem dos títulos do rodapé). Mexe na tipografia fixa.
12. **Botão "Criar" de parâmetro global.** Decidido em 26-09-2026: saiu da tela.

## C. Dependem de módulo (não antecipar)

- **18-recompensa:** congelamento de `recompensa` e `FOR UPDATE` no estoque.
- **19-denúncia:** gravidade por motivo, fundir as triggers, contestação do score, endpoint de encerrar por moderação.
- **22-contribuição:** `UNIQUE` em `id_transacao_api`, máquina de estados de `status_contribuicao`, e a regra de `SECURITY DEFINER` com checagem interna (F3.2).
- **23-repasse:** checagem em `atualizar_status_repasse()`.
- **26-notificacao:** `contar_metricas_dashboard()` também precisa ganhar a contagem de notificações; o módulo sozinho não resolve `notificacoesPendentes: null`.
- **4-mail:** e-mail de rejeição com reenvios, e "avise-me quando começar".
- **Deploy:** CORS com lista (`app.enableCors()` hoje aceita qualquer origem), refresh token em cookie (as duas juntas), Termos de Uso com texto real.
- **Por último:** gateway (sandbox também perfeito), 2FA, CPF real.

## D. Ideias opcionais da revisão externa (F1)

- Selo "Resultado publicado", a partir da fase `resultado_final`.
- "Revisada pela curadoria em (data)", a partir de `aprovado_em`.
- Rota `GET /c/:id` com as tags `og:` para o WhatsApp e o LinkedIn mostrarem o card.
- Todas dependem da página pública (B.4).
- Matchfunding, login por função `SECURITY DEFINER` com `pol_usuario_select` fechada, recálculo de score por instrução e throttle distribuído ficam para depois do TCC.

## E. A revisão externa recomenda não fazer

Mover regra de trigger para o Nest, recálculo de score sob demanda, trocar o log por pgAudit ou `supa_audit`, endpoint de enums, auditar Nielsen no Campo de Testes, dispatcher nas tabelas pequenas, `NODE_ENV` como barreira de segurança. Concordamos com tudo.

## F. Registrados de antes, ainda válidos

- **Não remover o `overrides` do `multer` em `nest/package.json`.** Hoje é cosmético (nenhuma rota usa upload multipart pelo Nest). No dia em que qualquer rota usar `FileInterceptor`, vira correção de segurança real. O `package.json` não aceita comentário, por isso o aviso mora aqui.
- **`GET /campanha` (listagem) traz as mesmas colunas pesadas do detalhe** (`CAMPANHA_COLUNAS_SELECT`, inclui `descricao` de até 20 mil caracteres). Inofensivo hoje; rever o contrato quando a página pública existir.
- **Constantes duplicadas entre `nest/` e `react/`:** conferido em 26-09-2026. A duplicação dentro de cada lado foi eliminada; sobram, de propósito, a lista de tipos de imagem e o perfil de redução do avatar (512 px, qualidade 80), sem código compartilhado entre os repositórios (cada lado comenta o outro). Sem mais nada a fazer.

## Sugestão de ordem

Se o foco é otimizar: A.4, A.3, A.2, A.1 e A.7 (o A.1 com OK para a dependência), todos sem decisão de negócio, com teste no PGlite e prova ao vivo. Em seguida, a fila de aprovação (A.5). O dispatcher fica para depois de "Minhas campanhas".
