import { useEffect, useState } from 'react';
import { BarraProgresso } from '../../components/crud/barra-progresso';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { orcamentoCampanhaApi } from '../../services/13-orcamento-campanha/api/orcamento-campanha.api';
import { marcoCronogramaApi } from '../../services/14-marco-cronograma/api/marco-cronograma.api';
import { formatarData, formatarMoeda } from '../../services/constant/util/formatacao.util';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { OrcamentoCampanhaResponse } from '../../services/13-orcamento-campanha/type/orcamento-campanha.type';
import type { MarcoCronogramaResponse } from '../../services/14-marco-cronograma/type/marco-cronograma.type';
import { EstadoVazio } from '../../components/crud/estado-vazio';

interface EtapaRevisaoCampanhaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  titulo: string;
  nomeArea: string;
  meta: number;
  // Datas no formato do <input type="date"> (yyyy-mm-dd), como no formulário da etapa Dados.
  dataInicio: string;
  dataFim: string;
  duracaoDias: number | null;
  prazoValido: boolean;
  minimoItensOrcamento: number;
  minimoMarcosCronograma: number;
}

// Última etapa do passo a passo: tudo o que vai para a avaliação, num lugar só, e o checklist do que o banco vai
// cobrar no envio (os mesmos critérios do "Pronta para aprovar?" do Revisar). O checklist só orienta: o botão
// Enviar continua clicável, e quem decide é o banco (trg_campanha_valida_completude), que diz o que falta.
export function EtapaRevisaoCampanha({
  auth,
  idCampanha,
  titulo,
  nomeArea,
  meta,
  dataInicio,
  dataFim,
  duracaoDias,
  prazoValido,
  minimoItensOrcamento,
  minimoMarcosCronograma,
}: EtapaRevisaoCampanhaProps) {
  const { reportarErro } = useErroToast();
  const [orcamento, setOrcamento] = useState<OrcamentoCampanhaResponse[]>([]);
  const [cronograma, setCronograma] = useState<MarcoCronogramaResponse[]>([]);

  useEffect(() => {
    Promise.all([orcamentoCampanhaApi.listar(auth.authFetch, idCampanha), marcoCronogramaApi.listar(auth.authFetch, idCampanha)])
      .then(([itens, marcos]) => {
        setOrcamento(itens);
        setCronograma([...marcos].sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista)));
      })
      .catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, idCampanha]);

  const soma = orcamento.reduce((total, item) => total + Number(item.valor), 0);
  const orcamentoOk = orcamento.length >= minimoItensOrcamento && soma === meta;
  const cronogramaOk = cronograma.length >= minimoMarcosCronograma;
  const tudoPronto = orcamentoOk && cronogramaOk && prazoValido;

  const item = (ok: boolean, texto: string) => (
    <li className={'paragrafo flex items-start gap-2 texto-herdado ' + (ok ? 'texto-sucesso' : 'texto-erro')}>
      <i className={'fa-solid mt-1 ' + (ok ? 'fa-circle-check' : 'fa-circle-xmark')} aria-hidden="true"></i>
      <span>{texto}</span>
    </li>
  );

  return (
    <div className="space-y-6">
      <div className={'rounded-lg border p-4 ' + (tudoPronto ? 'fundo-sucesso borda-sucesso' : 'fundo-aviso borda-padrao')}>
        <p className="paragrafo-destaque mb-2 texto-herdado">
          {tudoPronto ? 'Tudo pronto para enviar.' : 'Antes de enviar, confira o que ainda falta:'}
        </p>
        <ul className="space-y-1">
          {item(prazoValido, `Prazo: ${duracaoDias ?? '?'} dias, começando hoje ou depois.`)}
          {item(
            orcamento.length >= minimoItensOrcamento,
            `Orçamento: ${orcamento.length} de pelo menos ${minimoItensOrcamento} ${minimoItensOrcamento === 1 ? 'item' : 'itens'}.`,
          )}
          {item(soma === meta, `Soma do orçamento igual à meta: ${formatarMoeda(soma)} de ${formatarMoeda(meta)}.`)}
          {item(cronogramaOk, `Cronograma: ${cronograma.length} de pelo menos ${minimoMarcosCronograma} marcos.`)}
        </ul>
      </div>

      <SecaoFicha titulo="Dados">
        <CampoFicha rotulo="Título" valor={titulo} largura="cheia" />
        <CampoFicha rotulo="Área do conhecimento" valor={nomeArea} />
        <CampoFicha rotulo="Meta" valor={formatarMoeda(meta)} />
        <CampoFicha
          rotulo="Período"
          valor={`${formatarData(`${dataInicio}T12:00:00`)} a ${formatarData(`${dataFim}T12:00:00`)}`}
        />
        <CampoFicha rotulo="Duração" valor={duracaoDias === null ? null : `${duracaoDias} dias`} />
      </SecaoFicha>

      <SecaoFicha titulo={`Orçamento (${orcamento.length} ${orcamento.length === 1 ? 'item' : 'itens'})`} colunas={1}>
        {orcamento.length === 0 ? (
          <EstadoVazio compacto icone="fa-coins" titulo="Nenhum item de orçamento ainda." texto="Volte à etapa Orçamento para adicionar." />
        ) : (
          <ul className="space-y-1">
            {orcamento.map((itemOrcamento) => (
              <li key={itemOrcamento.idOrcamento} className="paragrafo flex justify-between gap-4 texto-herdado">
                <span>{itemOrcamento.categoria}</span>
                <span className="enfase">{formatarMoeda(itemOrcamento.valor)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="paragrafo flex items-center justify-between gap-4 texto-herdado">
          <span className="texto-fraco">Soma dos itens em relação à meta</span>
          <BarraProgresso valor={soma} total={meta} rotulo="Soma do orçamento em relação à meta" />
        </div>
      </SecaoFicha>

      <SecaoFicha titulo={`Cronograma (${cronograma.length} marcos)`} colunas={1}>
        {cronograma.length === 0 ? (
          <EstadoVazio compacto icone="fa-calendar-days" titulo="Nenhum marco no cronograma ainda." texto="Volte à etapa Cronograma para adicionar." />
        ) : (
          <ol className="linha-tempo">
            {cronograma.map((marco) => (
              <li key={marco.idMarco} className="linha-tempo__item">
                <p className="linha-tempo__data">{formatarData(marco.dataPrevista)}</p>
                <p className="linha-tempo__titulo">{marco.titulo}</p>
              </li>
            ))}
          </ol>
        )}
      </SecaoFicha>
    </div>
  );
}
