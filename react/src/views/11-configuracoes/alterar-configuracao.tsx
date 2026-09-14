import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { RodapeFormulario } from '../../components/crud/rodape-formulario';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { useToast } from '../../components/layout/toast/use-toast';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import { useBuscarPorId } from '../../services/constant/hook/use-buscar-por-id';
import type { PropsPagina } from '../../services/router/pagina.type';

// `chave`/`tipo` não aparecem no formulário (só leitura) porque
// AtualizarConfiguracaoRequestDto (Nest) não os aceita - são imutáveis
// depois de criada a linha, só valor/descricao/ativo podem mudar.
export function AlterarConfiguracao({ auth }: PropsPagina) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { dado: configuracao, carregando, erro, reportarErro, limparErro } = useBuscarPorId(
    (id) => configuracaoApi.buscar(auth.authFetch, id),
    id,
  );
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);
  // ADICIONADO (05-09-2026, item 5 de PENDENCIAS) - controla se a linha,
  // quando global, aparece pra quem não tem 'configuracao_gerenciar'.
  const [publica, setPublica] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Sincroniza os campos locais quando `configuracao` chega, sem useEffect
  // (evita set-state-in-effect) - técnica oficial do React de "ajustar
  // estado quando um valor muda", comparando com o valor anterior durante
  // o próprio render.
  const [configuracaoAnterior, setConfiguracaoAnterior] = useState(configuracao);
  if (configuracao !== configuracaoAnterior) {
    setConfiguracaoAnterior(configuracao);
    if (configuracao) {
      setValor(configuracao.valor ?? '');
      setDescricao(configuracao.descricao ?? '');
      setAtivo(configuracao.ativo);
      setPublica(configuracao.publica);
    }
  }

  const sujo =
    configuracao !== null &&
    (valor !== (configuracao.valor ?? '') ||
      descricao !== (configuracao.descricao ?? '') ||
      ativo !== configuracao.ativo ||
      publica !== configuracao.publica);
  useAvisoAlteracaoNaoSalva(sujo);

  const aoCancelar = () => {
    if (!confirmarSaida(sujo)) {
      return;
    }
    void navigate(-1);
  };

  const aoSalvar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      await configuracaoApi.atualizar(auth.authFetch, id, { valor, descricao, ativo, publica });
      mostrar('Parâmetro alterado com sucesso.', `ID: ${id} foi alterado`);
      void navigate(-1);
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
          <RodapeFormulario
            aoCancelar={aoCancelar}
            formulario="form-alterar-configuracao"
            desabilitado={enviando || !sujo}
            enviando={enviando}
            textoAcao="Salvar"
            textoEnviando="Salvando..."
          />
        )
      }
    >
      {carregando ? (
        <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>
      ) : !configuracao ? (
        <p className="p-10 text-center texto-erro text-sm font-bold">{erro}</p>
      ) : (
        <form id="form-alterar-configuracao" onSubmit={aoSalvar} className="p-10 space-y-6">
          {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

          <div className="flex items-center gap-3 pb-4 border-b borda-padrao">
            <div className="w-11 h-11 rounded-full fundo-marca text-white flex items-center justify-center shrink-0">
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
