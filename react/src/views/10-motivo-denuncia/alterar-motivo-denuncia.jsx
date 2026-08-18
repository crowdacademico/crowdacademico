import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';

// `codigo` não aparece como campo editável (só leitura) porque
// AtualizarMotivoDenunciaRequestDto (Nest) não o aceita — é a chave
// estável (UK_MOTIVO_DENUNCIA_CODIGO) que identifica o motivo no
// catálogo, mesmo raciocínio de AlterarTipoLink sobre `codigo`/
// AlterarAreaConhecimento sobre `codigoCnpq`. `tipo`, diferente de
// `codigo`, É editável aqui: não existe trigger no banco que trave a
// troca depois de criado (ver comentário completo em
// atualizar-motivo-denuncia.request.dto.ts, no backend).
export function AlterarMotivoDenuncia({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [motivo, setMotivo] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    motivoDenunciaApi
      .buscar(auth.authFetch, id)
      .then((dados) => {
        setMotivo(dados);
        setDescricao(dados.descricao ?? '');
        setTipo(dados.tipo);
        setAtivo(dados.ativo);
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sujo =
    motivo !== null &&
    (descricao !== (motivo.descricao ?? '') || tipo !== motivo.tipo || ativo !== motivo.ativo);
  useAvisoAlteracaoNaoSalva(sujo);

  const aoCancelar = () => {
    if (sujo && !window.confirm('Você tem alterações não salvas. Sair mesmo assim?')) {
      return;
    }
    navigate(-1);
  };

  const aoSalvar = async (evento) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      await motivoDenunciaApi.atualizar(auth.authFetch, id, {
        // '' vira `null` (limpa o campo) — descricao é NULLABLE e
        // AtualizarMotivoDenunciaRequestDto (Nest) aceita `null`
        // explícito no corpo pra isto.
        descricao: descricao || null,
        tipo,
        ativo,
      });
      mostrar('Motivo de denúncia alterado com sucesso.', `ID: ${id} foi alterado`);
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-flag"
      titulo="Alterar Motivo de Denúncia"
      rodape={
        motivo && (
          <div className="flex gap-3">
            <button type="button" onClick={aoCancelar} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              form="form-alterar-motivo-denuncia"
              disabled={enviando || !sujo || tipo === ''}
              className="btn btn-primary flex-1"
            >
              {enviando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )
      }
    >
      {carregando ? (
        <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>
      ) : !motivo ? (
        <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>
      ) : (
        <form id="form-alterar-motivo-denuncia" onSubmit={aoSalvar} className="p-10 space-y-6">
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          <div className="flex items-center gap-3 pb-4 border-b borda-padrao">
            <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
              <i className="fa-solid fa-flag"></i>
            </div>
            <div className="min-w-0">
              <p className="font-bold texto-forte truncate font-mono text-sm">{motivo.codigo}</p>
              <p className="text-xs texto-fraco">Motivo de denúncia #{motivo.idMotivo}</p>
            </div>
          </div>

          <SecaoFicha titulo="Dados">
            <CampoSomenteLeitura rotulo="Código" valor={motivo.codigo} />
          </SecaoFicha>

          <SecaoFicha titulo="Editar">
            <div className="sm:col-span-2">
              <label className="rotulo-campo">Tipo</label>
              <select
                value={tipo}
                onChange={(evento) => setTipo(evento.target.value)}
                required
                className="input-padrao"
              >
                <option value="campanha">Campanha</option>
                <option value="perfil">Perfil</option>
              </select>
              <p className="text-xs texto-fraco mt-1">
                Alterar isto muda em qual tela de denúncia este motivo aparece daqui pra frente —
                denúncias antigas que já usaram este motivo não são afetadas retroativamente.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="rotulo-campo">Descrição</label>
              <input
                type="text"
                value={descricao}
                onChange={(evento) => setDescricao(evento.target.value)}
                maxLength={255}
                className="input-padrao"
              />
            </div>

            <label className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold texto-padrao">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(evento) => setAtivo(evento.target.checked)}
              />
              Ativo
            </label>
          </SecaoFicha>
        </form>
      )}
    </CartaoFormulario>
  );
}
