import { useId, useState } from 'react';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';
import { ehTipoMotivoDenuncia, LIMITE_DESCRICAO_MOTIVO_DENUNCIA } from '../../services/10-motivo-denuncia/constants/motivo-denuncia.constants';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { MotivoDenunciaResponse, TipoMotivoDenuncia } from '../../services/10-motivo-denuncia/type/motivo-denuncia.type';

interface ModalCriarMotivoDenunciaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  aoFechar: () => void;
  aoCriado: (motivoCriado: MotivoDenunciaResponse) => void;
}

// Criar em modal, mesmo padrão de ModalCriarUsuario.
export function ModalCriarMotivoDenuncia({ auth, aoFechar, aoCriado }: ModalCriarMotivoDenunciaProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<TipoMotivoDenuncia | ''>('');
  const [enviando, setEnviando] = useState(false);
  const idTipo = useId();
  const idDescricao = useId();

  const aoCriar = async () => {
    if (tipo === '') return;
    limparErro();
    setEnviando(true);
    try {
      const motivoCriado = await motivoDenunciaApi.criar(auth.authFetch, { descricao, tipo });
      mostrar(
        'Motivo de denúncia cadastrado com sucesso.',
        `O novo motivo possui o ID: ${motivoCriado.idMotivo}`,
      );
      aoCriado(motivoCriado);
      aoFechar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModalFicha
      titulo="Criar Motivo de Denúncia"
      subtitulo="Preencha os dados abaixo para cadastrar um novo motivo de denúncia."
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-3 max-w-sm ml-auto">
          <button type="button" onClick={aoFechar} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void aoCriar()}
            disabled={enviando || descricao.trim() === '' || tipo === ''}
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Criando...' : 'Criar'}
          </button>
        </div>
      }
    >
      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

      <SecaoFicha titulo="Dados">
        <div className="sm:col-span-2">
          <label htmlFor={idTipo} className="rotulo-campo">Tipo</label>
          <select
            id={idTipo}
            value={tipo}
            onChange={(evento) => {
              if (ehTipoMotivoDenuncia(evento.target.value)) {
                setTipo(evento.target.value);
              }
            }}
            required
            className="input-padrao"
          >
            <option value="" disabled>
              Selecione...
            </option>
            <option value="campanha">Campanha</option>
            <option value="perfil">Perfil</option>
          </select>
          <p className="text-xs texto-fraco mt-1">
            Decide em qual tela de denúncia (de campanha ou de perfil) este motivo aparece como
            opção - a validação é garantida pelo próprio banco na hora de gravar a denúncia.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={idDescricao} className="rotulo-campo">Descrição</label>
          <input
            id={idDescricao}
            type="text"
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            required
            maxLength={LIMITE_DESCRICAO_MOTIVO_DENUNCIA}
            placeholder="ex.: Campanha com informações falsas ou enganosas"
            className="input-padrao"
          />
          <p className="text-xs texto-fraco mt-1">
            Texto exibido pra quem for escolher este motivo na tela de denúncia - é o único
            identificador do motivo, então precisa ser claro por si só.
          </p>
        </div>
      </SecaoFicha>
    </ModalFicha>
  );
}
