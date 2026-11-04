import { useEffect, useState } from 'react';
import { EstadoVazio } from '../../components/crud/estado-vazio';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { TabelaRecompensas } from '../../components/crud/tabelas/14-tabela-recompensas';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { recompensaApi } from '../../services/18-recompensa/api/recompensa.api';
import { useEnvio } from '../../services/constant/hook/use-envio';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { RecompensaResponse } from '../../services/18-recompensa/type/recompensa.type';
import { ModalRecompensa } from './modal-recompensa';

interface SecaoRecompensasCampanhaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  // Dono da campanha (Alterar e o passo a passo): cria, altera, desativa e reativa. Quem só lê (Consultar): vê a lista.
  podeGerenciar: boolean;
}

// Recompensas simbólicas da campanha (RF-103 a RF-105), em tabela: reconhecimento, acesso antecipado ou um conteúdo
// digital, cada uma a partir de um valor de contribuição. Sem estoque e sem entrega física. Nova e Alterar abrem um modal
// por cima (ModalRecompensa). O link especial só aparece para o dono, o admin e quem ganhou a recompensa (o banco esconde
// dos outros). Escolher a recompensa é na hora de contribuir (área pública).
export function SecaoRecompensasCampanha({ auth, idCampanha, podeGerenciar }: SecaoRecompensasCampanhaProps) {
  const [recompensas, setRecompensas] = useState<RecompensaResponse[] | null>(null);
  // null: nenhum modal. 'nova': criando. Uma recompensa: alterando ela.
  const [editando, setEditando] = useState<RecompensaResponse | 'nova' | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const { reportarErro } = useErroToast();
  const { mostrar } = useToast();
  const { executar } = useEnvio(reportarErro);

  useEffect(() => {
    recompensaApi.listar(auth.authFetch, idCampanha).then(setRecompensas).catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, idCampanha, chaveRecarga]);

  const recarregar = () => setChaveRecarga((atual) => atual + 1);

  const alternarAtivo = (item: RecompensaResponse) =>
    void executar(async () => {
      await recompensaApi.alterar(auth.authFetch, item.idRecompensa, { ativo: !item.ativo });
      mostrar(item.ativo ? 'Recompensa desativada.' : 'Recompensa ativa de novo.');
      recarregar();
    });

  if (recompensas === null) {
    return null;
  }
  const visiveis = podeGerenciar ? recompensas : recompensas.filter((r) => r.ativo);

  return (
    <SecaoFicha titulo={`Recompensas (${visiveis.length})`} colunas={1}>
      {podeGerenciar && (
        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={() => setEditando('nova')}>
            <i className="fa-solid fa-plus" aria-hidden="true"></i> Nova recompensa
          </button>
        </div>
      )}
      {visiveis.length === 0 ? (
        <EstadoVazio
          compacto
          icone="fa-gift"
          titulo="Nenhuma recompensa ainda."
          texto={
            podeGerenciar
              ? 'É opcional: um agradecimento simbólico para quem apoiar a pesquisa, a partir de um valor.'
              : 'Quando o pesquisador oferecer recompensas, elas aparecem aqui.'
          }
        />
      ) : (
        <TabelaRecompensas
          recompensas={visiveis}
          aoAlterar={podeGerenciar ? setEditando : undefined}
          aoAlternarAtivo={podeGerenciar ? alternarAtivo : undefined}
        />
      )}

      {editando && (
        <ModalRecompensa
          auth={auth}
          idCampanha={idCampanha}
          recompensa={editando === 'nova' ? undefined : editando}
          aoFechar={() => setEditando(null)}
          aoSalva={recarregar}
        />
      )}
    </SecaoFicha>
  );
}
