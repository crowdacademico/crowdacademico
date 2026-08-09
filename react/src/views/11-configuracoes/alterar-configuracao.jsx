import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';

// `chave`/`tipo` não aparecem no formulário (só leitura) porque
// AtualizarConfiguracaoRequestDto (Nest) não os aceita — são imutáveis
// depois de criada a linha, só valor/descricao/ativo podem mudar.
export function AlterarConfiguracao({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [configuracao, setConfiguracao] = useState(null);
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    configuracaoApi
      .buscar(auth.authFetch, id)
      .then((dados) => {
        setConfiguracao(dados);
        setValor(dados.valor ?? '');
        setDescricao(dados.descricao ?? '');
        setAtivo(dados.ativo);
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const aoSalvar = async (evento) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      await configuracaoApi.atualizar(auth.authFetch, id, { valor, descricao, ativo });
      mostrar('Configuração alterada com sucesso.', `ID: ${id} foi alterada`);
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <CartaoFormulario icone="fa-gear" titulo="Alterar Configuração">
      {carregando ? (
        <p className="p-10 text-center text-sm text-slate-600">Carregando...</p>
      ) : !configuracao ? (
        <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>
      ) : (
        <form onSubmit={aoSalvar} className="p-10 space-y-6">
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          <SecaoFicha titulo="Dados">
            <CampoSomenteLeitura rotulo="Chave" valor={configuracao.chave} />
            <CampoSomenteLeitura rotulo="Tipo" valor={configuracao.tipo} />
          </SecaoFicha>

          <SecaoFicha titulo="Editar">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Valor
              </label>
              <input
                type="text"
                value={valor}
                onChange={(evento) => setValor(evento.target.value)}
                className="input-padrao"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Descrição
              </label>
              <input
                type="text"
                value={descricao}
                onChange={(evento) => setDescricao(evento.target.value)}
                className="input-padrao"
              />
            </div>

            <label className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(evento) => setAtivo(evento.target.checked)}
              />
              Ativo
            </label>
          </SecaoFicha>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button type="submit" disabled={enviando} className="btn btn-primary flex-1">
              {enviando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </CartaoFormulario>
  );
}
