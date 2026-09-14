// ============================================================================
// Campo de Testes deixou de ser só ferramenta de teste descartável
// (07-09-2026, decisão do Lucas): virou parte permanente do painel
// administrativo, com o mesmo padrão de dados/comportamento do resto do
// sistema (nunca uma versão simplificada à parte).
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { AcaoLinha } from '../../components/crud/acao-linha';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { ORDEM_PODER_PAPEL, PAPEL_SEM_EXTRA } from '../../services/2-papel-permissao/constants/papel-ordem-poder';
import { PESQUISADOR_BLOQUEADO, motivoBloqueioPesquisador } from '../../services/campo-testes/util/registros-bloqueados';
import { gerarCpfValido } from '../../services/campo-testes/util/gerar-cpf-valido';
import { useCampoTestes } from '../../services/campo-testes/hook/use-campo-testes';
import { useFecharAoClicarFora } from '../../services/constant/hook/use-fechar-ao-clicar-fora';
import { paginarClientSide } from '../../services/constant/utils/paginacao.util';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TITULO_ACADEMICO,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { ModalAlterarUsuario, ModalConsultarUsuario, ModalExcluirUsuario } from '../1-usuario/modal-usuario';
import { ModalUpgradePesquisador } from '../6-perfil-pesquisador/modal-upgrade-pesquisador';
import { RegistroChamadas } from './registro-chamadas';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { UsuarioResponse } from '../../services/1-usuario/type/usuario.type';
import type { PerfilPesquisadorResponse } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';

const TAMANHOS_PAGINA = [10, 20, 30, 'todos'] as const;
const LIMIAR_FILTRO = 5;

// Perfil ainda pode não existir pra um usuário (upgrade nunca feito) -
// por isso os campos de PerfilPesquisadorResponse ficam todos opcionais
// aqui, diferente do tipo original (que sempre reflete uma linha real).
interface PesquisadorLinha extends Partial<PerfilPesquisadorResponse> {
  idUsuario: number;
  usuario: UsuarioResponse;
  papel: string;
}

// T1, Bancada do Pesquisador. Trabalha em cima de REGISTROS REAIS
// (23-08-2026, pedido do Lucas, ERA um roster de personas fixas,
// apagado): a lista abaixo vem de GET /perfil-pesquisador de verdade
// (mesma API da tela admin "Pesquisadores"). Os 11 pesquisadores 12-22
// (a "demo" do próprio 07_seed_dados.sql, já têm campanha, score e links
// pré-montados) ficam BLOQUEADOS aqui: aparecem na lista, mas riscados,
// com cadeado, sem botão de usar. Servem pra explorar o produto, não pra
// virar cobaia de teste.
//
// SEM ELENCO (25-08-2026, pedido do Lucas: "remover de vez" o motor de
// login-múltiplo). Toda escrita usa a sessão REAL do painel (`auth`).
//
// SEM "Escolher" (12-09-2026) - removida por completo, junto com o painel
// solto embaixo da tabela que ela alimentava.
//
// SEM MODAL PRÓPRIO (13-09-2026, pedido do Lucas: "apagar as telas do CRUD
// de Usuário, fazer a completa migração do Modal") - o modal completo
// (Alterar/Consultar/Excluir, unificando conta + Perfil de Pesquisador) que
// nasceu e cresceu aqui entre 07 e 12-09-2026 foi extraído pra
// `views/1-usuario/modal-usuario.tsx`, que agora também é o CRUD real de
// Usuário (`listar-usuarios.tsx`). Esta tela só abre esses componentes
// compartilhados - não duplica mais nome/senha/foto/papéis/moderação/CPF/
// score/links acadêmicos aqui dentro. O que continua exclusivo desta tela:
// a própria tabela (com linha riscada/cadeado por registro bloqueado, que
// GenericTable não sabe fazer) e o filtro/facet/paginação por cima dela.
export function BancadaPesquisador({ auth }: PropsPagina) {
  // CORRIGIDO (13-09-2026, achado numa varredura de código inerte pedida
  // pelo Lucas) - o modal compartilhado (`modal-usuario.tsx`) não pode usar
  // `chamarERegistrar`/`useCampoTestes()` internamente (quebraria a página
  // real em produção, ver comentário no topo daquele arquivo), então T1
  // tinha parado de aparecer no T4 (Registro de Chamadas) por completo -
  // regressão real, não cosmética, já que T4 é exatamente a ferramenta que
  // ajuda a ver de perto o que "testar upgrade de perfil, scores, etc."
  // dispara de verdade. `registrarChamada` (só existe aqui, dentro do
  // Provider) é passado como prop pro modal - a página real nunca recebe
  // essa prop, continua sem nenhuma dependência do Provider.
  const { registrarChamada } = useCampoTestes();
  const [pesquisadores, setPesquisadores] = useState<PesquisadorLinha[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroListagem, setErroListagem] = useState<string | null>(null);
  // Ligado por padrão (pedido do Lucas): a demo pré-montada (12-22) não
  // serve pra testar, então já nasce fora da vista, sem precisar caçar.
  const [ocultarBloqueados, setOcultarBloqueados] = useState(true);
  // Mesmo filtro + paginação + facet "Papel" de GenericTable (components/
  // crud/generic-table.tsx), reimplementado aqui (não a versão genérica
  // de N facetas com URL/ordenação) porque esta tabela precisa de linha
  // riscada/cadeado por registro bloqueado, que o GenericTable não tem
  // como fazer (sem className por linha).
  const [filtroTexto, setFiltroTexto] = useState('');
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState<number | 'todos'>(10);
  // Pré-marcado com usuário/pesquisador (pedido do Lucas, 23-08-2026: "só
  // pra adiantar os testes") - só este facet, só nesta tela; em qualquer
  // outro filtro por papel do painel (ex.: /admin/usuarios), o padrão
  // continua sendo "Todos".
  const [papeisSelecionados, setPapeisSelecionados] = useState<string[]>([PAPEL_SEM_EXTRA, 'pesquisador']);
  const [facetaPapelAberta, setFacetaPapelAberta] = useState(false);
  const facetaPapelRef = useRef<HTMLDivElement>(null);

  // Qual modal está aberto - o conteúdo de cada um vive em modal-usuario.tsx
  // (compartilhado com o CRUD real de Usuário), aqui só se guarda QUEM.
  const [idUsuarioConsultando, setIdUsuarioConsultando] = useState<number | null>(null);
  const [idUsuarioAlterando, setIdUsuarioAlterando] = useState<number | null>(null);
  const [usuarioExcluindo, setUsuarioExcluindo] = useState<PesquisadorLinha | null>(null);
  // Coluna "upgrade" (13-09-2026, pedido do Lucas) - cadeado abre o MESMO
  // Modal de upgrade de perfil que qualquer conta usaria (ModalUpgrade
  // Pesquisador, em 6-perfil-pesquisador/ - não é exclusivo do Campo de
  // Testes) pra QUALQUER linha sem perfil, própria ou de outra pessoa
  // (14-09-2026, decisão do Lucas via AskUserQuestion: o Termo de Uso
  // aparece sempre, mesmo pra outra conta - o Modal decide sozinho, por
  // baixo, se usa o endpoint self-service ou "para outro" comparando
  // `idUsuarioAlvo` com a conta logada).
  const [idUsuarioUpgrade, setIdUsuarioUpgrade] = useState<number | null>(null);

  // Lista TODOS os usuários (23-08-2026, pedido do Lucas: "não deve
  // aparecer só Pesquisadores"), não só quem já tem perfil_pesquisador -
  // qualquer conta real dá pra abrir. Coluna/facet "papel" (mesma lógica de
  // listar-usuarios.tsx): junta usuario_papel de todo mundo de uma vez (1
  // requisição, não 1 por linha), papel padrão 'usuario' não conta como
  // "extra".
  // `.catch()` no fim (achado 08-09-2026, no-floating-promises) - antes,
  // se `usuarioApi.listar` falhasse, o `.finally()` ainda zerava o
  // spinner, mas nenhum erro aparecia: a tela ficava vazia/desatualizada
  // em silêncio, sem explicar por quê.
  const carregarPesquisadores = useCallback(() => {
    setCarregandoLista(true);
    setErroListagem(null);
    Promise.all([
      usuarioApi.listar(auth.authFetch),
      perfilPesquisadorApi.listar(auth.authFetch).catch(() => []),
      usuarioPapelApi.listarTudo(auth.authFetch).catch(() => []),
    ])
      .then(([usuarios, perfis, vinculos]) => {
        const perfilPorId = new Map(perfis.map((perfil) => [perfil.idUsuario, perfil]));
        const papeisPorUsuario = new Map<number, string[]>();
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
      .catch((erro: unknown) => {
        setErroListagem(erro instanceof Error ? erro.message : 'Falha ao carregar a lista de pesquisadores.');
      })
      .finally(() => setCarregandoLista(false));
  }, [auth.authFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarPesquisadores();
  }, [carregarPesquisadores]);

  // Fechar o dropdown "Papel" ao clicar fora (mesmo padrão de
  // GenericTable, extraído em `useFecharAoClicarFora` em 13-09-2026).
  useFecharAoClicarFora(facetaPapelRef, facetaPapelAberta, () => setFacetaPapelAberta(false));

  // Opções do dropdown "Papel" - só os valores que já aparecem nos dados
  // (mesmo sniff de GenericTable), ordenados do menor pro maior poder.
  const opcoesPapel = [...new Set(pesquisadores.flatMap((perfil) => perfil.papel.split(', ').filter(Boolean)))].sort((a, b) => {
    const posicao = (valor: string): number => {
      const indice = ORDEM_PODER_PAPEL.indexOf(valor);
      return indice === -1 ? ORDEM_PODER_PAPEL.length : indice;
    };
    return posicao(a) - posicao(b) || a.localeCompare(b, 'pt-BR');
  });

  const pesquisadoresFiltrados = pesquisadores
    .filter((perfil) => !ocultarBloqueados || !PESQUISADOR_BLOQUEADO(perfil.idUsuario))
    .filter((perfil) => {
      if (papeisSelecionados.length === 0) return true;
      return perfil.papel.split(', ').some((papel) => papeisSelecionados.includes(papel));
    })
    .filter((perfil) => {
      const termo = filtroTexto.trim().toLowerCase();
      if (!termo) return true;
      return [
        perfil.idUsuario,
        perfil.usuario.nome,
        perfil.tituloAcademico ? ROTULO_TITULO_ACADEMICO[perfil.tituloAcademico] : undefined,
        perfil.statusPesquisador ? ROTULO_STATUS_PESQUISADOR[perfil.statusPesquisador] : undefined,
        perfil.papel,
      ]
        .some((valor) => String(valor ?? '').toLowerCase().includes(termo));
    });
  const { totalPaginas, paginaAtual, itensPagina: pesquisadoresPagina } = paginarClientSide(pesquisadoresFiltrados, pagina, tamanhoPagina);

  return (
    <div className="admin-content-painel">
      <section className="crud-secao">
      <div className="crud-secao__cabecalho">
        <h2 className="titulo-secao">Campo de Testes - Bancada do Pesquisador</h2>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h3 className="subtitulo">Usuários</h3>
        <div className="flex items-center gap-3 flex-wrap">
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
              className="w-full sm:w-64 border borda-forte rounded-lg fundo-sutil py-2 px-3 text-sm outline-none foco-marca"
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
                    className="dropdown-opcao"
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
                          className="combobox-opcao"
                          onClick={(evento) => {
                            if (evento.target instanceof Element && evento.target.tagName !== 'INPUT') {
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
            <th className="crud-tabela__celula--centralizada">status</th>
            <th className="crud-tabela__celula--centralizada">score</th>
            <th className="crud-tabela__celula--centralizada">upgrade</th>
            <th className="crud-tabela__celula--centralizada">Ações</th>
          </tr>
        </thead>
        <tbody>
          {carregandoLista && (
            <tr>
              <td colSpan={8} className="texto-fraco">Carregando...</td>
            </tr>
          )}
          {!carregandoLista && erroListagem && (
            <tr>
              <td colSpan={8} className="texto-erro font-bold">{erroListagem}</td>
            </tr>
          )}
          {!carregandoLista && !erroListagem && pesquisadoresPagina.length === 0 && (
            <tr>
              <td colSpan={8} className="texto-fraco">{filtroTexto ? 'Nenhum registro bate com o filtro.' : 'Nenhum registro.'}</td>
            </tr>
          )}
          {!carregandoLista &&
            pesquisadoresPagina.map((perfil) => {
              const bloqueado = PESQUISADOR_BLOQUEADO(perfil.idUsuario);
              return (
                <tr key={perfil.idUsuario} className={bloqueado ? 'texto-fraco' : undefined}>
                  <td className="crud-tabela__coluna-id crud-tabela__celula--centralizada" style={bloqueado ? { textDecoration: 'line-through' } : undefined}>
                    {perfil.idUsuario}
                  </td>
                  <td style={bloqueado ? { textDecoration: 'line-through' } : undefined}>
                    {perfil.usuario.nome}
                  </td>
                  <td style={bloqueado ? { textDecoration: 'line-through' } : undefined}>{perfil.papel}</td>
                  <td style={bloqueado ? { textDecoration: 'line-through' } : undefined}>
                    {perfil.tituloAcademico ? ROTULO_TITULO_ACADEMICO[perfil.tituloAcademico] : '-'}
                  </td>
                  <td
                    className="crud-tabela__celula--centralizada"
                    style={bloqueado ? { textDecoration: 'line-through' } : undefined}
                  >
                    {perfil.statusPesquisador ? ROTULO_STATUS_PESQUISADOR[perfil.statusPesquisador] : '-'}
                  </td>
                  <td className="crud-tabela__celula--centralizada">{perfil.scoreAtual ?? '-'}</td>
                  <td className="crud-tabela__celula--centralizada">
                    {perfil.statusPesquisador !== undefined ? (
                      <span className="badge badge-sucesso">Pesquisador</span>
                    ) : (
                      // Cadeado SEMPRE visível e clicável (14-09-2026,
                      // achado do Lucas: "nos Usuários que não Pesquisadores
                      // está aparecendo '-'... era pro cadeado estar ali") -
                      // em toda linha sem perfil, própria ou de outra
                      // pessoa. O Modal (ModalUpgradePesquisador) decide
                      // sozinho, por baixo, qual endpoint usar comparando o
                      // `idUsuarioAlvo` com a conta logada - aqui só se
                      // guarda QUEM.
                      <button
                        type="button"
                        onClick={() => setIdUsuarioUpgrade(perfil.idUsuario)}
                        disabled={bloqueado}
                        title="Fazer upgrade de perfil pra pesquisador"
                        aria-label="Fazer upgrade de perfil pra pesquisador"
                      >
                        <i className="fa-solid fa-lock texto-aviso"></i>
                      </button>
                    )}
                  </td>
                  <td className="crud-tabela__celula--centralizada">
                    {bloqueado ? (
                      <span title={motivoBloqueioPesquisador()}>
                        <i className="fa-solid fa-lock"></i> bloqueado
                      </span>
                    ) : (
                      <div className="crud-tabela__acoes">
                        <AcaoLinha
                          rotulo="Alterar"
                          icone="fa-pen"
                          variante="alterar"
                          onClick={() => setIdUsuarioAlterando(perfil.idUsuario)}
                        />
                        <AcaoLinha
                          rotulo="Consultar"
                          icone="fa-eye"
                          onClick={() => setIdUsuarioConsultando(perfil.idUsuario)}
                        />
                        <AcaoLinha
                          rotulo="Excluir"
                          icone="fa-trash"
                          variante="excluir"
                          onClick={() => setUsuarioExcluindo(perfil)}
                        />
                      </div>
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
                className="border borda-padrao rounded-md fundo-sutil py-1 px-2 text-xs outline-none foco-marca"
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

      {idUsuarioConsultando !== null && (
        <ModalConsultarUsuario
          auth={auth}
          idUsuario={idUsuarioConsultando}
          aoFechar={() => setIdUsuarioConsultando(null)}
          aoRegistrarChamada={registrarChamada}
        />
      )}

      {idUsuarioAlterando !== null && (
        <ModalAlterarUsuario
          auth={auth}
          idUsuario={idUsuarioAlterando}
          aoFechar={() => setIdUsuarioAlterando(null)}
          aoAtualizado={carregarPesquisadores}
          aoRegistrarChamada={registrarChamada}
        />
      )}

      {idUsuarioUpgrade !== null && (
        <ModalUpgradePesquisador
          auth={auth}
          idUsuarioAlvo={idUsuarioUpgrade}
          gerarCpfDeTeste={gerarCpfValido}
          aoFechar={() => setIdUsuarioUpgrade(null)}
          aoConcluido={carregarPesquisadores}
        />
      )}

      {usuarioExcluindo && (
        <ModalExcluirUsuario
          auth={auth}
          idUsuario={usuarioExcluindo.idUsuario}
          nome={usuarioExcluindo.usuario.nome}
          email={usuarioExcluindo.usuario.email}
          emailVerificado={usuarioExcluindo.usuario.emailVerificado}
          aoFechar={() => setUsuarioExcluindo(null)}
          aoExcluido={carregarPesquisadores}
          aoRegistrarChamada={registrarChamada}
        />
      )}

      <div className="border-t borda-padrao my-8"></div>

      <RegistroChamadas />
      </section>
    </div>
  );
}
