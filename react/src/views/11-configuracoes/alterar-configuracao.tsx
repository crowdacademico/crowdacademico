import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { ConfiguracaoResponse } from '../../services/11-configuracoes/type/configuracao.type';

// `chave`/`tipo` não aparecem no formulário (só leitura) porque
// AtualizarConfiguracaoRequestDto (Nest) não os aceita - são imutáveis
// depois de criada a linha, só valor/descricao/ativo podem mudar.
export function AlterarConfiguracao({ auth }: PropsPagina) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [configuracao, setConfiguracao] = useState<ConfiguracaoResponse | null>(null);
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);
  // ADICIONADO (05-09-2026, item 5 de PENDENCIAS) - controla se a linha,
  // quando global, aparece pra quem não tem 'configuracao_gerenciar'.
  const [publica, setPublica] = useState(false);
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
        setPublica(dados.publica);
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sujo =
    configuracao !== null &&
    (valor !== (configuracao.valor ?? '') ||
      descricao !== (configuracao.descricao ?? '') ||
      ativo !== configuracao.ativo ||
      publica !== configuracao.publica);
  useAvisoAlteracaoNaoSalva(sujo);

  const aoCancelar = () => {
    if (sujo && !window.confirm('Você tem alterações não salvas. Sair mesmo assim?')) {
      return;
    }
    navigate(-1);
  };

  const aoSalvar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      await configuracaoApi.atualizar(auth.authFetch, id, { valor, descricao, ativo, publica });
      mostrar('Parâmetro alterado com sucesso.', `ID: ${id} foi alterado`);
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-gear"
      titulo="Alterar Parâmetro"
      rodape={
        configuracao && (
          <div className="flex gap-3">
            <button type="button" onClick={aoCancelar} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              form="form-alterar-configuracao"
              disabled={enviando || !sujo}
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
      ) : !configuracao ? (
        <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>
      ) : (
        <form id="form-alterar-configuracao" onSubmit={aoSalvar} className="p-10 space-y-6">
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          <div className="flex items-center gap-3 pb-4 border-b borda-padrao">
            <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
              <i className="fa-solid fa-gear"></i>
            </div>
            <div className="min-w-0">
              <p className="font-bold texto-forte truncate font-mono text-sm">
                {configuracao.chave}
              </p>
              <p className="text-xs texto-fraco">Parâmetro #{configuracao.idConfig}</p>
            </div>
          </div>

          <SecaoFicha titulo="Dados">
            <CampoSomenteLeitura rotulo="Chave" valor={configuracao.chave} />
            <CampoSomenteLeitura rotulo="Tipo" valor={configuracao.tipo} />
          </SecaoFicha>

          <SecaoFicha titulo="Editar">
            <div className="sm:col-span-2">
              <label className="rotulo-campo">
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
              <label className="rotulo-campo">
                Descrição
              </label>
              <input
                type="text"
                value={descricao}
                onChange={(evento) => setDescricao(evento.target.value)}
                className="input-padrao"
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold texto-padrao">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(evento) => setAtivo(evento.target.checked)}
              />
              Ativo
            </label>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm font-semibold texto-padrao">
                <input
                  type="checkbox"
                  checked={publica}
                  onChange={(evento) => setPublica(evento.target.checked)}
                />
                Pública
              </label>
              <p className="text-xs texto-fraco mt-1">
                Só tem efeito se este parâmetro for global (não uma preferência pessoal): marcado,
                aparece pra qualquer visitante em <code>GET /configuracoes</code>; desmarcado, só
                aparece pra quem tem a permissão &quot;configuracao_gerenciar&quot;.
              </p>
            </div>
          </SecaoFicha>
        </form>
      )}
    </CartaoFormulario>
  );
}
