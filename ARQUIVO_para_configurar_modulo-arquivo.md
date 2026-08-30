
Criar o bucket no projeto Supabase que já existe
No painel do Supabase (o mesmo projeto do banco), vá em Storage > New bucket. 
Dê um nome (ex.: crowdacademico-arquivos) e marque a opção Public bucket na criação — 
isso já libera leitura pública sem precisar mexer em política depois. Nenhuma conta nova, nenhuma taxa.


# ============================================================================
# No Arquivo .env
# ============================================================================
# Provedor ATUAL: Supabase Storage (bucket S3-compatível). A mesma implementação
# (S3CompativelArmazenamentoService) também funciona com Cloudflare R2, AWS
# S3, Backblaze B2 ou MinIO — trocar de provedor é só preencher estas variáveis de novo
# com os dados do outro provedor, sem mudar nenhum código.
#
# Supabase Storage — onde achar cada valor:
# - STORAGE_ENDPOINT: Storage > S3 > "Endpoint" (ex.: https://$$$$$$$$$$$$.storage.supabase.co/storage/v1/s3).
# - STORAGE_ACCESS_KEY_ID / STORAGE_SECRET_ACCESS_KEY: Storage > S3 > "Access keys" > New acess key > create access key .
# Copie os dois na hora pra um lugar seguro (o .env do backend) — se fechar essa tela sem copiar a secret, 
# não tem como ver de novo, só apagar essa chave e criar outra. 
# (cuidado: se algum outro serviço estiver usando a chave antiga ele vai quebrar).
# - STORAGE_BUCKET: nome do bucket 
# - STORAGE_PUBLIC_BASE_URL: domínio público de leitura — o "Friendly URL"
#   que o B2 mostra no bucket, OU (recomendado) um domínio próprio (ex.:
#   arquivos.crowdacademico.com.br) com CNAME pro bucket, se o provedor
#   suportar. NUNCA o domínio principal do site (ver comentário de
#   segurança abaixo).
STORAGE_ENDPOINT=https://$$$$$$$$$$$$.storage.supabase.co/storage/v1/s3
STORAGE_ACCESS_KEY_ID= 
STORAGE_SECRET_ACCESS_KEY= 
STORAGE_BUCKET=crowdacademico-arquivos
STORAGE_PUBLIC_BASE_URL=//$$$$$$$$$$$$.supabase.co/storage/v1/object/public/NOME-DO-BUCKET
STORAGE_REGION=us-east-2
# só mude pra 'false' se um endpoint específico exigir virtual-hosted style.
STORAGE_FORCE_PATH_STYLE=true

# LEMBRETES DE INFRAESTRUTURA (configurados no painel do provedor, não em
# código):
# 1. O bucket precisa ser PÚBLICO (leitura), servido por um domínio
#    SEPARADO do site principal (arquivos.<dominio>, nunca
#    <dominio>/arquivos) — mesmo que algo malicioso escape de algum jeito,
#    ele não roda "de dentro" do site nem alcança cookies/sessão de login.
# 2. Regra de ciclo de vida (lifecycle rule) apagando tudo em "pendente/"
#    com mais de 24h — substitui um job de limpeza de órfãos inteiro (ver
#    comentário em commons/storage/storage.constants.ts).
# 3. Lista de tipos aceitos é fechada no código (ver 25-arquivo/
#    arquivo.constants.ts: JPEG, PNG, WebP, PDF) — SVG nunca é aceito
#    (pode conter script embutido).