import { useEffect, useState } from 'react';
import { EstadoVazio } from '../../components/crud/estado-vazio';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { TabelaAtualizacoes } from '../../components/crud/tabelas/10-tabela-atualizacoes';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { atualizacaoCampanhaApi } from '../../services/15-atualizacao-campanha/api/atualizacao-campanha.api';
import { rotuloSituacaoAtualizacao } from '../../services/15-atualizacao-campanha/constants/atualizacao-campanha.constants';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { AtualizacaoCampanhaResponse } from '../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';
import { ModalAtualizacao } from './modal-atualizacao';
import { ModalExcluirAtualizacao } from './modal-excluir-atualizacao';

interface SecaoAtualizacoesCampanhaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  // Campanha ativa, com sucesso ou não atingida (RF-052): só nelas o banco aceita atualização nova.
  podePublicar: boolean;
  // Dono: publica, altera e exclui. Quem só lê (Consultar, quem segue): vê a lista, sem botão nem ações.
  podeGerenciar?: boolean;
}

// Atualizações de progresso do dono da campanha (RF-052, RF-053), em tabela. Nova, Alterar e Excluir abrem um modal por
// cima (ModalAtualizacao, ModalExcluirAtualizacao). Elas aparecem na página pública da campanha, e quem segue a campanha
// recebe aviso por e-mail (RF-054).
export function SecaoAtualizacoesCampanha({ auth, idCampanha, podePublicar, podeGerenciar = true }: SecaoAtualizacoesCampanhaProps) {
  const [atualizacoes, setAtualizacoes] = useState<AtualizacaoCampanhaResponse[] | null>(null);
  // null: nenhum modal. 'nova': publicando. Uma atualização: alterando ela.
  const [editando, setEditando] = useState<AtualizacaoCampanhaResponse | 'nova' | null>(null);
  const [excluindo, setExcluindo] = useState<AtualizacaoCampanhaResponse | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const { reportarErro } = useErroToast();

  useEffect(() => {
    atualizacaoCampanhaApi.listar(auth.authFetch, idCampanha).then(setAtualizacoes).catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, idCampanha, chaveRecarga]);

  const recarregar = () => setChaveRecarga((atual) => atual + 1);

  if (atualizacoes === null) {
    return null;
  }

  return (
    <SecaoFicha titulo={`Atualizações (${atualizacoes.length})`} colunas={1}>
      {podeGerenciar && podePublicar && (
        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={() => setEditando('nova')}>
            <i className="fa-solid fa-plus" aria-hidden="true"></i> Nova atualização
          </button>
        </div>
      )}
      {atualizacoes.length === 0 ? (
        <EstadoVazio
          compacto
          icone="fa-bullhorn"
          titulo="Nenhuma atualização publicada ainda."
          texto={
            podeGerenciar && podePublicar
              ? 'É por aqui que quem apoia e quem segue acompanha a pesquisa.'
              : 'Quando o pesquisador publicar, a atualização aparece aqui.'
          }
        />
      ) : (
        <TabelaAtualizacoes
          atualizacoes={atualizacoes}
          aoAlterar={podeGerenciar ? setEditando : undefined}
          aoExcluir={podeGerenciar ? setExcluindo : undefined}
        />
      )}

      {editando && (
        <ModalAtualizacao
          auth={auth}
          idCampanha={idCampanha}
          atualizacao={editando === 'nova' ? undefined : editando}
          aoFechar={() => setEditando(null)}
          aoSalva={recarregar}
        />
      )}
      {excluindo && (
        <ModalExcluirAtualizacao
          authFetch={auth.authFetch}
          atualizacao={excluindo}
          situacao={rotuloSituacaoAtualizacao(excluindo, true)}
          aoFechar={() => setExcluindo(null)}
          aoExcluida={recarregar}
        />
      )}
    </SecaoFicha>
  );
}
