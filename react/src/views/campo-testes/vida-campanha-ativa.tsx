// Campo de Testes é parte permanente do painel administrativo (não uma ferramenta de teste descartável), com o
// mesmo padrão de dados/comportamento do resto do sistema (nunca uma versão simplificada à parte).

import { useEffect, useState } from 'react';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { tratarResposta } from '../../services/constant/api/http.util';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { useChamadaRegistrada } from '../../services/campo-testes/hook/use-chamada-registrada';
import { LIMITE_SUGESTOES_COMBOBOX } from '../../services/campo-testes/constants/campo-testes.constants';
import { contemTermo, normalizarBusca } from '../../services/constant/utils/busca.util';
import { RegistroChamadas } from './registro-chamadas';
import { TabelaAtualizacoes } from '../../components/crud/tabelas/10-tabela-atualizacoes';
import type { Atualizacao } from '../../components/crud/tabelas/10-tabela-atualizacoes';
import { TabelaComentarios } from '../../components/crud/tabelas/11-tabela-comentarios';
import type { Comentario } from '../../components/crud/tabelas/11-tabela-comentarios';
import { CaixaBuscaSugestoes } from '../../components/input/caixa-busca-sugestoes';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import type { ResultadoPaginado } from '../../services/constant/type/paginacao.type';

// `atualizacao-campanha`/`comentario`/`seguir-campanha` não têm type/
// formal ainda - só o Campo de Testes fala com eles, via authFetch cru +
// tratarResposta<T>/chamarERegistrar<T>. Shape inferido do próprio uso
// real aqui.
interface SeguirCampanha {
  idCampanha: number;
}

const FASES = ['andamento', 'resultado_preliminar', 'resultado_final'];
const TIPOS = ['texto', 'imagem', 'pdf', 'linkexterno'];

// T3, depende de uma campanha já ATIVA. Toda ação usa a sessão REAL do painel, sem escolha de ator: publicar
// atualização e comentar só têm efeito quando a própria sessão logada É o dono/o autor pretendido; "Seguidores"
// é um único toggle ("Eu sigo"), não dá para simular vários seguidores ao mesmo tempo dentro da ferramenta.
//
// Busca própria: T3 não depende de nenhuma seleção feita em outra tela. `campanhaFoco` é estado local (mesmo
// padrão do combobox "dono da campanha" de T2/Criar Campanha: digita id ou pedaço do título, até 5 resultados).
export function VidaCampanhaAtiva({ auth }: PropsPagina) {
  const chamarERegistrar = useChamadaRegistrada(auth);
  // Limite vem de configuracoes (publica), o 4 é só reserva enquanto carrega.
  const { obterConfiguracao } = useConfiguracoes();
  const valorLimiteEndossos = obterConfiguracao('limite_endossos_campanha', 4);
  const LIMITE_ENDOSSOS = typeof valorLimiteEndossos === 'number' ? valorLimiteEndossos : 4;

  const [campanhaFoco, setCampanhaFoco] = useState<number | null>(null);
  const [todasCampanhas, setTodasCampanhas] = useState<CampanhaResponse[]>([]);
  const [buscaCampanha, setBuscaCampanha] = useState('');

  const [campanha, setCampanha] = useState<CampanhaResponse | null>(null);
  const [nomesPorId, setNomesPorId] = useState<Map<number, string>>(new Map());

  const [atualizacoes, setAtualizacoes] = useState<Atualizacao[]>([]);
  const [novaAtualizacao, setNovaAtualizacao] = useState({ titulo: '', conteudo: '', fase: 'andamento', tipo: 'texto' });

  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  // SEM `endossado` aqui: quem escreve o comentário nunca decide o próprio endosso, só o dono da campanha,
  // depois, numa ação separada (ver `alternarEndosso`, abaixo). O banco bloqueia o autoendosso
  // incondicionalmente (trg_comentario_ignora_endosso_criacao, 05_regras_negocio.sql, RF-089).
  const [novoComentario, setNovoComentario] = useState({ conteudo: '' });

  const [euSigo, setEuSigo] = useState(false);

  // Aceita `null`: `idPesquisador` de um comentário pode ser `null` de verdade (autor excluído/anonimizado),
  // não só usuário nunca carregado.
  const nomeDe = (idUsuario: number | null): string =>
    idUsuario === null ? 'Pesquisador removido' : (nomesPorId.get(idUsuario) ?? `usuário #${idUsuario}`);

  useEffect(() => {
    // Espera a sessão ser restaurada (F5), ver bancada-campanha.tsx.
    if (auth.carregando) {
      return;
    }
    usuarioApi
      .listar(auth.authFetch)
      .then((lista) => setNomesPorId(new Map(lista.map((usuario) => [usuario.idUsuario, usuario.nome]))))
      .catch(() => {});
    // Todas as campanhas, uma vez só ao montar (mesmo padrão do combobox "dono da campanha" em
    // bancada-campanha.tsx: filtra client-side por id/título em vez de buscar a cada tecla): alimenta a busca
    // própria de T3, ver `sugestoesCampanha` abaixo.
    campanhaApi.listar(auth.authFetch).then(setTodasCampanhas).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.carregando]);

  // Busca por id OU pedaço do título (mesmo padrão do combobox de pesquisador em T2): até 5 resultados.
  const sugestoesCampanha = (() => {
    const termo = normalizarBusca(buscaCampanha);
    if (!termo) return [];
    return todasCampanhas
      .filter((item) => String(item.idCampanha).includes(termo) || contemTermo(item.titulo, termo))
      .slice(0, LIMITE_SUGESTOES_COMBOBOX);
  })();

  const recarregarTudo = (id: number | null) => {
    if (!id) return;
    campanhaApi.buscar(auth.authFetch, id).then(setCampanha).catch(() => {});
    auth
      .authFetch(`/atualizacao-campanha?idCampanha=${id}&tamanho=50`)
      .then(tratarResposta<ResultadoPaginado<Atualizacao>>)
      .then((r) => setAtualizacoes(r.dados))
      .catch(() => {});
    auth
      .authFetch(`/comentario?idCampanha=${id}&tamanho=50`)
      .then(tratarResposta<ResultadoPaginado<Comentario>>)
      .then((r) => setComentarios(r.dados))
      .catch(() => {});
    // GET /seguir-campanha só devolve "minha lista" (pol_seg_campanha_select,
    // 04) - sem Elenco, só dá pra saber se A PRÓPRIA sessão logada segue.
    chamarERegistrar<SeguirCampanha[]>('/seguir-campanha')
      .then((lista) => setEuSigo(lista.some((item) => item.idCampanha === id)))
      .catch(() => setEuSigo(false));
  };

  useEffect(() => {
    recarregarTudo(campanhaFoco);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanhaFoco]);

  const donoChave = campanha?.idUsuario ?? null;
  const donoEhSessaoReal = donoChave !== null && donoChave === auth.usuario?.idUsuario;

  const publicarAtualizacao = async () => {
    if (!donoEhSessaoReal || !novaAtualizacao.titulo || !novaAtualizacao.conteudo) return;
    await chamarERegistrar<void>('/atualizacao-campanha', {
      method: 'POST',
      body: JSON.stringify({ idCampanha: campanhaFoco, ...novaAtualizacao }),
    }).catch(() => {});
    setNovaAtualizacao({ titulo: '', conteudo: '', fase: 'andamento', tipo: 'texto' });
    recarregarTudo(campanhaFoco);
  };

  const alternarAtivoAtualizacao = async (idAtualizacao: number, ativoAtual: boolean) => {
    await chamarERegistrar<void>(`/atualizacao-campanha/${idAtualizacao}`, { method: 'PATCH', body: JSON.stringify({ ativo: !ativoAtual }) }).catch(() => {});
    recarregarTudo(campanhaFoco);
  };

  const enviarComentario = async () => {
    if (!novoComentario.conteudo) return;
    await chamarERegistrar<void>('/comentario', {
      method: 'POST',
      body: JSON.stringify({ idCampanha: campanhaFoco, conteudo: novoComentario.conteudo }),
    }).catch(() => {});
    setNovoComentario({ conteudo: '' });
    recarregarTudo(campanhaFoco);
  };

  const endossosAtivos = comentarios.filter((c) => c.endossado && c.ativo).length;

  // Endossar/remover endosso (RF-089) - ação SEPARADA do dono da campanha,
  // nunca do autor do comentário. Mesmo padrão de `alternarAtivoAtualizacao`
  // (acima): PATCH direto, gateado por `donoEhSessaoReal` no próprio botão
  // (a RLS/trigger no banco também recusa se a sessão não for o dono nem
  // tiver `comentario_moderar` - isto só evita oferecer um botão que ia
  // falhar na hora).
  const alternarEndosso = async (idComentario: number, endossadoAtual: boolean) => {
    await chamarERegistrar<void>(`/comentario/${idComentario}`, {
      method: 'PATCH',
      body: JSON.stringify({ endossado: !endossadoAtual }),
    }).catch(() => {});
    recarregarTudo(campanhaFoco);
  };

  const alternarSeguir = async () => {
    if (euSigo) {
      await chamarERegistrar<void>(`/seguir-campanha/${campanhaFoco}`, { method: 'DELETE' }).catch(() => {});
    } else {
      await chamarERegistrar<void>('/seguir-campanha', { method: 'POST', body: JSON.stringify({ idCampanha: campanhaFoco }) }).catch(() => {});
    }
    recarregarTudo(campanhaFoco);
  };

  return (
    <div className="admin-content-painel">
      <section className="crud-secao">
      <div className="crud-secao__cabecalho">
        <h1 className="titulo-secao">Campo de Testes - Vida da Campanha Ativa</h1>
      </div>

      <CaixaBuscaSugestoes
        className="mb-4 max-w-sm"
        rotulo="Buscar campanha"
        placeholder="Digite o id ou o título..."
        valor={buscaCampanha}
        aoDigitar={(texto) => {
          setBuscaCampanha(texto);
          setCampanhaFoco(null);
        }}
        sugestoes={sugestoesCampanha.map((item) => ({
          id: item.idCampanha,
          texto: item.titulo,
          extra: <span className="badge badge-neutro">{item.status}</span>,
        }))}
        aoEscolher={(sugestao) => {
          setCampanhaFoco(sugestao.id);
          setBuscaCampanha(sugestao.texto);
        }}
      />

      {!campanhaFoco && (
        <p className="texto-fraco">Nenhuma campanha selecionada ainda - busque uma acima (id ou título).</p>
      )}

      {campanha && (
        <>
          <div className="fundo-sutil rounded-md p-4 mb-4">
            <span className="badge badge-sucesso">{campanha.status}</span> <strong>#{campanha.idCampanha}: {campanha.titulo}</strong>{' '}
            <span className="texto-fraco text-xs">dono: {nomeDe(campanha.idUsuario)}</span>
          </div>

          <h2 className="subtitulo mb-2">Atualizações</h2>
          <div className="acao-com-motivo mb-2">
            <div className="flex gap-2 flex-wrap items-end">
              <input type="text" placeholder="Título" value={novaAtualizacao.titulo} onChange={(e) => setNovaAtualizacao({ ...novaAtualizacao, titulo: e.target.value })} className="input-padrao w-40" />
              <input type="text" placeholder="Conteúdo" value={novaAtualizacao.conteudo} onChange={(e) => setNovaAtualizacao({ ...novaAtualizacao, conteudo: e.target.value })} className="input-padrao flex-1" />
              <select value={novaAtualizacao.fase} onChange={(e) => setNovaAtualizacao({ ...novaAtualizacao, fase: e.target.value })} className="input-padrao w-40">
                {FASES.map((fase) => (
                  <option key={fase} value={fase}>
                    {fase}
                  </option>
                ))}
              </select>
              <select value={novaAtualizacao.tipo} onChange={(e) => setNovaAtualizacao({ ...novaAtualizacao, tipo: e.target.value })} className="input-padrao w-32">
                {TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-secondary text-xs" disabled={!donoEhSessaoReal} onClick={publicarAtualizacao}>
                Publicar ({donoChave ? nomeDe(donoChave) : '?'})
              </button>
            </div>
            {!donoEhSessaoReal && <span className="acao-com-motivo__motivo">Só publica quem estiver logado como o dono da campanha ({nomeDe(campanha.idUsuario)}).</span>}
          </div>
          <TabelaAtualizacoes
            atualizacoes={atualizacoes}
            aoAlternarAtivo={(item) => void alternarAtivoAtualizacao(item.idAtualizacao, item.ativo)}
          />
          <p className="texto-fraco text-xs mb-4">
            <i className="fa-solid fa-ban"></i> Anexos (arquivo_atualizacao): aguardando o módulo 25-arquivo existir de verdade.
          </p>

          <div className="border-t borda-padrao my-8"></div>

          <h3 className="subtitulo mb-2">
            Comentários e endossos ({endossosAtivos} de {LIMITE_ENDOSSOS} endossos ativos)
          </h3>
          <div className="flex gap-2 flex-wrap items-end mb-2">
            <input type="text" placeholder="Comentário" value={novoComentario.conteudo} onChange={(e) => setNovoComentario({ ...novoComentario, conteudo: e.target.value })} className="input-padrao flex-1" />
            <button type="button" className="btn btn-secondary text-xs" onClick={enviarComentario}>
              Enviar (como {auth.usuario?.nome})
            </button>
          </div>
          <p className="texto-fraco text-xs mb-2">
            Comenta sempre a sessão logada - o banco bloqueia comentário na própria campanha. Endossar é ação
            separada, só do dono da campanha (RF-089) - sem endossar aqui, só é possível testando logado como o
            próprio dono.
          </p>
          <TabelaComentarios
            comentarios={comentarios}
            nomeDe={nomeDe}
            podeEndossar={donoEhSessaoReal}
            limiteAtingido={endossosAtivos >= LIMITE_ENDOSSOS}
            aoAlternarEndosso={(item) => void alternarEndosso(item.idComentario, item.endossado)}
          />

          <div className="border-t borda-padrao my-8"></div>

          <h2 className="subtitulo mb-2">Seguidores</h2>
          <p className="texto-fraco text-xs mb-2">
            Sem Elenco só dá pra simular a própria sessão logada seguindo ou não - um roster de vários
            seguidores ao mesmo tempo fica pro redesenho de T3.
          </p>
          <button type="button" className={`btn ${euSigo ? 'btn-primary' : 'btn-secondary'} text-xs`} onClick={alternarSeguir}>
            {euSigo ? '✓ ' : ''}
            {auth.usuario?.nome} segue
          </button>
        </>
      )}

      <RegistroChamadas />
      </section>
    </div>
  );
}
