// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

import { Fragment, useEffect, useRef, useState } from 'react';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { tratarResposta } from '../../services/constant/api/http.util';
import { useCampoTestes } from '../../services/campo-testes/hook/use-campo-testes';
import { useChamadaRegistrada } from '../../services/campo-testes/hook/use-chamada-registrada';
import { CAMPANHA_BLOQUEADA, motivoBloqueioCampanha } from '../../services/campo-testes/util/registros-bloqueados';
import { ModalDetalhe } from '../../components/crud/modal-detalhe';
import { RegistroChamadas } from './registro-chamadas';

// Mesmos defaults de configuracoes.orcamento_min_itens/cronograma_min_marcos
// (07_seed_dados.sql), mostrados aqui só como RÓTULO da checklist "Pronta
// pra aprovar?"; quem decide de verdade é sempre o banco
// (fn_valida_completude_campanha_aprovacao, 05).
const MINIMO_ITENS_ORCAMENTO = 3;
const MINIMO_MARCOS_CRONOGRAMA = 3;
const TAMANHOS_PAGINA = [10, 20, 30, 'todos'];
const LIMIAR_FILTRO = 5;

function formatarReais(valor) {
  return (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// T2, Bancada da Campanha. SEM ELENCO (25-08-2026, pedido do Lucas:
// "remover de vez" o motor de login-múltiplo - redesenho completo desta
// tela). Toda chamada usa a sessão REAL do painel (`auth`, sempre um
// admin): leituras sempre funcionaram assim (relatorio_visualizar vê
// tudo); as ESCRITAS que hoje continuam fazendo sentido (Alterar,
// orçamento/cronograma, Aprovar, Rejeitar, Excluir) também - o admin já
// tem `campanha_editar`/`campanha_aprovar`/`campanha_rejeitar`, RLS
// libera não importa quem seja o dono de verdade (04_rls_policies.sql,
// pol_campanha_update). Criar campanha SAIU daqui (RLS exige
// id_usuario = id_usuario_atual(), não dá pra "criar em nome de" um
// pesquisador escolhido sem personificação) - o Lucas vai detalhar
// depois como a criação pelo próprio pesquisador vai funcionar.
//
// `pesquisadorSelecionado` (T1, Bancada do Pesquisador, compartilhado via
// CampoTestesProvider): se tiver alguém selecionado, a tabela abaixo só
// mostra as campanhas DESSE pesquisador (filtro server-side, campanhaApi.
// listar já aceita `idUsuario`). "Campanha em foco" (23-08-2026, ERA um
// <select>, virou tabela com filtro/facet/paginação/linha selecionada,
// mesma regra de T1) continua em `campanhaFoco`, é o que deixa a Vida da
// Campanha Ativa (T3) só continuar de onde esta tela parou.
export function BancadaCampanha({ auth }) {
  const { pesquisadorSelecionado, limparPesquisadorSelecionado, campanhaFoco, selecionarCampanhaFoco } = useCampoTestes();
  const chamarERegistrar = useChamadaRegistrada(auth);

  const [areas, setAreas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  // Ligado por padrão (pedido do Lucas): a demo pré-montada (campanhas
  // 1-10) não serve pra testar, então já nasce fora da vista.
  const [ocultarBloqueadas, setOcultarBloqueadas] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(10);
  const [statusSelecionados, setStatusSelecionados] = useState([]);
  const [facetaStatusAberta, setFacetaStatusAberta] = useState(false);
  const facetaStatusRef = useRef(null);
  const [campanhaConsultada, setCampanhaConsultada] = useState(null);
  const [idCampanhaEditando, setIdCampanhaEditando] = useState(null);
  const [formEdicaoCampanha, setFormEdicaoCampanha] = useState(null);

  const [campanha, setCampanha] = useState(null);
  const [nomeDono, setNomeDono] = useState(null);
  const [orcamento, setOrcamento] = useState([]);
  const [cronograma, setCronograma] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState('orcamento');

  const [novoItemOrcamento, setNovoItemOrcamento] = useState({ categoria: '', valor: '' });
  const [novoMarco, setNovoMarco] = useState({ titulo: '', dataPrevista: '' });
  const [justificativaRejeicao, setJustificativaRejeicao] = useState('');

  const carregarCampanhas = () => {
    campanhaApi
      .listar(auth.authFetch, pesquisadorSelecionado ? { idUsuario: pesquisadorSelecionado.idUsuario } : undefined)
      .then(setCampanhas)
      .catch(() => {});
  };

  useEffect(() => {
    areaConhecimentoApi
      .listar(auth.authFetch)
      .then((lista) => setAreas(lista.filter((area) => area.idPai !== null)))
      .catch(() => {});
    usuarioApi.listar(auth.authFetch).then(setUsuarios).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recarrega sempre que o pesquisador selecionado em T1 mudar (filtro
  // por dono, feito no servidor - campanhaApi.listar já aceita
  // `idUsuario`) ou limpar (volta a mostrar todas).
  useEffect(() => {
    carregarCampanhas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pesquisadorSelecionado]);

  // Fechar o dropdown "Status" ao clicar fora (mesmo padrão do facet
  // "Papel" de bancada-pesquisador.jsx / GenericTable).
  useEffect(() => {
    if (!facetaStatusAberta) return undefined;
    const aoClicarFora = (evento) => {
      if (facetaStatusRef.current && !facetaStatusRef.current.contains(evento.target)) {
        setFacetaStatusAberta(false);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [facetaStatusAberta]);

  const nomeDe = (idUsuario) => usuarios.find((u) => u.idUsuario === idUsuario)?.nome ?? `#${idUsuario}`;

  const carregarDetalheCampanha = (id) => {
    if (!id) {
      setCampanha(null);
      setNomeDono(null);
      setOrcamento([]);
      setCronograma([]);
      return;
    }
    campanhaApi
      .buscar(auth.authFetch, id)
      .then((dados) => {
        setCampanha(dados);
        usuarioApi.buscar(auth.authFetch, dados.idUsuario).then((u) => setNomeDono(u.nome)).catch(() => {});
      })
      .catch(() => {});
    auth.authFetch(`/orcamento-campanha?idCampanha=${id}`).then(tratarResposta).then(setOrcamento).catch(() => {});
    auth.authFetch(`/marco-cronograma?idCampanha=${id}`).then(tratarResposta).then(setCronograma).catch(() => {});
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarDetalheCampanha(campanhaFoco);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanhaFoco]);

  // Opções do dropdown "Status" - só os valores que já aparecem nos
  // dados (mesmo sniff de GenericTable/bancada-pesquisador.jsx), sem
  // lista fixa do enum (evita hardcoded - se um status novo aparecer, o
  // facet já mostra sozinho).
  const opcoesStatus = [...new Set(campanhas.map((c) => c.status))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const campanhasFiltradas = campanhas
    .filter((item) => !ocultarBloqueadas || !CAMPANHA_BLOQUEADA(item.idCampanha))
    .filter((item) => statusSelecionados.length === 0 || statusSelecionados.includes(item.status))
    .filter((item) => {
      const termo = filtroTexto.trim().toLowerCase();
      if (!termo) return true;
      return [item.idCampanha, item.titulo, item.status, nomeDe(item.idUsuario)].some((valor) =>
        String(valor ?? '').toLowerCase().includes(termo),
      );
    });
  const totalPaginas = tamanhoPagina === 'todos' ? 1 : Math.max(1, Math.ceil(campanhasFiltradas.length / tamanhoPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const campanhasPagina =
    tamanhoPagina === 'todos' ? campanhasFiltradas : campanhasFiltradas.slice((paginaAtual - 1) * tamanhoPagina, paginaAtual * tamanhoPagina);

  const somaOrcamento = orcamento.reduce((total, item) => total + Number(item.valor), 0);
  const metaBatendo = campanha && somaOrcamento === Number(campanha.metaFinanceira);
  const orcamentoOk = orcamento.length >= MINIMO_ITENS_ORCAMENTO && metaBatendo;
  const cronogramaOk = cronograma.length >= MINIMO_MARCOS_CRONOGRAMA;
  const prontaParaAprovar = campanha?.status === 'aguardando_aprovacao' && orcamentoOk && cronogramaOk;

  const motivoAprovarDesabilitado = () => {
    if (campanha?.status !== 'aguardando_aprovacao') return `Status atual é "${campanha?.status}", não dá pra aprovar.`;
    if (!orcamentoOk) return `Orçamento incompleto (${orcamento.length}/${MINIMO_ITENS_ORCAMENTO} itens, soma ${formatarReais(somaOrcamento)} de ${formatarReais(campanha?.metaFinanceira)}).`;
    if (!cronogramaOk) return `Cronograma incompleto (${cronograma.length}/${MINIMO_MARCOS_CRONOGRAMA} marcos).`;
    return null;
  };

  const iniciarEdicaoCampanha = (item) => {
    setIdCampanhaEditando(item.idCampanha);
    setFormEdicaoCampanha({
      titulo: item.titulo,
      idAreaConhecimento: item.idAreaConhecimento,
      metaFinanceira: item.metaFinanceira,
      descricao: item.descricao ?? '',
      dataInicio: item.dataInicio ? item.dataInicio.slice(0, 10) : '',
      dataFim: item.dataFim ? item.dataFim.slice(0, 10) : '',
      videoApresentacaoUrl: item.videoApresentacaoUrl ?? '',
    });
  };

  // PATCH /campanha/:id (dono OU campanha_editar) - sem status/id_admin/
  // taxa_plataforma/modelo aqui de propósito, ver campanha.request-update.
  // ts: quem muda status são aprovar/rejeitar, nunca este PATCH genérico.
  const salvarEdicaoCampanha = async () => {
    if (!formEdicaoCampanha.titulo) return;
    await chamarERegistrar(`/campanha/${idCampanhaEditando}`, {
      method: 'PATCH',
      body: JSON.stringify({
        titulo: formEdicaoCampanha.titulo,
        idAreaConhecimento: Number(formEdicaoCampanha.idAreaConhecimento),
        metaFinanceira: Number(formEdicaoCampanha.metaFinanceira),
        ...(formEdicaoCampanha.descricao ? { descricao: formEdicaoCampanha.descricao } : {}),
        ...(formEdicaoCampanha.dataInicio ? { dataInicio: new Date(formEdicaoCampanha.dataInicio).toISOString() } : {}),
        ...(formEdicaoCampanha.dataFim ? { dataFim: new Date(formEdicaoCampanha.dataFim).toISOString() } : {}),
        ...(formEdicaoCampanha.videoApresentacaoUrl ? { videoApresentacaoUrl: formEdicaoCampanha.videoApresentacaoUrl } : {}),
      }),
    }).catch(() => {});
    setIdCampanhaEditando(null);
    carregarCampanhas();
    if (campanhaFoco === idCampanhaEditando) {
      carregarDetalheCampanha(idCampanhaEditando);
    }
  };

  // pol_orcamento_campanha_*/pol_marco_cronograma_* (04) liberam dono OU
  // campanha_editar: admin sempre tem campanha_editar (trg_admin_
  // recebe_toda_permissao, 05), funciona não importa quem seja o dono de
  // verdade.
  const adicionarItemOrcamento = async () => {
    if (!novoItemOrcamento.categoria || !novoItemOrcamento.valor) return;
    await chamarERegistrar('/orcamento-campanha', {
      method: 'POST',
      body: JSON.stringify({ idCampanha: campanhaFoco, categoria: novoItemOrcamento.categoria, valor: Number(novoItemOrcamento.valor) }),
    }).catch(() => {});
    setNovoItemOrcamento({ categoria: '', valor: '' });
    carregarDetalheCampanha(campanhaFoco);
  };

  const removerItemOrcamento = async (idOrcamento) => {
    await chamarERegistrar(`/orcamento-campanha/${idOrcamento}`, { method: 'DELETE' }).catch(() => {});
    carregarDetalheCampanha(campanhaFoco);
  };

  const adicionarMarco = async () => {
    if (!novoMarco.titulo || !novoMarco.dataPrevista) return;
    await chamarERegistrar('/marco-cronograma', {
      method: 'POST',
      body: JSON.stringify({ idCampanha: campanhaFoco, titulo: novoMarco.titulo, dataPrevista: new Date(novoMarco.dataPrevista).toISOString() }),
    }).catch(() => {});
    setNovoMarco({ titulo: '', dataPrevista: '' });
    carregarDetalheCampanha(campanhaFoco);
  };

  const removerMarco = async (idMarco) => {
    await chamarERegistrar(`/marco-cronograma/${idMarco}`, { method: 'DELETE' }).catch(() => {});
    carregarDetalheCampanha(campanhaFoco);
  };

  const aprovar = async () => {
    await chamarERegistrar(`/campanha/${campanhaFoco}/aprovar`, { method: 'POST' }).catch(() => {});
    carregarDetalheCampanha(campanhaFoco);
    carregarCampanhas();
  };

  const rejeitar = async () => {
    await chamarERegistrar(`/campanha/${campanhaFoco}/rejeitar`, {
      method: 'POST',
      body: JSON.stringify({ justificativa: justificativaRejeicao || undefined }),
    }).catch(() => {});
    setJustificativaRejeicao('');
    carregarDetalheCampanha(campanhaFoco);
    carregarCampanhas();
  };

  // Só permitido em 'aguardando_aprovacao' (RLS: pol_campanha_delete, ver
  // 04_rls_policies.sql) - mesma lógica do congelamento pós-aprovação.
  // Cascateia orçamento/cronograma/atualizações/seguidores/comentários
  // (ON DELETE CASCADE, 01_extensoes_enums_tabelas.sql), sem risco: nada
  // disso existe ainda pra uma campanha que nunca foi aprovada.
  const excluirCampanha = async (idCampanha) => {
    await chamarERegistrar(`/campanha/${idCampanha}`, { method: 'DELETE' }).catch(() => {});
    if (campanhaFoco === idCampanha) {
      selecionarCampanhaFoco(null);
    }
    carregarCampanhas();
  };

  return (
    <div className="admin-content-painel">
      <section className="crud-secao">
      <div className="crud-secao__cabecalho">
        <h2 className="titulo-secao">Campo de Testes - Bancada da Campanha</h2>
      </div>

      {pesquisadorSelecionado && (
        <table className="crud-tabela mb-4">
          <thead>
            <tr>
              <th>Pesquisador selecionado (T1)</th>
              <th>E-mail</th>
              <th className="crud-tabela__celula--centralizada">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr className="crud-tabela__linha--selecionada">
              <td>{pesquisadorSelecionado.nome}</td>
              <td>{pesquisadorSelecionado.email}</td>
              <td className="crud-tabela__celula--centralizada">
                <button type="button" className="crud-tabela__acao crud-tabela__acao--excluir" onClick={limparPesquisadorSelecionado}>
                  <i className="fa-solid fa-xmark"></i>
                  <span className="crud-tabela__acao-texto">Limpar seleção</span>
                  <span className="crud-tabela__acao-dica" role="tooltip">Limpar seleção</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h3 className="subtitulo">Campanhas{pesquisadorSelecionado ? ` de ${pesquisadorSelecionado.nome}` : ''}</h3>
        <label className="text-xs flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={ocultarBloqueadas}
            onChange={(evento) => {
              setOcultarBloqueadas(evento.target.checked);
              setPagina(1);
            }}
          />
          Ocultar bloqueadas (demonstração)
        </label>
      </div>

      {(campanhas.length > LIMIAR_FILTRO || opcoesStatus.length > 1) && (
        <div className="flex items-center gap-3 flex-wrap mb-3">
          {campanhas.length > LIMIAR_FILTRO && (
            <input
              type="search"
              placeholder="Filtrar..."
              value={filtroTexto}
              onChange={(evento) => {
                setFiltroTexto(evento.target.value);
                setPagina(1);
              }}
              className="w-full sm:w-64 border borda-forte rounded-lg fundo-sutil py-2 px-3 text-sm outline-none focus:border-primary"
            />
          )}

          {opcoesStatus.length > 1 && (
            <div className="relative" ref={facetaStatusRef}>
              <button
                type="button"
                onClick={() => setFacetaStatusAberta((atual) => !atual)}
                className="btn btn-secondary text-sm flex items-center gap-2"
              >
                <i className="fa-solid fa-filter"></i>
                Status
                {statusSelecionados.length > 0 ? (
                  <span className="badge badge-sucesso">{statusSelecionados.length}</span>
                ) : (
                  <span className="texto-fraco font-normal">(Todos)</span>
                )}
                <i className="fa-solid fa-chevron-down text-xs"></i>
              </button>

              {facetaStatusAberta && (
                <div className="absolute left-0 mt-1 w-56 fundo-cartao border borda-padrao rounded-lg shadow-lg z-20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusSelecionados([]);
                      setPagina(1);
                    }}
                    className="w-full text-left px-3 py-2 text-sm font-bold hover:bg-primary/10 border-b borda-padrao flex items-center justify-between"
                  >
                    Todos
                    {statusSelecionados.length === 0 && <i className="fa-solid fa-check texto-sucesso"></i>}
                  </button>
                  <div className="max-h-64 overflow-y-auto">
                    {opcoesStatus.map((status) => {
                      const marcado = statusSelecionados.includes(status);
                      const alternar = () => {
                        setStatusSelecionados((atuais) => (marcado ? atuais.filter((s) => s !== status) : [...atuais, status]));
                        setPagina(1);
                      };
                      return (
                        <label
                          key={status}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/10 cursor-pointer"
                          onClick={(evento) => {
                            if (evento.target.tagName !== 'INPUT') {
                              evento.preventDefault();
                              alternar();
                            }
                          }}
                        >
                          <input type="checkbox" checked={marcado} onChange={alternar} />
                          {status}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      <table className="crud-tabela mb-2">
        <thead>
          <tr>
            <th className="crud-tabela__coluna-id crud-tabela__celula--centralizada">id</th>
            <th>título</th>
            <th>status</th>
            <th>dono</th>
            <th className="crud-tabela__celula--centralizada">meta</th>
            <th className="crud-tabela__celula--centralizada">Escolher</th>
            <th className="crud-tabela__celula--centralizada">Ações</th>
          </tr>
        </thead>
        <tbody>
          {campanhasPagina.length === 0 && (
            <tr>
              <td colSpan={7} className="texto-fraco">{filtroTexto ? 'Nenhum registro bate com o filtro.' : 'Nenhum registro.'}</td>
            </tr>
          )}
          {campanhasPagina.map((item) => {
            const bloqueada = CAMPANHA_BLOQUEADA(item.idCampanha);
            const selecionada = item.idCampanha === campanhaFoco;
            const emEdicao = idCampanhaEditando === item.idCampanha;
            const podeExcluir = item.status === 'aguardando_aprovacao';
            return (
              <Fragment key={item.idCampanha}>
                <tr
                  className={bloqueada ? 'texto-fraco' : selecionada ? 'crud-tabela__linha--selecionada' : undefined}
                >
                  <td className="crud-tabela__coluna-id crud-tabela__celula--centralizada" style={bloqueada ? { textDecoration: 'line-through' } : undefined}>
                    {item.idCampanha}
                  </td>
                  <td style={bloqueada ? { textDecoration: 'line-through' } : undefined}>{item.titulo}</td>
                  <td style={bloqueada ? { textDecoration: 'line-through' } : undefined}>{item.status}</td>
                  <td style={bloqueada ? { textDecoration: 'line-through' } : undefined}>{nomeDe(item.idUsuario)}</td>
                  <td className="crud-tabela__celula--centralizada">{formatarReais(item.metaFinanceira)}</td>
                  <td className="crud-tabela__celula--centralizada">
                    {bloqueada ? (
                      <span title={motivoBloqueioCampanha()}>
                        <i className="fa-solid fa-lock"></i>
                      </span>
                    ) : selecionada ? (
                      <span className="texto-sucesso font-bold text-xs">
                        <i className="fa-solid fa-circle-check"></i> Selecionada
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="crud-tabela__acao crud-tabela__acao--escolher"
                        onClick={() => selecionarCampanhaFoco(item.idCampanha)}
                        aria-label="Escolher"
                      >
                        <i className="fa-solid fa-circle-check"></i>
                        <span className="crud-tabela__acao-texto">Escolher</span>
                        <span className="crud-tabela__acao-dica" role="tooltip">Escolher</span>
                      </button>
                    )}
                  </td>
                  <td className="crud-tabela__celula--centralizada">
                    {bloqueada ? (
                      <span title={motivoBloqueioCampanha()}>
                        <i className="fa-solid fa-lock"></i> bloqueada
                      </span>
                    ) : (
                      <div className="crud-tabela__acoes">
                        <button
                          type="button"
                          className="crud-tabela__acao crud-tabela__acao--alterar"
                          onClick={() => iniciarEdicaoCampanha(item)}
                          aria-label="Alterar"
                        >
                          <i className="fa-solid fa-pen"></i>
                          <span className="crud-tabela__acao-texto">Alterar</span>
                          <span className="crud-tabela__acao-dica" role="tooltip">Alterar</span>
                        </button>
                        <button
                          type="button"
                          className="crud-tabela__acao"
                          onClick={() => setCampanhaConsultada(item)}
                          aria-label="Consultar"
                        >
                          <i className="fa-solid fa-eye"></i>
                          <span className="crud-tabela__acao-texto">Consultar</span>
                          <span className="crud-tabela__acao-dica" role="tooltip">Consultar</span>
                        </button>
                        <button
                          type="button"
                          className="crud-tabela__acao crud-tabela__acao--excluir"
                          disabled={!podeExcluir}
                          title={podeExcluir ? undefined : 'Só dá pra excluir campanhas que ainda não foram aprovadas.'}
                          onClick={() => excluirCampanha(item.idCampanha)}
                          aria-label="Excluir"
                        >
                          <i className="fa-solid fa-trash"></i>
                          <span className="crud-tabela__acao-texto">Excluir</span>
                          <span className="crud-tabela__acao-dica" role="tooltip">Excluir</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                {emEdicao && (
                  <tr>
                    <td colSpan={7}>
                      <div className="fundo-sutil rounded-md p-3 my-1">
                        <div className="flex gap-2 items-end flex-wrap">
                          <label className="text-xs flex flex-col gap-1">
                            Título
                            <input
                              type="text"
                              value={formEdicaoCampanha.titulo}
                              onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, titulo: evento.target.value })}
                              className="border-2 border-[var(--cor-texto-info)] rounded-md px-2 py-1"
                            />
                          </label>
                          <label className="text-xs flex flex-col gap-1">
                            Área
                            <select
                              value={formEdicaoCampanha.idAreaConhecimento}
                              onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, idAreaConhecimento: evento.target.value })}
                              className="border-2 border-[var(--cor-texto-info)] rounded-md px-2 py-1"
                            >
                              {areas.map((area) => (
                                <option key={area.idAreaConhecimento} value={area.idAreaConhecimento}>
                                  {area.nome}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs flex flex-col gap-1">
                            Meta (R$)
                            <input
                              type="number"
                              value={formEdicaoCampanha.metaFinanceira}
                              onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, metaFinanceira: evento.target.value })}
                              className="border-2 border-[var(--cor-texto-info)] rounded-md px-2 py-1 w-28"
                            />
                          </label>
                          <label className="text-xs flex flex-col gap-1">
                            Início
                            <input
                              type="date"
                              value={formEdicaoCampanha.dataInicio}
                              onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, dataInicio: evento.target.value })}
                              className="border-2 border-[var(--cor-texto-info)] rounded-md px-2 py-1"
                            />
                          </label>
                          <label className="text-xs flex flex-col gap-1">
                            Fim
                            <input
                              type="date"
                              value={formEdicaoCampanha.dataFim}
                              onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, dataFim: evento.target.value })}
                              className="border-2 border-[var(--cor-texto-info)] rounded-md px-2 py-1"
                            />
                          </label>
                        </div>
                        <div className="flex gap-2 items-end flex-wrap mt-2">
                          <label className="text-xs flex flex-col gap-1 flex-1 min-w-[16rem]">
                            Descrição
                            <input
                              type="text"
                              value={formEdicaoCampanha.descricao}
                              onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, descricao: evento.target.value })}
                              className="border-2 border-[var(--cor-texto-info)] rounded-md px-2 py-1 w-full"
                            />
                          </label>
                          <label className="text-xs flex flex-col gap-1 flex-1 min-w-[16rem]">
                            URL do vídeo
                            <input
                              type="text"
                              value={formEdicaoCampanha.videoApresentacaoUrl}
                              onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, videoApresentacaoUrl: evento.target.value })}
                              className="border-2 border-[var(--cor-texto-info)] rounded-md px-2 py-1 w-full"
                            />
                          </label>
                          <button type="button" className="btn btn-primary text-xs" onClick={salvarEdicaoCampanha}>
                            Salvar
                          </button>
                          <button type="button" className="btn btn-secondary text-xs" onClick={() => setIdCampanhaEditando(null)}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {campanhaConsultada && (
        <ModalDetalhe
          rotuloAcao="Consultar"
          titulo={`#${campanhaConsultada.idCampanha}: ${campanhaConsultada.titulo}`}
          chave={campanhaConsultada.status}
          secoes={[
            { titulo: 'Dono:', conteudo: nomeDe(campanhaConsultada.idUsuario) },
            { titulo: 'Área:', conteudo: areas.find((a) => a.idAreaConhecimento === campanhaConsultada.idAreaConhecimento)?.nome ?? campanhaConsultada.idAreaConhecimento },
            { titulo: 'Meta financeira:', conteudo: formatarReais(campanhaConsultada.metaFinanceira) },
            { titulo: 'Arrecadado:', conteudo: formatarReais(campanhaConsultada.valorBrutoArrecadado) },
            { titulo: 'Modelo:', conteudo: campanhaConsultada.modelo },
            ...(campanhaConsultada.taxaPlataforma !== null ? [{ titulo: 'Taxa da plataforma:', conteudo: `${campanhaConsultada.taxaPlataforma}%` }] : []),
            { titulo: 'Descrição:', conteudo: campanhaConsultada.descricao || '(sem descrição)' },
            { titulo: 'Data início:', conteudo: campanhaConsultada.dataInicio ? new Date(campanhaConsultada.dataInicio).toLocaleDateString('pt-BR') : '-' },
            { titulo: 'Data fim:', conteudo: campanhaConsultada.dataFim ? new Date(campanhaConsultada.dataFim).toLocaleDateString('pt-BR') : '-' },
            ...(campanhaConsultada.videoApresentacaoUrl
              ? [{ titulo: 'Vídeo:', conteudo: <a href={campanhaConsultada.videoApresentacaoUrl} target="_blank" rel="noreferrer" className="texto-link break-all">{campanhaConsultada.videoApresentacaoUrl}</a> }]
              : []),
          ]}
          aoFechar={() => setCampanhaConsultada(null)}
        />
      )}

      {campanhasFiltradas.length > TAMANHOS_PAGINA[0] && (
        <div className="flex items-center justify-between flex-wrap gap-3 mt-3 mb-4 text-sm texto-padrao">
          <span>
            Página {paginaAtual} de {totalPaginas} ({campanhasFiltradas.length} registros)
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold texto-padrao">
              Mostrar
              <select
                value={tamanhoPagina}
                onChange={(evento) => {
                  const valor = evento.target.value;
                  setTamanhoPagina(valor === 'todos' ? 'todos' : Number(valor));
                  setPagina(1);
                }}
                className="border borda-padrao rounded-md fundo-sutil py-1 px-2 text-xs outline-none focus:border-primary"
              >
                {TAMANHOS_PAGINA.map((tamanho) => (
                  <option key={tamanho} value={tamanho}>
                    {tamanho === 'todos' ? 'Todos' : tamanho}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
                disabled={paginaAtual === 1}
                className="btn btn-secondary"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
                disabled={paginaAtual === totalPaginas}
                className="btn btn-secondary"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Criar campanha saiu daqui (25-08-2026, remoção do Elenco): RLS
          exige id_usuario = id_usuario_atual(), não dá mais pra "criar em
          nome de" um pesquisador escolhido. Lucas vai detalhar depois como
          fica a criação pelo próprio pesquisador (login como ele, ou uma
          conta já com privilégio de pesquisador). */}

      <div className="border-t borda-padrao my-8"></div>

      {campanha && (
        <>
          <div className="fundo-sutil rounded-md p-4 mb-4">
            <div className="flex gap-3 items-center flex-wrap mb-2">
              <span className="badge badge-sucesso">{campanha.status}</span>
              <strong>{campanha.titulo}</strong>
              <span className="texto-fraco text-xs">dono: {nomeDono ?? campanha.idUsuario}</span>
              {CAMPANHA_BLOQUEADA(campanha.idCampanha) && (
                <span className="badge badge-erro" title={motivoBloqueioCampanha()}>
                  <i className="fa-solid fa-lock"></i> demonstração
                </span>
              )}
            </div>
            <p className="text-xs texto-fraco">
              Modelo: {campanha.modelo} · Meta: {formatarReais(campanha.metaFinanceira)} · Arrecadado: {formatarReais(campanha.valorBrutoArrecadado)}
              {campanha.taxaPlataforma !== null && (
                <>
                  {' '}
                  · Taxa: {campanha.taxaPlataforma}% <i className="fa-solid fa-lock" title="Congelada após aprovação"></i>
                </>
              )}
            </p>
          </div>

          <div className="fundo-sutil rounded-md p-4 mb-4">
            <h3 className="subtitulo mb-3">Pronta para aprovar?</h3>
            <table className="crud-tabela mb-3">
              <thead>
                <tr>
                  <th>Critério</th>
                  <th className="crud-tabela__celula--centralizada">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Orçamento: {orcamento.length} itens (mínimo {MINIMO_ITENS_ORCAMENTO})</td>
                  <td className="crud-tabela__celula--centralizada">
                    <span className={`badge ${orcamento.length >= MINIMO_ITENS_ORCAMENTO ? 'badge-sucesso' : 'badge-erro'}`}>
                      {orcamento.length >= MINIMO_ITENS_ORCAMENTO ? 'OK' : 'Faltando'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    Soma × meta: {formatarReais(somaOrcamento)} de {formatarReais(campanha.metaFinanceira)}
                    {!metaBatendo && ` (faltam ${formatarReais(Number(campanha.metaFinanceira) - somaOrcamento)})`}
                  </td>
                  <td className="crud-tabela__celula--centralizada">
                    <span className={`badge ${metaBatendo ? 'badge-sucesso' : 'badge-erro'}`}>{metaBatendo ? 'OK' : 'Faltando'}</span>
                  </td>
                </tr>
                <tr>
                  <td>Cronograma: {cronograma.length} marcos (mínimo {MINIMO_MARCOS_CRONOGRAMA})</td>
                  <td className="crud-tabela__celula--centralizada">
                    <span className={`badge ${cronogramaOk ? 'badge-sucesso' : 'badge-erro'}`}>{cronogramaOk ? 'OK' : 'Faltando'}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="acao-com-motivo mt-3">
              <button type="button" className="btn btn-primary" disabled={!prontaParaAprovar} onClick={aprovar}>
                Aprovar (Admin)
              </button>
              {!prontaParaAprovar && <span className="acao-com-motivo__motivo">{motivoAprovarDesabilitado()}</span>}
            </div>

            <div className="flex gap-2 items-end mt-3">
              <textarea
                placeholder="Justificativa da rejeição (opcional)"
                value={justificativaRejeicao}
                onChange={(evento) => setJustificativaRejeicao(evento.target.value)}
                className="input-padrao flex-1"
                rows={2}
              />
              <button
                type="button"
                className="btn btn-secondary text-xs"
                disabled={campanha.status !== 'aguardando_aprovacao'}
                onClick={rejeitar}
              >
                Rejeitar (Admin)
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <button type="button" className={`btn ${abaAtiva === 'orcamento' ? 'btn-primary' : 'btn-secondary'} text-xs`} onClick={() => setAbaAtiva('orcamento')}>
              Orçamento
            </button>
            <button type="button" className={`btn ${abaAtiva === 'cronograma' ? 'btn-primary' : 'btn-secondary'} text-xs`} onClick={() => setAbaAtiva('cronograma')}>
              Cronograma
            </button>
          </div>

          {abaAtiva === 'orcamento' && (
            <table className="crud-tabela mb-3">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Valor</th>
                  {campanha.status === 'aguardando_aprovacao' && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {orcamento.map((item) => (
                  <tr key={item.idOrcamento}>
                    <td>{item.categoria}</td>
                    <td>{formatarReais(item.valor)}</td>
                    {campanha.status === 'aguardando_aprovacao' && (
                      <td>
                        <button type="button" className="crud-tabela__acao crud-tabela__acao--excluir" onClick={() => removerItemOrcamento(item.idOrcamento)}>
                          Remover
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {campanha.status === 'aguardando_aprovacao' && (
                  <tr>
                    <td>
                      <input type="text" value={novoItemOrcamento.categoria} onChange={(e) => setNovoItemOrcamento({ ...novoItemOrcamento, categoria: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs w-full" placeholder="Categoria" />
                    </td>
                    <td>
                      <input type="number" value={novoItemOrcamento.valor} onChange={(e) => setNovoItemOrcamento({ ...novoItemOrcamento, valor: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs w-24" placeholder="Valor" />
                    </td>
                    <td>
                      <button type="button" className="btn btn-secondary text-xs" onClick={adicionarItemOrcamento}>
                        + adicionar
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {abaAtiva === 'cronograma' && (
            <table className="crud-tabela mb-3">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Data prevista</th>
                  {campanha.status === 'aguardando_aprovacao' && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {cronograma.map((marco) => (
                  <tr key={marco.idMarco}>
                    <td>{marco.titulo}</td>
                    <td>{new Date(marco.dataPrevista).toLocaleDateString('pt-BR')}</td>
                    {campanha.status === 'aguardando_aprovacao' && (
                      <td>
                        <button type="button" className="crud-tabela__acao crud-tabela__acao--excluir" onClick={() => removerMarco(marco.idMarco)}>
                          Remover
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {campanha.status === 'aguardando_aprovacao' && (
                  <tr>
                    <td>
                      <input type="text" value={novoMarco.titulo} onChange={(e) => setNovoMarco({ ...novoMarco, titulo: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs w-full" placeholder="Título" />
                    </td>
                    <td>
                      <input type="date" value={novoMarco.dataPrevista} onChange={(e) => setNovoMarco({ ...novoMarco, dataPrevista: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs" />
                    </td>
                    <td>
                      <button type="button" className="btn btn-secondary text-xs" onClick={adicionarMarco}>
                        + adicionar
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </>
      )}

      <RegistroChamadas />
      </section>
    </div>
  );
}
