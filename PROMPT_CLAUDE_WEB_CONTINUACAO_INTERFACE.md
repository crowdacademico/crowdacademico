# Prompt pra Claude Web — continuação da rodada de interface

Contexto rápido: você escreveu um prompt pro Claude Code numa rodada anterior
("Rodada de interface: Alterar / Excluir / Consultar + ajustes em Login e
Criar Configuração"). Ele executou os 2 primeiros itens e parou no checkpoint
que você mesmo sugeriu ("Parar depois do 2º pro Lucas ver"). Este prompt é
pra dar continuidade — o que já foi feito, o que falta, e um pedido novo.

═══════════════════════════════════════════════════
JÁ FEITO — não sugerir de novo
═══════════════════════════════════════════════════

**Causa raiz (CartaoFormulario largo demais/travado):** corrigida. Em vez da
prop `variante="pagina"|"modal"` que você sugeriu, virou `largura="media"|
"larga"` — `media` = 672px (mesma largura do Consultar), `larga` = 1024px.
Não existe hoje nenhum uso de CartaoFormulario como modal de verdade (os 7
usos são todos página inteira), então a distinção modal/página não se
aplicou; se um dia existir um modal de verdade, val revisitar. `max-h`/
`overflow-hidden` removidos, rodapé virou `sticky bottom-0`.

**Item 1 (Alterar Usuário, 2 colunas):** feito, com uma diferença do que
você pediu — o card "Sessões ativas" NÃO entrou na lateral do Alterar
Usuário. Motivo: não existe (nunca existiu) um endpoint do admin ver sessões
de OUTRA pessoa, só as próprias (`/auth/sessoes` é sempre "minhas sessões").
Criar isso seria um endpoint novo, fora do escopo de "só embelezar" — fica
registrado como possível item futuro, não implementado agora. O resto da
distribuição saiu como pedido: coluna principal (identidade, Dados da conta,
Acesso, Moderação), coluna lateral (Metadados somente-leitura, Papéis, card
de ferramentas `<dev>` isolado).

**Sessões ativas colapsadas:** feito, mas em MINHA CONTA (que é onde a
lista de sessões realmente existe e o problema acontecia — "Sessões ativas
(N) ⌄", expande com scroll interno `max-h-64`, nunca empurra a página).

**Efeito colateral:** por ser componente compartilhado, as outras 6 telas
que usam CartaoFormulario (Criar Usuário, Excluir Usuário, Alterar/Criar/
Excluir Configuração, Alterar Papel) já ficaram mais largas e sem o corte
de altura também, mesmo sem receber o layout de 2 colunas.

═══════════════════════════════════════════════════
NÃO FEITO — continuar a partir daqui
═══════════════════════════════════════════════════

Itens 2 a 6 do seu prompt original, na íntegra, sem nenhuma mudança de
escopo da sua parte necessária:

1. **Campos de Pesquisador em Alterar Usuário** (CPF com máscara + link
   acadêmico), visivelmente desabilitados com aviso honesto de módulo não
   implementado.
2. **Excluir** — usar FichaConsulta em modo leitura, explicar a consequência
   real (exclusão lógica, autor anonimizado), botão vermelho só no fim,
   mesma largura das outras telas.
3. **Consultar** — `max-w-5xl` + 2 colunas, botão "Alterar" no topo, CPF/
   links mascarados quando existirem, sessões também colapsadas.
4. **Login** — ícone do Google errado (ainda é `fa-brands fa-google
   text-red-500`, ninguém mexeu nisso ainda) + chamada de cadastro mais
   visível.
5. **Criar Configuração** — `tipo` virar select, aviso de convenção da
   chave, campo `valor` mudando conforme o tipo, aviso de que criar uma
   chave nova não faz o sistema passar a usá-la sozinho.

Nenhum desses 5 foi tocado. Build/lint entre cada um, mesmo padrão de antes.

═══════════════════════════════════════════════════
PEDIDO NOVO — Minha Conta (o Lucas já mexeu, quer sua opinião)
═══════════════════════════════════════════════════

Fora do que você pediu: o Lucas notou que Minha Conta tinha o MESMO problema
que Alterar tinha (cards empilhados, um embaixo do outro, como se fosse só
pra celular) e pediu pro Claude Code resolver sozinho, sem te consultar
antes. O que foi feito:

- Virou 2 colunas (`max-w-5xl`, mesmo padrão do Alterar): coluna principal
  (2/3) com as 6 seções que já existiam (Perfil, Segurança, Preferências,
  Meus Papéis, Privacidade, Perfil Acadêmico) — nenhuma removida, nenhuma
  funcionalidade tirada, só reorganizadas.
- Coluna lateral (1/3, sticky, acompanha o scroll): um cartão de perfil
  novo, resumo visual de "quem é essa conta" — o AvatarUsuario ganhou uma
  variante nova (`forma="quadrado"`, `tamanho="xl"`, rounded-2xl) só pra
  esse card, mantendo o formato redondo pequeno em todo o resto do app
  (cabeçalho, tabelas, dropdown). Conteúdo do card:

  ```
  [avatar quadrado grande]
  Admin Sistema
  admin@crowdacademico.com.br

  Papéis
  admin

  E-mail verificado    Na plataforma desde
  Não                  31/12/2023
  ```

- No celular, o card de perfil aparece PRIMEIRO (antes das seções) via
  `order-1 lg:order-2` — no desktop ele vai pra lateral direita, sem
  duplicar HTML nenhum, só troca a ordem visual por breakpoint.

**O Lucas gostou do resultado** ("Este card está bem intuitivo") mas quer
sua opinião: você tem alguma ideia de melhorar esse cartão de perfil, ou a
página inteira do Minha Conta, além do que já foi feito? Pode sugerir
livremente — não precisa se limitar a ajustar o que existe, mas **não pode
remover nenhuma funcionalidade já existente** (trocar senha, sessões
ativas, preferências de tema/fonte, papéis, exportar dados, excluir conta,
placeholder de perfil acadêmico — todas continuam precisando estar lá,
funcionando exatamente como já funcionam).

═══════════════════════════════════════════════════
ORDEM SUGERIDA
═══════════════════════════════════════════════════

Mesma da rodada anterior, começando do item 2: CPF/link → Excluir →
Consultar → Login → Criar Configuração. O pedido do Minha Conta pode entrar
em paralelo (é diagnóstico/opinião, não trava os outros 5).
