// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { tratarResposta } from '../../services/constant/api/http.util';
import { useCampoTestes } from '../../services/campo-testes/hook/use-campo-testes';
import { useChamadaRegistrada } from '../../services/campo-testes/hook/use-chamada-registrada';
import { RegistroChamadas } from './registro-chamadas';

const FASES = ['andamento', 'resultado_preliminar', 'resultado_final'];
const TIPOS = ['texto', 'imagem', 'pdf', 'linkexterno'];
const LIMITE_ENDOSSOS = 4; // configuracoes.limite_endossos_campanha (mesmo default do seed)

// T3, depende de uma campanha já ATIVA. Não escolhe mais a campanha por
// conta própria (23-08-2026, pedido do Lucas: "só vai aparecer a
// campanha que foi selecionada no T anterior"), usa `campanhaFoco`
// (CampoTestesProvider), a mesma escolha feita na Bancada da Campanha
// (T2). Sem campanha focada ainda, só mostra o link pra T2.
//
// SEM REDESENHO ainda (25-08-2026, remoção do Elenco: T1 e T2 tiveram
// prioridade, T3 fica só "destravado" por enquanto — o redesenho de
// verdade fica pra outra conversa, junto com a criação de campanha pelo
// próprio pesquisador). Toda ação usa a sessão REAL do painel agora, sem
// escolha de ator: publicar atualização e comentar só têm efeito quando
// a própria sessão logada É o dono/o autor pretendido; "Seguidores" virou
// um único toggle ("Eu sigo"), não dá mais pra simular vários seguidores
// ao mesmo tempo dentro da ferramenta.
export function VidaCampanhaAtiva({ auth }) {
  const { campanhaFoco } = useCampoTestes();
  const chamarERegistrar = useChamadaRegistrada(auth);

  const [campanha, setCampanha] = useState(null);
  const [nomesPorId, setNomesPorId] = useState(new Map());

  const [atualizacoes, setAtualizacoes] = useState([]);
  const [novaAtualizacao, setNovaAtualizacao] = useState({ titulo: '', conteudo: '', fase: 'andamento', tipo: 'texto' });

  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState({ conteudo: '', endossado: false });

  const [euSigo, setEuSigo] = useState(false);

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
    // 04) — sem Elenco, só dá pra saber se A PRÓPRIA sessão logada segue.
    chamarERegistrar('/seguir-campanha')
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
    await chamarERegistrar('/atualizacao-campanha', {
      method: 'POST',
      body: JSON.stringify({ idCampanha: campanhaFoco, ...novaAtualizacao }),
    }).catch(() => {});
    setNovaAtualizacao({ titulo: '', conteudo: '', fase: 'andamento', tipo: 'texto' });
    recarregarTudo(campanhaFoco);
  };

  const alternarAtivoAtualizacao = async (idAtualizacao, ativoAtual) => {
    await chamarERegistrar(`/atualizacao-campanha/${idAtualizacao}`, { method: 'PATCH', body: JSON.stringify({ ativo: !ativoAtual }) }).catch(() => {});
    recarregarTudo(campanhaFoco);
  };

  const enviarComentario = async () => {
    if (!novoComentario.conteudo) return;
    await chamarERegistrar('/comentario', {
      method: 'POST',
      body: JSON.stringify({ idCampanha: campanhaFoco, conteudo: novoComentario.conteudo, endossado: novoComentario.endossado }),
    }).catch(() => {});
    setNovoComentario({ conteudo: '', endossado: false });
    recarregarTudo(campanhaFoco);
  };

  const endossosAtivos = comentarios.filter((c) => c.endossado && c.ativo).length;

  const alternarSeguir = async () => {
    if (euSigo) {
      await chamarERegistrar(`/seguir-campanha/${campanhaFoco}`, { method: 'DELETE' }).catch(() => {});
    } else {
      await chamarERegistrar('/seguir-campanha', { method: 'POST', body: JSON.stringify({ idCampanha: campanhaFoco }) }).catch(() => {});
    }
    recarregarTudo(campanhaFoco);
  };

  return (
    <div className="admin-content-painel">
      <section className="crud-secao">
      <div className="crud-secao__cabecalho">
        <h2 className="titulo-secao">Campo de Testes - Vida da Campanha Ativa</h2>
      </div>

      {!campanhaFoco && (
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
          <div className="acao-com-motivo mb-2">
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
              <button type="button" className="btn btn-secondary text-xs" disabled={!donoEhSessaoReal} onClick={publicarAtualizacao}>
                Publicar ({donoChave ? nomeDe(donoChave) : '?'})
              </button>
            </div>
            {!donoEhSessaoReal && <span className="acao-com-motivo__motivo">Só publica quem estiver logado como o dono da campanha ({nomeDe(campanha.idUsuario)}).</span>}
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
                    <button type="button" className="crud-tabela__acao" onClick={() => alternarAtivoAtualizacao(item.idAtualizacao, item.ativo)}>
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
            <input type="text" placeholder="Comentário" value={novoComentario.conteudo} onChange={(e) => setNovoComentario({ ...novoComentario, conteudo: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs flex-1" />
            <label className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={novoComentario.endossado} onChange={(e) => setNovoComentario({ ...novoComentario, endossado: e.target.checked })} />
              endossar
            </label>
            <button type="button" className="btn btn-secondary text-xs" onClick={enviarComentario}>
              Enviar (como {auth.usuario?.nome})
            </button>
          </div>
          <p className="texto-fraco text-xs mb-2">Comenta sempre a sessão logada — o banco bloqueia comentário na própria campanha.</p>
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
          <p className="texto-fraco text-xs mb-2">
            Sem Elenco só dá pra simular a própria sessão logada seguindo ou não — um roster de vários
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
