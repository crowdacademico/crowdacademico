# Achados para discutir: o que ainda falta (lista de 26-09-2026)

Lista montada a partir da resposta da revisão externa de 24-09-2026 (a pasta de contra-prompt de 24-09 dentro de `informacoes/`), conferida item por item contra o código. Os achados antigos (itens 1 a 20, quase todos resolvidos) estão em `informacoes/HISTORICO/HISTORICO_ACHADOS_PARA_DISCUTIR.md`; qualquer citação "`ACHADOS_PARA_DISCUTIR.md`, item N" em documento ou comentário antigo aponta para lá.

## A. Dá para fazer agora, sem decisão de negócio

1. ✅ **FEITO em parte (28-09-2026): tipos gerados do banco (B4).** O `pglite-socket` foi instalado só na pasta de testes do banco, e o `db.types.generated.ts` é gerado a partir dos arquivos 01 a 08. O manual continua em uso, e uma suíte de teste compara os dois (ver `DOCUMENTACAO_BACKEND.md`, seção 2.6). A parte do React foi feita em 29-09-2026: `react/src/services/constant/type/enums-do-banco.gerado.ts`, gerado por `npm run gerar:enums` (ver `DOCUMENTACAO_FRONTEND.md`, seção 3). Texto original:
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
10. ✅ **FEITO (conferido no Supabase em 28-09-2026, só leitura: pol_usuariopapel_select já é a restrita): colar o Grupo I no Supabase (depois do H).** Sem ele, `/usuario-papel` e o dashboard continuam abertos à pesquisadora. Os Grupos F, G e H já foram colados; o E foi confirmado ao vivo pelo Playwright (o 5º envio foi recusado até para o admin).

## B. Precisam de decisão

1. ✅ **FEITO (26-09-2026); 03-10-2026: virou o T3 do Campo de Testes, porque o pesquisador não usa a área restrita (ele terá a área dele na parte pública).** Texto original: **"Minhas campanhas" do pesquisador, com o wizard extraído do Campo de Testes.**
   - Revisão externa: é o maior risco do TCC. Numa banca pedem "me mostra o pesquisador criando uma campanha", e hoje só existe a bancada de testes.
   - Decidido em 26-09-2026: dentro do painel, item novo do menu, só para pesquisador. FEITO em 26-09-2026 (Minhas Campanhas).
2. ✅ **FEITO (29-09-2026): hook `useErrosFormulario`**, aplicado em criar campanha, cadastro, suspensão e alterar senha (ver `DOCUMENTACAO_FRONTEND.md`). Texto original: Revisão externa: umas 60 linhas, aplicar primeiro no wizard. Sugestão: só faz sentido junto com o item 1.
3. ✅ **FEITO (26-09-2026, Minhas Campanhas, hoje T3 do Campo de Testes; decidido no V8: o admin modera, o pesquisador altera e exclui as próprias).** Texto original: **Alterar e Excluir campanha na tela real.** Revisão externa: dentro de "Minhas campanhas", com D4, e Excluir só em rascunho. Sugestão: concordo, depende do item 1 e do D4 (A.2).
4. **Página pública da campanha.** Revisão externa: não depende do gateway, com o botão "Contribuir em breve". Sugestão: concordo. A decisão é o escopo.
5. **Score, Parte C.** Adiada. Patch pronto; precisa de tela de admin, dos números (10, 15 e 3 denúncias) e do texto dos Termos de Uso.
6. **Dispatcher de triggers** (`campanha` de 17 para 5, `comentario` de 8 para 2).
   - Revisão externa: só depois de ter os testes no repositório.
   - Sugestão: o ganho é ordem explícita e mensagens previsíveis, não velocidade; risco médio. As suítes 8 e 9 já são a rede de segurança. Fazer depois do item 1, se sobrar tempo.
7. **Log de auditoria só com diff (A5).**
   - Revisão externa: sim, é barato.
   - Sugestão: recomendo não mudar. O UPDATE perde o estado completo, e o espaço não pesa (uns 5 MB por ano).
8. ✅ **FEITO (29-09-2026): comentários dos `.sql` `02` e `06`** (ver o histórico de pendências). Texto original: **Comentários dos `.sql`.** Revisão externa: fazer junto do dispatcher. Já houve a primeira passada em `03` e `05`; `02` e `06` seguem com uns 63% de comentário.
9. ✅ **FEITO (02-10-2026):** o verde `#2fbf71` ficou (passa de 4,5:1 nos três fundos escuros) e a borda de campo passou para 3,26:1 (`--cor-borda-campo`). Texto original: **Verde do tema escuro (#2fbf71) e borda de campo com 1,48:1.** Decidir olhando o Guia de Estilo, com a Alexia.
10. **Guarda de login em `/admin/*`.** Feita em 26-09-2026: uma guarda só no `AdminLayout` (confere sessão, não papel). A permissão por rota fica para perto do fim do sistema.
11. **Moderados do axe** (sem h1, ordem dos títulos do rodapé). Resolvido em 26-09-2026 sem mudar o visual: axe zerado nas 22 telas.
12. **Botão "Criar" de parâmetro global.** Decidido em 26-09-2026: saiu da tela.
13. **Horário dos jobs agendados (28-09-2026).**
   - Situação: o que cada job faz já é configurável pelo painel (ex.: `arquivo_horas_para_vincular`, `log_auditoria_retencao_dias`). Já o horário em que cada um roda está fixo no código do Nest. Job agendado é uma tarefa que o Nest roda sozinho, como um despertador. São 6: arquivos sem dono às 4h, limpeza do log às 3h, campanhas vencidas e fim de suspensão a cada 15 min, rascunho e rejeitada de hora em hora.
   - Para mudar pelo painel: o Nest lê o horário quando liga, então seria preciso "reprogramar o despertador" com o sistema ligado, nos 6 jobs, e guardar os horários em `configuracoes`.
   - Sugestão: deixar fixo. O horário é de infraestrutura (em que momento a faxina roda), não regra de negócio; mudar na prática é raro, e o custo não é pequeno. Rever se a banca ou o uso real pedirem.
14. **Nomes no Nest, próximas etapas (28-09-2026).** Os nomes de arquivo já seguem `entidade.camada.ação` em inglês (98 renomeados). Ficaram para depois, uma coisa de cada vez:
   - ✅ **FEITO (28-09-2026): classes e `11-configuracoes`.** A classe segue o nome do arquivo (104 renomeadas); o resto do código segue em português (regra em `DOCUMENTACAO_BACKEND.md` 7.1). `11-configuracoes` passou para o plural da tabela (14 arquivos).
   - **`3-auth/dto/response/sessao.response.ts`:** segue a regra (a tabela é `sessao`), mas fica deslocado dentro do módulo de auth. Pensar num lugar melhor.
   - ✅ **FEITO (28-09-2026), os 4 candidatos e o extra: 15 arquivos a menos (18 saíram, 3 entraram em `commons`), ver `DOCUMENTACAO_BACKEND.md` 7.1.** Texto da varredura: 4 candidatos. (1) `usuario.request-suspend` = `perfil-pesquisador.request-suspend` e (2) `usuario.response-suspend` = `perfil-pesquisador.response-suspend`, idênticos, podem virar um DTO de suspensão em `commons`. (3) `atualizacao-campanha.request-list` = `comentario.request-list` (paginação + `idCampanha`), podem virar um "listar por campanha" em `commons`. (4) `auth.response-refresh` tem os mesmos campos de `auth.response-login` e pode estender dela. Opcional e maior: os 11 `entity/*.entity.ts` são uma linha cada (`Selectable<Tabela>`) e poderiam morar no `db.types.ts`. Os 5 grupos de `.module.ts` iguais na forma não são candidatos.
15. ✅ **FEITO (28-09-2026): auditoria de nomes do React.** Aplicada a sugestão abaixo: 20 tipos renomeados, `configuracoes` no plural, sufixos `.constants`/`.util`, `util` no singular, `services/28-dashboard`, `/link-academico` em `services`. Regra em `DOCUMENTACAO_FRONTEND.md`, seção 3. Texto da auditoria: O React segue um padrão próprio e quase sempre consistente: `services/<N-modulo>/<api|type|constants|hook|util>/<assunto>.<papel>.ts`, e em `views`/`components` o arquivo tem o nome do componente (101 de 115 batem; os 14 restantes são arquivos que exportam o par Consultar/Alterar ou funções de coluna, de propósito). Fora do padrão:
   - **20 tipos com nome antigo do Nest** (ex.: `ConfiguracaoResponse`, `TermoUsoRequestCriar`, `ArquivoRequestIniciarUpload`); 3 são só do React (`AuthResponseVerificarEmail`, `SessaoResponseEncerrarTodas`, `HealthResponse`).
   - **`11-configuracoes` no singular** (`configuracoes.api.ts`, `configuracoes.type.ts`), igual ao Nest antes.
   - **Constantes sem o final `.constants`**: `configuracoes-grupos.constants.ts`, `configuracoes-pares-min-max.constants.ts`, `papel-ordem-poder.constants.ts`, `permissao-nomes-amigaveis.constants.ts`, `termo-uso-tipos.constants.ts`. Utilitários sem `.util`: `gerar-cpf-valido.util.ts`, `registros-bloqueados.util.ts`. Pasta `services/constant/util` no plural, as outras `util`.
   - **`services/admin`** corresponde ao `28-dashboard` do Nest.
   - **Telas chamando a API sem passar por `services`**: `modal-usuario.tsx` chama `/link-academico` direto (a pasta `services/7-link-academico` está vazia); o Campo de Testes chama comentário, atualização e seguir direto (de propósito, pelo registro de chamadas).
   - **Sufixo `-page` só no `3-auth`** (`login-page.tsx`...); as outras telas não têm. **Hooks em três lugares** (`services/*/hook`, `components/crud/use-alteracao-nao-salva.ts`, `components/layout/toast`). **Pastas vazias com `.gitkeep`** para módulos que ainda não existem.
   - Sugestão: renomear os 20 tipos, `configuracoes`, os sufixos de constantes/utilitários e `utils`→`util` (mecânico, o compilador confere); levar a chamada de `/link-academico` para `services`. Deixar os nomes das telas em português (é o nome do componente que a pessoa vê) e o resto como está.

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

## G. Pesquisa de mercado em plataformas de crowdfunding (01-10-2026)

Em palavras simples: olhamos como Kickstarter, Catarse e Experiment.com (o mais parecido com o CrowdAcadêmico, só ciência) organizam o painel de quem cria campanha. Quatro coisas que eles têm e nós não chamaram atenção (itens 1 a 4); o item 5 saiu da revisão do painel feita no mesmo dia, e os itens 6 a 8 de uma segunda olhada, em 02-10-2026. Só o item 5 foi feito: os outros são para pensar a melhor solução antes.

1. **Gráfico da arrecadação ao longo do tempo na campanha.**
   - Como é lá: no Kickstarter, o painel do criador tem um gráfico da arrecadação dia a dia, com uma linha verde marcando a meta; passando o mouse num dia, aparece o total daquele dia.
   - Como é aqui: o V8 já pede gráficos na página pública (RF-046: orçamento por categoria e cronograma como linha do tempo), mas não a arrecadação ao longo do tempo. Hoje mostramos só a barra de progresso.
   - Para pensar: depende do módulo de contribuição (é ele que tem as datas de cada apoio). Daria para mostrar ao pesquisador (Minhas Campanhas) e ao admin (Consultar Campanha). Fica fora do V8: seria requisito novo.
   - Fontes: [Kickstarter, Project Dashboard](https://www.kickstarter.com/blog/project-dashboard); [Kickstarter, The New Creator Dashboard](https://www.kickstarter.com/blog/the-new-creator-dashboard).

2. **Seção "Resultados" ao final da campanha.**
   - Como é lá: no Experiment.com, cada projeto tem seções próprias de Métodos e de Resultados, além das "Lab Notes" (um caderno de laboratório público). Eles fazem questão de dizer que "resultado negativo também é resultado".
   - Como é aqui: o V8 já tem metade disso. Cada atualização de progresso registra a fase (andamento, resultado preliminar ou resultado final, RF-052). Falta só dar destaque: uma seção "Resultados" na página da campanha que mostra a atualização de resultado final em primeiro lugar, em vez de ela ficar misturada na lista.
   - Para pensar: é a ideia que mais combina com um site de ciência e quase não muda requisito (é exibição do que o RF-052 já guarda).
   - Fontes: [Experiment.com, Researcher Guide: Share](https://experiment.com/guide/share); [Experiment.com](https://experiment.com/).

3. **Exportar apoiadores em CSV para o pesquisador.**
   - Como é lá: no Kickstarter, o "backer report" lista os apoiadores com filtros e busca e baixa em CSV. No Catarse, o realizador baixa o histórico de apoios e os dados dos apoiadores em Excel ou CSV.
   - Como é aqui: o V8 só tem a exportação dos PRÓPRIOS dados (LGPD, RF-017). Não existe exportação de apoiadores para o pesquisador.
   - Para pensar: depende do módulo de contribuição. Cuidado de LGPD: decidir quais dados do apoiador o pesquisador pode ver (o Catarse entrega nome, CPF, e-mail e endereço porque entrega recompensa física; aqui talvez só nome, valor e data, e nada do anônimo).
   - Fontes: [Kickstarter, How can I use my project's backer report?](https://help.kickstarter.com/hc/en-us/articles/48619766244251-How-can-I-use-my-project-s-backer-report); [Catarse, Quais informações o realizador recebe dos seus apoiadores?](https://suporte.catarse.me/hc/pt-br/articles/203074427-Quais-informa%C3%A7%C3%B5es-o-a-realizador-a-recebe-dos-seus-apoiadores); [Blog Catarse, funcionalidades do Novo Catarse em 2026](https://blog.catarse.com.br/post/confira-algumas-das-funcionalidades-que-chegam-no-novo-catarse-em-2026).

4. **Atualização só para apoiadores, e não pública.**
   - Como é lá: no Catarse, a novidade tem três destinos: pública (vai por e-mail e aparece na página), só para apoiadores (só e-mail), ou só para apoiadores de uma recompensa.
   - Como é aqui: conferido no V8, não está previsto. O RF-051 diz que as atualizações ficam visíveis na página pública, em ordem cronológica; não há atualização privada.
   - Para pensar: seria mudança de requisito (RF-051), e depende do módulo de e-mail. Para ciência pode fazer sentido (um resultado preliminar que o pesquisador ainda não quer tornar público), mas abre a pergunta de quem é "apoiador" (o anônimo não tem conta).
   - Fonte: [Catarse, Como enviar novidades para seus apoiadores?](https://suporte.catarse.me/hc/pt-br/articles/360024077731-Como-enviar-novidades-para-seus-apoiadores).

5. ~~**Aprovar Campanhas: mostrar há quanto tempo cada campanha espera.**~~ **Feito (02-10-2026).** A campanha ganhou a data de entrada na fila (`enviado_aprovacao_em`, carimbada pelo banco a cada envio ou reenvio), e a fila mostra "esperando há X dias", com a mais antiga no topo. Ver `DOCUMENTACAO_BD.md`, "Esperando há X dias na fila de aprovação". Boa prática de fila de moderação: [Stream, moderation queue](https://getstream.io/resources/projects/moderation-course/admin/queue/).

6. **Motivos prontos para a rejeição.**
   - Como é lá: as lojas de aplicativo (App Store e Google Play) recusam citando a regra exata que o envio descumpriu, com um texto padrão da própria regra, e o revisor só acrescenta o detalhe do caso.
   - Como é aqui: o admin escreve o motivo inteiro à mão, toda vez (o campo é obrigatório e livre).
   - Para pensar: uma lista curta de motivos comuns (orçamento que não fecha, cronograma vago, área errada, descrição sem método) que preenche o começo do texto, e o admin completa. Os motivos seriam dados editáveis, nunca escritos no código. Não muda requisito: é ajuda para escrever o mesmo campo.

7. **Previsão de repasse para o pesquisador.**
   - Como é lá: o Kickstarter avisa o criador de que o dinheiro é cobrado no fim da campanha e repassado cerca de 14 dias depois; o Catarse mostra o prazo do repasse no painel do realizador.
   - Como é aqui: o repasse existe no banco, mas o pesquisador não vê quando o dinheiro deve chegar.
   - Para pensar: depende do módulo de pagamento (o prazo vem do gateway escolhido). Quando existir, mostrar a data prevista em Minhas Campanhas evita a pergunta "cadê o dinheiro?".

8. **Atividade recente no Dashboard.**
   - Como é lá: painéis administrativos de referência (Stripe, por exemplo) abrem com uma lista dos últimos acontecimentos do sistema: quem fez o quê, e quando.
   - Como é aqui: o `log_auditoria` já guarda as mudanças importantes (status de campanha, papéis, configurações), mas só aparece dentro de cada tela, no "Ver log".
   - Para pensar: um bloco "Atividade recente" no Dashboard com as últimas linhas do log, em texto simples ("Campanha 12 aprovada por Admin Sistema, há 2 horas"). Não precisa de tabela nova. Fica fora do V8 como tela, mas não como dado.

## Sugestão de ordem

Se o foco é otimizar: A.4, A.3, A.2, A.1 e A.7 (o A.1 com OK para a dependência), todos sem decisão de negócio, com teste no PGlite e prova ao vivo. Em seguida, a fila de aprovação (A.5). O dispatcher fica para depois de "Minhas campanhas".
