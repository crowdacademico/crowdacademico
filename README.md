# crowdacademico
Projeto de TCC do IFSP Birigui

Numeração seguindo a ordem de dependência das FKs no DDL (tabela sem dependência primeiro, depois quem referencia ela, técnicos/transversais por último: resources, auth, mail).

Exemplo: 
```
crowdacademico/                          (repo único na Organization)
│
├── nest_academico/
│   └── src/
│       ├── app/
│       ├── commons/
│       │
│       ├── 1-usuario/
│       ├── 2-papel-permissao/            (papel, permissao, usuario_papel, papel_permissao)
│       ├── 3-termo-uso/                  (termo_de_uso, usuario_termo)
│       ├── 4-area-conhecimento/
│       ├── 5-tipo-link/
│       ├── 6-perfil-pesquisador/
│       ├── 7-link-academico/
│       ├── 8-motivo-denuncia/
│       ├── 9-campanha/
│       ├── 10-seguir-campanha/
│       ├── 11-atualizacao-campanha/      (+ arquivo_atualizacao)
│       ├── 12-comentario/
│       ├── 13-contribuicao/
│       ├── 14-repasse/
│       ├── 15-denuncia/
│       ├── 16-solicitacao-encerramento/
│       ├── 17-historico-rejeicao/
│       ├── 18-notificacao/
│       ├── 19-auditoria-financeira/
│       ├── 20-arquivo/
│       ├── 21-configuracoes/
│       ├── 22-resources/
│       ├── 23-auth/
│       └── 24-mail/
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
└── react_academico/
    └── src/
        ├── components/
        │   ├── auth/
        │   ├── input/
        │   ├── layout/
        │   ├── pagination/
        │   └── search/
        ├── services/
        │   ├── auth/
        │   ├── usuario/
        │   ├── perfil-pesquisador/
        │   ├── area-conhecimento/
        │   ├── link-academico/
        │   ├── campanha/
        │   ├── contribuicao/
        │   ├── repasse/
        │   ├── comentario/
        │   ├── denuncia/
        │   ├── notificacao/
        │   ├── admin/
        │   └── constant/
        │       (cada um com api/, constants/, hook/, type/ — igual ao modelo)
        ├── views/
        │   ├── auth/
        │   ├── usuario/
        │   ├── campanha/
        │   ├── checkout/
        │   ├── dash-doador/
        │   ├── dash-pesquisador/
        │   └── admin/
        └── services/router/
```

# Prefixo do DDL (tudo em maiúsculo, SNAKE_CASE [scriptDoBanco.sql])

Exemplo com CRW, usando nome fi

CRW_USUARIO
CRW_PAPEL
CRW_PERMISSAO
...

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

