import { useCallback, useEffect, useRef, useState } from 'react';
import { TabelaItensOrcamento } from '../../components/crud/tabelas/3-tabela-itens-orcamento';
import type { DadosItemOrcamento } from '../../components/crud/tabelas/3-tabela-itens-orcamento';
import { TabelaMarcosCronograma } from '../../components/crud/tabelas/4-tabela-marcos-cronograma';
import type { DadosMarco } from '../../components/crud/tabelas/4-tabela-marcos-cronograma';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { orcamentoCampanhaApi } from '../../services/13-orcamento-campanha/api/orcamento-campanha.api';
import { marcoCronogramaApi } from '../../services/14-marco-cronograma/api/marco-cronograma.api';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { OrcamentoCampanhaResponse } from '../../services/13-orcamento-campanha/type/orcamento-campanha.type';
import type { MarcoCronogramaResponse } from '../../services/14-marco-cronograma/type/marco-cronograma.type';

// Orçamento e cronograma de UMA campanha: lista, adiciona, altera e exclui itens. Usado por Minhas Campanhas
// (o pesquisador) e pela Bancada da Campanha, que passa um `authFetch` que também registra as chamadas.
// Quem barra item inválido é o banco (valor, data de marco antes do início, limite de itens, campanha já
// congelada): o erro aparece na tela, nunca some calado. As tabelas moram em components/crud/tabelas/ (3 e 4);
// aqui fica só buscar e salvar.

interface PainelOrcamentoCronogramaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  podeEditar: boolean;
  // `aoCarregar`: callback opcional que devolve os dados toda vez que este painel (re)carrega, para quem usa (o
  // modal de Alterar) manter as CONTAGENS em dia sem duplicar adicionar/remover. Só o Alterar passa isto, o
  // Consultar não precisa.
  aoCarregar?: (orcamento: OrcamentoCampanhaResponse[], cronograma: MarcoCronogramaResponse[]) => void;
  // `abaFixa`: mostra só uma das duas partes (Orçamento e Cronograma são etapas diferentes de Criar Campanha).
  // Sem isto (Alterar Campanha, consulta da Bancada da Campanha), as duas aparecem uma embaixo da outra, cada uma com o seu título:
  // nada escondido atrás de botões de trocar.
  abaFixa?: 'orcamento' | 'cronograma';
  // `metaFinanceira`: opcional; quando presente, a tabela de Orçamento mostra o total em relação à meta acima dela.
  metaFinanceira?: number;
  // `dataInicioCampanha`: mínimo da data prevista de um marco (ver 4-tabela-marcos-cronograma.tsx).
  dataInicioCampanha?: string;
  // `minimoMarcosCronograma`: quando presente, a tabela de Cronograma mostra o mínimo e quantos há.
  minimoMarcosCronograma?: number;
}

export function PainelOrcamentoCronograma({
  auth,
  idCampanha,
  podeEditar,
  aoCarregar,
  abaFixa,
  metaFinanceira,
  dataInicioCampanha,
  minimoMarcosCronograma,
}: PainelOrcamentoCronogramaProps) {
  const { reportarErro } = useErroToast();
  const [orcamento, setOrcamento] = useState<OrcamentoCampanhaResponse[]>([]);
  const [cronograma, setCronograma] = useState<MarcoCronogramaResponse[]>([]);
  const mostrarOrcamento = abaFixa !== 'cronograma';
  const mostrarCronograma = abaFixa !== 'orcamento';
  // Título de cada parte só quando as duas aparecem juntas (com `abaFixa`, quem usa já dá o título).
  const titulo = (texto: string) => !abaFixa && <h3 className="titulo-bloco titulo-bloco--linha">{texto}</h3>;

  // Ref (não dependência de `carregar`): `aoCarregar` recebe uma arrow function nova a cada render do modal
  // pai; colocá-la nas dependências de `useCallback` recriaria `carregar` toda hora, disparando o efeito de
  // baixo em loop. O ref sempre lê a versão mais recente sem esse risco. Atualizado em `useEffect` (não direto
  // no corpo do componente): mutar ref durante o render é proibido pela regra `react-hooks/refs`.
  const aoCarregarRef = useRef(aoCarregar);
  useEffect(() => {
    aoCarregarRef.current = aoCarregar;
  });

  const carregar = useCallback(() => {
    Promise.all([
      orcamentoCampanhaApi.listar(auth.authFetch, idCampanha).catch(() => []),
      marcoCronogramaApi.listar(auth.authFetch, idCampanha).catch(() => []),
    ])
      .then(([dadosOrcamento, dadosCronograma]) => {
        setOrcamento(dadosOrcamento);
        setCronograma(dadosCronograma);
        aoCarregarRef.current?.(dadosOrcamento, dadosCronograma);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCampanha]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Toda escrita recarrega as duas listas e devolve se deu certo (a tabela só limpa/fecha a linha quando sim).
  const executar = async (chamada: () => Promise<unknown>): Promise<boolean> => {
    try {
      await chamada();
      carregar();
      return true;
    } catch (erro) {
      reportarErro(erro);
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {mostrarOrcamento && (
        <div>
          {titulo('Orçamento')}
          <TabelaItensOrcamento
            itens={orcamento}
            podeEditar={podeEditar}
            metaFinanceira={metaFinanceira}
            aoAdicionar={(dados: DadosItemOrcamento) => executar(() => orcamentoCampanhaApi.criar(auth.authFetch, { idCampanha, ...dados }))}
            aoSalvar={(item, dados) => executar(() => orcamentoCampanhaApi.atualizar(auth.authFetch, item.idOrcamento, dados))}
            aoExcluir={(item) => void executar(() => orcamentoCampanhaApi.remover(auth.authFetch, item.idOrcamento))}
          />
        </div>
      )}

      {mostrarCronograma && (
        <div>
          {titulo('Cronograma')}
          <TabelaMarcosCronograma
            marcos={cronograma}
            podeEditar={podeEditar}
            dataInicioCampanha={dataInicioCampanha}
            minimoMarcos={minimoMarcosCronograma}
            aoAdicionar={(dados: DadosMarco) => executar(() => marcoCronogramaApi.criar(auth.authFetch, { idCampanha, ...dados }))}
            aoSalvar={(marco, dados) => executar(() => marcoCronogramaApi.atualizar(auth.authFetch, marco.idMarco, dados))}
            aoExcluir={(marco) => void executar(() => marcoCronogramaApi.remover(auth.authFetch, marco.idMarco))}
          />
        </div>
      )}
    </div>
  );
}
