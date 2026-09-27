import { useState } from 'react';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { Campo } from '../../components/input/campo';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';
import {
  ehTipoMotivoDenuncia,
  LIMITE_DESCRICAO_MOTIVO_DENUNCIA,
  ROTULO_TIPO_MOTIVO_DENUNCIA,
} from '../../services/10-motivo-denuncia/constants/motivo-denuncia.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
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
  const { erro, reportarErro, limparErro, errosCampo, limparErroCampo } = useErroToast();
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<TipoMotivoDenuncia | ''>('');

  const aoCriar = async () => {
    if (tipo === '') return;
    await executarEnviando(async () => {
      const motivoCriado = await motivoDenunciaApi.criar(auth.authFetch, { descricao, tipo });
      mostrar(
        'Motivo de denúncia cadastrado com sucesso.',
        `O novo motivo possui o ID: ${motivoCriado.idMotivo}`,
      );
      aoCriado(motivoCriado);
      aoFechar();
    });
  };

  return (
    <ModalFicha
      titulo="Criar Motivo de Denúncia"
      subtitulo="Preencha os dados abaixo para cadastrar um novo motivo de denúncia."
      aoFechar={aoFechar}
      rodape={
        <RodapeAcoes
          aoCancelar={aoFechar}
          acao={{
            rotulo: 'Criar',
            rotuloOcupado: 'Criando...',
            ocupado: enviando,
            desabilitado: descricao.trim() === '' || tipo === '',
            aoClicar: () => void aoCriar(),
          }}
        />
      }
      erro={erro}
    >
      <SecaoFicha titulo="Dados">
        <Campo
          rotulo="Tipo"
          erro={errosCampo.tipo}
          dica="Decide em qual tela de denúncia (de campanha ou de perfil) este motivo aparece como opção, a validação é garantida pelo próprio banco na hora de gravar a denúncia."
          className="sm:col-span-2"
        >
          {({ atributos, classeErro }) => (
            <select
              {...atributos}
              value={tipo}
              onChange={(evento) => {
                if (ehTipoMotivoDenuncia(evento.target.value)) {
                  setTipo(evento.target.value);
                  limparErroCampo('tipo');
                  limparErroCampo('descricao');
                }
              }}
              required
              className={'input-padrao' + classeErro}
            >
              <option value="" disabled>
                Selecione...
              </option>
              {Object.entries(ROTULO_TIPO_MOTIVO_DENUNCIA).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          )}
        </Campo>

        <Campo
          rotulo="Descrição"
          erro={errosCampo.descricao}
          dica="Texto exibido pra quem for escolher este motivo na tela de denúncia, é o único identificador do motivo, então precisa ser claro por si só."
          className="sm:col-span-2"
        >
          {({ atributos, classeErro }) => (
            <input
              {...atributos}
              type="text"
              value={descricao}
              onChange={(evento) => {
                setDescricao(evento.target.value);
                limparErroCampo('descricao');
              }}
              required
              maxLength={LIMITE_DESCRICAO_MOTIVO_DENUNCIA}
              placeholder="ex.: Campanha com informações falsas ou enganosas"
              className={'input-padrao' + classeErro}
            />
          )}
        </Campo>
      </SecaoFicha>
    </ModalFicha>
  );
}
