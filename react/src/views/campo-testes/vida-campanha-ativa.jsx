// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { tratarResposta } from '../../services/constant/api/http.util';
import { useElenco } from '../../services/campo-testes/hook/use-elenco';
import { BarraElenco } from './barra-elenco';
import { RegistroChamadas } from './registro-chamadas';

const FASES = ['andamento', 'resultado_preliminar', 'resultado_final'];
const TIPOS = ['texto', 'imagem', 'pdf', 'linkexterno'];
const LIMITE_ENDOSSOS = 4; // configuracoes.limite_endossos_campanha (mesmo default do seed)

// T3, depende de uma campanha já ATIVA. Não escolhe mais a campanha por
// conta própria (23-08-2026, pedido do Lucas: "só vai aparecer a
// campanha que foi selecionada no T anterior"), usa direto
// `elenco.campanhaFoco`, a mesma escolha feita na Bancada da Campanha
// (T2), compartilhada via ElencoProvider. Sem campanha focada ainda, só
// mostra o link pra T2. Leituras (detalhe, atualizações, comentários,
// nomes) usam a sessão REAL do painel; só publicar atualização/comentar/
// seguir passam por um ator específico do Elenco, é isso que precisa
// ficar atribuído a alguém de verdade.
export function VidaCampanhaAtiva({ auth }) {
  const elenco = useElenco();
  const chavesVivas = Object.keys(elenco.atores).filter((idUsuario) => elenco.atores[idUsuario].status === 'vivo');

  const [campanha, setCampanha] = useState(null);
  const [nomesPorId, setNomesPorId] = useState(new Map());

  const [atualizacoes, setAtualizacoes] = useState([]);
  const [novaAtualizacao, setNovaAtualizacao] = useState({ titulo: '', conteudo: '', fase: 'andamento', tipo: 'texto' });

  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState({ conteudo: '', endossado: false });
  const [autorComentario, setAutorComentario] = useState('');

  const [seguidores, setSeguidores] = useState([]);

  const nomeDe = (idUsuario) => nomesPorId.get(idUsuario) ?? `usuário #${idUsuario}`;

  useEffect(() => {
    usuarioApi
      .listar(auth.authFetch)
      .then((lista) => setNomesPorId(new Map(lista.map((usuario) => [usuario.idUsuario, usuario.nome]))))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recarregarTudo = (id) => {
    if (!id) return;
    campanhaApi.buscar(auth.authFetch, id).then(setCampanha).catch(() => {});
    auth.authFetch(`/atualizacao-campanha?idCampanha=${id}&tamanho=50`).then(tratarResposta).then((r) => setAtualizacoes(r.dados ?? [])).catch(() => {});
    auth.authFetch(`/comentario?idCampanha=${id}&tamanho=50`).then(tratarResposta).then((r) => setComentarios(r.dados ?? [])).catch(() => {});
    // GET /seguir-campanha só devolve "minha lista" (pol_seg_campanha_select,
    // 04): a única forma honesta de montar "quem segue" é perguntar a
    // CADA ator vivo do elenco e juntar. Sem várias sessões (o Elenco),
    // este painel simplesmente não existiria.
    Promise.all(
      chavesVivas.map((idUsuario) =>
        elenco
          .fetchComoAtor(idUsuario, '/seguir-campanha')
          .then((lista) => (lista.some((item) => item.idCampanha === id) ? [idUsuario] : []))
          .catch(() => []),
      ),
    ).then((listas) => setSeguidores(listas.flat()));
  };

  useEffect(() => {
    recarregarTudo(elenco.campanhaFoco);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elenco.campanhaFoco]);

  // Chave do Elenco é o idUsuario de verdade agora, o dono da campanha É
  // a própria chave, sem precisar procurar em lugar nenhum.
  const donoChave = campanha?.idUsuario ?? null;
  const donoEhOAtorFoco = donoChave && elenco.atores[donoChave]?.status === 'vivo';

  const publicarAtualizacao = async () => {
    if (!donoEhOAtorFoco || !novaAtualizacao.titulo || !novaAtualizacao.conteudo) return;
    await elenco
      .fetchComoAtor(donoChave, '/atualizacao-campanha', {
        method: 'POST',
        body: JSON.stringify({ idCampanha: elenco.campanhaFoco, ...novaAtualizacao }),
      })
      .catch(() => {});
    setNovaAtualizacao({ titulo: '', conteudo: '', fase: 'andamento', tipo: 'texto' });
    recarregarTudo(elenco.campanhaFoco);
  };

  const idAdminVivo = chavesVivas.find((idUsuario) => elenco.atores[idUsuario].papeis.includes('admin'));

  const alternarAtivoAtualizacao = async (idAtualizacao, ativoAtual) => {
    if (!idAdminVivo) return;
    await elenco.fetchComoAtor(idAdminVivo, `/atualizacao-campanha/${idAtualizacao}`, { method: 'PATCH', body: JSON.stringify({ ativo: !ativoAtual }) }).catch(() => {});
    recarregarTudo(elenco.campanhaFoco);
  };

  const enviarComentario = async () => {
    if (!autorComentario || !novoComentario.conteudo) return;
    await elenco
      .fetchComoAtor(Number(autorComentario), '/comentario', {
        method: 'POST',
        body: JSON.stringify({ idCampanha: elenco.campanhaFoco, conteudo: novoComentario.conteudo, endossado: novoComentario.endossado }),
      })
      .catch(() => {});
    setNovoComentario({ conteudo: '', endossado: false });
    recarregarTudo(elenco.campanhaFoco);
  };

  const endossosAtivos = comentarios.filter((c) => c.endossado && c.ativo).length;

  const alternarSeguir = async (idUsuario, jaSegue) => {
    if (jaSegue) {
      await elenco.fetchComoAtor(idUsuario, `/seguir-campanha/${elenco.campanhaFoco}`, { method: 'DELETE' }).catch(() => {});
    } else {
      await elenco.fetchComoAtor(idUsuario, '/seguir-campanha', { method: 'POST', body: JSON.stringify({ idCampanha: elenco.campanhaFoco }) }).catch(() => {});
    }
    recarregarTudo(elenco.campanhaFoco);
  };

  return (
    <div className="admin-content-painel">
      <section className="crud-secao">
      <div className="crud-secao__cabecalho">
        <h2 className="titulo-secao">Campo de Testes - Vida da Campanha Ativa</h2>
      </div>

      <BarraElenco auth={auth} />

      {!elenco.campanhaFoco && (
        <p className="texto-fraco">
          Nenhuma campanha selecionada ainda.{' '}
          <Link to="/admin/campo-testes/campanha" className="texto-link">
            Escolha uma na Bancada da Campanha primeiro.
          </Link>
        </p>
      )}

      {campanha && (
        <>
          <div className="fundo-sutil rounded-md p-4 mb-4">
            <span className="badge badge-sucesso">{campanha.status}</span> <strong>#{campanha.idCampanha}: {campanha.titulo}</strong>{' '}
            <span className="texto-fraco text-xs">dono: {nomeDe(campanha.idUsuario)}</span>
          </div>

          <h3 className="subtitulo mb-2">Atualizações</h3>
          <div className="elenco-botao-acao mb-2">
            <div className="flex gap-2 flex-wrap items-end">
              <input type="text" placeholder="Título" value={novaAtualizacao.titulo} onChange={(e) => setNovaAtualizacao({ ...novaAtualizacao, titulo: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs" />
              <input type="text" placeholder="Conteúdo" value={novaAtualizacao.conteudo} onChange={(e) => setNovaAtualizacao({ ...novaAtualizacao, conteudo: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs flex-1" />
              <select value={novaAtualizacao.fase} onChange={(e) => setNovaAtualizacao({ ...novaAtualizacao, fase: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs">
                {FASES.map((fase) => (
                  <option key={fase} value={fase}>
                    {fase}
                  </option>
                ))}
              </select>
              <select value={novaAtualizacao.tipo} onChange={(e) => setNovaAtualizacao({ ...novaAtualizacao, tipo: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs">
                {TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-secondary text-xs" disabled={!donoEhOAtorFoco} onClick={publicarAtualizacao}>
                Publicar ({donoChave ? nomeDe(donoChave) : '?'})
              </button>
            </div>
            {!donoEhOAtorFoco && <span className="elenco-botao-acao__motivo">O dono da campanha ({nomeDe(campanha.idUsuario)}) precisa estar no elenco.</span>}
          </div>
          <table className="crud-tabela mb-4">
            <thead>
              <tr>
                <th>Título</th>
                <th>Fase</th>
                <th className="crud-tabela__celula--centralizada">Ativo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {atualizacoes.map((item) => (
                <tr key={item.idAtualizacao}>
                  <td>{item.titulo}</td>
                  <td>{item.fase}</td>
                  <td className="crud-tabela__celula--centralizada">
                    <span className={`badge ${item.ativo ? 'badge-sucesso' : 'badge-neutro'}`}>{item.ativo ? 'Sim' : 'Não'}</span>
                  </td>
                  <td>
                    <button type="button" className="crud-tabela__acao" disabled={!idAdminVivo} onClick={() => alternarAtivoAtualizacao(item.idAtualizacao, item.ativo)}>
                      {item.ativo ? 'Ocultar' : 'Reverter'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="texto-fraco text-xs mb-4">
            <i className="fa-solid fa-ban"></i> Anexos (arquivo_atualizacao): aguardando o módulo 25-arquivo existir de verdade.
          </p>

          <div className="border-t borda-padrao my-8"></div>

          <h3 className="subtitulo mb-2">
            Comentários e endossos ({endossosAtivos} de {LIMITE_ENDOSSOS} endossos ativos)
          </h3>
          <div className="flex gap-2 flex-wrap items-end mb-2">
            <select value={autorComentario} onChange={(e) => setAutorComentario(e.target.value)} className="border borda-padrao rounded-md px-2 py-1 text-xs">
              <option value="">autor...</option>
              {chavesVivas
                .filter((idUsuario) => Number(idUsuario) !== campanha.idUsuario)
                .map((idUsuario) => (
                  <option key={idUsuario} value={idUsuario}>
                    {nomeDe(Number(idUsuario))}
                  </option>
                ))}
            </select>
            <input type="text" placeholder="Comentário" value={novoComentario.conteudo} onChange={(e) => setNovoComentario({ ...novoComentario, conteudo: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs flex-1" />
            <label className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={novoComentario.endossado} onChange={(e) => setNovoComentario({ ...novoComentario, endossado: e.target.checked })} />
              endossar
            </label>
            <button type="button" className="btn btn-secondary text-xs" onClick={enviarComentario}>
              Enviar
            </button>
          </div>
          <p className="texto-fraco text-xs mb-2">O dono da campanha não aparece na lista de autores. O banco bloqueia comentário na própria campanha.</p>
          <table className="crud-tabela mb-4">
            <thead>
              <tr>
                <th>Autor</th>
                <th>Comentário</th>
                <th>Endosso</th>
              </tr>
            </thead>
            <tbody>
              {comentarios.map((item) => (
                <tr key={item.idComentario}>
                  <td>{nomeDe(item.idPesquisador)}</td>
                  <td>{item.conteudo}</td>
                  <td>{item.endossado ? <span className="badge badge-sucesso">#{item.ordemEndosso}</span> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t borda-padrao my-8"></div>

          <h3 className="subtitulo mb-2">Seguidores</h3>
          <div className="flex gap-2 flex-wrap">
            {chavesVivas.map((idUsuario) => {
              const jaSegue = seguidores.includes(idUsuario);
              return (
                <button key={idUsuario} type="button" className={`btn ${jaSegue ? 'btn-primary' : 'btn-secondary'} text-xs`} onClick={() => alternarSeguir(Number(idUsuario), jaSegue)}>
                  {jaSegue ? '✓ ' : ''}
                  {nomeDe(Number(idUsuario))}
                </button>
              );
            })}
          </div>
        </>
      )}

      <RegistroChamadas />
      </section>
    </div>
  );
}
