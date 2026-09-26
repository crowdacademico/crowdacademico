import { useEffect, useId, useState } from 'react';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { ROTULO_STATUS_CAMPANHA, classeBadgeStatusCampanha } from '../../services/12-campanha/constants/status-campanha.constants';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { orcamentoCampanhaApi } from '../../services/13-orcamento-campanha/api/orcamento-campanha.api';
import { marcoCronogramaApi } from '../../services/14-marco-cronograma/api/marco-cronograma.api';
import { formatarData, formatarDataHora, formatarMoeda } from '../../services/constant/utils/formatacao.util';
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
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const { obterConfiguracao } = useConfiguracoes();
  const valorMinimoOrcamento = obterConfiguracao('orcamento_min_itens', 1);
  const minimoItensOrcamento = typeof valorMinimoOrcamento === 'number' ? valorMinimoOrcamento : 1;
  const valorMinimoCronograma = obterConfiguracao('cronograma_min_marcos', 3);
  const minimoMarcosCronograma = typeof valorMinimoCronograma === 'number' ? valorMinimoCronograma : 3;
  const idJustificativa = useId();

  const [campanha, setCampanha] = useState<CampanhaResponse | null>(null);
  const [orcamento, setOrcamento] = useState<OrcamentoCampanhaResponse[]>([]);
  const [cronograma, setCronograma] = useState<MarcoCronogramaResponse[]>([]);
  const [historico, setHistorico] = useState<HistoricoRejeicaoResponse[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [justificativa, setJustificativa] = useState('');
  const [enviando, setEnviando] = useState(false);

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

  const somaOrcamento = orcamento.reduce((total, item) => total + Number(item.valor), 0);
  const orcamentoOk = campanha !== null && orcamento.length >= minimoItensOrcamento && somaOrcamento === Number(campanha.metaFinanceira);
  const cronogramaOk = cronograma.length >= minimoMarcosCronograma;
  const aguardando = campanha?.status === 'aguardando_aprovacao';

  const decidir = async (acao: 'aprovar' | 'rejeitar') => {
    limparErro();
    setEnviando(true);
    try {
      if (acao === 'aprovar') {
        await campanhaApi.aprovar(auth.authFetch, idCampanha);
        mostrar('Campanha aprovada com sucesso.', `ID: ${idCampanha} foi aprovada`);
      } else {
        await campanhaApi.rejeitar(auth.authFetch, idCampanha, justificativa.trim());
        mostrar('Campanha rejeitada com sucesso.', `ID: ${idCampanha} foi rejeitada`);
      }
      aoConcluido();
      aoFechar();
    } catch (e) {
      reportarErro(e);
    } finally {
      setEnviando(false);
    }
  };

  const itemChecklist = (ok: boolean, texto: string) => (
    <li className={'flex items-start gap-2 text-sm ' + (ok ? 'texto-sucesso' : 'texto-erro')}>
      <i className={'fa-solid mt-1 ' + (ok ? 'fa-circle-check' : 'fa-circle-xmark')} aria-hidden="true"></i>
      <span>{texto}</span>
    </li>
  );

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
          {aguardando && (
            <>
              <button
                type="button"
                onClick={() => void decidir('rejeitar')}
                disabled={enviando || justificativa.trim().length === 0}
                className="btn btn-danger"
                title={justificativa.trim().length === 0 ? 'Escreva o motivo da rejeição para poder rejeitar.' : undefined}
              >
                Rejeitar
              </button>
              <button type="button" onClick={() => void decidir('aprovar')} disabled={enviando || !orcamentoOk || !cronogramaOk} className="btn btn-primary">
                {enviando ? 'Enviando...' : 'Aprovar'}
              </button>
            </>
          )}
        </div>
      }
    >
      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}
      {campanha && (
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            {campanha.precisaRevisaoScore && (
              <p className="fundo-aviso texto-aviso rounded-lg p-3 text-xs font-semibold">
                O pesquisador está abaixo do score mínimo para campanhas. É só um sinal para revisar com mais cuidado; não impede a aprovação.
              </p>
            )}
            {!aguardando && (
              <p className="fundo-info texto-info rounded-lg p-3 text-sm font-semibold">
                Esta campanha não está mais aguardando aprovação ({ROTULO_STATUS_CAMPANHA[campanha.status]}).
              </p>
            )}
            <SecaoFicha titulo="Dados">
              <CampoFicha rotulo="Área do conhecimento" valor={campanha.nomeArea ?? `#${campanha.idAreaConhecimento}`} />
              <CampoFicha rotulo="Modelo" valor={campanha.modelo} />
              <CampoFicha rotulo="Descrição" valor={campanha.descricao} largura="cheia" />
              <CampoFicha rotulo="Vídeo de apresentação" valor={campanha.videoApresentacaoUrl} largura="cheia" />
            </SecaoFicha>
            <SecaoFicha titulo="Datas">
              <CampoFicha rotulo="Início" valor={formatarDataHora(campanha.dataInicio)} />
              <CampoFicha rotulo="Fim (previsto)" valor={formatarDataHora(campanha.dataFim)} />
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
            <div className="fundo-cartao rounded-xl border borda-padrao p-4 space-y-2">
              <p className="rotulo-leitura">Pronta para aprovar?</p>
              <ul className="space-y-1">
                {itemChecklist(orcamentoOk, `Orçamento: ${orcamento.length}/${minimoItensOrcamento} itens e soma igual à meta`)}
                {itemChecklist(cronogramaOk, `Cronograma: ${cronograma.length}/${minimoMarcosCronograma} marcos`)}
              </ul>
            </div>
            {aguardando && (
              <div className="space-y-2">
                <label htmlFor={idJustificativa} className="rotulo-campo">
                  Motivo da rejeição (obrigatório para rejeitar)
                </label>
                <textarea
                  id={idJustificativa}
                  className="input-padrao"
                  rows={4}
                  value={justificativa}
                  onChange={(evento) => setJustificativa(evento.target.value)}
                  placeholder="O pesquisador lê este texto para corrigir e reenviar."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </ModalFicha>
  );
}
