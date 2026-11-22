import { useCallback, useState } from 'react';
import { ModalConsultarContribuicao } from './modal-consultar-contribuicao';
import { BadgeStatusContribuicao } from '../../components/crud/badge-status-contribuicao';
import { GenericTable } from '../../components/crud/generic-table';
import { contribuicaoApi } from '../../services/22-contribuicao/api/contribuicao.api';
import { ROTULO_MEIO_PAGAMENTO } from '../../services/22-contribuicao/constants/contribuicao.constants';
import { ROTULO_STATUS_CONTRIBUICAO } from '../../services/22-contribuicao/constants/status-contribuicao.constants';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { MinhaContribuicao } from '../../services/22-contribuicao/type/contribuicao.type';
import { pedirConfirmacao } from '../../components/crud/confirmacao';
import { useToast } from '../../components/layout/toast/use-toast';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';

interface ContribuicaoLinha extends MinhaContribuicao {
  campanha: string;
  meio: string;
  situacao: string;
  mural: string;
}

// Aba Contribuições da Minha Conta (RF-009, RF-089, RF-105): o histórico de contribuições da própria conta, com a
// coluna Mural: se a pessoa está no Mural dos apoiadores da campanha (a recompensa, 22-11-2026). Mora em 22-contribuicao (o dono do dado). Contribuir é
// pelo modal Apoiar da página pública da campanha (modal-apoiar.tsx); a T5 do Campo de Testes também cria, para testes.
export function AbaMinhasContribuicoes({ auth }: { auth: Pick<UseAuthReturn, 'authFetch'> }) {
  const [consultando, setConsultando] = useState<ContribuicaoLinha | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const [desistindo, setDesistindo] = useState<number | null>(null);
  const { mostrar } = useToast();
  const prazoDesistencia = useConfiguracoes().obterNumero('desistencia_prazo_dias', 7);

  // Desistir do apoio (CDC, art. 49): só a contribuição paga, dentro do prazo. O banco confere tudo de novo
  // (desistir_contribuicao); aqui é só para não oferecer o botão onde não vale.
  const podeDesistir = (linha: ContribuicaoLinha) =>
    linha.status === 'confirmado' &&
    Date.parse(linha.criadoEm) + prazoDesistencia * 86_400_000 > Date.now();

  async function desistir(linha: ContribuicaoLinha): Promise<void> {
    if (desistindo !== null) return;
    const confirmou = await pedirConfirmacao({
      titulo: 'Desistir deste apoio?',
      texto: `Você recebe de volta ${formatarMoeda(linha.valor)} pelo mesmo meio de pagamento. A tarifa do meio de pagamento (${formatarMoeda(linha.taxaPagamento)}) não é devolvida, porque fica com o provedor. Se a soma dos seus apoios a esta campanha ficar abaixo do mínimo do Mural dos apoiadores, você sai do mural. Não dá para desfazer.`,
      rotuloConfirmar: 'Desistir do apoio',
      perigo: true,
    });
    if (!confirmou) return;
    setDesistindo(linha.idContribuicao);
    try {
      await contribuicaoApi.desistir(auth.authFetch, linha.idContribuicao);
      mostrar('Pedido registrado. A devolução é feita automaticamente.', linha.campanha);
      setChaveRecarga((atual) => atual + 1);
    } catch (erro: unknown) {
      mostrar(traduzirErro(erro), undefined, 'erro');
    } finally {
      setDesistindo(null);
    }
  }

  const listar = useCallback(async (): Promise<ContribuicaoLinha[]> => {
    const lista = await contribuicaoApi.minhas(auth.authFetch);
    return lista.map((c) => ({
      ...c,
      campanha: c.tituloCampanha ?? `Campanha #${c.idCampanha}`,
      meio: ROTULO_MEIO_PAGAMENTO[c.meioPagamento],
      situacao: ROTULO_STATUS_CONTRIBUICAO[c.status],
      mural: c.noMural ? 'No mural' : '-',
    }));
  }, [auth.authFetch]);

  return (
    <div className="px-6 sm:px-8 py-8 space-y-8">
      <GenericTable<ContribuicaoLinha>
        titulo="Minhas contribuições"
        nivelTitulo={2}
        ajuda={`Todas as contribuições feitas com esta conta, da mais nova para a mais antiga, com a situação de cada uma (paga, devolvida, vencida...). Mural: você está no Mural dos apoiadores daquela campanha (a soma dos seus apoios alcançou o mínimo do pesquisador). A tarifa é a do meio de pagamento, paga por cima do valor; Consultar mostra o total cobrado. Até ${prazoDesistencia} dias depois de apoiar, você pode desistir de uma contribuição paga e receber o valor de volta (a tarifa não volta).`}
        colunas={[
          { chave: 'campanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
          { chave: 'valor', rotulo: 'valor', tipo: 'dinheiro' },
          { chave: 'taxaPagamento', rotulo: 'tarifa', tipo: 'dinheiro' },
          { chave: 'meio', rotulo: 'meio', tipo: 'texto' },
          { chave: 'criadoEm', rotulo: 'data', tipo: 'dataHora' },
          { chave: 'mural', rotulo: 'mural', tipo: 'texto' },
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
        chaveRecarga={chaveRecarga}
        acoes={{ consultar: (linha) => setConsultando(linha), desistirApoio: (linha) => void desistir(linha) }}
        acaoIndisponivel={(linha, acao) => {
          if (acao !== 'desistirApoio') return undefined;
          if (!podeDesistir(linha)) return null;
          return desistindo !== null ? 'Aguarde o pedido anterior.' : undefined;
        }}
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

    </div>
  );
}
