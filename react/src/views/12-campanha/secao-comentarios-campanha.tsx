import { useEffect, useState } from 'react';
import { EstadoVazio } from '../../components/crud/estado-vazio';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { TabelaComentarios } from '../../components/crud/tabelas/11-tabela-comentarios';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { RodapePaginacao } from '../../components/pagination/rodape-paginacao';
import { comentarioApi } from '../../services/17-comentario/api/comentario.api';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { usePaginaServidor } from '../../services/constant/hook/use-pagina-servidor';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { ComentarioResponse } from '../../services/17-comentario/type/comentario.type';

interface SecaoComentariosProps {
  authFetch: AuthFetch;
  idCampanha: number;
}

// Comentários endossados, na ordem do endosso: o que a página pública mostra. São no máximo o limite de endossos
// (configuracoes), então cabem sem paginação. Só leitura: endossar é do dono, em Minhas Campanhas.
export function SecaoComentariosEndossados({ authFetch, idCampanha }: SecaoComentariosProps) {
  const [endossados, setEndossados] = useState<ComentarioResponse[] | null>(null);
  const { reportarErro } = useErroToast();
  const limite = useConfiguracoes().obterNumero('limite_endossos_campanha', 4);

  useEffect(() => {
    comentarioApi
      .listarPagina(authFetch, idCampanha, 1, limite, true)
      .then((resultado) => setEndossados(resultado.dados))
      .catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch, idCampanha, limite]);

  if (endossados === null) {
    return null;
  }
  return (
    <SecaoFicha titulo={`Comentários endossados (${endossados.length} de ${limite})`} colunas={1}>
      {endossados.length === 0 ? (
        <EstadoVazio compacto icone="fa-heart" titulo="Nenhum comentário endossado." texto="O dono da campanha escolhe quais comentários aparecem na página pública." />
      ) : (
        <TabelaComentarios comentarios={endossados} ehDono={false} rotulo="Comentários endossados" />
      )}
    </SecaoFicha>
  );
}

// Todos os comentários, paginados pelo servidor (uma campanha pode ter milhares). A gestão vê todos pela permissão
// de moderar; quem não modera vê só os endossados (a regra é do banco).
export function SecaoComentariosTodos({ authFetch, idCampanha }: SecaoComentariosProps) {
  const { reportarErro } = useErroToast();
  const { dados, total, rodape } = usePaginaServidor(
    (pagina, tamanho) => comentarioApi.listarPagina(authFetch, idCampanha, pagina, tamanho),
    String(idCampanha),
    reportarErro,
  );

  if (dados === null) {
    return null;
  }
  return (
    <SecaoFicha titulo={`Comentários (${total})`} colunas={1}>
      {total === 0 ? (
        <EstadoVazio compacto icone="fa-comments" titulo="Nenhum comentário ainda." />
      ) : (
        <>
          <TabelaComentarios comentarios={dados} ehDono={false} />
          <RodapePaginacao {...rodape} />
        </>
      )}
    </SecaoFicha>
  );
}
