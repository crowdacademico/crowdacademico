// ============================================================================
// Campo de Testes deixou de ser só ferramenta de teste descartável
// (07-09-2026, decisão do Lucas): virou parte permanente do painel
// administrativo, com o mesmo padrão de dados/comportamento do resto do
// sistema (nunca uma versão simplificada à parte).
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { ORDEM_PODER_PAPEL, PAPEL_SEM_EXTRA } from '../../services/2-papel-permissao/constants/papel-ordem-poder';
import { useCampoTestes } from '../../services/campo-testes/hook/use-campo-testes';
import { useChamadaRegistrada } from '../../services/campo-testes/hook/use-chamada-registrada';
import { gerarCpfValido } from '../../services/campo-testes/util/gerar-cpf-valido';
import { PESQUISADOR_BLOQUEADO, motivoBloqueioPesquisador } from '../../services/campo-testes/util/registros-bloqueados';
import { formatarCpf, formatarCpfExibicao, formatarDataHora } from '../../services/constant/utils/formatacao.util';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TIPO_VINCULO,
  ROTULO_TITULO_ACADEMICO,
  classeBadgeStatusPesquisador,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalDetalhe } from '../../components/crud/modal-detalhe';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { SecaoModeracaoPesquisador } from '../6-perfil-pesquisador/secao-moderacao-pesquisador';
import { RegistroChamadas } from './registro-chamadas';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { UsuarioResponse } from '../../services/1-usuario/type/usuario.type';
import type { PerfilPesquisadorResponse, PerfilPesquisadorResponseScore } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';
import type { TipoVinculo, TituloAcademico } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import type { TipoLinkResponse } from '../../services/9-tipo-link/type/tipo-link.type';
import type { ResultadoPaginado } from '../../services/constant/type/paginacao.type';

const TIPOS_VINCULO: TipoVinculo[] = ['institucional', 'independente'];
const TITULOS_ACADEMICOS: TituloAcademico[] = ['graduado', 'especialista', 'mestre', 'doutor'];
const TAMANHOS_PAGINA = [10, 20, 30, 'todos'] as const;
const LIMIAR_FILTRO = 5;

// `link-academico` (módulo 7) não tem type/ formal - backend ainda sem
// controller registrado nas fases anteriores (só o Campo de Testes fala
// com ele, via chamarERegistrar cru). Shape inferido do próprio uso real
// aqui e em bancada-campanha.jsx/vida-campanha-ativa.jsx.
interface LinkAcademico {
  idLinkAcademico: number;
  idTipoLink: number;
  url: string;
  rotulo: string | null;
}

// Perfil ainda pode não existir pra um usuário (upgrade nunca feito) -
// por isso os campos de PerfilPesquisadorResponse ficam todos opcionais
// aqui, diferente do tipo original (que sempre reflete uma linha real).
interface PesquisadorLinha extends Partial<PerfilPesquisadorResponse> {
  idUsuario: number;
  usuario: UsuarioResponse;
  papel: string;
}

interface FormCriarPerfil {
  cpf: string;
  tipoVinculo: TipoVinculo;
  vinculoInstitucional: string;
  tituloAcademico: TituloAcademico;
}

function ehTipoVinculo(valor: string): valor is TipoVinculo {
  return valor === 'institucional' || valor === 'independente';
}

function ehTituloAcademico(valor: string): valor is TituloAcademico {
  return valor === 'graduado' || valor === 'especialista' || valor === 'mestre' || valor === 'doutor';
}

const TAMANHO_MAXIMO_URL_NA_LINHA = 40;

// Sem quebra de linha na tabela de links (pedido do Lucas, 23-08-2026:
// "alguns links são excepcionalmente grandes") - trunca com " ..." de
// verdade (texto, não elipse via CSS) e quem quiser o link inteiro clica
// em Consultar.
function truncarUrl(url: string): string {
  return url.length > TAMANHO_MAXIMO_URL_NA_LINHA ? `${url.slice(0, TAMANHO_MAXIMO_URL_NA_LINHA)} ...` : url;
}

interface PainelLinksAcademicosProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
  tiposLink: TipoLinkResponse[];
  // `tituloComoSecaoFicha` (08-09-2026, pedido do Lucas: "precisava se
  // parecer com os demais") - dentro do modal de Alterar, o título precisa
  // bater com o mesmo estilo de "Perfil de Pesquisador"/"Metadados"
  // (SecaoFicha, ficha-consulta.tsx) - embaixo da página (uso original),
  // continua com o título simples de sempre. Mesmas classes de
  // `SecaoFicha`, sem importar o componente inteiro (ele espera pares
  // rótulo/valor num grid, não uma tabela inteira).
  tituloComoSecaoFicha?: boolean;
}

// Extraído (08-09-2026, pedido do Lucas) - o mesmo card de "Links
// acadêmicos" que já existia embaixo (ligado ao pesquisador ESCOLHIDO,
// `chaveFoco`) passou a ser reaproveitado TAMBÉM dentro do modal de
// Alterar (ligado ao pesquisador em EDIÇÃO, `idUsuarioEditandoPerfil`) -
// os dois podem ser pessoas diferentes ao mesmo tempo, por isso virou
// componente próprio com estado próprio, em vez de duplicar o JSX cru
// (duas cópias do mesmo bug seria pior que uma). É proposital ter os dois
// lugares por enquanto: o Lucas quer perguntar pra Alexia qual dos dois
// ela prefere (embaixo, solto, ou dentro do Alterar) antes de decidir
// remover um.
function PainelLinksAcademicos({ auth, idUsuario, tiposLink, tituloComoSecaoFicha }: PainelLinksAcademicosProps) {
  const chamarERegistrar = useChamadaRegistrada(auth);
  const { mostrar } = useToast();
  const { reportarErro } = useErroToast();

  const [links, setLinks] = useState<LinkAcademico[]>([]);
  const [novoLink, setNovoLink] = useState({ idTipoLink: '', url: '', rotulo: '' });
  const [idLinkEditando, setIdLinkEditando] = useState<number | null>(null);
  const [formEdicaoLink, setFormEdicaoLink] = useState({ url: '', rotulo: '' });
  const [linkConsultado, setLinkConsultado] = useState<LinkAcademico | null>(null);

  const carregarLinks = useCallback(() => {
    chamarERegistrar<LinkAcademico[]>(`/link-academico?idUsuario=${idUsuario}`)
      .then(setLinks)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUsuario]);

  useEffect(() => {
    carregarLinks();
  }, [carregarLinks]);

  const adicionarLink = async () => {
    if (!novoLink.idTipoLink || !novoLink.url) return;
    try {
      await chamarERegistrar<LinkAcademico>(`/link-academico/${idUsuario}`, {
        method: 'POST',
        body: JSON.stringify({
          idTipoLink: Number(novoLink.idTipoLink),
          url: novoLink.url,
          ...(novoLink.rotulo ? { rotulo: novoLink.rotulo } : {}),
        }),
      });
      carregarLinks();
      setNovoLink({ idTipoLink: '', url: '', rotulo: '' });
      mostrar('Link acadêmico adicionado com sucesso.');
    } catch (erro) {
      reportarErro(erro);
    }
  };

  const removerLink = async (idLinkAcademico: number) => {
    try {
      await chamarERegistrar<void>(`/link-academico/${idLinkAcademico}`, { method: 'DELETE' });
      carregarLinks();
      mostrar('Link acadêmico excluído com sucesso.');
    } catch (erro) {
      reportarErro(erro);
    }
  };

  const iniciarEdicaoLink = (link: LinkAcademico) => {
    setIdLinkEditando(link.idLinkAcademico);
    setFormEdicaoLink({ url: link.url, rotulo: link.rotulo ?? '' });
  };

  const salvarEdicaoLink = async () => {
    if (!formEdicaoLink.url) return;
    try {
      await chamarERegistrar<void>(`/link-academico/${idLinkEditando}`, {
        method: 'PATCH',
        body: JSON.stringify({ url: formEdicaoLink.url, ...(formEdicaoLink.rotulo ? { rotulo: formEdicaoLink.rotulo } : {}) }),
      });
      carregarLinks();
      setIdLinkEditando(null);
      mostrar('Link acadêmico alterado com sucesso.');
    } catch (erro) {
      reportarErro(erro);
    }
  };

  return (
    <>
      {/* `.titulo-bloco` (08-09-2026) - token novo em 1-base.css, o mesmo
          rótulo pequeno/maiúsculo que SecaoFicha/Minha Conta já usavam
          soltos (achado do Lucas: "não podemos ter algo perdido flutuando
          por aí"). Define a tipografia certa sozinho (font-family sans,
          não depende mais de estar numa tag h1/h2/h3 específica pra
          escapar da regra global de heading serifado). */}
      {tituloComoSecaoFicha ? (
        <h3 className="titulo-bloco mb-3 pb-2 border-b borda-padrao">
          Links acadêmicos ({links.length} de 5)
        </h3>
      ) : (
        <h4 className="font-bold mt-4 mb-1">Links acadêmicos ({links.length} de 5)</h4>
      )}
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
                    péssimo, aparece barra de rolagem") - o botão SÓ
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
  );
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
// login-múltiplo). Selecionar uma linha aqui só marca `pesquisadorSelecionado`
// (CampoTestesProvider) - não faz login nenhum, é sempre a sessão real do
// painel (`auth`) quem executa toda escrita. "Promover Usuário → Pesquisador"
// e as ações de link acadêmico (07/08-09-2026: ambos ganharam endpoint "para
// outro", mesmo padrão de CPF/suspensão) já funcionam de verdade pra
// QUALQUER pesquisador selecionado, não só a própria conta do Admin - a
// limitação antiga ("só funciona logado como a própria pessoa") foi
// corrigida nos dois casos, não é mais verdade.
export function BancadaPesquisador({ auth }: PropsPagina) {
  const { pesquisadorSelecionado, selecionarPesquisador, limparPesquisadorSelecionado } = useCampoTestes();
  const chamarERegistrar = useChamadaRegistrada(auth);
  const chaveFoco = pesquisadorSelecionado?.idUsuario ?? null;

  const [pesquisadores, setPesquisadores] = useState<PesquisadorLinha[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroListagem, setErroListagem] = useState<string | null>(null);
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
  const [tamanhoPagina, setTamanhoPagina] = useState<number | 'todos'>(10);
  // Pré-marcado com usuário/pesquisador (pedido do Lucas, 23-08-2026: "só
  // pra adiantar os testes") - só este facet, só nesta tela; em qualquer
  // outro filtro por papel do painel (ex.: /admin/usuarios), o padrão
  // continua sendo "Todos".
  const [papeisSelecionados, setPapeisSelecionados] = useState<string[]>([PAPEL_SEM_EXTRA, 'pesquisador']);
  const [facetaPapelAberta, setFacetaPapelAberta] = useState(false);
  const facetaPapelRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormCriarPerfil>({
    cpf: '',
    tipoVinculo: 'institucional',
    vinculoInstitucional: '',
    tituloAcademico: 'mestre',
  });
  const [criando, setCriando] = useState(false);
  const [erroCriar, setErroCriar] = useState<string | null>(null);

  // Ações da coluna normal (07-09-2026, pedido do Lucas: Admin ver/alterar
  // TODOS os campos do pesquisador, igual os outros módulos) - separado da
  // coluna "Escolher" (mesmo split já feito em T2, Bancada da Campanha).
  const [perfilConsultado, setPerfilConsultado] = useState<PesquisadorLinha | null>(null);
  const [idUsuarioEditandoPerfil, setIdUsuarioEditandoPerfil] = useState<number | null>(null);
  const [formEdicaoPerfil, setFormEdicaoPerfil] = useState<{
    tipoVinculo: TipoVinculo;
    vinculoInstitucional: string;
    tituloAcademico: TituloAcademico;
  } | null>(null);
  const [cpfCorrecao, setCpfCorrecao] = useState('');

  const [score, setScore] = useState<PerfilPesquisadorResponseScore | null>(null);
  const [tiposLink, setTiposLink] = useState<TipoLinkResponse[]>([]);

  // Sem probe separado (era `elenco.atores[chaveFoco].temPerfilPesquisador`,
  // uma 2ª chamada de rede): `pesquisadores` já carrega perfil_pesquisador
  // JUNTO com usuario (ver carregarPesquisadores abaixo), então a própria
  // linha selecionada já diz se tem perfil ou não.
  const perfilFoco = pesquisadores.find((perfil) => perfil.idUsuario === chaveFoco) ?? null;
  const usuarioFoco = perfilFoco?.usuario ?? pesquisadorSelecionado ?? null;
  const jaTemPerfil = chaveFoco === null ? undefined : Boolean(perfilFoco?.statusPesquisador);

  // Lista TODOS os usuários (23-08-2026, pedido do Lucas: "não deve
  // aparecer só Pesquisadores"), não só quem já tem perfil_pesquisador -
  // qualquer conta real dá pra selecionar. Quem ainda não tem perfil
  // mostra as colunas de pesquisador em branco, é o gancho pro formulário
  // "Criar perfil" logo abaixo.
  // Coluna/facet "papel" (mesma lógica de listar-usuarios.jsx): junta
  // usuario_papel de todo mundo de uma vez (1 requisição, não 1 por
  // linha), papel padrão 'usuario' não conta como "extra".
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
  // GenericTable) - listener de mousedown, não depende de foco.
  useEffect(() => {
    if (!facetaPapelAberta) return undefined;
    const aoClicarFora = (evento: MouseEvent) => {
      if (
        facetaPapelRef.current &&
        evento.target instanceof Node &&
        !facetaPapelRef.current.contains(evento.target)
      ) {
        setFacetaPapelAberta(false);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [facetaPapelAberta]);

  // Carrega score sempre que o pesquisador selecionado (com perfil) mudar.
  // A comparação "CPF visto pelo dono x visto por outro" (RF-016) não tem
  // mais painel dedicado (23-08-2026, pedido do Lucas): as chamadas GET já
  // aparecem naturalmente no Registro de Chamadas, sem precisar duplicar a
  // UI. Links acadêmicos saíram daqui (08-09-2026) - viraram responsabilidade
  // própria de <PainelLinksAcademicos>, que carrega pelo idUsuario que
  // recebe (chaveFoco aqui embaixo, idUsuarioEditandoPerfil dentro do modal).
  useEffect(() => {
    if (!chaveFoco || jaTemPerfil !== true) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScore(null);
      return;
    }
    chamarERegistrar<PerfilPesquisadorResponseScore>(`/perfil-pesquisador/${chaveFoco}/score`)
      .then(setScore)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveFoco, jaTemPerfil]);

  // Catálogo de tipo de link, uma vez só, ao montar - não depende mais de
  // ninguém selecionado (era "qualquer ator vivo", só pra ter alguém pra
  // registrar a chamada em T4; sem Elenco, a sessão real já basta).
  useEffect(() => {
    if (tiposLink.length > 0) return;
    chamarERegistrar<ResultadoPaginado<TipoLinkResponse>>('/tipo-link?escopo=perfil&tamanho=100')
      .then((resultado) => setTiposLink(resultado.dados ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const escolherPesquisador = (perfil: PesquisadorLinha) => {
    if (!perfil.usuario) return;
    selecionarPesquisador({ idUsuario: perfil.idUsuario, nome: perfil.usuario.nome, email: perfil.usuario.email });
  };

  // CORRIGIDO (07-09-2026): chamava POST /perfil-pesquisador (self-service,
  // sempre cria em nome de quem está logado) - promover outro usuário,
  // logado como Admin, sempre colidia com o PRÓPRIO perfil do Admin ("já
  // existe um registro"), nunca criava nada de verdade pro usuário
  // escolhido. Agora usa POST /perfil-pesquisador/:id (endpoint de
  // suporte/admin, ver perfil-pesquisador.service.create-para-outro.ts).
  const criarPerfil = async () => {
    if (chaveFoco === null) return;
    setCriando(true);
    setErroCriar(null);
    try {
      await chamarERegistrar<PerfilPesquisadorResponse>(`/perfil-pesquisador/${chaveFoco}`, {
        method: 'POST',
        body: JSON.stringify({
          cpf: form.cpf,
          tipoVinculo: form.tipoVinculo,
          ...(form.tipoVinculo === 'institucional' ? { vinculoInstitucional: form.vinculoInstitucional } : {}),
          tituloAcademico: form.tituloAcademico,
        }),
      });
      carregarPesquisadores();
    } catch (erro) {
      setErroCriar(erro instanceof Error ? erro.message : 'Falha ao criar perfil.');
    } finally {
      setCriando(false);
    }
  };

  const iniciarEdicaoPerfil = (perfil: PesquisadorLinha) => {
    setIdUsuarioEditandoPerfil(perfil.idUsuario);
    setFormEdicaoPerfil({
      tipoVinculo: perfil.tipoVinculo ?? 'institucional',
      vinculoInstitucional: perfil.vinculoInstitucional ?? '',
      tituloAcademico: perfil.tituloAcademico ?? 'mestre',
    });
    setCpfCorrecao('');
  };

  // PATCH /perfil-pesquisador/:id (vínculo/título) - endpoint já existia,
  // só nunca tinha tela nenhuma chamando ele (nem aqui, nem no painel real).
  const salvarEdicaoPerfil = async () => {
    if (!formEdicaoPerfil || idUsuarioEditandoPerfil === null) return;
    await chamarERegistrar<void>(`/perfil-pesquisador/${idUsuarioEditandoPerfil}`, {
      method: 'PATCH',
      body: JSON.stringify({
        tipoVinculo: formEdicaoPerfil.tipoVinculo,
        ...(formEdicaoPerfil.tipoVinculo === 'institucional'
          ? { vinculoInstitucional: formEdicaoPerfil.vinculoInstitucional }
          : {}),
        tituloAcademico: formEdicaoPerfil.tituloAcademico,
      }),
    }).catch(() => {});
    setIdUsuarioEditandoPerfil(null);
    carregarPesquisadores();
  };

  // PATCH /perfil-pesquisador/:id/cpf (07-09-2026) - endpoint novo, gateado
  // por 'perfil_pesquisador_corrigir_cpf' (RF-017, ação de suporte/admin,
  // nunca do próprio pesquisador). corrigir_cpf_pesquisador() já existia no
  // banco, achado sem endpoint nenhum no Nest ao investigar este pedido.
  const salvarCorrecaoCpf = async () => {
    if (!cpfCorrecao || idUsuarioEditandoPerfil === null) return;
    await chamarERegistrar<void>(`/perfil-pesquisador/${idUsuarioEditandoPerfil}/cpf`, {
      method: 'PATCH',
      body: JSON.stringify({ cpf: cpfCorrecao }),
    }).catch(() => {});
    setCpfCorrecao('');
    carregarPesquisadores();
  };

  // Opções do dropdown "Papel" - só os valores que já aparecem nos dados
  // (mesmo sniff de GenericTable), ordenados do menor pro maior poder.
  const opcoesPapel = [...new Set(pesquisadores.flatMap((perfil) => (perfil.papel ?? '').split(', ').filter(Boolean)))].sort((a, b) => {
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
      return (perfil.papel ?? '').split(', ').some((papel) => papeisSelecionados.includes(papel));
    })
    .filter((perfil) => {
      const termo = filtroTexto.trim().toLowerCase();
      if (!termo) return true;
      return [
        perfil.idUsuario,
        perfil.usuario?.nome,
        perfil.tituloAcademico ? ROTULO_TITULO_ACADEMICO[perfil.tituloAcademico] : undefined,
        perfil.statusPesquisador ? ROTULO_STATUS_PESQUISADOR[perfil.statusPesquisador] : undefined,
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

      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h3 className="subtitulo">Usuários</h3>
        <div className="flex items-center gap-3 flex-wrap">
          {pesquisadorSelecionado && (
            <button type="button" className="btn btn-secondary text-xs" onClick={limparPesquisadorSelecionado}>
              <i className="fa-solid fa-xmark"></i> Limpar seleção
            </button>
          )}
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
            <th>status</th>
            <th className="crud-tabela__celula--centralizada">score</th>
            <th className="crud-tabela__celula--centralizada">Escolher</th>
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
              // Só UM pesquisador selecionado por vez (pedido do Lucas,
              // 23-08-2026: "clicar em outro a seleção troca") - usado
              // por T2 (Bancada da Campanha) pra filtrar por dono.
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
                      <span title={motivoBloqueioPesquisador()}>
                        <i className="fa-solid fa-lock"></i>
                      </span>
                    ) : selecionado ? (
                      <span className="texto-sucesso font-bold text-xs">
                        <i className="fa-solid fa-circle-check"></i> Selecionado
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="crud-tabela__acao crud-tabela__acao--escolher"
                        onClick={() => escolherPesquisador(perfil)}
                        aria-label="Escolher"
                      >
                        <i className="fa-solid fa-user-check"></i>
                        <span className="crud-tabela__acao-texto">Escolher</span>
                        <span className="crud-tabela__acao-dica" role="tooltip">Escolher</span>
                      </button>
                    )}
                  </td>
                  <td className="crud-tabela__celula--centralizada">
                    {bloqueado ? (
                      <span title={motivoBloqueioPesquisador()}>
                        <i className="fa-solid fa-lock"></i> bloqueado
                      </span>
                    ) : perfil.statusPesquisador ? (
                      <div className="crud-tabela__acoes">
                        <button
                          type="button"
                          className="crud-tabela__acao crud-tabela__acao--alterar"
                          onClick={() => iniciarEdicaoPerfil(perfil)}
                          aria-label="Alterar"
                        >
                          <i className="fa-solid fa-pen"></i>
                          <span className="crud-tabela__acao-texto">Alterar</span>
                          <span className="crud-tabela__acao-dica" role="tooltip">Alterar</span>
                        </button>
                        <button
                          type="button"
                          className="crud-tabela__acao"
                          onClick={() => setPerfilConsultado(perfil)}
                          aria-label="Consultar"
                        >
                          <i className="fa-solid fa-eye"></i>
                          <span className="crud-tabela__acao-texto">Consultar</span>
                          <span className="crud-tabela__acao-dica" role="tooltip">Consultar</span>
                        </button>
                      </div>
                    ) : (
                      <span className="texto-fraco text-xs">-</span>
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

      {/* Consultar/Alterar em MODAL, replicando a mesma aparência de
          Consultar/Alterar Usuário (SecaoFicha/CampoFicha, grid de 2
          colunas em Alterar) - pedido do Lucas, 07-09-2026: "não precisa
          reinventar a roda... exatamente igual, a diferença é que dessa
          vez é um modal". Escopo limitado ao que T1 sempre tratou (Perfil
          de Pesquisador + as 2 Moderações) - nome/senha/foto/papéis
          continuam fora daqui, como sempre foram (decisão do Lucas). Se
          ficar bom, o Lucas pretende levar este mesmo tratamento (modal em
          vez de página) pra Consultar/Alterar Usuário de verdade depois. */}
      {perfilConsultado && (
        <ModalFicha
          titulo={perfilConsultado.usuario?.nome ?? `#${perfilConsultado.idUsuario}`}
          subtitulo={perfilConsultado.usuario?.email}
          avatar={<AvatarUsuario nome={perfilConsultado.usuario?.nome} tamanho="lg" />}
          aoFechar={() => setPerfilConsultado(null)}
          rodape={
            <button type="button" onClick={() => setPerfilConsultado(null)} className="btn btn-secondary w-full">
              Fechar
            </button>
          }
        >
          <SecaoFicha titulo="Perfil de Pesquisador">
            <CampoFicha
              rotulo="CPF"
              valor={
                perfilConsultado.cpf
                  ? formatarCpfExibicao(perfilConsultado.cpf)
                  : 'Não visível (sem permissão sensível ou não é o dono)'
              }
            />
            <CampoFicha
              rotulo="Status"
              valor={
                perfilConsultado.statusPesquisador && (
                  <span className={'badge ' + classeBadgeStatusPesquisador(perfilConsultado.statusPesquisador)}>
                    {ROTULO_STATUS_PESQUISADOR[perfilConsultado.statusPesquisador]}
                  </span>
                )
              }
            />
            <CampoFicha
              rotulo="Título acadêmico"
              valor={perfilConsultado.tituloAcademico ? ROTULO_TITULO_ACADEMICO[perfilConsultado.tituloAcademico] : undefined}
            />
            <CampoFicha
              rotulo="Tipo de vínculo"
              valor={perfilConsultado.tipoVinculo ? ROTULO_TIPO_VINCULO[perfilConsultado.tipoVinculo] : undefined}
            />
            <CampoFicha rotulo="Vínculo institucional" valor={perfilConsultado.vinculoInstitucional} />
            <CampoFicha rotulo="Score atual" valor={perfilConsultado.scoreAtual} />
            <CampoFicha
              rotulo="Ativado em"
              valor={perfilConsultado.ativadoEm ? formatarDataHora(perfilConsultado.ativadoEm) : undefined}
            />
          </SecaoFicha>
        </ModalFicha>
      )}

      {idUsuarioEditandoPerfil !== null && formEdicaoPerfil && (() => {
        const perfilEmEdicao = pesquisadores.find((perfil) => perfil.idUsuario === idUsuarioEditandoPerfil) ?? null;
        // Sempre recarrega a lista ao fechar (X, backdrop ou Cancelar) - não
        // só depois de "Salvar" (achado 08-09-2026, revisão pós-rodada):
        // SecaoModeracaoPesquisador chama `perfilPesquisadorApi` direto, sem
        // avisar este componente pai - suspender/reativar por lá deixava a
        // tabela (e um Consultar aberto depois) com o status ANTIGO até
        // alguma outra ação disparar carregarPesquisadores() por acaso.
        const fecharModal = () => {
          setIdUsuarioEditandoPerfil(null);
          carregarPesquisadores();
        };
        return (
          <ModalFicha
            titulo={perfilEmEdicao?.usuario?.nome ?? `#${idUsuarioEditandoPerfil}`}
            subtitulo={perfilEmEdicao?.usuario?.email}
            avatar={<AvatarUsuario nome={perfilEmEdicao?.usuario?.nome} tamanho="lg" />}
            aoFechar={fecharModal}
            rodape={
              <div className="flex gap-3 max-w-sm ml-auto">
                <button type="button" onClick={fecharModal} className="btn btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="button" onClick={salvarEdicaoPerfil} className="btn btn-primary flex-1">
                  Salvar
                </button>
              </div>
            }
          >
            <div className="grid lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">
                <SecaoFicha titulo="Perfil de Pesquisador">
                  <div>
                    <label className="rotulo-campo">Tipo de vínculo</label>
                    <select
                      value={formEdicaoPerfil.tipoVinculo}
                      onChange={(evento) => {
                        if (ehTipoVinculo(evento.target.value)) {
                          setFormEdicaoPerfil({ ...formEdicaoPerfil, tipoVinculo: evento.target.value });
                        }
                      }}
                      className="input-padrao"
                    >
                      {TIPOS_VINCULO.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formEdicaoPerfil.tipoVinculo === 'institucional' && (
                    <div>
                      <label className="rotulo-campo">Vínculo institucional</label>
                      <input
                        type="text"
                        value={formEdicaoPerfil.vinculoInstitucional}
                        onChange={(evento) =>
                          setFormEdicaoPerfil({ ...formEdicaoPerfil, vinculoInstitucional: evento.target.value })
                        }
                        className="input-padrao"
                      />
                    </div>
                  )}
                  <div>
                    <label className="rotulo-campo">Título acadêmico</label>
                    <select
                      value={formEdicaoPerfil.tituloAcademico}
                      onChange={(evento) => {
                        if (ehTituloAcademico(evento.target.value)) {
                          setFormEdicaoPerfil({ ...formEdicaoPerfil, tituloAcademico: evento.target.value });
                        }
                      }}
                      className="input-padrao"
                    >
                      {TITULOS_ACADEMICOS.map((titulo) => (
                        <option key={titulo} value={titulo}>
                          {titulo}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* CPF em endpoint separado de propósito (RF-017, ação de
                      suporte/admin) - não faz parte do "Salvar" do rodapé. */}
                  <div className="sm:col-span-2 flex items-end gap-2 rounded-lg border borda-forte p-3">
                    <label className="text-xs flex-1 flex flex-col gap-1">
                      Corrigir CPF (suporte/admin)
                      <input
                        type="text"
                        value={formatarCpf(cpfCorrecao)}
                        onChange={(evento) => setCpfCorrecao(evento.target.value.replace(/\D/g, '').slice(0, 11))}
                        className="input-padrao"
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary shrink-0"
                      disabled={!cpfCorrecao}
                      onClick={salvarCorrecaoCpf}
                    >
                      Salvar CPF
                    </button>
                  </div>
                </SecaoFicha>

                {/* Duplicado de propósito (08-09-2026, pedido do Lucas) - o
                    mesmo card que já existe embaixo, agora também aqui
                    dentro do Alterar. Os dois convivem até o Lucas
                    perguntar pra Alexia qual lugar ela prefere. */}
                <PainelLinksAcademicos
                  auth={auth}
                  idUsuario={idUsuarioEditandoPerfil}
                  tiposLink={tiposLink}
                  tituloComoSecaoFicha
                />

                {/* Linha divisória (08-09-2026, pedido do Lucas: "insinuando
                    que são coisas separadas") - Links acadêmicos e Moderação
                    são conceitos bem diferentes, mesmo vizinhos no modal. */}
                <div className="border-t borda-padrao"></div>

                <SecaoModeracaoPesquisador auth={auth} idUsuario={idUsuarioEditandoPerfil} />
              </div>

              <div className="space-y-6">
                <SecaoFicha titulo="Metadados" colunas={1}>
                  <CampoSomenteLeitura rotulo="id" valor={idUsuarioEditandoPerfil} />
                  <CampoSomenteLeitura rotulo="E-mail" valor={perfilEmEdicao?.usuario?.email} />
                  <CampoSomenteLeitura
                    rotulo="Status atual"
                    valor={
                      perfilEmEdicao?.statusPesquisador
                        ? ROTULO_STATUS_PESQUISADOR[perfilEmEdicao.statusPesquisador]
                        : '-'
                    }
                  />
                </SecaoFicha>
              </div>
            </div>
          </ModalFicha>
        );
      })()}

      <div className="border-t borda-padrao my-8"></div>

      {!chaveFoco && (
        <p className="texto-fraco">
          Clique em <strong>Escolher</strong> numa linha da tabela acima.
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
                    onChange={(evento) => {
                      if (ehTipoVinculo(evento.target.value)) {
                        setForm({ ...form, tipoVinculo: evento.target.value });
                      }
                    }}
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
                    onChange={(evento) => {
                      if (ehTituloAcademico(evento.target.value)) {
                        setForm({ ...form, tituloAcademico: evento.target.value });
                      }
                    }}
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

            {jaTemPerfil === true && chaveFoco !== null && (
              <PainelLinksAcademicos auth={auth} idUsuario={chaveFoco} tiposLink={tiposLink} />
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
