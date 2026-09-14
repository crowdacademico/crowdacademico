import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { RodapeFormulario } from '../../components/crud/rodape-formulario';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { useToast } from '../../components/layout/toast/use-toast';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';
import { ehTipoMotivoDenuncia, LIMITE_DESCRICAO_MOTIVO_DENUNCIA } from '../../services/10-motivo-denuncia/constants/motivo-denuncia.constants';
import { useBuscarPorId } from '../../services/constant/hook/use-buscar-por-id';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { TipoMotivoDenuncia } from '../../services/10-motivo-denuncia/type/motivo-denuncia.type';

// `tipo` É editável aqui: não existe trigger no banco que trave a troca
// depois de criado (ver comentário completo em
// atualizar-motivo-denuncia.request.dto.ts, no backend). `descricao`
// também é editável - desde 18-08-2026 (remoção de `codigo`) é o único
// identificador do motivo, então precisa continuar não vazia.
export function AlterarMotivoDenuncia({ auth }: PropsPagina) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { dado: motivo, carregando, erro, reportarErro, limparErro } = useBuscarPorId(
    (id) => motivoDenunciaApi.buscar(auth.authFetch, id),
    id,
  );
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<TipoMotivoDenuncia | ''>('');
  const [ativo, setAtivo] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Sincroniza os campos locais quando `motivo` chega, sem useEffect (evita
  // set-state-in-effect) - técnica oficial do React de "ajustar estado
  // quando um valor muda", comparando com o valor anterior durante o
  // próprio render.
  const [motivoAnterior, setMotivoAnterior] = useState(motivo);
  if (motivo !== motivoAnterior) {
    setMotivoAnterior(motivo);
    if (motivo) {
      setDescricao(motivo.descricao);
      setTipo(motivo.tipo);
      setAtivo(motivo.ativo);
    }
  }

  const sujo =
    motivo !== null &&
    (descricao !== motivo.descricao || tipo !== motivo.tipo || ativo !== motivo.ativo);
  useAvisoAlteracaoNaoSalva(sujo);

  const aoCancelar = () => {
    if (!confirmarSaida(sujo)) {
      return;
    }
    void navigate(-1);
  };

  const aoSalvar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (tipo === '') return;
    limparErro();
    setEnviando(true);
    try {
      await motivoDenunciaApi.atualizar(auth.authFetch, id, {
        descricao,
        tipo,
        ativo,
      });
      mostrar('Motivo de denúncia alterado com sucesso.', `ID: ${id} foi alterado`);
      void navigate(-1);
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
          <RodapeFormulario
            aoCancelar={aoCancelar}
            formulario="form-alterar-motivo-denuncia"
            desabilitado={enviando || !sujo || tipo === '' || descricao.trim() === ''}
            enviando={enviando}
            textoAcao="Salvar"
            textoEnviando="Salvando..."
          />
        )
      }
    >
      {carregando ? (
        <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>
      ) : !motivo ? (
        <p className="p-10 text-center texto-erro text-sm font-bold">{erro}</p>
      ) : (
        <form id="form-alterar-motivo-denuncia" onSubmit={aoSalvar} className="p-10 space-y-6">
          {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

          <div className="flex items-center gap-3 pb-4 border-b borda-padrao">
            <div className="w-11 h-11 rounded-full fundo-marca text-white flex items-center justify-center shrink-0">
              <i className="fa-solid fa-flag"></i>
            </div>
            <div className="min-w-0">
              <p className="font-bold texto-forte truncate text-sm">{motivo.descricao}</p>
              <p className="text-xs texto-fraco">Motivo de denúncia #{motivo.idMotivo}</p>
            </div>
          </div>

          <SecaoFicha titulo="Editar">
            <div className="sm:col-span-2">
              <label className="rotulo-campo">Tipo</label>
              <select
                value={tipo}
                onChange={(evento) => {
                  if (ehTipoMotivoDenuncia(evento.target.value)) {
                    setTipo(evento.target.value);
                  }
                }}
                required
                className="input-padrao"
              >
                <option value="campanha">Campanha</option>
                <option value="perfil">Perfil</option>
              </select>
              <p className="text-xs texto-fraco mt-1">
                Alterar isto muda em qual tela de denúncia este motivo aparece daqui pra frente -
                denúncias antigas que já usaram este motivo não são afetadas retroativamente.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="rotulo-campo">Descrição</label>
              <input
                type="text"
                value={descricao}
                onChange={(evento) => setDescricao(evento.target.value)}
                required
                maxLength={LIMITE_DESCRICAO_MOTIVO_DENUNCIA}
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
