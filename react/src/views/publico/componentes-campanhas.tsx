import { Link } from 'react-router';
import {
  classeBadgeCampanha,
  emBreve,
  ROTULO_MODELO_CAMPANHA,
  rotuloStatusCampanha,
} from '../../services/12-campanha/constants/status-campanha.constants';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import { diasRestantes, formatarData, formatarMoeda, percentualArrecadado } from './util-campanhas';

function iniciaisPesquisador(nome: string | null): string {
  if (!nome) {
    return '';
  }
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toLocaleUpperCase('pt-BR');
}

export function CartaoCampanha({
  campanha,
  seguindo = false,
  seguirDesabilitado = false,
  aoAlternarSeguir,
}: {
  campanha: CampanhaResponse;
  seguindo?: boolean;
  seguirDesabilitado?: boolean;
  aoAlternarSeguir?: (idCampanha: number, titulo: string) => void;
}) {
  const percentual = percentualArrecadado(campanha);
  const aguardandoInicio = emBreve(campanha);
  const diasAteFim = diasRestantes(campanha.dataFim);
  const rotuloTempo = campanha.status === 'ativo'
    ? diasAteFim === null
      ? 'Prazo não informado'
      : `${diasAteFim} dia${diasAteFim === 1 ? '' : 's'} restante${diasAteFim === 1 ? '' : 's'}`
    : `Encerrada em ${formatarData(campanha.dataFim)}`;

  return (
    <article className="cartao-campanha fundo-cartao border borda-padrao rounded-xl overflow-hidden flex flex-col">
      <div className="cartao-campanha__capa relative flex items-center justify-center">
        {campanha.imagemCapaUrl ? (
          <img
            className="cartao-campanha__imagem-capa"
            src={campanha.imagemCapaUrl}
            alt=""
            aria-hidden="true"
          />
        ) : (
          <div className="cartao-campanha__arte" aria-hidden="true">
            <i className="fa-solid fa-flask" />
          </div>
        )}
        <span className="cartao-campanha__modelo">
          {ROTULO_MODELO_CAMPANHA[campanha.modelo]}
        </span>
        <button
          type="button"
          className={`botao-seguir ${seguindo ? 'botao-seguir--ativo' : ''}`}
          aria-pressed={seguindo}
          aria-label={seguindo ? 'Deixar de seguir esta campanha' : 'Seguir esta campanha'}
          disabled={seguirDesabilitado}
          onClick={() => aoAlternarSeguir?.(campanha.idCampanha, campanha.titulo)}
        >
          <i className={`${seguindo ? 'fa-solid' : 'fa-regular'} fa-heart`} aria-hidden="true" />
        </button>
        <span className={`badge ${classeBadgeCampanha(campanha)} cartao-campanha__status`}>
          {rotuloStatusCampanha(campanha)}
        </span>
      </div>
      <div className="cartao-campanha__corpo p-5 min-w-0 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="pagina-publica__tag">{campanha.nomeArea ?? 'Área não informada'}</span>
        </div>
        <h3 className="cartao-campanha__titulo subtitulo">
          <Link className="hover:underline" to={`/campanha/${campanha.idCampanha}`}>
            {campanha.titulo}
          </Link>
        </h3>
        <p className="cartao-campanha__descricao paragrafo texto-padrao mt-3">
          {campanha.descricao || 'Esta campanha ainda não possui uma descrição pública.'}
        </p>
        <div className="cartao-campanha__pesquisador mt-3">
          <span className="cartao-campanha__avatar" aria-hidden="true">
            {iniciaisPesquisador(campanha.nomePesquisador) || (
              <i className="fa-solid fa-user-graduate" />
            )}
          </span>
          <div className="min-w-0">
            {campanha.nomePesquisador ? (
              <Link
                className="cartao-campanha__nome-pesquisador"
                to={`/pesquisador/${campanha.idUsuario}`}
              >
                {campanha.nomePesquisador}
              </Link>
            ) : (
              <span className="cartao-campanha__nome-pesquisador">Pesquisador não informado</span>
            )}
            <span className="cartao-campanha__area-pesquisador">
              {campanha.instituicaoPesquisador ?? 'Instituição não informada'}
            </span>
          </div>
        </div>
        <div className="cartao-campanha__detalhes mt-auto pt-5">
          {aguardandoInicio ? (
            <>
              <div className="cartao-campanha__em-breve">
                <i className="fa-regular fa-clock text-lg shrink-0" aria-hidden="true" />
                <div>
                  <span className="font-bold text-sm block">
                    {campanha.dataInicio
                      ? `Início em ${formatarData(campanha.dataInicio)}`
                      : 'Início previsto'}
                  </span>
                  <span className="paragrafo-denso">Meta: {formatarMoeda(campanha.metaFinanceira)}</span>
                </div>
              </div>
              <span className="fundo-realce px-2 py-1 rounded-md legenda mt-3 inline-block">
                <i className="fa-regular fa-clock mr-1" aria-hidden="true" />
                {rotuloTempo}
              </span>
            </>
          ) : (
            <>
              <div className="flex justify-between items-end gap-3 mb-1.5">
                <span className="numero numero--kpi texto-forte">{formatarMoeda(campanha.valorBrutoArrecadado)}</span>
                <span className="paragrafo-denso texto-fraco">
                  {percentual === null ? 'Meta indisponível' : `${percentual}% da meta`}
                </span>
              </div>
              {percentual !== null && (
                <div className="cartao-campanha__progresso">
                  <div
                    aria-label={`${percentual}% da meta arrecadada`}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(percentual, 100)}
                    className={`cartao-campanha__trilho cartao-campanha__trilho--${campanha.modelo}`}
                  >
                    <div
                      className="cartao-campanha__preenchimento"
                      style={{ width: `${Math.min(percentual, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex flex-nowrap justify-between items-center gap-2 legenda mt-3">
                <span className="fundo-realce px-2 py-1 rounded-md">
                  Meta: {formatarMoeda(campanha.metaFinanceira)}
                </span>
                <span className="fundo-realce px-2 py-1 rounded-md">
                  <i className="fa-regular fa-clock mr-1" aria-hidden="true" />
                  {rotuloTempo}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function EstadoVazio({ children }: { children: string }) {
  return (
    <div className="fundo-cartao border borda-padrao rounded-xl p-8 text-center">
      <p className="paragrafo texto-padrao">{children}</p>
    </div>
  );
}
