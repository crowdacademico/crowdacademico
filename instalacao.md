# Divisão de prioridades
# Núcleo obrigatório (não é "módulo 1", são os módulos 1 + 23 nascendo juntos):

 - 1-usuario + 23-auth: signup (INSERT em usuario → chamar atribuir_papel_padrao() → criar linha em verificacao_email), login (comparar senha_hash, checar bloqueado_ate, chamar registrar_falha_login()/registrar_login_sucesso() conforme o caso, emitir JWT), e o middleware que faz SET LOCAL app.id_usuario_atual por request. Sem isso, nenhuma tabela protegida por RLS responde nada.

 - Detalhe que o Sonnet não falou: o e-mail de verificação de verdade (envio via SMTP, módulo 24-mail) pode ficar fake nessa primeira leva - só loga o link no console em vez de mandar e-mail de verdade. Você cria o registro em verificacao_email e chama confirmar_email_por_token() normalmente, só não manda e-mail real ainda. Isso adia o 24-mail de verdade sem quebrar o fluxo.

 - 2-papel-permissao: concordo com o Sonnet - não precisa de tela nem CRUD agora, só um guard pequeno usando tem_permissao(). Gestão continua por SQL direto por enquanto (mesmo raciocínio vale pro 21-configuracoes - admin edita configuração pelo SQL Editor até vocês fazerem a tela).

# Primeira tela visível - duas opções, ordem que eu seguiria:

 - 4-area-conhecimento primeiro, mesmo sendo "menos importante": zero dependência de login, é literalmente o endpoint que já está pronto no tutorial-rodar-projeto.md. Serve só pra você ver rápido que back+front+banco conversam, sem risco de travar em bug de auth antes de ver qualquer coisa na tela.

 - Depois, 9-campanha (só listagem pública, sem criar/editar) - aí sim é a vitrine de verdade do projeto, e concordo com o Sonnet que essa é a peça que prova login+RLS funcionando de verdade.

 - Depois disso, na ordem que faz o "upgrade pra pesquisador" da nossa conversa funcionar: 6-perfil-pesquisador (criar perfil) → 7-link-academico → 9-campanha (agora a escrita: criar campanha). Isso te dá a jornada completa "cadastro → virar pesquisador → criar campanha" rodando de ponta a ponta, que é o coração do sistema.

---

# Tutorial: npm install primeiro ou npm install nest?

O primeiro comando de verdade é diferente pra cada lado:

# Backend (Nest):
```
npx @nestjs/cli new nest
```
Esse comando já faz o install sozinho (ele pergunta npm/yarn/pnpm, escolha npm). Não precisa rodar npm install antes nem npm install -g @nestjs/cli - o npx baixa o CLI na hora, usa uma vez, e não fica instalado global pra sempre. Só depois de criado é que você entra na pasta e instala o resto:

```
cd nest                             # entra na pasta que acabou de ser criada
npm install pg                      # driver que fala com o PostgreSQL
npm install @types/pg --save-dev    # "dicionário" de tipos do pg, só ajuda o editor a autocompletar/avisar erro - não roda em produção
npm install @nestjs/config          # lê o arquivo .env (onde fica a senha do banco)
```

# Frontend (React + Vite):

```
npm create vite@latest react -- --template react
cd react
npm install
```

Aqui é diferente: o npm create vite não instala sozinho - ele só gera os arquivos. O npm install depois é obrigatório, senão npm run dev nem sobe.

Resumindo a ordem certa: npx @nestjs/cli new (já instala) → npm create vite → npm install (aí sim, manual) → npm run dev.

Não fiz nada disso ainda, só respondi - se quiser, aviso quando puder já deixar as pastas nest/react criadas certinho como o README.md pede, mas isso eu só faço quando você mandar.