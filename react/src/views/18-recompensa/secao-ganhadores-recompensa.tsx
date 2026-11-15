import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { Carregando } from '../../components/layout/carregando';
import { recompensaApi } from '../../services/18-recompensa/api/recompensa.api';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { formatarData, formatarMoeda } from '../../services/constant/util/formatacao.util';

// "Quem ganhou" no Consultar da recompensa (Estúdio), para o pesquisador saber a quem entregar, principalmente o
// reconhecimento (16-11-2026, pedido da Alexia). Só o nome (ou "Apoiador anônimo"): o e-mail de quem apoiou não vem.
// Só contribuição paga e não devolvida aparece. No Tudo ou Nada, a recompensa fica "aguardando a meta" até a campanha
// bater a meta (recompensa_liberada, 03).
export function SecaoGanhadoresRecompensa({ authFetch, idRecompensa }: { authFetch: AuthFetch; idRecompensa: number }) {
  const { dado, carregando, erro } = useBuscar(() => recompensaApi.ganhadores(authFetch, idRecompensa), [authFetch, idRecompensa], {
    mostraTexto: true,
  });

  return (
    <SecaoFicha titulo={`Quem ganhou${dado ? ` (${dado.length})` : ''}`} colunas={1}>
      {carregando && <Carregando />}
      {!carregando && erro && <MensagemErro texto={erro} />}
      {!carregando && !erro && dado?.length === 0 && (
        <p className="paragrafo texto-fraco">Ninguém ganhou esta recompensa ainda.</p>
      )}
      {!carregando && !erro && dado && dado.length > 0 && (
        <ul className="flex flex-col divide-y divide-[var(--cor-borda)]">
          {dado.map((ganhador) => (
            <li key={ganhador.idContribuicao} className="py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <span className="paragrafo enfase texto-forte">{ganhador.apoiador}</span>
              <span className="legenda texto-fraco inline-flex items-center gap-3">
                <span className="numero">{formatarMoeda(ganhador.valor)}</span>
                <span>{formatarData(ganhador.ganhaEm)}</span>
                <span className={'badge ' + (ganhador.liberada ? 'badge-sucesso' : 'badge-aviso')}>
                  {ganhador.liberada ? 'Liberada' : 'Aguardando a meta'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="legenda texto-fraco">
        Só aparece quem apoiou com a conta e já pagou. Quem apoia como anônimo aparece como "Apoiador anônimo" e não ganha o
        reconhecimento. No Tudo ou Nada, a recompensa só é liberada quando a campanha bate a meta.
      </p>
    </SecaoFicha>
  );
}
