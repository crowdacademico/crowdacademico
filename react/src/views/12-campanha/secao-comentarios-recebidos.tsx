import { useEffect, useState } from 'react';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalExcluirComentario } from '../../components/crud/modal-excluir-comentario';
import { TabelaComentarios } from '../../components/crud/tabelas/11-tabela-comentarios';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { comentarioApi } from '../../services/17-comentario/api/comentario.api';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { ComentarioResponse } from '../../services/17-comentario/type/comentario.type';

interface SecaoComentariosRecebidosProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  // Campanha que já foi ao ar: a seção aparece mesmo sem comentário ("nenhum ainda"). Antes disso, só aparece se
  // houver algum (RF-098: comentário de campanha que nunca foi publicada fica visível só para o dono).
  publicada: boolean;
}

// Comentários recebidos, no painel privado do dono da campanha (RF-093): quem escreveu, quando e o texto; endossar
// (RF-094, até o limite de configuracoes) e excluir ou excluir e bloquear. Só o dono vê esta seção (Minhas
// Campanhas); o banco recusa qualquer outra pessoa de qualquer jeito.
export function SecaoComentariosRecebidos({ auth, idCampanha, publicada }: SecaoComentariosRecebidosProps) {
  const [comentarios, setComentarios] = useState<ComentarioResponse[] | null>(null);
  const [excluindo, setExcluindo] = useState<ComentarioResponse | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const { reportarErro } = useErroToast();
  const { mostrar } = useToast();
  const { obterConfiguracao } = useConfiguracoes();
  const valorLimite = obterConfiguracao('limite_endossos_campanha', 4);
  const limiteEndossos = typeof valorLimite === 'number' ? valorLimite : 4;

  useEffect(() => {
    comentarioApi
      .listar(auth.authFetch, idCampanha)
      .then(setComentarios)
      .catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, idCampanha, chaveRecarga]);

  const recarregar = () => setChaveRecarga((atual) => atual + 1);

  const alternarEndosso = async (comentario: ComentarioResponse) => {
    try {
      await comentarioApi.alternarEndosso(auth.authFetch, comentario.idComentario, !comentario.endossado);
      mostrar(comentario.endossado ? 'Endosso removido.' : 'Comentário endossado: agora aparece na página da campanha.');
      recarregar();
    } catch (erro) {
      reportarErro(erro);
    }
  };

  if (comentarios === null || (!publicada && comentarios.length === 0)) {
    return null;
  }

  const endossosAtivos = comentarios.filter((item) => item.endossado && item.ativo).length;

  return (
    <SecaoFicha titulo={`Comentários recebidos (${endossosAtivos} de ${limiteEndossos} endossados)`} colunas={1}>
      <p className="legenda texto-fraco">
        Só você vê estes comentários. Os que você endossar aparecem na página pública da campanha. O autor não é
        avisado quando você endossa, remove o endosso ou exclui.
      </p>
      <div>
        {comentarios.length === 0 ? (
          <p className="paragrafo texto-fraco">Nenhum comentário recebido ainda.</p>
        ) : (
          <TabelaComentarios
            comentarios={comentarios}
            ehDono
            limiteAtingido={endossosAtivos >= limiteEndossos}
            aoAlternarEndosso={(item) => void alternarEndosso(item)}
            aoExcluir={setExcluindo}
          />
        )}
      </div>
      {excluindo && (
        <ModalExcluirComentario
          autor={excluindo.nomePesquisador ?? 'Pesquisador removido'}
          conteudo={excluindo.conteudo}
          excluir={async (bloquear) => {
            if (bloquear) {
              await comentarioApi.bloquear(auth.authFetch, excluindo.idComentario);
            } else {
              await comentarioApi.excluir(auth.authFetch, excluindo.idComentario);
            }
          }}
          aoFechar={() => setExcluindo(null)}
          aoExcluido={recarregar}
        />
      )}
    </SecaoFicha>
  );
}
