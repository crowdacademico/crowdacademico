import { useCallback, useState } from 'react';
import { BadgeStatusRepasse } from '../../components/crud/badge-status-repasse';
import { GenericTable } from '../../components/crud/generic-table';
import { ROTULO_AGUARDANDO_CONTA, ROTULO_STATUS_REPASSE, rotuloSituacaoRepasse } from '../../services/23-repasse/constants/status-repasse.constants';
import { pagamentoRevisaoApi } from '../../services/32-pagamento-revisao/api/pagamento-revisao.api';
import { ModalReenfileirarRepasse } from './modal-reenfileirar-repasse';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { RepasseAtencaoResponse } from '../../services/32-pagamento-revisao/type/pagamento-revisao.type';

interface RepasseLinha extends RepasseAtencaoResponse {
  situacao: string;
  motivo: string;
}

// Ordem das opções do filtro: só estas duas situações existem nesta lista (todo repasse pendente aqui espera a chave Pix).
const ORDEM_SITUACAO = [ROTULO_STATUS_REPASSE.erro, ROTULO_AGUARDANDO_CONTA];

// Repasses em Atenção (moderação financeira): o repasse é o pagamento do que foi arrecadado ao pesquisador.
// Entram aqui os que estão em "erro" (a transferência falhou de forma definitiva ou as tentativas acabaram) e os
// "pendentes" cujo dono da campanha ainda não tem chave Pix verificada (o sistema não os pega até ele cadastrar).
// Alterar abre o reenfileiramento (só repasse em erro); Consultar abre qualquer um só para ler.
export function ListarRepassesAtencao({ auth }: PropsPagina) {
  const [aberto, setAberto] = useState<{ repasse: RepasseAtencaoResponse; somenteLeitura: boolean } | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);

  const listar = useCallback(async (): Promise<RepasseLinha[]> => {
    const repasses = await pagamentoRevisaoApi.listarRepassesAtencao(auth.authFetch);
    return repasses.map((repasse) => ({
      ...repasse,
      situacao: rotuloSituacaoRepasse(repasse.status, repasse.aguardandoConta),
      motivo: repasse.ultimoMotivo ?? '-',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, chaveRecarga]);

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Repasses em Atenção"
        ajuda="Repasses ao pesquisador que não andam sozinhos. Erro: a transferência falhou e alguém precisa corrigir a causa e reenfileirar. Aguardando chave Pix: o pesquisador ainda não cadastrou (ou não verificou) a chave onde receber; não há o que fazer aqui até ele cadastrar."
        colunas={[
          { chave: 'idRepasse', rotulo: 'id', tipo: 'id' },
          { chave: 'titulo', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
          { chave: 'valorLiquido', rotulo: 'líquido', tipo: 'dinheiro' },
          { chave: 'tentativas', rotulo: 'tentativas', tipo: 'numero' },
          { chave: 'motivo', rotulo: 'último motivo', tipo: 'texto', umaLinha: true },
          {
            chave: 'situacao',
            rotulo: 'situação',
            tipo: 'status',
            renderizar: (linha: RepasseLinha) => <BadgeStatusRepasse status={linha.status} aguardandoConta={linha.aguardandoConta} />,
          },
        ]}
        vazio={{
          icone: 'fa-circle-check',
          titulo: 'Nenhum repasse pede atenção.',
          texto: 'Quando uma transferência ao pesquisador falhar, ou esperar a chave Pix dele, o repasse aparece aqui.',
        }}
        chavePrimaria="idRepasse"
        listar={listar}
        acoes={{
          alterar: (linha) => setAberto({ repasse: linha, somenteLeitura: false }),
          consultar: (linha) => setAberto({ repasse: linha, somenteLeitura: true }),
        }}
        acaoIndisponivel={(linha, acao) =>
          acao === 'alterar' && linha.status !== 'erro'
            ? 'Só um repasse em erro pode ser reenfileirado. Este espera o pesquisador cadastrar a chave Pix.'
            : undefined
        }
        filtrosFacetados={[{ chave: 'situacao', rotulo: 'Situação', ordem: ORDEM_SITUACAO }]}
      />

      {aberto && (
        <ModalReenfileirarRepasse
          authFetch={auth.authFetch}
          repasse={aberto.repasse}
          somenteLeitura={aberto.somenteLeitura}
          aoFechar={() => setAberto(null)}
          aoReenfileirado={() => setChaveRecarga((atual) => atual + 1)}
        />
      )}
    </div>
  );
}
