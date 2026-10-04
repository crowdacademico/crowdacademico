import { useState } from 'react';
import { BadgeStatusEncerramento } from '../../components/crud/badge-status-encerramento';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { Campo } from '../../components/input/campo';
import { ContadorCaracteres } from '../../components/input/contador-caracteres';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { ROTULO_MODELO_CAMPANHA } from '../../services/12-campanha/constants/status-campanha.constants';
import { solicitacaoEncerramentoApi } from '../../services/20-solicitacao-encerramento/api/solicitacao-encerramento.api';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { formatarDataHora, formatarMoeda } from '../../services/constant/util/formatacao.util';
import { contarCaracteres } from '../../services/constant/util/validacao.util';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { SolicitacaoEncerramentoResponse } from '../../services/20-solicitacao-encerramento/type/solicitacao-encerramento.type';

interface ModalDecidirEncerramentoProps {
  authFetch: AuthFetch;
  pedido: SolicitacaoEncerramentoResponse;
  aoFechar: () => void;
  aoDecidido: () => void;
}

// Decidir um pedido de encerramento antecipado (RF-065): o que o pesquisador pediu, com o modelo, o arrecadado e as
// contribuições confirmadas. Aprovar encerra a campanha na hora (pede confirmação); rejeitar exige justificativa e a
// campanha segue ativa. Pedido já decidido ou cancelado só se consulta.
export function ModalDecidirEncerramento({ authFetch, pedido, aoFechar, aoDecidido }: ModalDecidirEncerramentoProps) {
  const [justificativa, setJustificativa] = useState('');
  const [confirmandoAprovar, setConfirmandoAprovar] = useState(false);
  const [rejeitando, setRejeitando] = useState(false);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const limite = useConfiguracoes().obterNumero('limite_caracteres_justificativa_encerramento', 2000);
  const pendente = pedido.status === 'pendente';

  const erros = useErrosFormulario(() => ({
    justificativa:
      rejeitando && justificativa.trim() === ''
        ? 'Escreva por que o pedido foi rejeitado.'
        : contarCaracteres(justificativa) > limite && `A justificativa passou do limite de ${limite.toLocaleString('pt-BR')} caracteres.`,
  }));

  const decidir = async (aprovar: boolean) => {
    setRejeitando(!aprovar);
    if (!aprovar && justificativa.trim() === '') {
      erros.tentarEnviar();
      return;
    }
    if (aprovar && !confirmandoAprovar) {
      setConfirmandoAprovar(true);
      return;
    }
    await executar(async () => {
      await solicitacaoEncerramentoApi.decidir(authFetch, pedido.idSolicitacao, aprovar, justificativa.trim() || undefined);
      mostrar(aprovar ? 'Pedido aprovado: campanha encerrada.' : 'Pedido rejeitado: a campanha segue ativa.', pedido.tituloCampanha ?? '');
      aoDecidido();
      aoFechar();
    });
  };

  return (
    <ModalFicha
      titulo={`Pedido de encerramento #${pedido.idSolicitacao}`}
      subtitulo={pedido.tituloCampanha ?? `Campanha #${pedido.idCampanha}`}
      badges={[<BadgeStatusEncerramento key="status" status={pedido.status} />]}
      aoFechar={aoFechar}
      erro={erro}
      rodape={
        <RodapeAcoes
          aoCancelar={aoFechar}
          rotuloCancelar={pendente ? 'Cancelar' : 'Fechar'}
          acao={
            pendente
              ? [
                  { rotulo: 'Rejeitar', ocupado, aoClicar: () => void decidir(false) },
                  {
                    rotulo: confirmandoAprovar ? 'Confirmar: encerrar a campanha' : 'Aprovar',
                    rotuloOcupado: 'Salvando...',
                    ocupado,
                    perigo: confirmandoAprovar,
                    aoClicar: () => void decidir(true),
                  },
                ]
              : undefined
          }
        />
      }
    >
      <div className="space-y-6">
        <SecaoFicha titulo="O pedido">
          <CampoFicha rotulo="Pesquisador" valor={pedido.nomePesquisador ?? (pedido.idPesquisador === null ? '-' : `#${pedido.idPesquisador}`)} />
          <CampoFicha rotulo="Pedido em" valor={formatarDataHora(pedido.solicitadoEm)} />
          <CampoFicha rotulo="Modelo" valor={pedido.modeloCampanha ? ROTULO_MODELO_CAMPANHA[pedido.modeloCampanha] : '-'} />
          <CampoFicha rotulo="Arrecadado" valor={formatarMoeda(pedido.valorArrecadado)} />
          <CampoFicha rotulo="Contribuições confirmadas" valor={pedido.contribuicoesConfirmadas} />
          <CampoFicha rotulo="Justificativa do pesquisador" valor={pedido.justificativaPesquisador} largura="cheia" />
        </SecaoFicha>

        {pendente ? (
          <SecaoFicha titulo="Decisão" colunas={1}>
            <Campo rotulo="Justificativa (obrigatória para rejeitar)" erro={erros.erroDe('justificativa')}>
              {({ atributos, classeErro }) => (
                <>
                  <textarea
                    {...atributos}
                    rows={3}
                    value={justificativa}
                    onChange={(evento) => setJustificativa(evento.target.value)}
                    className={'input-padrao' + classeErro}
                  />
                  <ContadorCaracteres texto={justificativa} limite={limite} />
                </>
              )}
            </Campo>
            {confirmandoAprovar && (
              <CaixaAviso tom="erro" icone="fa-triangle-exclamation" titulo="Aprovar encerra a campanha agora">
                {pedido.modeloCampanha === 'flexivel'
                  ? 'No modelo flexível, o valor arrecadado até aqui vai para o pesquisador.'
                  : 'No modelo tudo ou nada, todo o valor arrecadado volta para os apoiadores.'}{' '}
                A campanha para de receber apoio e não dá para desfazer.
              </CaixaAviso>
            )}
          </SecaoFicha>
        ) : (
          <SecaoFicha titulo="Decisão">
            <CampoFicha
              rotulo="Decidido por"
              valor={pedido.status === 'aprovado' && pedido.idAdmin === null ? 'O próprio pesquisador (sem contribuição)' : (pedido.nomeAdmin ?? '-')}
            />
            <CampoFicha rotulo="Em" valor={formatarDataHora(pedido.avaliadoEm)} />
            <CampoFicha rotulo="Justificativa" valor={pedido.justificativaAdmin} largura="cheia" />
          </SecaoFicha>
        )}
      </div>
    </ModalFicha>
  );
}
