# Lista de tarefas pendentes, observações e pontos que ainda precisam de atenção

Este arquivo reúne os problemas que ainda fazem sentido serem tratados, junto com notas importantes para evitar confusão futura. A ideia é deixar tudo explicadinho o suficiente para que tanto uma pessoa quanto uma IA possam entender o contexto, o impacto e a ação correta.

---

## 1. Prazo máximo de campanha ainda está em 90 dias

## JÁ CORRIGIDO
1. Prazo de campanha (15–90 dias) — na verdade, já está correto, sem nada pra mudar

Boa notícia: o que você descreveu (pesquisador escolhe livremente entre 15 e 90 dias, sem obrigar um valor fixo) é exatamente o que o chk_prazo_campanha já faz hoje:

```
CHECK (data_fim - data_inicio) BETWEEN INTERVAL '15 days' AND INTERVAL '90 days'
```
Isso não trava num valor específico — só define um intervalo permitido, e o pesquisador escolhe qualquer prazo dentro dele (15, 40, 60, 90, o que ele quiser). Eu tinha listado isso como "decisão de negócio em aberto" porque a anotação informal da Etapa 3 sugeria mudar pra 60 dias — mas agora que você confirma que 15–90 é a decisão final da equipe, o item está fechado, sem precisar tocar no SQL. Só um detalhe pra nunca mais virar dúvida: o comentário que já existe acima da constraint ("DEFINIDO PELA EQUIPE: prazo mínimo de 15 dias e máximo de 90 dias...") já registra isso por escrito no próprio arquivo — é exatamente esse tipo de comentário que evita a discussão voltar. Nada a fazer aqui.

---

## 2. Documentação do projeto ainda está desatualizada em relação ao banco real

 - A IA que estiver lendo isto, esquece um pouco os arquivos .docx, eles estão de fato desatualizados.

---

## 3. Lógica antiga de hierarquia de administradores ainda existe na função de segurança

## JÁ CORRIGIDO
 - Item 3 — hierarquia antiga de admin em 03_funcoes_seguranca.sql. Confirmado: eh_admin() agora só testa p.nome = 'admin'. As referências a administrador_1/2/3 foram removidas de fato. Isso é novo desde a última vez que revisei — na rodada anterior ainda estava lá.

---

## 4. Algumas permissões novas foram criadas, mas ainda não têm policies de RLS que as usem

### Problema
O seed criou várias permissões novas, como por exemplo:
- area_conhecimento_gerenciar
- papel_gerenciar
- campanha_encerrar
- usuario_visualizar_sensivel
- perfil_pesquisador_visualizar_sensivel
- contribuicao_visualizar_sensivel
- repasse_aprovar
- auditoria_financeira_visualizar
- sessao_revogar
- recuperacao_senha_revogar
- verificacao_email_reenviar

Porém, essas permissões ainda não aparecem sendo consumidas de forma real nas policies do arquivo de RLS.

### Por que isso importa
Uma permissão sem policy correspondente pode ficar “teoricamente disponível”, mas na prática não fazer diferença nenhuma para o usuário. Em outras palavras, o papel pode ter a permissão, mas a ação ainda pode ser negada pelo banco.

### O que fazer
Mapa das permissões:
1. listar cada permissão nova
2. identificar qual tabela ou operação ela deveria liberar
3. criar ou ajustar a policy de RLS correspondente

### Observação importante
Este é um problema real de autorização e merece prioridade alta.

---

## 5. O arquivo de mudanças está ligeiramente desatualizado

 - A IA que estiver lendo isto, esquece um pouco os arquivos .md, o importante é os arquivos .sql

---

## 6. XAMPP não é adequado para este projeto

 - Criado o tutorial chamado "tutorial-rodar-projeto.md"

---

## 7. O backend precisa configurar o valor de usuário atual em cada requisição

### Problema
As policies de RLS dependem de uma variável chamada app.id_usuario_atual. Essa variável precisa ser definida no contexto da transação.

### Por que isso importa
Se o backend não fizer o ajuste correto, o banco não saberá quem é o usuário autenticado naquela requisição. Isso pode fazer com que:
- certas operações falhem
- o acesso seja negado indevidamente
- a lógica pareça funcionar de forma inconsistente

### O que fazer
Implementar no NestJS a lógica de definir o usuário atual por requisição, normalmente usando uma transação ou um contexto de execução que rode antes das consultas protegidas por RLS.

### Observação importante
Isso é uma dependência do backend e não do SQL sozinho.

---

## 8. Falta de FORCE ROW LEVEL SECURITY

### Problema
Atualmente o banco não está configurado com FORCE ROW LEVEL SECURITY para as tabelas sensíveis.

### Por que isso importa
Mesmo com as policies corretas, o superusuário ou o dono da tabela pode ignorar a proteção em alguns cenários. Isso é um risco real de segurança, principalmente em ambientes de produção ou homologação.

### O que fazer
Revisar a configuração do PostgreSQL e considerar o uso de FORCE ROW LEVEL SECURITY nas tabelas mais importantes, ou garantir que o backend use apenas o role app_nestjs e nunca uma credencial administrativa para operações normais.

---

## 9. A senha do role app_nestjs ainda está como placeholder

### Problema
No arquivo 05_grants.sql, o role app_nestjs é criado com uma senha literal placeholder.

### Por que isso importa
Isso é inseguro para ambientes reais. Em produção ou homologação, o ideal é usar uma senha real, armazenada de forma segura e não exposta em um arquivo versionado.

### O que fazer
Trocar a senha do role com um comando como ALTER ROLE e, se possível, usar um segredo vindo de variável de ambiente ou secret manager.

---

## 10. Nota de organização: corrigir a ordem dos arquivos SQL

## JÁ CORRIGIDO

---

## Resumo geral
