// Campo de Testes é parte permanente do painel administrativo (não uma ferramenta de teste descartável), com o
// mesmo padrão de dados/comportamento do resto do sistema (nunca uma versão simplificada à parte).

import { useCallback, useEffect, useState } from 'react';
import { AcaoLinha } from '../../components/crud/acao-linha';
import { Dica } from '../../components/layout/tooltip';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { ORDEM_PODER_PAPEL, PAPEL_SEM_EXTRA } from '../../services/2-papel-permissao/constants/papel-ordem-poder';
import { PESQUISADOR_BLOQUEADO, motivoBloqueioPesquisador } from '../../services/campo-testes/util/registros-bloqueados';
import { gerarCpfValido } from '../../services/campo-testes/util/gerar-cpf-valido';
import { useCampoTestes } from '../../services/campo-testes/hook/use-campo-testes';
import { paginarClientSide } from '../../services/constant/utils/paginacao.util';
import { RodapePaginacao } from '../../components/pagination/rodape-paginacao';
import { BarraFiltros } from '../../components/search/barra-filtros';
import { LIMIAR_FILTRO } from '../../components/search/limiar-filtro.constants';
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

// Perfil ainda pode não existir pra um usuário (upgrade nunca feito) -
// por isso os campos de PerfilPesquisadorResponse ficam todos opcionais
// aqui, diferente do tipo original (que sempre reflete uma linha real).
interface PesquisadorLinha extends Partial<PerfilPesquisadorResponse> {
  idUsuario: number;
  usuario: UsuarioResponse;
  papel: string;
}

// T1, Bancada do Pesquisador. Trabalha em cima de REGISTROS REAIS: a lista abaixo vem de GET
// /perfil-pesquisador de verdade (mesma API da tela admin "Pesquisadores"). Os 11 pesquisadores 12-22 (a "demo"
// do próprio 07_seed_dados.sql, que já têm campanha, score e links pré-montados) ficam BLOQUEADOS aqui:
// aparecem na lista, mas riscados, com cadeado, sem botão de usar. Servem para explorar o produto, não para
// virar cobaia de teste.
//
// Toda escrita usa a sessão REAL do painel (`auth`).
//
// Esta tela não tem modal próprio: abre os componentes compartilhados de `views/1-usuario/modal-usuario.tsx`
// (Alterar/Consultar/Excluir, unificando conta + Perfil de Pesquisador), que também são o CRUD real de Usuário
// (`listar-usuarios.tsx`); não duplica nome/senha/foto/papéis/moderação/CPF/score/links acadêmicos aqui dentro.
// O que continua exclusivo desta tela: a própria tabela (com linha riscada/cadeado por registro bloqueado, que
// GenericTable não sabe fazer) e o filtro/facet/paginação por cima dela.
export function BancadaPesquisador({ auth }: PropsPagina) {
  // O modal compartilhado (`modal-usuario.tsx`) não pode usar `chamarERegistrar`/`useCampoTestes()`
  // internamente (quebraria a página real em produção, ver comentário no topo daquele arquivo). Para T1
  // continuar aparecendo no T4 (Registro de Chamadas), que é a ferramenta que ajuda a ver de perto o que
  // "testar upgrade de perfil, scores, etc." dispara de verdade, `registrarChamada` (só existe aqui, dentro do
  // Provider) é passado como prop para o modal; a página real nunca recebe essa prop, continua sem nenhuma
  // dependência do Provider.
  const { registrarChamada } = useCampoTestes();
  const [pesquisadores, setPesquisadores] = useState<PesquisadorLinha[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroListagem, setErroListagem] = useState<string | null>(null);
  // Ligado por padrão: a demo pré-montada (12-22) não serve para testar, então já nasce fora da vista, sem
  // precisar caçar.
  const [ocultarBloqueados, setOcultarBloqueados] = useState(true);
  // Mesmo filtro + paginação + facet "Papel" de GenericTable (components/
  // crud/generic-table.tsx), reimplementado aqui (não a versão genérica
  // de N facetas com URL/ordenação) porque esta tabela precisa de linha
  // riscada/cadeado por registro bloqueado, que o GenericTable não tem
  // como fazer (sem className por linha).
  const [filtroTexto, setFiltroTexto] = useState('');
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState<number | 'todos'>(10);
  // Pré-marcado com usuário/pesquisador, para adiantar os testes: só este facet, só nesta tela; em qualquer
  // outro filtro por papel do painel (ex.: /admin/usuarios), o padrão continua sendo "Todos".
  const [papeisSelecionados, setPapeisSelecionados] = useState<string[]>([PAPEL_SEM_EXTRA, 'pesquisador']);

  // Qual modal está aberto - o conteúdo de cada um vive em modal-usuario.tsx
  // (compartilhado com o CRUD real de Usuário), aqui só se guarda QUEM.
  const [idUsuarioConsultando, setIdUsuarioConsultando] = useState<number | null>(null);
  const [idUsuarioAlterando, setIdUsuarioAlterando] = useState<number | null>(null);
  const [usuarioExcluindo, setUsuarioExcluindo] = useState<PesquisadorLinha | null>(null);
  // Coluna "upgrade": o cadeado abre o MESMO Modal de upgrade de perfil que qualquer conta usaria
  // (ModalUpgradePesquisador, em 6-perfil-pesquisador/, não é exclusivo do Campo de Testes) para QUALQUER linha
  // sem perfil, própria ou de outra pessoa (o Termo de Uso aparece sempre, mesmo para outra conta): o Modal
  // decide sozinho, por baixo, se usa o endpoint self-service ou "para outro" comparando `idUsuarioAlvo` com a
  // conta logada.
  const [idUsuarioUpgrade, setIdUsuarioUpgrade] = useState<number | null>(null);

  // Lista TODOS os usuários, não só quem já tem perfil_pesquisador: qualquer conta real dá para abrir.
  // Coluna/facet "papel" (mesma lógica de listar-usuarios.tsx): junta usuario_papel de todo mundo de uma vez (1
  // requisição, não 1 por linha), papel padrão 'usuario' não conta como "extra".
  // `.catch()` no fim (`no-floating-promises`): se `usuarioApi.listar` falhasse, o `.finally()` ainda zeraria o
  // spinner, mas nenhum erro apareceria: a tela ficaria vazia/desatualizada em silêncio, sem explicar por quê.
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

      <BarraFiltros
        mostrarBusca={pesquisadores.length > LIMIAR_FILTRO}
        valorBusca={filtroTexto}
        aoMudarBusca={(valor) => {
          setFiltroTexto(valor);
          setPagina(1);
        }}
        facetas={[
          {
            chave: 'papel',
            rotulo: 'Papel',
            opcoes: opcoesPapel,
            selecionados: papeisSelecionados,
            aoAlternar: (papel) => {
              setPapeisSelecionados((atuais) =>
                atuais.includes(papel) ? atuais.filter((p) => p !== papel) : [...atuais, papel],
              );
              setPagina(1);
            },
            aoLimpar: () => {
              setPapeisSelecionados([]);
              setPagina(1);
            },
          },
        ]}
      />

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
                      // Cadeado SEMPRE visível e clicável em toda linha sem perfil, própria ou de outra pessoa.
                      // O Modal (ModalUpgradePesquisador) decide sozinho, por baixo, qual endpoint usar
                      // comparando o `idUsuarioAlvo` com a conta logada: aqui só se guarda QUEM.
                      <button
                        type="button"
                        onClick={() => setIdUsuarioUpgrade(perfil.idUsuario)}
                        disabled={bloqueado}
                        aria-label="Fazer upgrade de perfil pra pesquisador"
                        className="dica"
                      >
                        <i className="fa-solid fa-lock texto-aviso"></i>
                        <Dica texto="Fazer upgrade de perfil pra pesquisador" curta />
                      </button>
                    )}
                  </td>
                  <td className="crud-tabela__celula--centralizada">
                    {bloqueado ? (
                      <span className="dica" tabIndex={0} role="note" aria-label={motivoBloqueioPesquisador()}>
                        <i className="fa-solid fa-lock"></i> bloqueado
                        <Dica texto={motivoBloqueioPesquisador()} />
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

      <RodapePaginacao
        total={pesquisadoresFiltrados.length}
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        tamanhoPagina={tamanhoPagina}
        className="mb-4"
        aoMudarPagina={setPagina}
        aoMudarTamanho={(tamanho) => {
          setTamanhoPagina(tamanho);
          setPagina(1);
        }}
      />

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
