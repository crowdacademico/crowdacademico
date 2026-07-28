## textão do CLAUDE para vc

PARTE 2 — Texto para mandar pra ela

Alexia, passei o banco inteiro num Postgres simulado conforme o prompt do Lucas pra testar (rodando os 8 arquivos do zero) e queria te contar o que deu, porque teve bastante coisa tua envolvida.

Primeiro: o teste dos 4 pesquisadores com as 4 faixas de score é a melhor coisa que tem no seed hoje. Rodei e os números saem exatos — 100 Referência, 60 Confiável, 46 Em Construção, 19 Atenção — e saem da fórmula de verdade, não de número digitado. Isso é um teste de ponta a ponta do motor de score que a gente não tinha. Testei até o que aconteceria se a gente mudar a regra de denúncia depois, e o teu teste continua de pé.

Aquilo de tirar os scores fixos do seed também estava certo, e a mesma lógica se aplicava ao valor arrecadado das campanhas (que estava digitado à mão e não batia com as contribuições). Copiamos teu raciocínio e agora é o Postgres que calcula.

Tua ideia da recompensa simbólica destravou uma discussão que estava parada faz tempo. O problema era que recompensa material cria obrigação de ` entrega e logística ` , que a gente não tem como bancar — e "nome do doador no projeto" resolve isso sem perder a ideia. Tiramos "física" e "outro" do tipo de recompensa, ficou só digital/reconhecimento/acesso antecipado. As tabelas estão vazias esperando teus registros.

Duas coisas que apareceram e valem conversa:

Os motivos de denúncia novos que você sugeriu entraram, mas como as linhas novas de campanha entraram antes das de perfil, os números mudaram e as denúncias antigas passaram a apontar pro motivo errado. É bug do seed, não da tua ideia — e na real tua sugestão expôs uma fragilidade que já estava lá. Vamos passar a referenciar pelo código (PERF-001) em vez do número, aí nunca mais quebra.
O NOT NULL no vínculo institucional: teu raciocínio de "perfil não nasce pela metade" tá certo e a gente quer manter. Só que do jeito que ficou, pesquisador sem instituição não consegue nem existir — e a gente escreveu na Etapa 1 que quer alcançar exatamente quem está fora do circuito. Achamos um jeito de ter os dois: um campo "tipo de vínculo" (institucional ou independente), com regra que continua barrando perfil incompleto, mas deixa quem é independente declarar isso. Fica até mais rigoroso que agora, porque some o campo em branco ambíguo. O que você acha?



## O mesmo textão de cima, só que com outras palavras do Claude também.

Alexia, passei o banco inteiro como se fosse no Postgres pra testar (rodando os 8 arquivos do zero) e queria te contar o que deu, porque teve bastante coisa tua envolvida.

Primeiro: o teste dos 4 pesquisadores com as 4 faixas de score é a melhor coisa que tem no seed hoje. Rodei e os números saem exatos — 100 Referência, 60 Confiável, 46 Em Construção, 19 Atenção — e saem da fórmula de verdade, não de número digitado. Isso é um teste de ponta a ponta do motor de score que a gente não tinha.

Aquilo de tirar os scores fixos do seed também estava certo, e a mesma lógica se aplicava ao valor arrecadado das campanhas (que estava digitado à mão e não batia com as contribuições). Copiamos teu raciocínio e agora é o Postgres que calcula.

Tua ideia da recompensa simbólica destravou uma discussão que estava parada faz tempo. O problema era que recompensa material cria obrigação de entrega e logística, que a gente não tem como bancar — e "nome do doador no projeto" resolve isso sem perder a ideia. Tiramos "física" e "outro" do tipo de recompensa, ficou só digital/reconhecimento/acesso antecipado. As tabelas estão vazias esperando teus registros.

Duas coisas que apareceram e valem conversa:

1. Os motivos de denúncia novos que você sugeriu entraram, mas como as linhas novas de campanha entraram antes das de perfil, os números mudaram e as denúncias antigas passaram a apontar pro motivo errado. Isso quebrou o seed inteiro em silêncio (a tabela de denúncia nascia vazia) — já corrigido. É bug de como o seed referenciava catálogo, não da tua ideia — e na real tua sugestão expôs uma fragilidade que já estava lá. Agora passamos a referenciar pelo código (tipo PERF-001) em vez do número, aí nunca mais quebra.

2. O NOT NULL no vínculo institucional: teu raciocínio de "perfil não nasce pela metade" tá certo e a gente manteve. Só que do jeito que ficou, pesquisador sem instituição não conseguia nem existir — e a gente escreveu na Etapa 1 que quer alcançar exatamente quem está fora do circuito. Já implementamos e testamos uma solução que resolve os dois lados: um campo "tipo de vínculo" (institucional ou independente), com uma regra que continua barrando perfil incompleto (institucional sem nome de instituição continua proibido), mas deixa quem é independente declarar isso explicitamente. Testei contra os 11 perfis do seed e nada quebrou. Fica até mais rigoroso que antes, porque some o campo em branco ambíguo. O que você acha?
