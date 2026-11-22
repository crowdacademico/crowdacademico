import { useEffect, useState } from 'react';
import { EstadoVazio } from '../../components/crud/estado-vazio';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { MuralApoiadores } from '../../components/crud/mural-apoiadores';
import { ModalConfirmacao } from '../../components/crud/modal-confirmacao';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { recompensaApi } from '../../services/18-recompensa/api/recompensa.api';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import { useEnvio } from '../../services/constant/hook/use-envio';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { MuralResponse } from '../../services/18-recompensa/type/recompensa.type';
import { ModalRecompensa } from './modal-recompensa';

interface SecaoRecompensasCampanhaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  // Dono da campanha (Alterar e o passo a passo): cria, altera e exclui. Quem só lê (Consultar): vê.
  podeGerenciar: boolean;
}

// A recompensa da campanha = o Mural dos apoiadores (22-11-2026, RF-103 a RF-105): opcional, uma por campanha. Mostra o
// valor mínimo, a mensagem e quem já está no mural. Com alguém no mural, não sai mais (o banco recusa, 91067).
export function SecaoRecompensasCampanha({ auth, idCampanha, podeGerenciar }: SecaoRecompensasCampanhaProps) {
  const [mural, setMural] = useState<MuralResponse | null>(null);
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const { reportarErro } = useErroToast();
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro);

  useEffect(() => {
    recompensaApi.mural(auth.authFetch, idCampanha).then(setMural).catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, idCampanha, chaveRecarga]);

  const recarregar = () => setChaveRecarga((atual) => atual + 1);

  if (mural === null) {
    return null;
  }
  const { recompensa, apoiadores, travada } = mural;

  const excluir = () =>
    void executar(async () => {
      if (!recompensa) return;
      await recompensaApi.excluir(auth.authFetch, recompensa.idRecompensa);
      mostrar('Mural dos apoiadores excluído.');
      setExcluindo(false);
      recarregar();
    });

  return (
    <SecaoFicha titulo="Recompensa: Mural dos apoiadores" colunas={1}>
      {!recompensa ? (
        <>
          <EstadoVazio
            compacto
            icone="fa-users"
            titulo="Sem Mural dos apoiadores."
            texto={
              podeGerenciar
                ? 'É opcional: o nome e a foto de quem apoiar, a partir de um valor, na página da campanha.'
                : 'O pesquisador não ofereceu o mural nesta campanha.'
            }
          />
          {podeGerenciar && (
            <div className="flex justify-center">
              <button type="button" className="btn btn-primary" onClick={() => setEditando(true)}>
                <i className="fa-solid fa-plus" aria-hidden="true"></i> Oferecer o mural
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="paragrafo">
            A partir de <strong>{formatarMoeda(recompensa.valorMinimo)}</strong> somados nas contribuições
            {!recompensa.ativo && <span className="badge badge-aviso ml-2">Desativado</span>}
          </p>
          {recompensa.descricao && <p className="paragrafo texto-fraco whitespace-pre-line">{recompensa.descricao}</p>}
          <p className="legenda texto-fraco">
            {apoiadores.length === 0 ? 'Ninguém no mural ainda.' : `${apoiadores.length} no mural.`}
          </p>
          {apoiadores.length > 0 && <MuralApoiadores apoiadores={apoiadores} />}
          {podeGerenciar && (
            <div className="flex flex-wrap justify-end gap-2">
              {!travada && (
                <button type="button" className="btn btn-secondary" onClick={() => setExcluindo(true)}>
                  Excluir
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => setEditando(true)}>
                Alterar
              </button>
            </div>
          )}
        </>
      )}

      {editando && (
        <ModalRecompensa
          auth={auth}
          idCampanha={idCampanha}
          recompensa={recompensa ?? undefined}
          travada={travada}
          aoFechar={() => setEditando(false)}
          aoSalva={recarregar}
        />
      )}
      {excluindo && (
        <ModalConfirmacao
          titulo="Excluir o Mural dos apoiadores?"
          rotuloConfirmar="Excluir"
          rotuloOcupado="Excluindo..."
          perigo
          ocupado={ocupado}
          aoConfirmar={excluir}
          aoCancelar={() => setExcluindo(false)}
        >
          <p>A campanha fica sem mural. Dá para oferecer de novo depois, enquanto ninguém tiver entrado.</p>
        </ModalConfirmacao>
      )}
    </SecaoFicha>
  );
}
