import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { TextoResumido } from '../../components/crud/texto-resumido';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { rotuloStatusCampanha } from '../../services/12-campanha/constants/status-campanha.constants';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import { renderizarStatus, textoStatus } from '../12-campanha/colunas-campanha';
import { seguirCampanhaApi } from '../../services/16-seguir/api/seguir-campanha.api';
import type { SeguirCampanhaResponse } from '../../services/16-seguir/type/seguir-campanha.type';
import { seguirPesquisadorApi } from '../../services/16-seguir/api/seguir-pesquisador.api';
import type { SeguirPesquisadorResponse } from '../../services/16-seguir/type/seguir-pesquisador.type';
import { comentarioApi } from '../../services/17-comentario/api/comentario.api';
import type { ComentarioMeuResponse } from '../../services/17-comentario/type/comentario.type';
import { denunciaApi } from '../../services/19-denuncia/api/denuncia.api';
import { SecaoContestacaoScore } from '../19-denuncia/secao-contestacao-score';
import {
  CLASSE_BADGE_STATUS_DENUNCIA,
  ROTULO_STATUS_DENUNCIA,
  situacaoDenuncia,
} from '../../services/19-denuncia/constants/status-denuncia.constants';
import type { DenunciaResponse } from '../../services/19-denuncia/type/denuncia.type';
import type { SituacaoDenuncia } from '../../services/19-denuncia/constants/status-denuncia.constants';
import { BadgeClicavel } from '../../components/crud/badge-clicavel';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { CampoFicha } from '../../components/crud/ficha-consulta';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';

interface CampanhaSeguindo extends SeguirCampanhaResponse {
  tituloCampanha: string;
  // RF-089: o indicador de status de cada campanha seguida.
  status: string;
  statusOriginal: CampanhaResponse['status'];
  dataInicio: CampanhaResponse['dataInicio'];
}

interface PesquisadorSeguido extends SeguirPesquisadorResponse {
  nomeExibicao: string;
}

interface DenunciaLinha extends DenunciaResponse {
  alvo: string;
  situacaoChave: SituacaoDenuncia;
  situacao: string;
  classeSituacao: string;
}

interface ComentarioLinha extends ComentarioMeuResponse {
  situacao: string;
}

interface AbaMinhasAtividadesProps {
  auth: Pick<UseAuthReturn, 'usuario' | 'authFetch'>;
}

function paraDenunciaLinha(denuncia: DenunciaResponse): DenunciaLinha {
  const situacao = situacaoDenuncia(denuncia);
  const alvo = denuncia.idCampanhaAlvo !== null
    ? `Campanha: ${denuncia.tituloCampanha ?? `#${denuncia.idCampanhaAlvo}`}`
    : `Pesquisador: ${denuncia.nomePesquisadorAlvo ?? 'perfil indisponível'}`;
  return {
    ...denuncia,
    alvo,
    situacaoChave: situacao,
    situacao: ROTULO_STATUS_DENUNCIA[situacao],
    classeSituacao: CLASSE_BADGE_STATUS_DENUNCIA[situacao],
  };
}

// O desfecho em palavras simples, para quem denunciou (21-11-2026): antes ela só via a pílula e não sabia o que tinha
// acontecido. Quem julgou não aparece: a decisão é da moderação, não de uma pessoa.
const DESFECHO_DENUNCIA: Record<SituacaoDenuncia, string> = {
  pendente: 'A moderação ainda vai analisar esta denúncia. Quando decidir, o resultado aparece aqui.',
  resolvida: 'A moderação analisou e concordou com a denúncia: o problema foi confirmado e tratado.',
  improcedente: 'A moderação analisou e não encontrou o problema apontado, então nada mudou.',
  em_contestacao: 'A moderação concordou com a denúncia, mas o pesquisador contestou a decisão. A moderação vai analisar de novo, e o resultado pode mudar.',
};

function paraComentarioLinha(comentario: ComentarioMeuResponse): ComentarioLinha {
  return {
    ...comentario,
    situacao: !comentario.ativo
      ? 'Removido'
      : comentario.endossado
        ? 'Endossado'
        : '-', // sem endosso: só um traço ("aguardando" prometia um endosso que quase nunca vem)
  };
}

export function AbaMinhasAtividades({ auth }: AbaMinhasAtividadesProps) {
  const [chaveRecargaCampanhas, setChaveRecargaCampanhas] = useState(0);
  const [chaveRecargaPesquisadores, setChaveRecargaPesquisadores] = useState(0);
  const [vendoDenuncia, setVendoDenuncia] = useState<DenunciaLinha | null>(null);
  const erros = useErroToast();
  const { mostrar } = useToast();
  const { executar } = useEnvio(erros.reportarErro, erros.limparErro);

  const listarCampanhasSeguidas = useCallback(async (): Promise<CampanhaSeguindo[]> => {
    const seguidas = await seguirCampanhaApi.listarMinhas(auth.authFetch);
    return Promise.all(seguidas.map(async (seguida) => {
      const campanha = await campanhaApi.buscar(auth.authFetch, seguida.idCampanha);
      return {
        ...seguida,
        tituloCampanha: campanha.titulo,
        status: rotuloStatusCampanha(campanha),
        statusOriginal: campanha.status,
        dataInicio: campanha.dataInicio,
      };
    }));
  }, [auth.authFetch]);

  const listarPesquisadoresSeguidos = useCallback(async (): Promise<PesquisadorSeguido[]> =>
    (await seguirPesquisadorApi.listarMinhas(auth.authFetch)).map((pesquisador) => ({
      ...pesquisador,
      nomeExibicao: pesquisador.nomePesquisador ?? `Pesquisador #${pesquisador.idPesquisador}`,
    })), [auth.authFetch]);

  const listarDenuncias = useCallback(async (): Promise<DenunciaLinha[]> =>
    (await denunciaApi.listar(auth.authFetch)).map(paraDenunciaLinha), [auth.authFetch]);

  const listarComentarios = useCallback(async (): Promise<ComentarioLinha[]> =>
    (await comentarioApi.listarMinhas(auth.authFetch)).map(paraComentarioLinha), [auth.authFetch]);

  const deixarDeSeguirCampanha = (linha: CampanhaSeguindo) => void executar(async () => {
    await seguirCampanhaApi.deixarDeSeguir(auth.authFetch, linha.idCampanha);
    mostrar('Você deixou de seguir esta campanha.');
    setChaveRecargaCampanhas((atual) => atual + 1);
  });

  const deixarDeSeguirPesquisador = (linha: PesquisadorSeguido) => void executar(async () => {
    await seguirPesquisadorApi.deixarDeSeguir(auth.authFetch, linha.idPesquisador);
    mostrar('Você deixou de seguir este pesquisador.');
    setChaveRecargaPesquisadores((atual) => atual + 1);
  });

  return (
    <div className="px-6 sm:px-8 py-8 space-y-8">
      <GenericTable<CampanhaSeguindo>
        titulo="Campanhas que sigo"
        nivelTitulo={2}
        colunas={[
          {
            chave: 'tituloCampanha',
            rotulo: 'campanha',
            tipo: 'nome',
            umaLinha: true,
            renderizar: (linha) => (
              <span className="crud-tabela__nome">
                <TextoResumido texto={linha.tituloCampanha} link={`/campanha/${linha.idCampanha}`} />
              </span>
            ),
            textoExibido: (linha) => linha.tituloCampanha,
          },
          { chave: 'status', rotulo: 'situação', tipo: 'status', renderizar: renderizarStatus, textoExibido: textoStatus },
          { chave: 'seguidoEm', rotulo: 'seguindo desde', tipo: 'dataHora' },
        ]}
        chavePrimaria="idSegCampanha"
        listar={listarCampanhasSeguidas}
        chaveRecarga={chaveRecargaCampanhas}
        acoes={{ deixarDeSeguir: deixarDeSeguirCampanha }}
        vazio={{ icone: 'fa-heart', titulo: 'Você ainda não segue campanhas.' }}
      />

      <GenericTable<PesquisadorSeguido>
        titulo="Pesquisadores que sigo"
        nivelTitulo={2}
        colunas={[
          {
            chave: 'nomeExibicao',
            rotulo: 'pesquisador',
            tipo: 'nome',
            umaLinha: true,
            renderizar: (linha) => (
              <Link to={`/pesquisador/${linha.idPesquisador}`} className="link-texto">
                {linha.nomeExibicao}
              </Link>
            ),
            textoExibido: (linha) => linha.nomeExibicao,
          },
          { chave: 'seguidoEm', rotulo: 'seguindo desde', tipo: 'dataHora' },
        ]}
        chavePrimaria="idSegPesquisador"
        listar={listarPesquisadoresSeguidos}
        chaveRecarga={chaveRecargaPesquisadores}
        acoes={{ deixarDeSeguir: deixarDeSeguirPesquisador }}
        vazio={{ icone: 'fa-user-plus', titulo: 'Você ainda não segue pesquisadores.' }}
      />

      <GenericTable<DenunciaLinha>
        titulo="Denúncias que fiz"
        nivelTitulo={2}
        colunas={[
          { chave: 'alvo', rotulo: 'alvo', tipo: 'nome', umaLinha: true },
          { chave: 'motivo', rotulo: 'motivo', tipo: 'texto' },
          {
            chave: 'situacao',
            rotulo: 'situação',
            tipo: 'status',
            // A pílula abre o desfecho (21-11-2026).
            renderizar: (linha) => (
              <BadgeClicavel classe={linha.classeSituacao} rotulo={linha.situacao} dica="Ver o que aconteceu" aoClicar={() => setVendoDenuncia(linha)} />
            ),
            textoExibido: (linha) => linha.situacao,
          },
          { chave: 'criadoEm', rotulo: 'enviada em', tipo: 'dataHora' },
        ]}
        chavePrimaria="idDenuncia"
        listar={listarDenuncias}
        vazio={{ icone: 'fa-flag', titulo: 'Você ainda não fez denúncias.' }}
      />
      {vendoDenuncia && (
        <ModalFicha
          titulo="Sua denúncia"
          subtitulo={vendoDenuncia.alvo}
          aoFechar={() => setVendoDenuncia(null)}
          rodape={<RodapeAcoes aoCancelar={() => setVendoDenuncia(null)} rotuloCancelar="Fechar" />}
        >
          <div className="grade-ficha">
            <CampoFicha rotulo="Situação" valor={vendoDenuncia.situacao} />
            <CampoFicha rotulo="Enviada em" valor={formatarDataHora(vendoDenuncia.criadoEm)} />
            <CampoFicha rotulo="O que aconteceu" valor={DESFECHO_DENUNCIA[vendoDenuncia.situacaoChave]} largura="cheia" />
            {vendoDenuncia.justificativaModeracao && (
              <CampoFicha rotulo="Resposta da moderação" valor={vendoDenuncia.justificativaModeracao} largura="cheia" />
            )}
            {vendoDenuncia.contestacaoStatus === 'aceita' && (
              <CampoFicha
                rotulo="Revisão da decisão"
                valor={`O pesquisador contestou e a moderação reviu a decisão.${vendoDenuncia.justificativaContestacao ? ` ${vendoDenuncia.justificativaContestacao}` : ''}`}
                largura="cheia"
              />
            )}
            {vendoDenuncia.julgadoEm && <CampoFicha rotulo="Decidida em" valor={formatarDataHora(vendoDenuncia.julgadoEm)} />}
            <CampoFicha rotulo="Motivo" valor={vendoDenuncia.motivo} largura="cheia" />
            {vendoDenuncia.relato && <CampoFicha rotulo="O que você relatou" valor={vendoDenuncia.relato} largura="cheia" />}
          </div>
        </ModalFicha>
      )}

      {/* Denúncias recebidas (decisão de 14-11-2026): junto das enviadas, aqui em Minhas atividades, não mais em Segurança. */}
      {auth.usuario?.ehPesquisador && <SecaoContestacaoScore authFetch={auth.authFetch} />}

      {auth.usuario?.ehPesquisador && (
        <GenericTable<ComentarioLinha>
          titulo="Comentários que fiz"
          nivelTitulo={2}
          colunas={[
            {
              chave: 'tituloCampanha',
              rotulo: 'campanha',
              tipo: 'nome',
              umaLinha: true,
              renderizar: (linha) => (
                <span className="crud-tabela__nome">
                  <TextoResumido texto={linha.tituloCampanha} link={`/campanha/${linha.idCampanha}`} />
                </span>
              ),
              textoExibido: (linha) => linha.tituloCampanha,
            },
            { chave: 'conteudo', rotulo: 'comentário', tipo: 'texto', umaLinha: true },
            {
              chave: 'situacao',
              rotulo: 'situação',
              tipo: 'status',
              renderizar: (linha) => (
                <span className={'badge ' + (linha.ativo ? 'badge-neutro' : 'badge-erro')}>
                  {linha.situacao}
                </span>
              ),
              textoExibido: (linha) => linha.situacao,
            },
            { chave: 'criadoEm', rotulo: 'feito em', tipo: 'dataHora' },
          ]}
          chavePrimaria="idComentario"
          listar={listarComentarios}
          vazio={{ icone: 'fa-comments', titulo: 'Você ainda não comentou em campanhas.' }}
        />
      )}
    </div>
  );
}
