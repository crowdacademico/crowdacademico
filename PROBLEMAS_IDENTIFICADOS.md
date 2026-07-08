
# Duas inconsistências reais que encontrei:

usuario.criado_em foi criada com esse nome no DDL (arquivo 01), mas tanto o INSERT do seed (arquivo 07) quanto o GRANT SELECT (arquivo 05) usam data_cadastro enquanto que na coluna que não existe. Isso quebraria na hora de rodar.

perfil_pesquisador.score_atual é INTEGER no DDL, mas o seed insere valores decimais (85.50, 72.00 etc.). O Postgres vai truncar/arredondar silenciosamente.