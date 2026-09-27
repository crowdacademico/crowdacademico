import { useState } from 'react';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { ConfirmacaoDigitada } from '../../components/input/confirmacao-digitada';
import { confirmacaoConfere } from '../../components/input/confirmacao-confere';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { ROTULO_STATUS_CAMPANHA } from '../../services/12-campanha/constants/status-campanha.constants';
import { formatarMoeda } from '../../services/constant/utils/formatacao.util';
import { useEnvio } from '../../services/constant/hook/use-envio';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';

interface ModalExcluirCampanhaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  campanha: CampanhaResponse;
  aoExcluida: () => void;
  aoFechar: () => void;
}

// Excluir campanha é DELETE de verdade (não lógica, como usuário), com a mesma barreira de Excluir Usuário:
// digitar o título para confirmar. Só vale para rascunho (pol_campanha_delete, 04): depois de enviada, a
// campanha tem histórico na fila e o banco recusa. O modal abre mesmo assim e explica o porquê, em vez de um
// botão cinza sem explicação na tabela.
export function ModalExcluirCampanha({ auth, campanha, aoExcluida, aoFechar }: ModalExcluirCampanhaProps) {
  const { mostrar } = useToast();
  const { reportarErro } = useErroToast();
  const { ocupado: excluindo, executar: executarExcluindo } = useEnvio(reportarErro);
  const [confirmacao, setConfirmacao] = useState('');
  const podeExcluir = campanha.status === 'rascunho';
  const confirmado = confirmacaoConfere(confirmacao, campanha.titulo);

  const excluir = async () => {
    await executarExcluindo(async () => {
      await campanhaApi.remover(auth.authFetch, campanha.idCampanha);
      mostrar('Campanha excluída com sucesso.', `ID: ${campanha.idCampanha} foi excluída`);
      aoExcluida();
      aoFechar();
    });
  };

  return (
    <ModalFicha
      titulo={`Excluir "${campanha.titulo}"`}
      subtitulo={podeExcluir ? 'Não existe botão de desfazer.' : undefined}
      aoFechar={aoFechar}
      rodape={
        <RodapeAcoes
          aoCancelar={aoFechar}
          rotuloCancelar={podeExcluir ? 'Cancelar' : 'Fechar'}
          acao={
            podeExcluir
              ? {
                  rotulo: 'Confirmar exclusão',
                  rotuloOcupado: 'Excluindo...',
                  ocupado: excluindo,
                  desabilitado: !confirmado,
                  aoClicar: () => void excluir(),
                  perigo: true,
                }
              : undefined
          }
        />
      }
    >
      <SecaoFicha titulo={podeExcluir ? 'O que será excluído' : 'Dados da campanha'}>
        <CampoFicha rotulo="id" valor={campanha.idCampanha} />
        <CampoFicha rotulo="Título" valor={campanha.titulo} />
        <CampoFicha rotulo="Status" valor={ROTULO_STATUS_CAMPANHA[campanha.status]} />
        <CampoFicha rotulo="Meta" valor={formatarMoeda(campanha.metaFinanceira)} />
      </SecaoFicha>

      {podeExcluir ? (
        <>
          <CaixaAviso titulo="O que acontece de verdade">
            <p>
              A campanha some do sistema para sempre, junto com o orçamento e o cronograma. Só é possível enquanto ela é
              um rascunho.
            </p>
          </CaixaAviso>
          <ConfirmacaoDigitada oQue="o título" esperado={campanha.titulo} valor={confirmacao} aoMudar={setConfirmacao} />
        </>
      ) : (
        <CaixaAviso titulo="Esta campanha não pode ser excluída">
          <p>Só dá para excluir campanhas em rascunho. Esta já foi enviada para aprovação ou aprovada.</p>
        </CaixaAviso>
      )}
    </ModalFicha>
  );
}
