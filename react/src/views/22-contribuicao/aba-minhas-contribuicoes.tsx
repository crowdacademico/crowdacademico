import { useCallback, useEffect, useState } from 'react';
import { BadgeStatusContribuicao } from '../../components/crud/badge-status-contribuicao';
import { EstadoVazio } from '../../components/crud/estado-vazio';
import { GenericTable } from '../../components/crud/generic-table';
import { Carregando } from '../../components/layout/carregando';
import { recompensaApi } from '../../services/18-recompensa/api/recompensa.api';
import { ROTULO_TIPO_RECOMPENSA } from '../../services/18-recompensa/constants/recompensa.constants';
import { contribuicaoApi } from '../../services/22-contribuicao/api/contribuicao.api';
import { ROTULO_MEIO_PAGAMENTO } from '../../services/22-contribuicao/constants/contribuicao.constants';
import { ROTULO_STATUS_CONTRIBUICAO } from '../../services/22-contribuicao/constants/status-contribuicao.constants';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { RecompensaGanha } from '../../services/18-recompensa/type/recompensa.type';
import type { MinhaContribuicao } from '../../services/22-contribuicao/type/contribuicao.type';

interface ContribuicaoLinha extends MinhaContribuicao {
  campanha: string;
  meio: string;
  situacao: string;
  recompensa: string;
}

// Aba Contribuições da Minha Conta (RF-009, RF-085, RF-101): o histórico de contribuições da própria conta e as
// recompensas que ela ganhou, com o link especial de cada uma. Mora em 22-contribuicao (o dono do dado). Contribuir é
// na página pública da campanha, que ainda não existe; hoje uma contribuição nasce pela T5 do Campo de Testes.
export function AbaMinhasContribuicoes({ auth }: { auth: Pick<UseAuthReturn, 'authFetch'> }) {
  const [recompensas, setRecompensas] = useState<RecompensaGanha[] | null>(null);

  useEffect(() => {
    recompensaApi
      .minhas(auth.authFetch)
      .then(setRecompensas)
      .catch(() => setRecompensas([]));
  }, [auth.authFetch]);

  const listar = useCallback(async (): Promise<ContribuicaoLinha[]> => {
    const lista = await contribuicaoApi.minhas(auth.authFetch);
    return lista.map((c) => ({
      ...c,
      campanha: c.tituloCampanha ?? `Campanha #${c.idCampanha}`,
      meio: ROTULO_MEIO_PAGAMENTO[c.meioPagamento],
      situacao: ROTULO_STATUS_CONTRIBUICAO[c.status],
      recompensa: c.tituloRecompensa ?? '-',
    }));
  }, [auth.authFetch]);

  return (
    <div className="px-6 sm:px-8 py-8 space-y-8">
      <GenericTable<ContribuicaoLinha>
        titulo="Minhas contribuições"
        nivelTitulo={2}
        ajuda="Todas as contribuições feitas com esta conta, da mais nova para a mais antiga, com a situação de cada uma (paga, devolvida, vencida...)."
        colunas={[
          { chave: 'idContribuicao', rotulo: 'id', tipo: 'id' },
          { chave: 'campanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
          { chave: 'valor', rotulo: 'valor', tipo: 'dinheiro' },
          { chave: 'meio', rotulo: 'meio', tipo: 'texto' },
          { chave: 'recompensa', rotulo: 'recompensa', tipo: 'texto' },
          { chave: 'criadoEm', rotulo: 'data', tipo: 'dataHora' },
          {
            chave: 'situacao',
            rotulo: 'situação',
            tipo: 'status',
            renderizar: (linha: ContribuicaoLinha) => <BadgeStatusContribuicao status={linha.status} />,
            textoExibido: (linha: ContribuicaoLinha) => ROTULO_STATUS_CONTRIBUICAO[linha.status],
          },
        ]}
        chavePrimaria="idContribuicao"
        listar={listar}
        vazio={{ icone: 'fa-hand-holding-heart', titulo: 'Você ainda não apoiou nenhuma campanha.' }}
        filtrosFacetados={[{ chave: 'situacao', rotulo: 'Situação' }]}
      />

      <section className="space-y-3">
        <h2 className="titulo-secao">Recompensas ganhas</h2>
        {recompensas === null ? (
          <Carregando />
        ) : recompensas.length === 0 ? (
          <EstadoVazio compacto icone="fa-gift" titulo="Nenhuma recompensa ainda." texto="Elas aparecem aqui quando a contribuição que as escolheu é paga." />
        ) : (
          <ul className="space-y-3">
            {recompensas.map((item) => (
              <li key={`${item.idContribuicao}-${item.idRecompensa}`} className="cartao-painel p-4 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="enfase">{item.titulo}</span>
                  <span className="badge badge-neutro">{ROTULO_TIPO_RECOMPENSA[item.tipo]}</span>
                </div>
                <p className="paragrafo texto-fraco">{item.tituloCampanha}</p>
                {item.descricao && <p className="paragrafo">{item.descricao}</p>}
                {item.links.map((link) => (
                  <p key={link.idLinkRecompensa} className="paragrafo flex items-center gap-2">
                    <i className="fa-solid fa-link" aria-hidden="true"></i>
                    <a href={link.url} target="_blank" rel="noreferrer" className="link-texto break-all">
                      {link.url}
                    </a>
                  </p>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
