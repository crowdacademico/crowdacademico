// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { ORDEM_PODER_PAPEL, PAPEL_SEM_EXTRA } from '../../services/2-papel-permissao/constants/papel-ordem-poder';
import { useElenco } from '../../services/campo-testes/hook/use-elenco';
import { gerarCpfValido } from '../../services/campo-testes/util/gerar-cpf-valido';
import { PESQUISADOR_BLOQUEADO, motivoBloqueioPesquisador } from '../../services/campo-testes/util/registros-bloqueados';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TITULO_ACADEMICO,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { ModalDetalhe } from '../../components/crud/modal-detalhe';
import { BarraElenco } from './barra-elenco';
import { RegistroChamadas } from './registro-chamadas';

const TIPOS_VINCULO = ['institucional', 'independente'];
const TITULOS_ACADEMICOS = ['graduado', 'especialista', 'mestre', 'doutor'];
const TAMANHOS_PAGINA = [10, 20, 30, 'todos'];
const LIMIAR_FILTRO = 5;

function formatarCpf(cpf) {
  if (!cpf) return '';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

const TAMANHO_MAXIMO_URL_NA_LINHA = 40;

// Sem quebra de linha na tabela de links (pedido do Lucas, 23-08-2026:
// "alguns links são excepcionalmente grandes") — trunca com " ..." de
// verdade (texto, não elipse via CSS) e quem quiser o link inteiro clica
// em Consultar.
function truncarUrl(url) {
  return url.length > TAMANHO_MAXIMO_URL_NA_LINHA ? `${url.slice(0, TAMANHO_MAXIMO_URL_NA_LINHA)} ...` : url;
}

// T1, Bancada do Pesquisador. Trabalha em cima de REGISTROS REAIS
// (23-08-2026, pedido do Lucas, ERA um roster de personas fixas,
// apagado): a lista abaixo vem de GET /perfil-pesquisador de verdade
// (mesma API da tela admin "Pesquisadores"), e o ator em foco é sempre
// "Agindo como" (Barra do Elenco). Os 11 pesquisadores 12-22 (a "demo"
// do próprio 07_seed_dados.sql, já têm campanha, score e links
// pré-montados) ficam BLOQUEADOS aqui: aparecem na lista, mas riscados,
// com cadeado, sem botão de usar. Servem pra explorar o produto, não pra
// virar cobaia de teste.
export function BancadaPesquisador({ auth }) {
  const elenco = useElenco();
  const chaveFoco = elenco.atorPadrao;
  const usuarioFoco = elenco.atores[chaveFoco]?.usuario ?? null;
  const jaTemPerfil = elenco.atores[chaveFoco]?.temPerfilPesquisador;

  const [pesquisadores, setPesquisadores] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  // Ligado por padrão (pedido do Lucas): a demo pré-montada (12-22) não
  // serve pra testar, então já nasce fora da vista, sem precisar caçar.
  const [ocultarBloqueados, setOcultarBloqueados] = useState(true);
  // Mesmo filtro + paginação + facet "Papel" de GenericTable (components/
  // crud/generic-table.jsx), reimplementado aqui (não a versão genérica
  // de N facetas com URL/ordenação) porque esta tabela precisa de linha
  // riscada/cadeado por registro bloqueado, que o GenericTable não tem
  // como fazer (sem className por linha).
  const [filtroTexto, setFiltroTexto] = useState('');
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(10);
  // Pré-marcado com usuário/pesquisador (pedido do Lucas, 23-08-2026: "só
  // pra adiantar os testes") — só este facet, só nesta tela; em qualquer
  // outro filtro por papel do painel (ex.: /admin/usuarios), o padrão
  // continua sendo "Todos".
  const [papeisSelecionados, setPapeisSelecionados] = useState([PAPEL_SEM_EXTRA, 'pesquisador']);
  const [facetaPapelAberta, setFacetaPapelAberta] = useState(false);
  const facetaPapelRef = useRef(null);

  const [form, setForm] = useState({
    cpf: '',
    tipoVinculo: 'institucional',
    vinculoInstitucional: '',
    tituloAcademico: 'mestre',
  });
  const [criando, setCriando] = useState(false);
  const [erroCriar, setErroCriar] = useState(null);

  const [score, setScore] = useState(null);

  const [links, setLinks] = useState([]);
  const [tiposLink, setTiposLink] = useState([]);
  const [novoLink, setNovoLink] = useState({ idTipoLink: '', url: '', rotulo: '' });
  const [idLinkEditando, setIdLinkEditando] = useState(null);
  const [formEdicaoLink, setFormEdicaoLink] = useState({ url: '', rotulo: '' });
  const [linkConsultado, setLinkConsultado] = useState(null);

  const chavesVivasForaFoco = Object.keys(elenco.atores).filter(
    (idUsuario) => Number(idUsuario) !== chaveFoco && elenco.atores[idUsuario].status === 'vivo',
  );

  // Lista TODOS os usuários (23-08-2026, pedido do Lucas: "não deve
  // aparecer só Pesquisadores"), não só quem já tem perfil_pesquisador,
  // pra dar pra escolher qualquer conta real como ator sem precisar da
  // busca "+ ator" da Barra do Elenco. Quem ainda não tem perfil mostra
  // as colunas de pesquisador em branco, é o gancho pro formulário "Criar
  // perfil" logo abaixo.
  // Coluna/facet "papel" (mesma lógica de listar-usuarios.jsx): junta
  // usuario_papel de todo mundo de uma vez (1 requisição, não 1 por
  // linha), papel padrão 'usuario' não conta como "extra".
  const carregarPesquisadores = useCallback(() => {
    setCarregandoLista(true);
    Promise.all([
      usuarioApi.listar(auth.authFetch),
      perfilPesquisadorApi.listar(auth.authFetch).catch(() => []),
      usuarioPapelApi.listarTudo(auth.authFetch).catch(() => []),
    ])
      .then(([usuarios, perfis, vinculos]) => {
        const perfilPorId = new Map(perfis.map((perfil) => [perfil.idUsuario, perfil]));
        const papeisPorUsuario = new Map();
        for (const vinculo of vinculos) {
          if (vinculo.nomePapel === 'usuario') continue;
          const atuais = papeisPorUsuario.get(vinculo.idUsuario) ?? [];
          atuais.push(vinculo.nomePapel);
          papeisPorUsuario.set(vinculo.idUsuario, atuais);
        }
        setPesquisadores(
          usuarios.map((usuario) => ({
            ...perfilPorId.get(usuario.idUsuario),
            idUsuario: usuario.idUsuario,
            usuario,
            papel: papeisPorUsuario.get(usuario.idUsuario)?.join(', ') || PAPEL_SEM_EXTRA,
          })),
        );
      })
      .finally(() => setCarregandoLista(false));
  }, [auth.authFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarPesquisadores();
  }, [carregarPesquisadores]);

  // Fechar o dropdown "Papel" ao clicar fora (mesmo padrão de
  // GenericTable) — listener de mousedown, não depende de foco.
  useEffect(() => {
    if (!facetaPapelAberta) return undefined;
    const aoClicarFora = (evento) => {
      if (facetaPapelRef.current && !facetaPapelRef.current.contains(evento.target)) {
        setFacetaPapelAberta(false);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [facetaPapelAberta]);

  // Carrega score + links sempre que o ator em foco (ou quem tem perfil)
  // mudar. A comparação "CPF visto pelo dono x visto por outro" (RF-016)
  // não tem mais painel dedicado (23-08-2026, pedido do Lucas): as duas
  // chamadas GET /perfil-pesquisador de atores diferentes já aparecem
  // naturalmente no Registro de Chamadas, sem precisar duplicar a UI.
  useEffect(() => {
    if (!chaveFoco || jaTemPerfil !== true) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScore(null);
      setLinks([]);
      return;
    }
    elenco.fetchComoAtor(chaveFoco, `/perfil-pesquisador/${chaveFoco}/score`).then(setScore).catch(() => {});
    elenco.fetchComoAtor(chaveFoco, `/link-academico?idUsuario=${chaveFoco}`).then(setLinks).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveFoco, jaTemPerfil]);

  // Catálogo de tipo de link, só uma vez, assim que existir QUALQUER ator
  // vivo pra buscar (é público, mas fetchComoAtor precisa de um ator pra
  // registrar a chamada em T4, qualquer um serve).
  useEffect(() => {
    const chaveQualquerVivo = chaveFoco ?? chavesVivasForaFoco[0];
    if (!chaveQualquerVivo || tiposLink.length > 0) return;
    elenco
      .fetchComoAtor(chaveQualquerVivo, '/tipo-link?escopo=perfil&tamanho=100')
      .then((resultado) => setTiposLink(resultado.dados ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveFoco]);

  const usarPesquisador = async (perfil) => {
    if (!perfil.usuario) return;
    await elenco.entrarComoUsuario({ idUsuario: perfil.idUsuario, email: perfil.usuario.email });
    elenco.selecionarAtorPadrao(perfil.idUsuario);
  };

  const criarPerfil = async () => {
    setCriando(true);
    setErroCriar(null);
    try {
      await elenco.fetchComoAtor(chaveFoco, '/perfil-pesquisador', {
        method: 'POST',
        body: JSON.stringify({
          cpf: form.cpf,
          tipoVinculo: form.tipoVinculo,
          ...(form.tipoVinculo === 'institucional' ? { vinculoInstitucional: form.vinculoInstitucional } : {}),
          tituloAcademico: form.tituloAcademico,
        }),
      });
      await elenco.renovarAtor(chaveFoco);
      carregarPesquisadores();
    } catch (erro) {
      setErroCriar(erro.message ?? 'Falha ao criar perfil.');
    } finally {
      setCriando(false);
    }
  };

  const adicionarLink = async () => {
    if (!novoLink.idTipoLink || !novoLink.url) return;
    try {
      await elenco.fetchComoAtor(chaveFoco, '/link-academico', {
        method: 'POST',
        body: JSON.stringify({
          idTipoLink: Number(novoLink.idTipoLink),
          url: novoLink.url,
          ...(novoLink.rotulo ? { rotulo: novoLink.rotulo } : {}),
        }),
      });
      const atualizados = await elenco.fetchComoAtor(chaveFoco, `/link-academico?idUsuario=${chaveFoco}`);
      setLinks(atualizados);
      setNovoLink({ idTipoLink: '', url: '', rotulo: '' });
    } catch {
      // O erro (ex.: limite de 5 links) já aparece no Registro de
      // Chamadas (T4), é justamente o tipo de erro que vale a pena ver
      // acontecer, não esconder.
    }
  };

  // Faltava (23-08-2026, achado do Lucas: "consigo adicionar mas não
  // consigo tirar") — o DELETE /link-academico/:id já existe e funciona
  // desde sempre (7-link-academico/controllers/link-academico.controller.
  // remove.ts), só nunca tinha ganhado botão aqui na tela de teste.
  const removerLink = async (idLinkAcademico) => {
    await elenco.fetchComoAtor(chaveFoco, `/link-academico/${idLinkAcademico}`, { method: 'DELETE' }).catch(() => {});
    const atualizados = await elenco.fetchComoAtor(chaveFoco, `/link-academico?idUsuario=${chaveFoco}`);
    setLinks(atualizados);
  };

  const iniciarEdicaoLink = (link) => {
    setIdLinkEditando(link.idLinkAcademico);
    setFormEdicaoLink({ url: link.url, rotulo: link.rotulo ?? '' });
  };

  // PATCH /link-academico/:id: sem idTipoLink de propósito (trocar o TIPO
  // de um link existente não é permitido pelo próprio DTO, ver
  // link-academico.request-update.ts), só url/rótulo.
  const salvarEdicaoLink = async () => {
    if (!formEdicaoLink.url) return;
    await elenco
      .fetchComoAtor(chaveFoco, `/link-academico/${idLinkEditando}`, {
        method: 'PATCH',
        body: JSON.stringify({ url: formEdicaoLink.url, ...(formEdicaoLink.rotulo ? { rotulo: formEdicaoLink.rotulo } : {}) }),
      })
      .catch(() => {});
    const atualizados = await elenco.fetchComoAtor(chaveFoco, `/link-academico?idUsuario=${chaveFoco}`);
    setLinks(atualizados);
    setIdLinkEditando(null);
  };

  // Opções do dropdown "Papel" — só os valores que já aparecem nos dados
  // (mesmo sniff de GenericTable), ordenados do menor pro maior poder.
  const opcoesPapel = [...new Set(pesquisadores.flatMap((perfil) => (perfil.papel ?? '').split(', ').filter(Boolean)))].sort((a, b) => {
    const posicao = (valor) => {
      const indice = ORDEM_PODER_PAPEL.indexOf(valor);
      return indice === -1 ? ORDEM_PODER_PAPEL.length : indice;
    };
    return posicao(a) - posicao(b) || a.localeCompare(b, 'pt-BR');
  });

  const pesquisadoresFiltrados = pesquisadores
    .filter((perfil) => !ocultarBloqueados || !PESQUISADOR_BLOQUEADO(perfil.idUsuario))
    .filter((perfil) => {
      if (papeisSelecionados.length === 0) return true;
      return (perfil.papel ?? '').split(', ').some((papel) => papeisSelecionados.includes(papel));
    })
    .filter((perfil) => {
      const termo = filtroTexto.trim().toLowerCase();
      if (!termo) return true;
      return [
        perfil.idUsuario,
        perfil.usuario?.nome,
        ROTULO_TITULO_ACADEMICO[perfil.tituloAcademico],
        ROTULO_STATUS_PESQUISADOR[perfil.statusPesquisador],
        perfil.papel,
      ]
        .some((valor) => String(valor ?? '').toLowerCase().includes(termo));
    });
  const totalPaginas = tamanhoPagina === 'todos' ? 1 : Math.max(1, Math.ceil(pesquisadoresFiltrados.length / tamanhoPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const pesquisadoresPagina =
    tamanhoPagina === 'todos' ? pesquisadoresFiltrados : pesquisadoresFiltrados.slice((paginaAtual - 1) * tamanhoPagina, paginaAtual * tamanhoPagina);

  return (
    <div className="admin-content-painel">
      <section className="crud-secao">
      <div className="crud-secao__cabecalho">
        <h2 className="titulo-secao">Campo de Testes - Bancada do Pesquisador</h2>
      </div>

      <BarraElenco auth={auth} />

      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h3 className="subtitulo">Usuários</h3>
        <label className="text-xs flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={ocultarBloqueados}
            onChange={(evento) => {
              setOcultarBloqueados(evento.target.checked);
              setPagina(1);
            }}
          />
          Ocultar bloqueados (demonstração)
        </label>
      </div>

      {(pesquisadores.length > LIMIAR_FILTRO || opcoesPapel.length > 1) && (
        <div className="flex items-center gap-3 flex-wrap mb-3">
          {pesquisadores.length > LIMIAR_FILTRO && (
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

          {opcoesPapel.length > 1 && (
            <div className="relative" ref={facetaPapelRef}>
              <button
                type="button"
                onClick={() => setFacetaPapelAberta((atual) => !atual)}
                className="btn btn-secondary text-sm flex items-center gap-2"
              >
                <i className="fa-solid fa-filter"></i>
                Papel
                {papeisSelecionados.length > 0 ? (
                  <span className="badge badge-sucesso">{papeisSelecionados.length}</span>
                ) : (
                  <span className="texto-fraco font-normal">(Todos)</span>
                )}
                <i className="fa-solid fa-chevron-down text-xs"></i>
              </button>

              {facetaPapelAberta && (
                <div className="absolute left-0 mt-1 w-56 fundo-cartao border borda-padrao rounded-lg shadow-lg z-20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setPapeisSelecionados([]);
                      setPagina(1);
                    }}
                    className="w-full text-left px-3 py-2 text-sm font-bold hover:bg-primary/10 border-b borda-padrao flex items-center justify-between"
                  >
                    Todos
                    {papeisSelecionados.length === 0 && <i className="fa-solid fa-check texto-sucesso"></i>}
                  </button>
                  <div className="max-h-64 overflow-y-auto">
                    {opcoesPapel.map((papel) => {
                      const marcado = papeisSelecionados.includes(papel);
                      const alternar = () => {
                        setPapeisSelecionados((atuais) => (marcado ? atuais.filter((p) => p !== papel) : [...atuais, papel]));
                        setPagina(1);
                      };
                      return (
                        <label
                          key={papel}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/10 cursor-pointer"
                          onClick={(evento) => {
                            if (evento.target.tagName !== 'INPUT') {
                              evento.preventDefault();
                              alternar();
                            }
                          }}
                        >
                          <input type="checkbox" checked={marcado} onChange={alternar} />
                          {papel}
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

      <table className="crud-tabela mb-4">
        <thead>
          <tr>
            <th className="crud-tabela__coluna-id crud-tabela__celula--centralizada">id</th>
            <th>nome</th>
            <th>papel</th>
            <th>título</th>
            <th>status</th>
            <th className="crud-tabela__celula--centralizada">score</th>
            <th className="crud-tabela__celula--centralizada">Ações</th>
          </tr>
        </thead>
        <tbody>
          {carregandoLista && (
            <tr>
              <td colSpan={7} className="texto-fraco">Carregando...</td>
            </tr>
          )}
          {!carregandoLista && pesquisadoresPagina.length === 0 && (
            <tr>
              <td colSpan={7} className="texto-fraco">{filtroTexto ? 'Nenhum registro bate com o filtro.' : 'Nenhum registro.'}</td>
            </tr>
          )}
          {!carregandoLista &&
            pesquisadoresPagina.map((perfil) => {
              const bloqueado = PESQUISADOR_BLOQUEADO(perfil.idUsuario);
              // Só UM pesquisador pode estar "Agindo como" por vez (pedido
              // do Lucas, 23-08-2026: "clicar em outro a seleção troca" —
              // já era assim por baixo, selecionarAtorPadrao é um valor
              // só, nunca lista; faltava só marcar visualmente QUAL linha
              // é essa, pra ficar óbvio, não só implícito no dropdown
              // "Agindo como" lá em cima).
              const selecionado = perfil.idUsuario === chaveFoco;
              return (
                <tr
                  key={perfil.idUsuario}
                  className={bloqueado ? 'texto-fraco' : selecionado ? 'crud-tabela__linha--selecionada' : undefined}
                >
                  <td className="crud-tabela__coluna-id crud-tabela__celula--centralizada" style={bloqueado ? { textDecoration: 'line-through' } : undefined}>
                    {perfil.idUsuario}
                  </td>
                  <td style={bloqueado ? { textDecoration: 'line-through' } : undefined}>
                    {perfil.usuario?.nome ?? `#${perfil.idUsuario}`}
                  </td>
                  <td style={bloqueado ? { textDecoration: 'line-through' } : undefined}>{perfil.papel}</td>
                  <td style={bloqueado ? { textDecoration: 'line-through' } : undefined}>
                    {perfil.tituloAcademico ? ROTULO_TITULO_ACADEMICO[perfil.tituloAcademico] ?? perfil.tituloAcademico : '-'}
                  </td>
                  <td style={bloqueado ? { textDecoration: 'line-through' } : undefined}>
                    {perfil.statusPesquisador ? ROTULO_STATUS_PESQUISADOR[perfil.statusPesquisador] ?? perfil.statusPesquisador : '-'}
                  </td>
                  <td className="crud-tabela__celula--centralizada">{perfil.scoreAtual ?? '-'}</td>
                  <td className="crud-tabela__celula--centralizada">
                    {bloqueado ? (
                      <span title={motivoBloqueioPesquisador(perfil.idUsuario)}>
                        <i className="fa-solid fa-lock"></i> bloqueado
                      </span>
                    ) : selecionado ? (
                      <span className="texto-sucesso font-bold text-xs">
                        <i className="fa-solid fa-circle-check"></i> Selecionado
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="crud-tabela__acao crud-tabela__acao--escolher"
                        onClick={() => usarPesquisador(perfil)}
                        aria-label="Escolher"
                      >
                        <i className="fa-solid fa-user-check"></i>
                        <span className="crud-tabela__acao-texto">Escolher</span>
                        <span className="crud-tabela__acao-dica" role="tooltip">Escolher</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>

      {pesquisadoresFiltrados.length > TAMANHOS_PAGINA[0] && (
        <div className="flex items-center justify-between flex-wrap gap-3 mt-3 mb-4 text-sm texto-padrao">
          <span>
            Página {paginaAtual} de {totalPaginas} ({pesquisadoresFiltrados.length} registros)
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

      <div className="border-t borda-padrao my-8"></div>

      {!chaveFoco && (
        <p className="texto-fraco">
          Escolha um ator em <strong>Agindo como</strong> (Barra do Elenco), ou clique "Escolher" numa linha da
          tabela acima.
        </p>
      )}

      {chaveFoco && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <h3 className="subtitulo mb-2">
              Criar Perfil Pesquisador ({usuarioFoco?.nome ?? chaveFoco})
              {jaTemPerfil === true && <span className="badge badge-sucesso ml-2">Pesquisador</span>}
            </h3>

            {jaTemPerfil !== true && (
              <div className="flex flex-col gap-4 max-w-sm">
                <label className="text-sm flex flex-col gap-1">
                  CPF
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formatarCpf(form.cpf)}
                      onChange={(evento) =>
                        setForm({ ...form, cpf: evento.target.value.replace(/\D/g, '').slice(0, 11) })
                      }
                      className="border borda-padrao rounded-md px-2 py-1 w-full"
                    />
                    <button
                      type="button"
                      className="btn btn-secondary text-xs whitespace-nowrap"
                      onClick={() => setForm({ ...form, cpf: gerarCpfValido() })}
                    >
                      Gerar CPF válido
                    </button>
                  </div>
                </label>

                <label className="text-sm flex flex-col gap-1">
                  Tipo de vínculo
                  <select
                    value={form.tipoVinculo}
                    onChange={(evento) => setForm({ ...form, tipoVinculo: evento.target.value })}
                    className="border borda-padrao rounded-md px-2 py-1 w-full"
                  >
                    {TIPOS_VINCULO.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </label>

                {form.tipoVinculo === 'institucional' && (
                  <label className="text-sm flex flex-col gap-1">
                    Instituição
                    <input
                      type="text"
                      value={form.vinculoInstitucional}
                      onChange={(evento) => setForm({ ...form, vinculoInstitucional: evento.target.value })}
                      className="border borda-padrao rounded-md px-2 py-1 w-full"
                    />
                  </label>
                )}

                <label className="text-sm flex flex-col gap-1">
                  Título acadêmico
                  <select
                    value={form.tituloAcademico}
                    onChange={(evento) => setForm({ ...form, tituloAcademico: evento.target.value })}
                    className="border borda-padrao rounded-md px-2 py-1 w-full"
                  >
                    {TITULOS_ACADEMICOS.map((titulo) => (
                      <option key={titulo} value={titulo}>
                        {titulo}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={criando || !form.cpf}
                  onClick={criarPerfil}
                >
                  Criar Perfil Pesquisador ({usuarioFoco?.nome ?? chaveFoco})
                </button>
                {erroCriar && <p className="texto-erro text-xs">{erroCriar}</p>}
              </div>
            )}

            {jaTemPerfil === true && (
              <>
                <h4 className="font-bold mt-4 mb-1">
                  Links acadêmicos ({links.length} de 5)
                </h4>
                <div className="links-academicos-wrapper">
                <table className="crud-tabela mb-2">
                  <thead>
                    <tr>
                      <th className="crud-tabela__celula--centralizada">Tipo</th>
                      <th className="crud-tabela__celula--centralizada">URL</th>
                      <th className="crud-tabela__celula--centralizada">Rótulo</th>
                      <th className="crud-tabela__celula--centralizada">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((link) => {
                      const emEdicao = idLinkEditando === link.idLinkAcademico;
                      return (
                        <tr key={link.idLinkAcademico}>
                          <td className="crud-tabela__celula--centralizada">{tiposLink.find((t) => t.idTipolink === link.idTipoLink)?.nome ?? link.idTipoLink}</td>
                          {emEdicao ? (
                            <>
                              <td>
                                <input
                                  type="text"
                                  value={formEdicaoLink.url}
                                  onChange={(evento) => setFormEdicaoLink({ ...formEdicaoLink, url: evento.target.value })}
                                  className="border-2 border-[var(--cor-texto-info)] rounded-md px-2 py-1 w-full"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={formEdicaoLink.rotulo}
                                  onChange={(evento) => setFormEdicaoLink({ ...formEdicaoLink, rotulo: evento.target.value })}
                                  className="border-2 border-[var(--cor-texto-info)] rounded-md px-2 py-1 w-full"
                                />
                              </td>
                              <td className="crud-tabela__celula--centralizada">
                                <div className="crud-tabela__acoes">
                                  <button type="button" className="crud-tabela__acao crud-tabela__acao--escolher" onClick={salvarEdicaoLink} aria-label="Salvar">
                                    <i className="fa-solid fa-check"></i>
                                    <span className="crud-tabela__acao-texto">Salvar</span>
                                    <span className="crud-tabela__acao-dica" role="tooltip">Salvar</span>
                                  </button>
                                  <button type="button" className="crud-tabela__acao" onClick={() => setIdLinkEditando(null)} aria-label="Cancelar">
                                    <i className="fa-solid fa-xmark"></i>
                                    <span className="crud-tabela__acao-texto">Cancelar</span>
                                    <span className="crud-tabela__acao-dica" role="tooltip">Cancelar</span>
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ whiteSpace: 'nowrap' }}>{truncarUrl(link.url)}</td>
                              <td className="crud-tabela__celula--centralizada">{link.rotulo ?? '-'}</td>
                              <td className="crud-tabela__celula--centralizada">
                                <div className="crud-tabela__acoes">
                                  <button
                                    type="button"
                                    className="crud-tabela__acao crud-tabela__acao--alterar"
                                    onClick={() => iniciarEdicaoLink(link)}
                                    aria-label="Alterar"
                                  >
                                    <i className="fa-solid fa-pen"></i>
                                    <span className="crud-tabela__acao-texto">Alterar</span>
                                    <span className="crud-tabela__acao-dica" role="tooltip">Alterar</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="crud-tabela__acao"
                                    onClick={() => setLinkConsultado(link)}
                                    aria-label="Consultar"
                                  >
                                    <i className="fa-solid fa-eye"></i>
                                    <span className="crud-tabela__acao-texto">Consultar</span>
                                    <span className="crud-tabela__acao-dica" role="tooltip">Consultar</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="crud-tabela__acao crud-tabela__acao--excluir"
                                    onClick={() => removerLink(link.idLinkAcademico)}
                                    aria-label="Remover"
                                  >
                                    <i className="fa-solid fa-trash"></i>
                                    <span className="crud-tabela__acao-texto">Remover</span>
                                    <span className="crud-tabela__acao-dica" role="tooltip">Remover</span>
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {links.length < 5 && (
                      <tr>
                        <td>
                          <select
                            value={novoLink.idTipoLink}
                            onChange={(evento) => setNovoLink({ ...novoLink, idTipoLink: evento.target.value })}
                            className="border borda-forte rounded-md px-2 py-1 w-full"
                          >
                            <option value="">Tipo...</option>
                            {tiposLink.map((tipo) => (
                              <option key={tipo.idTipolink} value={tipo.idTipolink}>
                                {tipo.nome}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="URL"
                            value={novoLink.url}
                            onChange={(evento) => setNovoLink({ ...novoLink, url: evento.target.value })}
                            className="border borda-forte rounded-md px-2 py-1 w-full placeholder:text-[var(--cor-texto)]"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Rótulo (opcional)"
                            value={novoLink.rotulo}
                            onChange={(evento) => setNovoLink({ ...novoLink, rotulo: evento.target.value })}
                            className="border borda-forte rounded-md px-2 py-1 w-full placeholder:text-[var(--cor-texto)]"
                          />
                        </td>
                        {/* Nada aqui embaixo de Ações de propósito (23-08-2026,
                            achado do Lucas: "+ adicionar na mesma linha ficou
                            péssimo, aparece barra de rolagem") — o botão SÓ
                            forçava a tabela a precisar de mais espaço do que
                            a coluna tinha, empurrando tudo. Vive fora da
                            tabela agora, embaixo. */}
                        <td></td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>

                {links.length < 5 && (
                  <button type="button" className="btn btn-primary" onClick={adicionarLink}>
                    + Adicionar
                  </button>
                )}

                {linkConsultado && (
                  <ModalDetalhe
                    rotuloAcao="Consultar"
                    titulo={tiposLink.find((t) => t.idTipolink === linkConsultado.idTipoLink)?.nome ?? 'Link acadêmico'}
                    secoes={[
                      { titulo: 'URL completa:', conteudo: <a href={linkConsultado.url} target="_blank" rel="noreferrer" className="texto-link break-all">{linkConsultado.url}</a> },
                      { titulo: 'Rótulo:', conteudo: linkConsultado.rotulo ?? '(sem rótulo)' },
                    ]}
                    aoFechar={() => setLinkConsultado(null)}
                  />
                )}
              </>
            )}
          </div>

          <div className={'flex-1 min-w-0' + (jaTemPerfil === true ? ' lg:border-l lg:border-[var(--cor-borda)] lg:pl-6' : '')}>
            {jaTemPerfil === true && (
              <>
                <h3 className="subtitulo mb-2">Score</h3>
                <div className="fundo-erro texto-erro rounded-md p-4 mb-3 flex items-start gap-3">
                  <i className="fa-solid fa-triangle-exclamation text-xl"></i>
                  <div>
                    <p className="font-bold">Ainda não está pronto</p>
                    <p className="text-sm">
                      A regra de negócio de pontuação (pesos e dimensões abaixo) ainda não foi fechada. Os números
                      são só uma prévia da estrutura, não confie neles pra testar nada que dependa do valor final.
                    </p>
                  </div>
                </div>
                {score ? (
                  <>
                    <p>
                      {score.scoreTotal} pontos, <span className="badge badge-sucesso">{score.rotulo}</span>
                    </p>
                    <table className="crud-tabela mt-2">
                      <thead>
                        <tr>
                          <th>Dimensão</th>
                          <th>Pontos</th>
                          <th>Peso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {score.dimensoes.map((dimensao) => (
                          <tr key={dimensao.nomeDimensao}>
                            <td>{dimensao.nomeDimensao}</td>
                            <td>{dimensao.pontosObtidos}</td>
                            <td>{dimensao.peso}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p className="texto-fraco text-xs">carregando...</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <RegistroChamadas />
      </section>
    </div>
  );
}
