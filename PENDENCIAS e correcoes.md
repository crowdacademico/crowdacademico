🔴 CRÍTICO — corrigido no .sql

1. A role app_nestjs passou a ser criada antes do primeiro uso

Problema original:
O arquivo 04_rls_policies.sql contém várias policies do tipo CREATE POLICY ... TO app_nestjs. Essas policies dependem da existência do role app_nestjs no momento em que o PostgreSQL executa o script. No estado anterior do projeto, a criação da role estava concentrada dentro de 06_grants.sql, que roda muito depois do 04. Como a sequência de execução é 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08, quando o banco chegava no arquivo 04, o role ainda não existia. O resultado era o erro clássico: role "app_nestjs" does not exist.

O que foi corrigido:
- O bloco de criação da role app_nestjs, que antes ficava dentro de 06_grants.sql, foi movido para o topo do arquivo 01_extensoes_enums_tabelas.sql.
- Com isso, a role passa a existir bem antes do arquivo 04 rodar, garantindo que as policies possam referenciá-la corretamente.
- A ordem dos arquivos foi mantida exatamente igual: 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08. Não houve renumeração nem criação de um novo arquivo.

Por que essa mudança foi necessária:
- Porque o PostgreSQL valida a existência da role no momento da execução do comando CREATE POLICY.
- Se a role ainda não foi criada, a instrução falha imediatamente, mesmo que a role apareça em outro arquivo mais tarde na sequência.
- O problema não era a policy em si, e sim a ordem de bootstrap do banco.

Como foi feito:
- O bloco DO $$ ... CREATE ROLE app_nestjs ... $$ foi deslocado para o início do arquivo 01, antes de qualquer extensão, enum ou tabela.
- No arquivo 06_grants.sql, esse bloco foi removido do corpo principal e substituído por um comentário curto, indicando que a criação da role foi movida para o arquivo 01 e que este arquivo agora tem responsabilidade apenas de conceder permissões.
- Não foram alterados os GRANTs nem o restante da lógica de permissões.

Impacto esperado:
- O fluxo de execução do banco passa a funcionar do zero sem depender de uma criação manual da role antes do arquivo 04.
- O bootstrap do projeto fica mais previsível e menos vulnerável ao erro de ordem de execução.
- O tutorial também passou a refletir esse cenário de forma mais correta, porque a execução do banco não depende mais de um workaround manual.

Observação complementar:
- Esta correção não muda o modelo de segurança nem a estrutura do banco; ela apenas corrige a ordem em que a role é criada para que o fluxo SQL execute de forma consistente.
- A senha placeholder da role continua sendo um ponto de atenção para ambiente real, mas isso é uma questão separada da ordem de execução.



#### Pendências reais do sistema (só o que falta)

No .sql:

1. 5 permissões sem policy de RLS: campanha_encerrar, perfil_pesquisador_visualizar_sensivel, sessao_revogar, recuperacao_senha_revogar, verificacao_email_reenviar.
2. Senha placeholder 'TROCAR_NO_AMBIENTE_REAL' em 06_grants.sql (só risco fora do ambiente local).
3. tipo_link com só 5 de 7 tipos seedados (faltam "Site Institucional" e "Outro").
4. Debate tipo_link/contexto_link (2 tabelas novas) — adiado, não mexer sem pedir.

5. Reorganização de comentários (em andamento, você mesmo vai conduzir):
6. ## Criado o DOCUMENTACAO_BD.md

7. Mover comentários grandes dos 8 .sql pro DOCUMENTACAO_BD.md, usando o prompt revisado que te dei.

Só resolve em código Nest/React (ainda não existem):
8. SET LOCAL app.id_usuario_atual por requisição.
9. Fluxo de autenticação completo (signup, login, verificação de e-mail, recuperação de senha, refresh token).
10. Guards/interceptors no NestJS espelhando tem_permissao().
11. Garantir que a conexão do backend use sempre app_nestjs, nunca superusuário.

Decisões suas, não bugs:
12. React em JavaScript ou TypeScript.
13. Pool direto no Service (só nota de melhoria futura, não urgente).


## Sobre a 1. 
 
Sobre o 1: 5 permissões sem policy de RLS: campanha_encerrar, perfil_pesquisador_visualizar_sensivel, sessao_revogar, recuperacao_senha_revogar, verificacao_email_reenviar.

 - Eu perguntei pro CLAUDE: Vc acha que pode mandar a IA do VSCode consertar agora? ia quebrar alguma coisa? é simples?

Não é tão simples quanto parece — não é "esqueceu de escrever a policy", é que ninguém decidiu ainda o que cada permissão deveria liberar. Mandar a IA "consertar" sem isso é arriscado: ela vai ter que adivinhar a regra, e pode acertar errado.

Separando as 5:

sessao_revogar, recuperacao_senha_revogar, verificacao_email_reenviar — essas 3 tabelas já têm policy FOR ALL USING (true) de propósito (o próprio projeto decidiu que a autorização desses fluxos fica no NestJS, não na RLS, porque acontecem antes do login existir). Criar uma policy pra essas permissões seria redundante, não quebra nada, mas também não muda nada — a USING(true) já libera geral. Não vale a pena mexer.
perfil_pesquisador_visualizar_sensivel — já está parcialmente resolvida: o cpf_criptografado já foi excluído do GRANT SELECT geral. Criar uma policy de RLS pra isso não encaixa bem (é proteção de coluna, não de linha) — mexer aqui de novo é mais risco que benefício agora.
campanha_encerrar — essa sim é a única em aberto de verdade, mas exige uma decisão sua antes: ela é redundante com solicitacao_encerramento_decidir (que já existe e já funciona), ou deveria liberar um encerramento direto, sem passar pela solicitação? Sem essa resposta, a IA vai ter que chutar.

Minha recomendação: não mande "consertar" agora. As 3 primeiras eu deixaria como estão (funcionam por design). A perfil_pesquisador_visualizar_sensivel eu consideraria resolvida. Só a campanha_encerrar precisa de uma resposta sua — aí sim vira uma tarefa de 1 linha pra IA.