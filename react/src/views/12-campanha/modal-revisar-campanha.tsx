import { useEffect, useState } from 'react';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { ROTULO_MODELO_CAMPANHA, ROTULO_STATUS_CAMPANHA, classeBadgeStatusCampanha } from '../../services/12-campanha/constants/status-campanha.constants';
import { useDecisaoAprovacao, usePronta } from '../../services/12-campanha/hook/use-decisao-aprovacao';
import { BotoesDecisao, CampoMotivoRejeicao, ChecklistAprovacao } from './decisao-aprovacao';
import { orcamentoCampanhaApi } from '../../services/13-orcamento-campanha/api/orcamento-campanha.api';
import { marcoCronogramaApi } from '../../services/14-marco-cronograma/api/marco-cronograma.api';
import { formatarData, formatarDataHora, formatarMoeda } from '../../services/constant/util/formatacao.util';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { CampanhaResponse, HistoricoRejeicaoResponse } from '../../services/12-campanha/type/campanha.type';
import type { OrcamentoCampanhaResponse } from '../../services/13-orcamento-campanha/type/orcamento-campanha.type';
import type { MarcoCronogramaResponse } from '../../services/14-marco-cronograma/type/marco-cronograma.type';

interface ModalRevisarCampanhaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  aoFechar: () => void;
  aoConcluido: () => void;
}

// Revisão de uma campanha da fila de aprovação: tudo o que o admin precisa ler para decidir (dados, orçamento,
// cronograma, histórico de rejeições, sinal de score baixo) e os dois botões, Aprovar e Rejeitar. O checklist
// "Pronta para aprovar?" só ajuda a decidir; quem barra de verdade é o banco (fn_valida_completude_campanha,
// 90009 a 90011).
export function ModalRevisarCampanha({ auth, idCampanha, aoFechar, aoConcluido }: ModalRevisarCampanhaProps) {
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  // Aprovar/Rejeitar: a mesma regra e as mesmas peças do T2 do Campo de Testes (decisao-aprovacao.tsx).
  const decisao = useDecisaoAprovacao({
    authFetch: auth.authFetch,
    idCampanha,
    reportarErro,
    limparErro,
    aoConcluido: () => {
      aoConcluido();
      aoFechar();
    },
  });

  const [campanha, setCampanha] = useState<CampanhaResponse | null>(null);
  const [orcamento, setOrcamento] = useState<OrcamentoCampanhaResponse[]>([]);
  const [cronograma, setCronograma] = useState<MarcoCronogramaResponse[]>([]);
  const [historico, setHistorico] = useState<HistoricoRejeicaoResponse[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      campanhaApi.buscar(auth.authFetch, idCampanha),
      orcamentoCampanhaApi.listar(auth.authFetch, idCampanha).catch(() => []),
      marcoCronogramaApi.listar(auth.authFetch, idCampanha).catch(() => []),
      campanhaApi.listarHistoricoRejeicao(auth.authFetch, idCampanha).catch(() => []),
    ])
      .then(([c, o, m, h]) => {
        if (!ativo) return;
        setCampanha(c);
        setOrcamento(o);
        setCronograma(m);
        setHistorico(h);
      })
      .catch((e: unknown) => {
        if (ativo) reportarErro(e);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, idCampanha]);

  const dadosDecisao = { orcamento, cronograma, metaFinanceira: campanha?.metaFinanceira ?? 0 };
  const { soma: somaOrcamento, pronta } = usePronta(dadosDecisao);
  const aguardando = campanha?.status === 'aguardando_aprovacao';

  return (
    <ModalFicha
      titulo={campanha?.titulo ?? `#${idCampanha}`}
      carregando={carregando}
      subtitulo={campanha?.nomePesquisador ? `Pesquisador: ${campanha.nomePesquisador}` : undefined}
      badges={
        campanha
          ? [
              <span key="status" className={`badge ${classeBadgeStatusCampanha(campanha.status)}`}>
                {ROTULO_STATUS_CAMPANHA[campanha.status]}
              </span>,
            ]
          : undefined
      }
      aoFechar={aoFechar}
      rodape={
        <div className="flex flex-wrap gap-3 justify-end">
          <button type="button" onClick={aoFechar} className="btn btn-secondary">
            Fechar
          </button>
          {aguardando && <BotoesDecisao decisao={decisao} pronta={pronta} />}
        </div>
      }
      erro={erro}
    >
      {campanha && (
        <div className="grade-ficha">
          <div className="lg:col-span-2 space-y-6">
            {campanha.precisaRevisaoScore && (
              <p className="legenda-destaque fundo-aviso texto-aviso rounded-lg p-3">
                O pesquisador está abaixo do score mínimo para campanhas. É só um sinal para revisar com mais cuidado; não impede a aprovação.
              </p>
            )}
            {!aguardando && (
              <p className="paragrafo-destaque fundo-info texto-info rounded-lg p-3">
                Esta campanha não está mais aguardando aprovação ({ROTULO_STATUS_CAMPANHA[campanha.status]}).
              </p>
            )}
            <SecaoFicha titulo="Dados">
              <CampoFicha rotulo="Área do conhecimento" valor={campanha.nomeArea ?? `#${campanha.idAreaConhecimento}`} />
              <CampoFicha rotulo="Modelo" valor={ROTULO_MODELO_CAMPANHA[campanha.modelo]} />
              <CampoFicha rotulo="Descrição" valor={campanha.descricao} largura="cheia" />
              <CampoFicha rotulo="Vídeo de apresentação" valor={campanha.videoApresentacaoUrl} largura="cheia" />
            </SecaoFicha>
            <SecaoFicha titulo="Datas">
              <CampoFicha rotulo="Início" valor={formatarData(campanha.dataInicio)} />
              <CampoFicha rotulo="Fim (previsto)" valor={formatarData(campanha.dataFim)} />
              <CampoFicha rotulo="Criada em" valor={formatarDataHora(campanha.criadoEm)} />
            </SecaoFicha>
            <SecaoFicha titulo={`Orçamento (${orcamento.length} ${orcamento.length === 1 ? 'item' : 'itens'})`}>
              {orcamento.length === 0 && <CampoFicha rotulo="Itens" valor="Nenhum item cadastrado." largura="cheia" />}
              {orcamento.map((item) => (
                <CampoFicha key={item.idOrcamento} rotulo={item.categoria} valor={`${formatarMoeda(item.valor)}${item.descricao ? ` - ${item.descricao}` : ''}`} largura="cheia" />
              ))}
            </SecaoFicha>
            <SecaoFicha titulo={`Cronograma (${cronograma.length} ${cronograma.length === 1 ? 'marco' : 'marcos'})`}>
              {cronograma.length === 0 && <CampoFicha rotulo="Marcos" valor="Nenhum marco cadastrado." largura="cheia" />}
              {cronograma.map((marco) => (
                <CampoFicha key={marco.idMarco} rotulo={formatarData(marco.dataPrevista)} valor={marco.titulo} largura="cheia" />
              ))}
            </SecaoFicha>
            {historico.length > 0 && (
              <SecaoFicha titulo="Histórico de rejeições">
                {historico.map((item) => (
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
              <CampoFicha rotulo="Soma do orçamento" valor={formatarMoeda(somaOrcamento)} />
            </SecaoFicha>
            <ChecklistAprovacao {...dadosDecisao} />
            {aguardando && <CampoMotivoRejeicao decisao={decisao} />}
          </div>
        </div>
      )}
    </ModalFicha>
  );
}
