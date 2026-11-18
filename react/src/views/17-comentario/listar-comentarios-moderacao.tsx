import { useCallback, useState } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { pedirConfirmacao } from '../../components/crud/confirmacao';
import { useToast } from '../../components/layout/toast/use-toast';
import { comentarioApi } from '../../services/17-comentario/api/comentario.api';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { ComentarioModeracaoResponse } from '../../services/17-comentario/type/comentario.type';

interface ComentarioLinha extends ComentarioModeracaoResponse {
  autor: string;
  campanha: string;
  situacao: string;
}

// Quem vê o comentário hoje: endossado é público; o não endossado só o dono da campanha (e o autor) veem; o oculto
// ninguém vê fora daqui (o autor ocultou, o dono da campanha bloqueou, uma denúncia procedente ou esta tela).
const SITUACOES = ['Público (endossado)', 'Só o dono da campanha vê', 'Oculto'];

function paraLinha(comentario: ComentarioModeracaoResponse): ComentarioLinha {
  return {
    ...comentario,
    autor: comentario.nomePesquisador ?? 'Conta excluída',
    campanha: comentario.tituloCampanha ?? `Campanha #${comentario.idCampanha}`,
    situacao: !comentario.ativo ? SITUACOES[2] : comentario.endossado ? SITUACOES[0] : SITUACOES[1],
  };
}

// Comentários (18-11-2026): os comentários de todas as campanhas, o mais novo primeiro. Não é um mural: só pesquisador
// comenta campanha de outro pesquisador, e só o endossado pelo dono fica público. Esta tela é para o caso excepcional,
// um comentário perigoso que ninguém denunciou: Ocultar tira do ar (e do endosso) e só a moderação desfaz. Quem ocultou
// e quando fica no log de auditoria. O caminho normal continua sendo a denúncia (tela Denúncias).
export function ListarComentariosModeracao({ auth }: PropsPagina) {
  const { mostrar } = useToast();
  const [consultando, setConsultando] = useState<ComentarioLinha | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);

  const listar = useCallback(
    async (): Promise<ComentarioLinha[]> => (await comentarioApi.listarModeracao(auth.authFetch)).map(paraLinha),
    [auth.authFetch],
  );

  async function mudar(linha: ComentarioLinha, ocultar: boolean): Promise<void> {
    const confirmou = await pedirConfirmacao(
      ocultar
        ? {
            titulo: 'Ocultar este comentário?',
            texto: `O comentário de ${linha.autor} sai do ar${linha.endossado ? ' e perde o endosso (sai da página pública)' : ''}. O autor não consegue pô-lo de volta, e o dono da campanha deixa de vê-lo. Dá para desfazer aqui.`,
            rotuloConfirmar: 'Ocultar',
            perigo: true,
          }
        : {
            titulo: 'Mostrar este comentário de novo?',
            texto: 'O comentário volta a aparecer para o dono da campanha, sem endosso: ele decide se endossa outra vez.',
            rotuloConfirmar: 'Mostrar de novo',
          },
    );
    if (!confirmou) return;
    try {
      if (ocultar) await comentarioApi.ocultarModeracao(auth.authFetch, linha.idComentario);
      else await comentarioApi.mostrarModeracao(auth.authFetch, linha.idComentario);
      mostrar(ocultar ? 'Comentário ocultado.' : 'Comentário visível de novo.', linha.campanha);
      setChaveRecarga((atual) => atual + 1);
    } catch (erro: unknown) {
      mostrar(traduzirErro(erro), undefined, 'erro');
    }
  }

  return (
    <div className="admin-content-painel">
      <GenericTable<ComentarioLinha>
        titulo="Comentários"
        ajuda="Os comentários de pesquisadores nas campanhas, o mais novo primeiro. Para o caso excepcional de um comentário perigoso: Ocultar tira do ar e só a moderação desfaz. O caminho normal é a denúncia."
        colunas={[
          { chave: 'idComentario', rotulo: 'id', tipo: 'id' },
          { chave: 'conteudo', rotulo: 'comentário', tipo: 'texto', umaLinha: true },
          { chave: 'autor', rotulo: 'autor', tipo: 'nome', umaLinha: true },
          { chave: 'campanha', rotulo: 'campanha', tipo: 'texto', umaLinha: true },
          { chave: 'situacao', rotulo: 'situação', tipo: 'status' },
          { chave: 'criadoEm', rotulo: 'feito em', tipo: 'dataHora' },
        ]}
        vazio={{
          icone: 'fa-comments',
          titulo: 'Nenhum comentário ainda.',
          texto: 'Quando um pesquisador comentar a campanha de outro, o comentário aparece aqui.',
        }}
        chavePrimaria="idComentario"
        listar={listar}
        chaveRecarga={chaveRecarga}
        acoes={{
          consultar: setConsultando,
          ocultar: (linha) => void mudar(linha, true),
          mostrarDeNovo: (linha) => void mudar(linha, false),
        }}
        acaoIndisponivel={(linha, acao) => {
          if (acao === 'ocultar' && !linha.ativo) return null;
          if (acao === 'mostrarDeNovo' && linha.ativo) return null;
          return undefined;
        }}
        linhaApagada={(linha) => !linha.ativo}
        filtrosFacetados={[{ chave: 'situacao', rotulo: 'Situação', ordem: SITUACOES }]}
      />

      {consultando && (
        <ModalFicha titulo={`Comentário de ${consultando.autor}`} subtitulo={consultando.campanha} aoFechar={() => setConsultando(null)}>
          <SecaoFicha titulo="Comentário">
            <CampoFicha rotulo="Feito em" valor={formatarDataHora(consultando.criadoEm)} />
            <CampoFicha rotulo="Situação" valor={consultando.situacao} />
            <CampoFicha rotulo="Texto" valor={<span className="whitespace-pre-line">{consultando.conteudo}</span>} largura="cheia" />
          </SecaoFicha>
        </ModalFicha>
      )}
    </div>
  );
}
