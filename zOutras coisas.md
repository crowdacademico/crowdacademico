# Lista de tarefas pendentes, observações e pontos que ainda precisam de atenção

Este arquivo reúne os problemas que ainda fazem sentido serem tratados, junto com notas importantes para evitar confusão futura. A ideia é deixar tudo explicadinho o suficiente para que tanto uma pessoa quanto uma IA possam entender o contexto, o impacto e a ação correta.

---

## 1. Prazo máximo de campanha ainda está em 90 dias

### Problema
O banco ainda permite campanhas com duração máxima de 90 dias. O SQL atual continua com essa regra no arquivo de estrutura e também na seed de configuração.

### Por que isso importa
Isso não é apenas um detalhe estético. Se a equipe decidiu que o prazo deveria ser menor, por exemplo 60 dias, então o banco está aplicando uma regra antiga que pode conflitar com o que foi definido no projeto ou no TCC.

### O que fazer
Revisar com a equipe se o prazo deve permanecer em 90 dias ou passar para 60. Depois disso, ajustar:
- a constraint de validação em 01_extensoes_enums_tabelas.sql
- a configuração inicial em 07_seed_dados.sql

### Observação importante
Isso é uma decisão de negócio e não um bug de implementação simples. Ou seja, antes de alterar, é preciso confirmar a regra correta.

---

## 2. Documentação do projeto ainda está desatualizada em relação ao banco real

### Problema
A documentação e o texto do TCC ainda parecem estar alinhados com um cenário antigo, principalmente quando falam em MySQL ou em uma stack que não corresponde ao que foi implementado.

### Por que isso importa
O projeto real usa PostgreSQL, com recursos como:
- extensões
- enums
- funções plpgsql
- RLS (Row Level Security)

Esses recursos não existem da mesma forma em MySQL. Se a documentação continuar dizendo outra coisa, a banca, a equipe e até novas IAs podem interpretar o projeto de forma errada.

### O que fazer
Revisar os documentos principais e alinhar tudo com o estado real do banco, especialmente os textos que descrevem a tecnologia, a execução do projeto e o fluxo de instalação.

### Observação importante
Esse ponto não é um erro de banco em si, mas sim uma inconsistência documental que pode causar confusão grande.

---

## 3. Lógica antiga de hierarquia de administradores ainda existe na função de segurança

### Problema
No arquivo 03_funcoes_seguranca.sql, a função de verificação de admin ainda referencia papéis antigos como administrador_1, administrador_2 e administrador_3.

### Por que isso importa
Esses papéis não aparecem mais no seed atual. Então a função está carregando uma lógica antiga que provavelmente não é mais usada, mas ainda existe no código.

### O que fazer
Revisar se essa parte ainda faz sentido. Se não fizer, ela deve ser removida ou ajustada para refletir o modelo atual de papéis.

### Observação importante
Isso não quebra o sistema de forma crítica, mas deixa o código desatualizado e pode confundir futuras alterações.

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

### Problema
O conteúdo de modificacoes.md não está 100% alinhado com o código atual. Em especial, há uma parte que fala em renomear permissões antigas antes do insert, mas o arquivo atual não segue exatamente esse fluxo.

### Por que isso importa
Esse arquivo é usado como referência de entendimento do que foi implementado. Se ele estiver desatualizado, qualquer pessoa ou IA que o leia pode chegar a conclusões erradas sobre o que realmente está no banco.

### O que fazer
Atualizar o arquivo para refletir exatamente o que está no SQL atual, sem deixar dúvidas sobre o que foi implementado e o que ainda é apenas uma decisão futura.

---

## 6. XAMPP não é adequado para este projeto

### Problema
O uso de XAMPP é incompatível com este projeto porque ele normalmente traz MySQL ou MariaDB, enquanto o sistema foi construído para PostgreSQL.

### Por que isso importa
Este projeto depende de recursos específicos do PostgreSQL, como:
- CREATE EXTENSION
- enums
- RLS
- funções plpgsql

Esses recursos não funcionam corretamente em um ambiente MySQL/MariaDB.

### O que fazer
Manter o ambiente de execução com PostgreSQL real e evitar qualquer recomendação de XAMPP para rodar este sistema.

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

### Problema
A ordem de execução dos arquivos SQL precisa ser consistente, clara e documentada. Isso é importante porque alguns scripts dependem de objetos que só existem depois de outros arquivos serem executados.

### Por que isso importa
Se a ordem estiver confusa, o banco pode falhar na execução ou parecer que algo está quebrado quando na verdade é só a sequência de execução que está errada.

### O que fazer
Revisar a numeração e a ordem dos scripts, garantindo que a sequência correta fique explícita em todos os documentos e instruções de uso.

---

## Resumo geral

Os pontos acima podem ser agrupados em três categorias:

1. Questões de negócio e decisão de regra
   - prazo de campanha
   - alinhamento da documentação com o projeto real

2. Questões de segurança e autorização
   - permissões sem policy
   - backend sem contexto de usuário
   - ausência de FORCE RLS
   - senha placeholder

3. Questões de manutenção e organização
   - documentação desatualizada
   - lógica antiga de papéis
   - ordem dos arquivos SQL

Se esta lista for seguida em ordem, o projeto ficará mais consistente, mais seguro e mais fácil de manter no futuro.