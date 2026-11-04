import { useCallback, useState } from 'react';
import { ModalConsultarContribuicao } from './modal-consultar-contribuicao';
import { BadgeStatusContribuicao } from '../../components/crud/badge-status-contribuicao';
import { GenericTable } from '../../components/crud/generic-table';
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

interface RecompensaLinha extends RecompensaGanha {
  // A mesma recompensa pode vir de duas contribuições: o par é a chave.
  chave: string;
  tipoRotulo: string;
}

// Aba Contribuições da Minha Conta (RF-009, RF-089, RF-105): o histórico de contribuições da própria conta e as
// recompensas que ela ganhou (todas as que o valor de cada contribuição paga alcançou), em tabela, com a campanha e o link
// especial de cada uma. Mora em 22-contribuicao (o dono do dado). Contribuir é
// na página pública da campanha, que ainda não existe; hoje uma contribuição nasce pela T5 do Campo de Testes.
export function AbaMinhasContribuicoes({ auth }: { auth: Pick<UseAuthReturn, 'authFetch'> }) {
  const [consultando, setConsultando] = useState<ContribuicaoLinha | null>(null);

  const listarRecompensas = useCallback(
    async (): Promise<RecompensaLinha[]> =>
      (await recompensaApi.minhas(auth.authFetch)).map((r) => ({
        ...r,
        chave: `${r.idContribuicao}-${r.idRecompensa}`,
        tipoRotulo: ROTULO_TIPO_RECOMPENSA[r.tipo],
      })),
    [auth.authFetch],
  );

  const listar = useCallback(async (): Promise<ContribuicaoLinha[]> => {
    const lista = await contribuicaoApi.minhas(auth.authFetch);
    return lista.map((c) => ({
      ...c,
      campanha: c.tituloCampanha ?? `Campanha #${c.idCampanha}`,
      meio: ROTULO_MEIO_PAGAMENTO[c.meioPagamento],
      situacao: ROTULO_STATUS_CONTRIBUICAO[c.status],
      recompensa: c.recompensas ?? '-',
    }));
  }, [auth.authFetch]);

  return (
    <div className="px-6 sm:px-8 py-8 space-y-8">
      <GenericTable<ContribuicaoLinha>
        titulo="Minhas contribuições"
        nivelTitulo={2}
        ajuda="Todas as contribuições feitas com esta conta, da mais nova para a mais antiga, com a situação de cada uma (paga, devolvida, vencida...). A tarifa é a do meio de pagamento, paga por cima do valor; Consultar mostra o total cobrado."
        colunas={[
          { chave: 'idContribuicao', rotulo: 'id', tipo: 'id' },
          { chave: 'campanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
          { chave: 'valor', rotulo: 'valor', tipo: 'dinheiro' },
          { chave: 'taxaPagamento', rotulo: 'tarifa', tipo: 'dinheiro' },
          { chave: 'meio', rotulo: 'meio', tipo: 'texto' },
          { chave: 'recompensa', rotulo: 'recompensas', tipo: 'texto', umaLinha: true },
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
        acoes={{ consultar: (linha) => setConsultando(linha) }}
        vazio={{ icone: 'fa-hand-holding-heart', titulo: 'Você ainda não apoiou nenhuma campanha.' }}
        filtrosFacetados={[{ chave: 'situacao', rotulo: 'Situação' }]}
      />

      {consultando && (
        <ModalConsultarContribuicao
          authFetch={auth.authFetch}
          contribuicao={consultando}
          rotuloMeio={consultando.meio}
          dicaPendente="Entra no arrecadado quando o pagamento for confirmado."
          aoFechar={() => setConsultando(null)}
        />
      )}

      <GenericTable<RecompensaLinha>
        titulo="Recompensas ganhas"
        nivelTitulo={2}
        ajuda="Toda recompensa que o valor de uma contribuição sua alcançou, quando ela foi paga. O link especial só você, o pesquisador e a administração enxergam."
        colunas={[
          { chave: 'idRecompensa', rotulo: 'id', tipo: 'id' },
          { chave: 'titulo', rotulo: 'recompensa', tipo: 'nome', umaLinha: true },
          { chave: 'tipoRotulo', rotulo: 'tipo', tipo: 'status' },
          { chave: 'tituloCampanha', rotulo: 'campanha', tipo: 'texto', umaLinha: true },
          { chave: 'idContribuicao', rotulo: 'contribuição', tipo: 'id' },
          {
            chave: 'links',
            rotulo: 'link',
            tipo: 'texto',
            renderizar: (linha: RecompensaLinha) =>
              linha.links[0] ? (
                <a href={linha.links[0].url} target="_blank" rel="noreferrer" className="link-texto">
                  <i className="fa-solid fa-link" aria-hidden="true"></i> Abrir
                </a>
              ) : (
                '-'
              ),
            textoExibido: (linha: RecompensaLinha) => (linha.links[0] ? 'Abrir' : '-'),
          },
        ]}
        chavePrimaria="chave"
        listar={listarRecompensas}
        vazio={{ icone: 'fa-gift', titulo: 'Nenhuma recompensa ainda.', texto: 'Elas aparecem aqui quando uma contribuição sua que alcança o valor de uma recompensa é paga.' }}
        filtrosFacetados={[{ chave: 'tipoRotulo', rotulo: 'Tipo' }]}
      />
    </div>
  );
}
