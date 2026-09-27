import { useId, useState } from 'react';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { ROTULO_STATUS_CAMPANHA } from '../../services/12-campanha/constants/status-campanha.constants';
import { formatarMoeda } from '../../services/constant/utils/formatacao.util';
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
  const idConfirmacao = useId();
  const [confirmacao, setConfirmacao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const podeExcluir = campanha.status === 'rascunho';
  const confirmado = confirmacao.trim().toLowerCase() === campanha.titulo.trim().toLowerCase();

  const excluir = async () => {
    setExcluindo(true);
    try {
      await campanhaApi.remover(auth.authFetch, campanha.idCampanha);
      mostrar('Campanha excluída com sucesso.', `ID: ${campanha.idCampanha} foi excluída`);
      aoExcluida();
      aoFechar();
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <ModalFicha
      titulo={`Excluir "${campanha.titulo}"`}
      subtitulo={podeExcluir ? 'Não existe botão de desfazer.' : undefined}
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-3 max-w-sm ml-auto">
          <button type="button" onClick={aoFechar} className="btn btn-secondary flex-1">
            {podeExcluir ? 'Cancelar' : 'Fechar'}
          </button>
          {podeExcluir && (
            <button type="button" onClick={excluir} disabled={excluindo || !confirmado} className="btn btn-danger flex-1">
              {excluindo ? 'Excluindo...' : 'Confirmar exclusão'}
            </button>
          )}
        </div>
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
          <div className="rounded-lg border borda-forte fundo-aviso p-4 text-sm texto-aviso">
            <p className="font-bold mb-1">
              <i className="fa-solid fa-circle-info mr-1"></i> O que acontece de verdade
            </p>
            <p>
              A campanha some do sistema para sempre, junto com o orçamento e o cronograma. Só é possível enquanto ela é
              um rascunho.
            </p>
          </div>
          <div>
            <label htmlFor={idConfirmacao} className="rotulo-campo">
              Digite o título "{campanha.titulo}" para confirmar
            </label>
            <input
              id={idConfirmacao}
              type="text"
              value={confirmacao}
              onChange={(evento) => setConfirmacao(evento.target.value)}
              className="input-padrao"
              placeholder={campanha.titulo}
              autoComplete="off"
            />
          </div>
        </>
      ) : (
        <div className="rounded-lg border borda-forte fundo-aviso p-4 text-sm texto-aviso">
          <p className="font-bold mb-1">
            <i className="fa-solid fa-circle-info mr-1"></i> Esta campanha não pode ser excluída
          </p>
          <p>Só dá para excluir campanhas em rascunho. Esta já foi enviada para aprovação ou aprovada.</p>
        </div>
      )}
    </ModalFicha>
  );
}
