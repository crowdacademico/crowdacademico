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
-- GRUPO U (28-09-2026) - pode colar mais de uma vez (idempotente). Não precisa parar o Nest.
-- 1) Foto de perfil só aceita arquivo ativo, enviado por quem está logado e sem outro dono (ERRCODE 90022,
--    92025, 91029). Fecha o caminho de apontar a própria foto para o arquivo de outra pessoa e apagá-lo.
-- 2) Arquivo enviado que ninguém adotou em 24h (chave nova arquivo_horas_para_vincular) é desativado pelo job
--    diário das 4h do Nest, que apaga o objeto do armazenamento. Valor 0 = desligado.
-- ============================================================================
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'arquivo_horas_para_vincular', '24', 'inteiro', 'Horas que um arquivo enviado pode ficar sem uso (sem virar foto ou anexo) antes de ser apagado', TRUE, FALSE)
ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- [05-G] ARQUIVO: posse da foto de perfil e limpeza de órfãos
-- ============================================================
-- Um arquivo enviado só "fica" se algum registro dono o adotar (foto de perfil, anexo de atualização ou de
-- recompensa). O upload é confirmado antes do dono existir (a tela mostra a foto na hora, antes de salvar), então
-- o banco garante as duas pontas: quem adota tem de ter enviado o arquivo, e quem ninguém adotou some depois de um
-- prazo.

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_posse_imagem_perfil
-- Uso:        Invocada por trg_valida_posse_imagem_perfil
-- Bloco:      [05-G]
-- Regra:      Só vale com alguém logado (id_usuario_atual()); o seed e a manutenção direta no banco não têm sessão, e o
--             cadastro público não aceita foto. A foto nova precisa: existir e estar ativa (90022), ter sido enviada
--             por quem está logado (92025; o admin que troca a foto de outra pessoa envia o arquivo ele mesmo) e não
--             estar em uso em outro lugar (91029). Sem isso, qualquer conta apontava a própria foto para o arquivo de
--             outra pessoa e, pela posse que pol_arquivo_update (04) dá à foto de perfil, conseguia apagá-lo.
--             SECURITY DEFINER para enxergar vínculos que a RLS esconde de quem está logado.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_posse_imagem_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_atual   INT := public.id_usuario_atual();
    v_arquivo arquivo%ROWTYPE;
BEGIN
    IF NEW.id_imagem_perfil IS NULL
       OR (TG_OP = 'UPDATE' AND NEW.id_imagem_perfil IS NOT DISTINCT FROM OLD.id_imagem_perfil)
       OR v_atual IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_arquivo FROM arquivo WHERE id_arquivo = NEW.id_imagem_perfil;
    IF NOT FOUND OR v_arquivo.ativo IS NOT TRUE THEN
        RAISE EXCEPTION 'A foto escolhida não existe mais ou foi removida. Envie a imagem de novo.' USING ERRCODE = '90022';
    END IF;
    IF v_arquivo.id_usuario_upload IS DISTINCT FROM v_atual THEN
        RAISE EXCEPTION 'Só é possível usar como foto um arquivo que você mesmo enviou.' USING ERRCODE = '92025';
    END IF;
    IF EXISTS (SELECT 1 FROM usuario WHERE id_imagem_perfil = NEW.id_imagem_perfil AND id_usuario <> NEW.id_usuario)
       OR EXISTS (SELECT 1 FROM arquivo_atualizacao WHERE id_arquivo = NEW.id_imagem_perfil)
       OR EXISTS (SELECT 1 FROM arquivo_recompensa WHERE id_arquivo = NEW.id_imagem_perfil) THEN
        RAISE EXCEPTION 'Este arquivo já está em uso em outro lugar.' USING ERRCODE = '91029';
    END IF;
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_valida_posse_imagem_perfil
-- Tabela:    usuario
-- Momento:   BEFORE INSERT OR UPDATE OF id_imagem_perfil
-- Função:    fn_valida_posse_imagem_perfil()
-- Bloco:     [05-G]
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_valida_posse_imagem_perfil ON usuario;
CREATE TRIGGER trg_valida_posse_imagem_perfil
BEFORE INSERT OR UPDATE OF id_imagem_perfil ON usuario
FOR EACH ROW EXECUTE FUNCTION public.fn_valida_posse_imagem_perfil();

-- ----------------------------------------------------------------------------
-- Função:     desativar_arquivos_orfaos
-- Assinatura: () -> TABLE(id_arquivo INT, chave TEXT)
-- Bloco:      [05-G]
-- Regra:      Desativa (ativo = FALSE, mesma exclusão lógica do resto do sistema) todo arquivo ativo enviado há mais de
--             configuracoes.arquivo_horas_para_vincular (24) que nenhum dono adotou: não é foto de perfil de ninguém
--             nem anexo de atualização ou de recompensa. 0 ou negativo = desligado. Devolve as chaves para o Nest
--             apagar os objetos do armazenamento, e deixa UMA linha de rastro em log_auditoria quando desativa algo.
--             Dono novo de arquivo (tabela nova que aponte para arquivo) tem de entrar nos NOT EXISTS abaixo e em
--             fn_valida_posse_imagem_perfil. SECURITY DEFINER, chamada por @Cron diário, sem sessão de usuário.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.desativar_arquivos_orfaos()
RETURNS TABLE (id_arquivo INT, chave TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_horas INT;
    v_corte TIMESTAMPTZ;
    v_total INT;
BEGIN
    v_horas := public.config_numero('arquivo_horas_para_vincular', 24)::INT;
    IF v_horas <= 0 THEN
        RETURN;
    END IF;
    v_corte := NOW() - (v_horas * INTERVAL '1 hour');

    RETURN QUERY
    UPDATE arquivo a
       SET ativo = FALSE, desativado_em = NOW()
     WHERE a.ativo = TRUE
       AND a.criado_em < v_corte
       AND NOT EXISTS (SELECT 1 FROM usuario u WHERE u.id_imagem_perfil = a.id_arquivo)
       AND NOT EXISTS (SELECT 1 FROM arquivo_atualizacao aa WHERE aa.id_arquivo = a.id_arquivo)
       AND NOT EXISTS (SELECT 1 FROM arquivo_recompensa ar WHERE ar.id_arquivo = a.id_arquivo)
    RETURNING a.id_arquivo, a.chave::TEXT;

    GET DIAGNOSTICS v_total = ROW_COUNT;
    IF v_total > 0 THEN
        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, dados_novos)
        VALUES ('arquivo', 'órfãos anteriores a ' || to_char(v_corte, 'YYYY-MM-DD HH24:MI'), 'UPDATE', NULL,
                jsonb_build_object('quantidade', v_total, 'horas_para_vincular', v_horas, 'corte', v_corte));
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.desativar_arquivos_orfaos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.desativar_arquivos_orfaos() TO app_nestjs;
