import { useState } from 'react';
import { BadgeBooleano } from '../../components/crud/badge-booleano';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { ModalExcluirItem } from '../../components/crud/modal-excluir-item';
import { Campo } from '../../components/input/campo';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { CaixaMarcacao } from '../../components/input/caixa-marcacao';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';
import {
  ehTipoMotivoDenuncia,
  LIMITE_DESCRICAO_MOTIVO_DENUNCIA,
  ROTULO_TIPO_MOTIVO_DENUNCIA as ROTULO_TIPO,
} from '../../services/10-motivo-denuncia/constants/motivo-denuncia.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { MotivoDenunciaResponse, TipoMotivoDenuncia } from '../../services/10-motivo-denuncia/type/motivo-denuncia.type';

// Consultar/Alterar/Excluir em modal. Recebem a linha (`motivo: MotivoDenunciaResponse`) inteira do chamador: o
// `GenericTable` já tem o dado completo em memória (`aoAlterar`/`aoConsultar`/`aoExcluir` recebem `linha: T`),
// não precisa refazer a busca por id como ModalAlterarUsuario faz (que precisa de MUITO mais dado do que a
// linha da tabela tem). Criar fica em arquivo separado (modal-criar-motivo-denuncia.tsx), mesmo padrão de
// modal-usuario.tsx/modal-criar-usuario.tsx.

interface ModalConsultarMotivoDenunciaProps {
  motivo: MotivoDenunciaResponse;
  aoFechar: () => void;
}

export function ModalConsultarMotivoDenuncia({ motivo, aoFechar }: ModalConsultarMotivoDenunciaProps) {
  return (
    <ModalFicha
      titulo={motivo.descricao}
      badges={[
        <BadgeBooleano key="ativo" valor={motivo.ativo} rotuloTrue="Ativo" rotuloFalse="Inativo" />,
        <span key="tipo" className="badge badge-neutro">
          {ROTULO_TIPO[motivo.tipo]}
        </span>,
      ]}
      aoFechar={aoFechar}
      rodape={
        <RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />
      }
    >
      <SecaoFicha titulo="Dados">
        <CampoFicha rotulo="id" valor={motivo.idMotivo} />
        <CampoFicha rotulo="Tipo" valor={ROTULO_TIPO[motivo.tipo]} />
        <CampoFicha rotulo="Descrição" valor={motivo.descricao} largura="cheia" />
      </SecaoFicha>
    </ModalFicha>
  );
}

interface ModalAlterarMotivoDenunciaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  motivo: MotivoDenunciaResponse;
  aoFechar: () => void;
  aoAtualizado: () => void;
}

export function ModalAlterarMotivoDenuncia({ auth, motivo, aoFechar, aoAtualizado }: ModalAlterarMotivoDenunciaProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro, errosCampo, limparErroCampo } = useErroToast();
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const [descricao, setDescricao] = useState(motivo.descricao);
  const [tipo, setTipo] = useState<TipoMotivoDenuncia>(motivo.tipo);
  const [ativo, setAtivo] = useState(motivo.ativo);

  const sujo = descricao !== motivo.descricao || tipo !== motivo.tipo || ativo !== motivo.ativo;
  useAvisoAlteracaoNaoSalva(sujo);

  const fechar = () => {
    if (!confirmarSaida(sujo)) {
      return;
    }
    aoFechar();
  };

  const aoSalvar = async () => {
    await executarEnviando(async () => {
      await motivoDenunciaApi.atualizar(auth.authFetch, motivo.idMotivo, { descricao, tipo, ativo });
      mostrar('Motivo de denúncia alterado com sucesso.', `ID: ${motivo.idMotivo} foi alterado`);
      aoAtualizado();
      aoFechar();
    });
  };

  return (
    <ModalFicha
      titulo={`Alterar "${motivo.descricao}"`}
      aoFechar={fechar}
      rodape={
        <RodapeAcoes
          aoCancelar={fechar}
          acao={{
            rotulo: 'Salvar',
            rotuloOcupado: 'Salvando...',
            ocupado: enviando,
            desabilitado: !sujo || descricao.trim() === '',
            aoClicar: () => void aoSalvar(),
          }}
        />
      }
      erro={erro}
    >
      <SecaoFicha titulo="Editar">
        <Campo
          rotulo="Tipo"
          erro={errosCampo.tipo}
          dica="Alterar isto muda em qual tela de denúncia este motivo aparece daqui pra frente, denúncias antigas que já usaram este motivo não são afetadas retroativamente."
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
              {Object.entries(ROTULO_TIPO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          )}
        </Campo>

        <Campo rotulo="Descrição" erro={errosCampo.descricao} className="sm:col-span-2">
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
              className={'input-padrao' + classeErro}
            />
          )}
        </Campo>

        <CaixaMarcacao rotulo="Ativo" marcado={ativo} aoMudar={setAtivo} className="sm:col-span-2" />
      </SecaoFicha>
    </ModalFicha>
  );
}

interface ModalExcluirMotivoDenunciaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  motivo: MotivoDenunciaResponse;
  aoFechar: () => void;
  aoExcluido: () => void;
}

export function ModalExcluirMotivoDenuncia({ auth, motivo, aoFechar, aoExcluido }: ModalExcluirMotivoDenunciaProps) {
  return (
    <ModalExcluirItem
      nome={motivo.descricao}
      campos={
        <>
          <CampoFicha rotulo="Descrição" valor={motivo.descricao} largura="cheia" />
          <CampoFicha rotulo="Tipo" valor={ROTULO_TIPO[motivo.tipo]} />
        </>
      }
      explicacao="Se este motivo já tiver sido usado em alguma denúncia, a exclusão é bloqueada pelo próprio banco: desative-o em vez de excluir. Se não estiver em uso, some do catálogo pra sempre, sem exclusão lógica."
      remover={() => motivoDenunciaApi.remover(auth.authFetch, motivo.idMotivo)}
      mensagemSucesso="Motivo de denúncia excluído com sucesso."
      detalheSucesso={`ID: ${motivo.idMotivo} foi excluído`}
      aoFechar={aoFechar}
      aoExcluido={aoExcluido}
    />
  );
}
