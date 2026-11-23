-- ============================================================================
-- Este arquivo é TEMPORÁRIO - depois a gente deleta.
--
-- Serve pra registrar, em ordem de DATA, cada mudança de banco que precisa
-- ser colada manualmente no SQL Editor do Supabase (fora do fluxo normal dos
-- arquivos numerados 01-08, que descrevem o banco inteiro do zero). Toda vez
-- que um arquivo 01-08 for alterado por uma mudança pequena, o trecho novo
-- entra aqui embaixo, numa seção nova com a data do dia.
--
-- REGRA DESTE ARQUIVO: do lado de cada data, está escrito se aquele bloco é
-- seguro colar e rodar MAIS DE UMA VEZ (idempotente) ou se é de rodar
-- UMA VEZ SÓ. Por padrão, tudo aqui é idempotente (pode colar o arquivo
-- inteiro de novo sem medo) - se algum dia entrar um bloco que não seja,
-- vai vir com um aviso bem visível.
-- ============================================================================




-- ============================================================================
-- GRUPO DP (22-11-2026) - Tipos de link para a atualização: YouTube, Vimeo, DOI e Google Drive. IDEMPOTENTE.
-- Pode colar com o Nest no ar. Só dados (o seed novo já traz os mesmos; isto é para o banco que já está no ar).
--
-- O que muda: a atualização de campanha passa a aceitar link de vídeo (YouTube, Vimeo: toca na própria atualização),
-- de artigo (DOI) e de pasta de arquivos (Google Drive), de uma lista fechada de sites, em vez de qualquer endereço.
-- ============================================================================
INSERT INTO tipo_link (codigo, nome, ativo, regex, dominio, permite_perfil, permite_atualizacao) VALUES
('YOUTUBE',            'YouTube',              TRUE,  '^https?://((www\.|m\.)?youtube\.com/(watch\?v=|shorts/|embed/|live/)|youtu\.be/)[\w\-]+', '{youtube.com,youtu.be}', FALSE, TRUE),
('VIMEO',              'Vimeo',                TRUE,  '^https?://(www\.|player\.)?vimeo\.com/(video/)?\d+',         '{vimeo.com}',        FALSE, TRUE),
('DOI',                'DOI (artigo)',         TRUE,  '^https?://(dx\.)?doi\.org/10\.\d{4,9}/\S+$',                 '{doi.org}',          FALSE, TRUE),
('GOOGLE_DRIVE',       'Google Drive',         TRUE,  '^https?://(drive|docs)\.google\.com/\S+$',                      '{drive.google.com,docs.google.com}', FALSE, TRUE)
ON CONFLICT (codigo) DO NOTHING;
