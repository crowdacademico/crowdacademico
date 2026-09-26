import { useEffect, useState } from 'react';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import {
  ROTULO_STATUS_CAMPANHA,
  classeBadgeStatusCampanha,
} from '../../services/12-campanha/constants/status-campanha.constants';
import { useBuscarPorId } from '../../services/constant/hook/use-buscar-por-id';
import { formatarDataHora, formatarMoeda } from '../../services/constant/utils/formatacao.util';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { HistoricoRejeicaoResponse } from '../../services/12-campanha/type/campanha.type';

interface ModalConsultarCampanhaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  aoFechar: () => void;
}

// Consultar em modal. Recebe só `idCampanha` (não a linha inteira da listagem) e busca a campanha de novo, de
// propósito: diferente dos catálogos simples (ver modal-motivo-denuncia.tsx), a linha de `listar-campanhas.tsx`
// é TRANSFORMADA para exibição (`status` vira rótulo em português, `metaFinanceira`/`valorBrutoArrecadado`
// viram string já formatada em R$): usar a linha direto quebraria o badge de status e formataria moeda em cima
// de moeda já formatada. `useBuscarPorId` pega o dado cru de verdade.
export function ModalConsultarCampanha({ auth, idCampanha, aoFechar }: ModalConsultarCampanhaProps) {
  const { dado: campanha, carregando, erro } = useBuscarPorId(
    (id) => campanhaApi.buscar(auth.authFetch, id),
    String(idCampanha),
  );
  const [historicoRejeicao, setHistoricoRejeicao] = useState<HistoricoRejeicaoResponse[]>([]);

  useEffect(() => {
    if (campanha) {
      campanhaApi
        .listarHistoricoRejeicao(auth.authFetch, campanha.idCampanha)
        .then(setHistoricoRejeicao)
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanha]);

  if (!carregando && !campanha) {
    return (
      <ModalFicha
        titulo={`#${idCampanha}`}
        aoFechar={aoFechar}
        rodape={
          <button type="button" onClick={aoFechar} className="btn btn-secondary w-full max-w-sm ml-auto">
            Fechar
          </button>
        }
      >
        <p className="texto-erro text-sm font-bold text-center">{erro}</p>
      </ModalFicha>
    );
  }

  return (
    <ModalFicha
      titulo={campanha?.titulo ?? `#${idCampanha}`}
      carregando={carregando || !campanha}
      subtitulo={campanha?.nomePesquisador ? `Pesquisador: ${campanha.nomePesquisador}` : undefined}
      badges={
        campanha
          ? [
              <span key="status" className={`badge ${classeBadgeStatusCampanha(campanha.status)}`}>
                {ROTULO_STATUS_CAMPANHA[campanha.status]}
              </span>,
              <span key="modelo" className="badge badge-neutro">
                {campanha.modelo}
              </span>,
            ]
          : undefined
      }
      aoFechar={aoFechar}
      rodape={
        <button type="button" onClick={aoFechar} className="btn btn-secondary w-full max-w-sm ml-auto">
          Fechar
        </button>
      }
    >
      {campanha && (
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            {campanha.precisaRevisaoScore && (
              <p className="fundo-aviso texto-aviso rounded-lg p-3 text-xs font-semibold">
                O pesquisador está abaixo do score mínimo para campanhas. É só um sinal para revisar esta campanha
                com mais cuidado; não impede a aprovação.
              </p>
            )}
            <SecaoFicha titulo="Dados">
              <CampoFicha rotulo="id" valor={campanha.idCampanha} />
              <CampoFicha rotulo="Área do conhecimento" valor={campanha.nomeArea ?? `#${campanha.idAreaConhecimento}`} />
              <CampoFicha rotulo="Descrição" valor={campanha.descricao} largura="cheia" />
              <CampoFicha rotulo="Vídeo de apresentação" valor={campanha.videoApresentacaoUrl} largura="cheia" />
            </SecaoFicha>

            <SecaoFicha titulo="Datas">
              <CampoFicha rotulo="Início" valor={formatarDataHora(campanha.dataInicio)} />
              <CampoFicha rotulo="Fim (previsto)" valor={formatarDataHora(campanha.dataFim)} />
              <CampoFicha rotulo="Criada em" valor={formatarDataHora(campanha.criadoEm)} />
              <CampoFicha rotulo="Aprovada em" valor={formatarDataHora(campanha.aprovadoEm)} />
              <CampoFicha rotulo="Encerrada em" valor={formatarDataHora(campanha.encerradoEm)} />
            </SecaoFicha>

            {/* Escondida quando vazia, de propósito: rejeição é minoria, mostrar "nenhuma" sempre seria
                ruído. */}
            {historicoRejeicao.length > 0 && (
              <SecaoFicha titulo="Histórico de Rejeições">
                {historicoRejeicao.map((item) => (
                  <CampoFicha
                    key={item.idRejeicao}
                    rotulo={formatarDataHora(item.rejeitadoEm)}
                    valor={`${item.justificativa ?? 'Sem justificativa registrada.'} (${item.nomeAdmin ?? 'Administrador removido'})`}
                    largura="cheia"
                  />
                ))}
              </SecaoFicha>
            )}
          </div>

          <div className="space-y-6">
            <SecaoFicha titulo="Financeiro">
              <CampoFicha rotulo="Meta" valor={formatarMoeda(campanha.metaFinanceira)} />
              <CampoFicha rotulo="Arrecadado" valor={formatarMoeda(campanha.valorBrutoArrecadado)} />
              <CampoFicha
                rotulo="Taxa da plataforma"
                valor={campanha.taxaPlataforma === null ? 'Ainda não carimbada (não aprovada)' : `${campanha.taxaPlataforma}%`}
              />
            </SecaoFicha>
          </div>
        </div>
      )}
    </ModalFicha>
  );
}
