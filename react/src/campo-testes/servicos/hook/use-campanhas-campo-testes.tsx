import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { BadgeStatusCampanha } from '../../../components/crud/badge-status-campanha';
import type { AcaoPadrao, AcoesLinha } from '../../../components/crud/colunas/5-coluna-acoes';
import type { GenericTableProps } from '../../../components/crud/generic-table';
import { useErroToast } from '../../../components/layout/toast/use-erro-toast';
import { useToast } from '../../../components/layout/toast/use-toast';
import { campanhaApi } from '../../../services/12-campanha/api/campanha.api';
import {
  ROTULO_STATUS_CAMPANHA,
  rotuloStatusCampanha,
  STATUS_ACEITA_COMENTARIO,
  STATUS_ACEITA_DENUNCIA,
  STATUS_ACEITA_SEGUIR,
} from '../../../services/12-campanha/constants/status-campanha.constants';
import { seguirCampanhaApi } from '../../../services/16-seguir-campanha/api/seguir-campanha.api';
import { usuarioApi } from '../../../services/1-usuario/api/usuario.api';
import { renderizarArrecadado } from '../../../views/12-campanha/colunas-campanha';
import { ModalConsultarCampanha } from '../../../views/12-campanha/modal-consultar-campanha';
import { ModalDenunciar } from '../../../views/19-denuncia/modal-denunciar';
import { ModalComentar } from '../../paginas/modal-comentar';
import { ORIGEM_TESTE, origemCampanha } from '../util/registros-demonstracao.util';
import { useAuthFetchRegistrado } from './use-chamada-registrada';
import type { CampanhaResponse } from '../../../services/12-campanha/type/campanha.type';
import type { UsuarioResponse } from '../../../services/1-usuario/type/usuario.type';
import type { UseAuthReturn } from '../../../services/3-auth/hook/use-auth';

// Linha da tabela: a campanha com o nome do dono já resolvido (coluna, busca e modais) e a origem (faceta).
export type CampanhaLinha = CampanhaResponse & { dono: string; origem: string };

// Peças comuns às telas de campanha do Campo de Testes (T2, T4 e as próximas): colunas, as ações de quem visita
// a campanha (consultar, comentar, seguir, denunciar), os modais delas e a lista com dono e origem. Cada tela
// junta o que é só dela (ex.: o T2 cria, altera e exclui). Toda chamada aparece no Registro de Chamadas.
// `aoMudarSeguidas`: para a tela que depende de quem a conta segue (T4) recarregar a lista.
export function useCampanhasCampoTestes(auth: UseAuthReturn, aoMudarSeguidas?: () => void) {
  const authRegistrado = { authFetch: useAuthFetchRegistrado(auth) };
  const { mostrar } = useToast();
  const { reportarErro } = useErroToast();
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [seguidas, setSeguidas] = useState<ReadonlySet<number>>(new Set());
  const [consultando, setConsultando] = useState<CampanhaLinha | null>(null);
  const [comentando, setComentando] = useState<CampanhaLinha | null>(null);
  const [denunciando, setDenunciando] = useState<CampanhaLinha | null>(null);

  const carregarSeguidas = () => {
    seguirCampanhaApi
      .listarMinhas(auth.authFetch)
      .then((lista) => setSeguidas(new Set(lista.map((item) => item.idCampanha))))
      .catch(() => {});
  };

  // Espera a sessão ser restaurada (`auth.carregando`): num F5, o authFetch ainda não tem token.
  useEffect(() => {
    if (!auth.carregando) carregarSeguidas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.carregando]);

  // Faceta Origem pré-marcada em "teste": esconde as campanhas da demonstração ao abrir.
  const [parametros, setParametros] = useSearchParams();
  useEffect(() => {
    if (!parametros.has('origem')) setParametros({ origem: ORIGEM_TESTE }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Os usuários vêm junto: dão o nome do dono (coluna, busca e modais).
  const buscarLinhas = async (): Promise<CampanhaLinha[]> => {
    if (auth.carregando) {
      return [];
    }
    const [campanhas, todos] = await Promise.all([campanhaApi.listar(auth.authFetch), usuarioApi.listar(auth.authFetch)]);
    setUsuarios(todos);
    return campanhas.map((campanha) => ({
      ...campanha,
      dono: todos.find((u) => u.idUsuario === campanha.idUsuario)?.nome ?? `#${campanha.idUsuario}`,
      origem: origemCampanha(campanha.idCampanha),
    }));
  };

  // Seguir e deixar de seguir como a conta logada, num clique (a mesma regra da página pública).
  const alternarSeguir = (campanha: CampanhaLinha) => {
    const segue = seguidas.has(campanha.idCampanha);
    const chamada = segue
      ? seguirCampanhaApi.deixarDeSeguir(authRegistrado.authFetch, campanha.idCampanha)
      : seguirCampanhaApi.seguir(authRegistrado.authFetch, campanha.idCampanha);
    chamada
      .then(() => {
        mostrar(segue ? 'Deixou de seguir.' : 'Seguindo a campanha.', campanha.titulo);
        carregarSeguidas();
        aoMudarSeguidas?.();
      })
      .catch(reportarErro);
  };

  // Comentar e Seguir: só campanha publicada; Denunciar: só ativa. Seguir e Deixar de seguir se alternam
  // conforme a conta logada já segue ou não.
  const acaoIndisponivel = (campanha: CampanhaLinha, acao: AcaoPadrao): string | null | undefined => {
    if (acao === (seguidas.has(campanha.idCampanha) ? 'seguir' : 'deixarDeSeguir')) return null;
    if (acao === 'denunciar') return STATUS_ACEITA_DENUNCIA.has(campanha.status) ? undefined : 'Só campanha ativa pode ser denunciada.';
    if (acao !== 'comentar' && acao !== 'seguir') return undefined;
    return (acao === 'comentar' ? STATUS_ACEITA_COMENTARIO : STATUS_ACEITA_SEGUIR).has(campanha.status)
      ? undefined
      : 'Só campanha publicada (não rascunho, aguardando, rejeitada ou encerrada por moderação)';
  };

  const tabela: Pick<
    GenericTableProps<CampanhaLinha>,
    'colunas' | 'chavePrimaria' | 'acoesEmColuna' | 'acaoIndisponivel' | 'filtrosFacetados'
  > = {
    colunas: [
      { chave: 'idCampanha', rotulo: 'id', tipo: 'id' },
      { chave: 'titulo', rotulo: 'título', tipo: 'nome', umaLinha: true },
      {
        chave: 'status',
        rotulo: 'status',
        tipo: 'status',
        renderizar: (campanha) => <BadgeStatusCampanha campanha={campanha} />,
        textoExibido: (campanha) => rotuloStatusCampanha(campanha),
      },
      {
        chave: 'valorBrutoArrecadado',
        rotulo: 'arrecadado',
        tipo: 'dinheiro',
        renderizar: renderizarArrecadado,
      },
      { chave: 'metaFinanceira', rotulo: 'meta', tipo: 'dinheiro' },
    ],
    chavePrimaria: 'idCampanha',
    acoesEmColuna: [
      { rotulo: 'comentar', acoes: ['comentar'] },
      { rotulo: 'seguir', acoes: ['seguir', 'deixarDeSeguir'] },
      { rotulo: 'denunciar', acoes: ['denunciar'] },
    ],
    acaoIndisponivel,
    filtrosFacetados: [
      { chave: 'status', rotulo: 'Status', rotulos: ROTULO_STATUS_CAMPANHA },
      { chave: 'origem', rotulo: 'Origem' },
    ],
  };

  const acoes: AcoesLinha<CampanhaLinha> = {
    consultar: setConsultando,
    comentar: setComentando,
    seguir: alternarSeguir,
    deixarDeSeguir: alternarSeguir,
    denunciar: setDenunciando,
  };

  const modais = (
    <>
      {consultando && (
        <ModalConsultarCampanha auth={authRegistrado} idCampanha={consultando.idCampanha} aoFechar={() => setConsultando(null)} />
      )}
      {comentando && (
        <ModalComentar
          authFetch={authRegistrado.authFetch}
          usuario={auth.usuario}
          campanha={comentando}
          aoFechar={() => setComentando(null)}
        />
      )}
      {denunciando && (
        <ModalDenunciar
          authFetch={authRegistrado.authFetch}
          alvo={{ idCampanhaAlvo: denunciando.idCampanha }}
          nomeAlvo={denunciando.titulo}
          aoFechar={() => setDenunciando(null)}
        />
      )}
    </>
  );

  return { authRegistrado, usuarios, buscarLinhas, tabela, acoes, modais };
}
