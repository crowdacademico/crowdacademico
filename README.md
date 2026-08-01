# crowdacademico
Projeto de TCC do IFSP Birigui


# EXEMPLO do código que já pronto com SCREAMING_SNAKE_CASE, CONSTRAINTS nomeados fácil de achar e INDEX
```
-- ============================================================
--  CRW_SEGUIR_PESQUISADOR
--  Convenção: prefixo CRW_, SCREAMING_SNAKE_CASE, constraints nomeadas
-- ============================================================
CREATE TABLE CRW_SEGUIR_PESQUISADOR (
    ID_SEG_PESQUISADOR SERIAL,
    ID_USUARIO         INT NOT NULL,
    ID_PESQUISADOR     INT NOT NULL,
    SEGUIDO_EM         TIMESTAMP DEFAULT NOW(),

    CONSTRAINT PK_CRW_SEGUIR_PESQUISADOR
        PRIMARY KEY (ID_SEG_PESQUISADOR),

    CONSTRAINT FK_CRW_SEGUIR_PESQUISADOR_USUARIO
        FOREIGN KEY (ID_USUARIO) REFERENCES CRW_USUARIO (ID_USUARIO)
        ON DELETE CASCADE,

    CONSTRAINT FK_CRW_SEGUIR_PESQUISADOR_PESQUISADOR
        FOREIGN KEY (ID_PESQUISADOR) REFERENCES CRW_USUARIO (ID_USUARIO)
        ON DELETE CASCADE,

    CONSTRAINT UK_CRW_SEGUIR_PESQUISADOR_PAR
        UNIQUE (ID_USUARIO, ID_PESQUISADOR),

    CONSTRAINT CK_CRW_SEGUIR_PESQUISADOR_NAO_AUTOSEGUIR
        CHECK (ID_USUARIO <> ID_PESQUISADOR)
);

-- Índices seguindo o mesmo padrão de nome (cobrem as duas pontas do relacionamento)
CREATE INDEX IDX_CRW_SEGUIR_PESQUISADOR_USUARIO     ON CRW_SEGUIR_PESQUISADOR (ID_USUARIO);
CREATE INDEX IDX_CRW_SEGUIR_PESQUISADOR_PESQUISADOR ON CRW_SEGUIR_PESQUISADOR (ID_PESQUISADOR);
```


- Numeração seguindo **afinidade de uso** (onde eu esperaria achar a pasta procurando o problema), não a ordem de dependência de FK do `.sql` — as duas divergem porque o `.sql` agrupa por "quem referencia quem" (ex.: `sessao`/`recuperacao_senha`/`verificacao_email` vivem dentro do bloco `USUÁRIO` do banco só porque têm FK pra `usuario`, mas na prática **são** o módulo `auth`, não perfil de usuário). 5 clusters, nesta ordem:
  1. **Identidade** — quem é a pessoa e como ela entra (usuario → RBAC → auth → mail → termo de uso → perfil de pesquisador → seus links).
  2. **Catálogos** — dado de apoio que existe independente de campanha (área de conhecimento, tipo de link, motivo de denúncia, configurações).
  3. **Núcleo** — a trilha de vida de uma campanha, em ordem de fluxo: cria → orçamento/cronograma → publica atualização → engajamento social → recompensa → moderação (denúncia/encerramento).
  4. **Financeiro** — dinheiro (contribuição, repasse, auditoria).
  5. **Infra transversal** — usado por todo mundo, dono de ninguém (arquivo, notificação, resources).
- `score_config`/`score_rotulo`/`score_pesquisador` (banco) não têm módulo próprio — dobrados dentro de `6-perfil-pesquisador`, porque score é característica calculada do pesquisador, sem tela própria de criar/editar.

Exemplo: 
```
crowdacademico/                          (repo único na Organization)
│
├── nest/
│   └── src/
│       ├── app/
│       ├── commons/
│       │
│       │   --- Cluster 1: Identidade ---
│       ├── 1-usuario/
│       ├── 2-papel-permissao/            (papel, permissao, usuario_papel, papel_permissao)
│       ├── 3-auth/                       (sessao, recuperacao_senha, verificacao_email)
│       ├── 4-mail/
│       ├── 5-termo-uso/                  (termo_de_uso, usuario_termo)
│       ├── 6-perfil-pesquisador/         (+ score_config/score_rotulo/score_pesquisador)
│       ├── 7-link-academico/
│       │
│       │   --- Cluster 2: Catálogos ---
│       ├── 8-area-conhecimento/
│       ├── 9-tipo-link/
│       ├── 10-motivo-denuncia/
│       ├── 11-configuracoes/
│       │
│       │   --- Cluster 3: Núcleo (campanha) ---
│       ├── 12-campanha/
│       ├── 13-orcamento-campanha/
│       ├── 14-marco-cronograma/
│       ├── 15-atualizacao-campanha/      (+ arquivo_atualizacao)
│       ├── 16-seguir-campanha/
│       ├── 17-comentario/
│       ├── 18-recompensa/                (+ contribuicao_recompensa, arquivo_recompensa, link_recompensa)
│       ├── 19-denuncia/
│       ├── 20-solicitacao-encerramento/
│       ├── 21-historico-rejeicao/
│       │
│       │   --- Cluster 4: Financeiro ---
│       ├── 22-contribuicao/
│       ├── 23-repasse/
│       ├── 24-auditoria-financeira/
│       │
│       │   --- Cluster 5: Infra transversal ---
│       ├── 25-arquivo/
│       ├── 26-notificacao/
│       └── 27-resources/
│
│       (padrão interno de cada módulo N-nome/, igual ao modelo):
│       │   ├── constants/
│       │   ├── controllers/
│       │   │   ├── <nome>.controller.create.ts
│       │   │   ├── <nome>.controller.findall.ts
│       │   │   ├── <nome>.controller.findone.ts
│       │   │   ├── <nome>.controller.update.ts
│       │   │   └── <nome>.controller.remove.ts
│       │   ├── dto/
│       │   │   ├── converter/
│       │   │   ├── request/
│       │   │   └── response/
│       │   ├── entity/
│       │   ├── service/
│       │   │   ├── <nome>.service.create.ts
│       │   │   ├── <nome>.service.findall.ts
│       │   │   ├── <nome>.service.findone.ts
│       │   │   ├── <nome>.service.update.ts
│       │   │   └── <nome>.service.remove.ts
│       │   └── <nome>.module.ts
│
└── react/
    └── src/
        │   (pasta que tem par no nest/ usa o MESMO número — nunca cria número
        │   novo aqui; pasta sem par no nest fica sem número, tipo router/)
        ├── components/
        │   ├── 3-auth/
        │   ├── input/
        │   ├── layout/
        │   ├── pagination/
        │   └── search/
        ├── services/
        │   ├── 1-usuario/
        │   ├── 3-auth/
        │   ├── 6-perfil-pesquisador/
        │   ├── 7-link-academico/
        │   ├── 8-area-conhecimento/
        │   ├── 12-campanha/
        │   ├── 17-comentario/
        │   ├── 19-denuncia/
        │   ├── 22-contribuicao/
        │   ├── 23-repasse/
        │   ├── 26-notificacao/
        │   ├── admin/
        │   ├── constant/
        │   └── router/
        │       (cada um dos numerados com api/, constants/, hook/, type/ — igual ao modelo)
        └── views/
            ├── 1-usuario/
            ├── 3-auth/
            ├── 12-campanha/
            ├── admin/
            ├── checkout/
            ├── dash-doador/
            └── dash-pesquisador/
```

# Prefixo do DDL (tudo em maiúsculo, SNAKE_CASE [scriptDoBanco.sql])

Exemplo com CRW, usando nome fi

CRW_USUARIO
CRW_PAPEL
CRW_PERMISSAO
...

# Sobre main vs branches

Agora no começo não precisa se preocupar, a gente pode jogar tudo na 'main' e já sincronizar para agilizar, espero que o espírito ancestral dos programadores de verdade não leia isto que eu escrevi

Mas no futuro e pro final, quando já estiver em fazer de implantação, com tela, coisa rodando e funcionnando.

# Vamos tentar usar Branch em vez de mexer direto no Main

- O padrão é usar é branch por feature/tarefa, de vida curta, algo como:
```
main                              ← sempre estável, o que está "funcionando"
├── feat/backend-usuario-crud
├── feat/frontend-home-vitrine
├── feat/backend-campanha-all-or-nothing
├── fix/checkout-validacao-valor-minimo
└── chore/config-swagger
...
```

- Mas ia ser um saco, então, a gente pode usar algo como: git checkout frontend e git checkout backend

ou mais informal, como dev-lucasnovais01

Mas em ambos estes casos, é sempre necessário fazer as testagem após acabar de mexer, já fazer o pull request e merge, não deixar acumular commits
Fechou uma parte e testou → abre o Pull Request no GitHub (frontend → main ou backend → main), e o outro aprova o merge.

Vamos tentar manter a main protegida, principalmente nos estágios finais