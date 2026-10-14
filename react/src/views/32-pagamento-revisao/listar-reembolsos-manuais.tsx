import { useCallback, useState } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { ROTULO_MEIO_PAGAMENTO } from '../../services/22-contribuicao/constants/contribuicao.constants';
import { pagamentoRevisaoApi } from '../../services/32-pagamento-revisao/api/pagamento-revisao.api';
import { ModalConcluirReembolso } from './modal-concluir-reembolso';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { ReembolsoManualResponse } from '../../services/32-pagamento-revisao/type/pagamento-revisao.type';

interface ReembolsoLinha extends ReembolsoManualResponse {
  campanha: string;
  meio: string;
}

// A fila não traz o título da campanha (só o id). Busca uma vez junto da lista; se falhar (ex.: sem permissão de ver
// campanhas), a tela segue com "Campanha #id" em vez de quebrar.
async function titulosDasCampanhas(authFetch: AuthFetch): Promise<Map<number, string>> {
  try {
    const campanhas = await campanhaApi.listar(authFetch);
    return new Map(campanhas.map((campanha) => [campanha.idCampanha, campanha.titulo]));
  } catch {
    return new Map();
  }
}

// Reembolsos Manuais (moderação financeira): contribuições em "reembolso manual", ou seja, o estorno automático
// desistiu (falha definitiva, tentativas esgotadas ou prazo do Pix vencido) e uma pessoa precisa devolver o dinheiro
// POR FORA do sistema (no painel do provedor ou por Pix). A tela só lista e REGISTRA que a devolução foi feita; nada
// move dinheiro. Alterar abre o registro da devolução; Consultar abre a ficha só para ler.
export function ListarReembolsosManuais({ auth }: PropsPagina) {
  const [aberto, setAberto] = useState<{ reembolso: ReembolsoLinha; somenteLeitura: boolean } | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);

  const listar = useCallback(async (): Promise<ReembolsoLinha[]> => {
    const [reembolsos, titulos] = await Promise.all([pagamentoRevisaoApi.listarReembolsosManuais(auth.authFetch), titulosDasCampanhas(auth.authFetch)]);
    return reembolsos.map((reembolso) => ({
      ...reembolso,
      campanha: titulos.get(reembolso.idCampanha) ?? `Campanha #${reembolso.idCampanha}`,
      meio: ROTULO_MEIO_PAGAMENTO[reembolso.meioPagamento],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, chaveRecarga]);

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Reembolsos Manuais"
        ajuda="Contribuições que o estorno automático não conseguiu devolver. Uma pessoa devolve o dinheiro fora do sistema (painel do provedor ou Pix) e registra aqui o que foi feito. O valor a devolver já desconta a taxa da plataforma, que fica retida."
        colunas={[
          { chave: 'idContribuicao', rotulo: 'id', tipo: 'id' },
          { chave: 'campanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
          { chave: 'valorBruto', rotulo: 'valor pago', tipo: 'dinheiro' },
          { chave: 'valorADevolver', rotulo: 'a devolver', tipo: 'dinheiro' },
          { chave: 'meio', rotulo: 'meio', tipo: 'status' },
          { chave: 'contribuinteTemContaVerificada', rotulo: 'chave Pix', tipo: 'simNao' },
          { chave: 'ultimoMotivo', rotulo: 'último motivo', tipo: 'texto', umaLinha: true },
        ]}
        vazio={{
          icone: 'fa-circle-check',
          titulo: 'Nenhum reembolso espera devolução manual.',
          texto: 'Quando o estorno automático de uma contribuição desistir, ela aparece aqui para uma pessoa devolver.',
        }}
        chavePrimaria="idContribuicao"
        listar={listar}
        acoes={{
          alterar: (linha) => setAberto({ reembolso: linha, somenteLeitura: false }),
          consultar: (linha) => setAberto({ reembolso: linha, somenteLeitura: true }),
        }}
        filtrosFacetados={[{ chave: 'meio', rotulo: 'Meio de pagamento' }]}
      />

      {aberto && (
        <ModalConcluirReembolso
          authFetch={auth.authFetch}
          reembolso={aberto.reembolso}
          tituloCampanha={aberto.reembolso.campanha}
          somenteLeitura={aberto.somenteLeitura}
          aoFechar={() => setAberto(null)}
          aoConcluido={() => setChaveRecarga((atual) => atual + 1)}
        />
      )}
    </div>
  );
}
