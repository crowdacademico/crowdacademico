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
import { useChamadaRegistrada } from '../../services/campo-testes/hook/use-chamada-registrada';
import { gerarCpfValido } from '../../services/campo-testes/util/gerar-cpf-valido';
import { PESQUISADOR_BLOQUEADO, motivoBloqueioPesquisador } from '../../services/campo-testes/util/registros-bloqueados';
import { formatarCpf, formatarCpfOuMotivoOculto, formatarData, formatarDataHora, formatarNomeDimensao } from '../../services/constant/utils/formatacao.util';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TIPO_VINCULO,
  ROTULO_TITULO_ACADEMICO,
  classeBadgeStatusPesquisador,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';
import { SeletorFotoPerfil } from '../../components/input/seletor-foto-perfil';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalDetalhe } from '../../components/crud/modal-detalhe';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { SecaoModeracaoPesquisador } from '../6-perfil-pesquisador/secao-moderacao-pesquisador';
import { SecaoModeracao } from '../1-usuario/secao-moderacao';
import { BotaoVerFotoPerfil } from '../1-usuario/consultar-usuario';
import { arquivoApi } from '../../services/25-arquivo/api/arquivo.api';
import { RegistroChamadas } from './registro-chamadas';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { UsuarioResponse, UsuarioResponseLoginHistorico } from '../../services/1-usuario/type/usuario.type';
import type { PapelResponse, UsuarioPapelResponse } from '../../services/2-papel-permissao/type/papel-permissao.type';
import type { PerfilPesquisadorResponse, PerfilPesquisadorResponseScore } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';
import type { TipoVinculo, TituloAcademico } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import type { TipoLinkResponse } from '../../services/9-tipo-link/type/tipo-link.type';
import type { ResultadoPaginado } from '../../services/constant/type/paginacao.type';

// Precisa bater com o hash seedado em arquivos_banco_dados/07_seed_dados.sql
// ([07-D-1]) - mesma constante de views/1-usuario/alterar-usuario.tsx,
// duplicada de propósito aqui (12-09-2026, pedido do Lucas: unificar o
// modal de T1 com o CRUD de Usuário) - os dois modais fazem exatamente a
// mesma coisa (redefinir pra uma senha conhecida), mas vivem em módulos
// diferentes o bastante pra não valer a pena extrair um import cruzado só
// por causa de uma string.
const SENHA_DEV = 'DevTcc123!';

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
}

// Extraído (08-09-2026, pedido do Lucas) - componente próprio com estado
// próprio (não JSX cru duplicado), usado só dentro do modal de Alterar
// (Consultar nunca mostrou Links Acadêmicos, só Perfil de Pesquisador +
// Score).
// SIMPLIFICADO (12-09-2026, consequência direta de remover a coluna
// "Escolher"): existia uma 2ª cópia solta embaixo da tabela, ligada ao
// pesquisador ESCOLHIDO (`chaveFoco`) - o Lucas ia perguntar pra Alexia
// qual dos dois lugares ela preferia. Com "Escolher" removido, só sobrou
// o uso dentro do modal - a prop `tituloComoSecaoFicha` (que alternava
// entre os dois estilos de título) virou sempre-verdadeira, então saiu
// junto com o branch morto.
function PainelLinksAcademicos({ auth, idUsuario, tiposLink }: PainelLinksAcademicosProps) {
  const chamarERegistrar = useChamadaRegistrada(auth);
  const { mostrar } = useToast();
  const { reportarErro } = useErroToast();

  // CORRIGIDO (12-09-2026, achado de agente numa auditoria de hardcode):
  // `5` era fixo aqui, mesmo já existindo `configuracoes.
  // limite_links_academicos_perfil` (pública, é o valor que
  // trg_link_academico_valida_limite lê de verdade) - se o Admin mudasse
  // esse número pelo painel, esta tela continuava travada em 5. Mesmo
  // padrão de `seletor-foto-perfil.tsx`.
  const { obterConfiguracao } = useConfiguracoes();
  const valorLimiteLinks = obterConfiguracao('limite_links_academicos_perfil', 5);
  const limiteLinks = typeof valorLimiteLinks === 'number' ? valorLimiteLinks : 5;

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
      {/* `.titulo-bloco` (08-09-2026) - token novo em 2-tipografia.css, o mesmo
          rótulo pequeno/maiúsculo que SecaoFicha/Minha Conta já usavam
          soltos (achado do Lucas: "não podemos ter algo perdido flutuando
          por aí"). Define a tipografia certa sozinho (font-family sans,
          não depende mais de estar numa tag h1/h2/h3 específica pra
          escapar da regra global de heading serifado). */}
      <h3 className="titulo-bloco mb-3 pb-2 border-b borda-padrao">
        Links acadêmicos ({links.length} de {limiteLinks})
      </h3>
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
            {links.length < limiteLinks && (
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

      {links.length < limiteLinks && (
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

interface PainelScoreProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
}

// Extraído (08-09-2026, pedido do Lucas) - componente próprio com fetch
// próprio (não JSX cru duplicado), reaproveitado tanto no modal de
// Consultar quanto no de Alterar.
// SIMPLIFICADO (12-09-2026, mesma consequência de PainelLinksAcademicos,
// acima) - a cópia solta embaixo da tabela (ligada a `chaveFoco`) saiu
// junto com a coluna "Escolher"; só sobrou o uso dentro dos modais, então
// `tituloComoSecaoFicha` virou sempre-verdadeiro e saiu do componente.
function PainelScore({ auth, idUsuario }: PainelScoreProps) {
  const chamarERegistrar = useChamadaRegistrada(auth);
  const [score, setScore] = useState<PerfilPesquisadorResponseScore | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScore(null);
    chamarERegistrar<PerfilPesquisadorResponseScore>(`/perfil-pesquisador/${idUsuario}/score`)
      .then(setScore)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUsuario]);

  return (
    <>
      <h3 className="titulo-bloco mb-3 pb-2 border-b borda-padrao">Score</h3>
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
                  <td>{formatarNomeDimensao(dimensao.nomeDimensao)}</td>
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
// login-múltiplo). Toda escrita usa a sessão REAL do painel (`auth`).
// "Promover Usuário → Pesquisador" e as ações de link acadêmico (07/08-
// 09-2026: ambos ganharam endpoint "para outro", mesmo padrão de CPF/
// suspensão) funcionam de verdade pra QUALQUER pesquisador, não só a
// própria conta do Admin.
//
// SEM "Escolher" (12-09-2026, pedido do Lucas: "abandonar completamente
// esta coluna... podemos tirar ela e tudo relacionado a ela") - o
// mecanismo de selecionar-um-registro-e-ver-um-painel-embaixo saiu de
// vez (junto com `pesquisadorSelecionado`/CampoTestesProvider, que só
// existia pra alimentar isso e o pré-filtro de T2, também removido).
// Toda ação (inclusive "Criar Perfil Pesquisador", que antes só existia
// nesse painel de baixo) agora mora dentro do modal de Alterar, aberto
// por linha - mesmo espírito de "não precisa reinventar a roda" já usado
// pro resto deste modal, um degrau adiante: o modal também UNIFICA T1 com
// o CRUD de Usuário de verdade (nome/senha/foto/papéis/moderação de
// conta, antes só em views/1-usuario/alterar-usuario.tsx), virando um
// único lugar que edita a pessoa inteira - conta E perfil de pesquisador.
export function BancadaPesquisador({ auth }: PropsPagina) {
  const chamarERegistrar = useChamadaRegistrada(auth);
  const { mostrar } = useToast();
  const { erro: erroModal, reportarErro: reportarErroModal, limparErro: limparErroModal } = useErroToast();

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

  // Criar Perfil Pesquisador (12-09-2026: ERA um painel solto embaixo da
  // tabela, ligado a `chaveFoco`/"Escolher" - agora vive DENTRO do modal
  // de Alterar, condicionado a `formEdicaoPerfil === null` logo abaixo,
  // pra quem ainda não é pesquisador).
  const [form, setForm] = useState<FormCriarPerfil>({
    cpf: '',
    tipoVinculo: 'institucional',
    vinculoInstitucional: '',
    tituloAcademico: 'mestre',
  });
  const [criando, setCriando] = useState(false);
  const [erroCriar, setErroCriar] = useState<string | null>(null);

  // Consultar - mesmos dados de conta que a listagem principal não carrega
  // (avatar/papéis/histórico de login), buscados só ao abrir o modal
  // (mesmo padrão "colapsado até clicar" de consultar-usuario.tsx).
  const [perfilConsultado, setPerfilConsultado] = useState<PesquisadorLinha | null>(null);
  const [avatarConsultado, setAvatarConsultado] = useState<string | null>(null);
  const [papeisConsultado, setPapeisConsultado] = useState<UsuarioPapelResponse[] | null>(null);
  const [loginsConsultado, setLoginsConsultado] = useState<UsuarioResponseLoginHistorico[] | null>(null);
  const [carregandoLoginsConsultado, setCarregandoLoginsConsultado] = useState(false);
  const [loginsAbertosConsultado, setLoginsAbertosConsultado] = useState(false);

  // Excluir (13-09-2026, pedido do Lucas: "faltava o ícone de excluir")
  // - mesma exclusão LÓGICA e confirmação por e-mail de excluir-usuario.tsx
  // (CRUD real), agora em modal, completando o trio Alterar/Consultar/
  // Excluir que faltava aqui desde a unificação do modal.
  const [usuarioExcluindo, setUsuarioExcluindo] = useState<PesquisadorLinha | null>(null);
  const [confirmacaoExclusaoUsuario, setConfirmacaoExclusaoUsuario] = useState('');
  const [excluindoUsuario, setExcluindoUsuario] = useState(false);

  // Alterar - conta inteira (12-09-2026, pedido do Lucas: unificar este
  // modal com o CRUD de Usuário) - `idUsuarioEditandoPerfil` continua com
  // este nome (histórico, era só o perfil), mas agora identifica a PESSOA
  // em edição no modal, não só o perfil de pesquisador dela.
  const [idUsuarioEditandoPerfil, setIdUsuarioEditandoPerfil] = useState<number | null>(null);
  // `null` = a pessoa ainda não é pesquisador (mostra o formulário "Criar
  // Perfil Pesquisador" no lugar das seções de perfil/links/moderação).
  const [formEdicaoPerfil, setFormEdicaoPerfil] = useState<{
    tipoVinculo: TipoVinculo;
    vinculoInstitucional: string;
    tituloAcademico: TituloAcademico;
  } | null>(null);
  const [cpfCorrecao, setCpfCorrecao] = useState('');
  // Dados da conta (nome/senha/foto) - mesmo trio de estados de
  // alterar-usuario.tsx (3 estados no avatar de propósito: `undefined` =
  // nenhuma escolha nova, número = foto nova, `null` = removida).
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [novaSenhaEdicao, setNovaSenhaEdicao] = useState('');
  const [avatarUrlEdicao, setAvatarUrlEdicao] = useState<string | null>(null);
  const [idImagemPerfilNovoEdicao, setIdImagemPerfilNovoEdicao] = useState<number | null | undefined>(undefined);
  const [avatarUrlNovoEdicao, setAvatarUrlNovoEdicao] = useState<string | null>(null);
  const [desbloqueando, setDesbloqueando] = useState(false);
  const [redefinindoSenhaDev, setRedefinindoSenhaDev] = useState(false);
  // Papéis (mesmo padrão de alterar-usuario.tsx) - catálogo carrega uma
  // vez só (ver useEffect abaixo), os atuais recarregam a cada abertura.
  const [catalogoPapeis, setCatalogoPapeis] = useState<PapelResponse[]>([]);
  const [papeisAtuaisEdicao, setPapeisAtuaisEdicao] = useState<UsuarioPapelResponse[]>([]);
  const [idPapelParaAtribuir, setIdPapelParaAtribuir] = useState('');
  const [atribuindoPapel, setAtribuindoPapel] = useState(false);
  const [papelSuspendendoId, setPapelSuspendendoId] = useState<number | null>(null);
  const [enviandoSuspensaoPapel, setEnviandoSuspensaoPapel] = useState<number | null>(null);
  const [reativandoPapel, setReativandoPapel] = useState<number | null>(null);
  const [revogandoPapel, setRevogandoPapel] = useState<number | null>(null);

  const [tiposLink, setTiposLink] = useState<TipoLinkResponse[]>([]);

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

  // A comparação "CPF visto pelo dono x visto por outro" (RF-016) não tem
  // mais painel dedicado (23-08-2026, pedido do Lucas): as chamadas GET já
  // aparecem naturalmente no Registro de Chamadas, sem precisar duplicar a
  // UI. Links acadêmicos e Score saíram daqui (08-09-2026) - viraram
  // responsabilidade própria de <PainelLinksAcademicos>/<PainelScore>, que
  // carregam pelo idUsuario que recebem (idUsuarioEditandoPerfil dentro do
  // modal, perfilConsultado.idUsuario no Consultar).

  // Catálogo de tipo de link, uma vez só, ao montar - não depende mais de
  // ninguém selecionado (era "qualquer ator vivo", só pra ter alguém pra
  // registrar a chamada em T4; sem Elenco, a sessão real já basta).
  useEffect(() => {
    if (tiposLink.length > 0) return;
    chamarERegistrar<ResultadoPaginado<TipoLinkResponse>>('/tipo-link?escopo=perfil&tamanho=100')
      .then((resultado) => setTiposLink(resultado.dados))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Catálogo de papéis, uma vez só ao montar (12-09-2026, mesmo padrão de
  // tiposLink acima) - alimenta o seletor "Atribuir papel" dentro do modal
  // de Alterar (seção "Papéis", trazida de alterar-usuario.tsx).
  useEffect(() => {
    chamarERegistrar<PapelResponse[]>('/papel')
      .then(setCatalogoPapeis)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Só os papéis que este usuário AINDA não tem (mesmo filtro de
  // alterar-usuario.tsx).
  const papeisDisponiveis = catalogoPapeis.filter(
    (papel) => !papeisAtuaisEdicao.some((atual) => atual.idPapel === papel.idPapel),
  );

  // CORRIGIDO (07-09-2026): chamava POST /perfil-pesquisador (self-service,
  // sempre cria em nome de quem está logado) - promover outro usuário,
  // logado como Admin, sempre colidia com o PRÓPRIO perfil do Admin ("já
  // existe um registro"), nunca criava nada de verdade pro usuário
  // escolhido. Agora usa POST /perfil-pesquisador/:id (endpoint de
  // suporte/admin, ver perfil-pesquisador.service.create-para-outro.ts).
  //
  // CORRIGIDO (12-09-2026): usava `chaveFoco` (o antigo "Escolher"),
  // agora usa `idUsuarioEditandoPerfil` - o formulário vive dentro do
  // modal de Alterar (ver JSX abaixo), não mais num painel solto embaixo
  // da tabela. Ao criar com sucesso, `formEdicaoPerfil` passa a não-nulo
  // na hora (sem esperar carregarPesquisadores() recarregar a lista
  // inteira): o modal troca sozinho do formulário de criação pras seções
  // de Perfil de Pesquisador/Links/Moderação, sem precisar fechar e abrir
  // de novo.
  const criarPerfil = async () => {
    if (idUsuarioEditandoPerfil === null) return;
    setCriando(true);
    setErroCriar(null);
    try {
      const perfilCriado = await chamarERegistrar<PerfilPesquisadorResponse>(`/perfil-pesquisador/${idUsuarioEditandoPerfil}`, {
        method: 'POST',
        body: JSON.stringify({
          cpf: form.cpf,
          tipoVinculo: form.tipoVinculo,
          ...(form.tipoVinculo === 'institucional' ? { vinculoInstitucional: form.vinculoInstitucional } : {}),
          tituloAcademico: form.tituloAcademico,
        }),
      });
      setFormEdicaoPerfil({
        tipoVinculo: perfilCriado.tipoVinculo,
        vinculoInstitucional: perfilCriado.vinculoInstitucional ?? '',
        tituloAcademico: perfilCriado.tituloAcademico,
      });
      mostrar('Perfil de Pesquisador criado com sucesso.', `ID: ${idUsuarioEditandoPerfil} agora é pesquisador`);
      carregarPesquisadores();
    } catch (erro) {
      setErroCriar(erro instanceof Error ? erro.message : 'Falha ao criar perfil.');
    } finally {
      setCriando(false);
    }
  };

  // Abre o modal de Alterar já carregando TUDO (12-09-2026: antes só
  // carregava vínculo/título/CPF do perfil - agora também busca avatar e
  // papéis atuais, mesmo padrão de alterar-usuario.tsx). `perfil.
  // statusPesquisador` decide se mostra as seções de pesquisador ou o
  // formulário de criação (`formEdicaoPerfil` vira `null` nesse caso).
  const iniciarEdicaoPerfil = (perfil: PesquisadorLinha) => {
    setIdUsuarioEditandoPerfil(perfil.idUsuario);
    setFormEdicaoPerfil(
      perfil.statusPesquisador
        ? {
            tipoVinculo: perfil.tipoVinculo ?? 'institucional',
            vinculoInstitucional: perfil.vinculoInstitucional ?? '',
            tituloAcademico: perfil.tituloAcademico ?? 'mestre',
          }
        : null,
    );
    setCpfCorrecao('');
    setForm({ cpf: '', tipoVinculo: 'institucional', vinculoInstitucional: '', tituloAcademico: 'mestre' });
    setErroCriar(null);
    limparErroModal();

    setNomeEdicao(perfil.usuario.nome);
    setNovaSenhaEdicao('');
    setAvatarUrlEdicao(null);
    setIdImagemPerfilNovoEdicao(undefined);
    setAvatarUrlNovoEdicao(null);
    setPapeisAtuaisEdicao([]);

    arquivoApi
      .buscarAvatarPorUsuario(perfil.idUsuario)
      .then((avatar) => setAvatarUrlEdicao(avatar.url))
      .catch(() => {});
    chamarERegistrar<UsuarioPapelResponse[]>(`/usuario-papel/${perfil.idUsuario}`)
      .then(setPapeisAtuaisEdicao)
      .catch(() => {});
  };

  // Salva a conta inteira (12-09-2026: ERA só PATCH /perfil-pesquisador -
  // agora também PATCH /usuario, trazido de alterar-usuario.tsx). O PATCH
  // de perfil só roda se a pessoa já É pesquisadora (`formEdicaoPerfil`
  // não-nulo) - quem ainda não é usa o formulário "Criar Perfil" (função
  // `criarPerfil`, botão próprio, não faz parte deste "Salvar").
  const salvarEdicaoPerfil = async () => {
    if (idUsuarioEditandoPerfil === null) return;
    limparErroModal();
    try {
      await chamarERegistrar<UsuarioResponse>(`/usuario/${idUsuarioEditandoPerfil}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nome: nomeEdicao,
          ...(novaSenhaEdicao ? { novaSenha: novaSenhaEdicao } : {}),
          ...(idImagemPerfilNovoEdicao !== undefined ? { idImagemPerfil: idImagemPerfilNovoEdicao } : {}),
        }),
      });
      if (formEdicaoPerfil) {
        await chamarERegistrar<void>(`/perfil-pesquisador/${idUsuarioEditandoPerfil}`, {
          method: 'PATCH',
          body: JSON.stringify({
            tipoVinculo: formEdicaoPerfil.tipoVinculo,
            ...(formEdicaoPerfil.tipoVinculo === 'institucional'
              ? { vinculoInstitucional: formEdicaoPerfil.vinculoInstitucional }
              : {}),
            tituloAcademico: formEdicaoPerfil.tituloAcademico,
          }),
        });
      }
      mostrar('Usuário alterado com sucesso.', `ID: ${idUsuarioEditandoPerfil} foi alterado`);
      setIdUsuarioEditandoPerfil(null);
      carregarPesquisadores();
    } catch (erro) {
      reportarErroModal(erro);
    }
  };

  const aoAtribuirPapel = async () => {
    if (!idPapelParaAtribuir || idUsuarioEditandoPerfil === null) return;
    limparErroModal();
    setAtribuindoPapel(true);
    try {
      const papelEscolhido = catalogoPapeis.find((papel) => papel.idPapel === Number(idPapelParaAtribuir));
      await chamarERegistrar<void>('/usuario-papel', {
        method: 'POST',
        body: JSON.stringify({ idUsuario: idUsuarioEditandoPerfil, idPapel: Number(idPapelParaAtribuir) }),
      });
      const papeisAtualizados = await chamarERegistrar<UsuarioPapelResponse[]>(`/usuario-papel/${idUsuarioEditandoPerfil}`);
      setPapeisAtuaisEdicao(papeisAtualizados);
      setIdPapelParaAtribuir('');
      mostrar('Papel atribuído com sucesso.', `ID: ${idUsuarioEditandoPerfil} agora tem o papel "${papelEscolhido?.nome}"`);
      carregarPesquisadores();
    } catch (erro) {
      reportarErroModal(erro);
    } finally {
      setAtribuindoPapel(false);
    }
  };

  const aoSuspenderPapel = async (papel: UsuarioPapelResponse, dias: number) => {
    if (idUsuarioEditandoPerfil === null) return;
    limparErroModal();
    setEnviandoSuspensaoPapel(papel.idPapel);
    try {
      // eslint-disable-next-line react-hooks/purity
      const ate = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
      await chamarERegistrar<void>(`/usuario-papel/${idUsuarioEditandoPerfil}/${papel.idPapel}/suspender`, {
        method: 'POST',
        body: JSON.stringify({ ate }),
      });
      const papeisAtualizados = await chamarERegistrar<UsuarioPapelResponse[]>(`/usuario-papel/${idUsuarioEditandoPerfil}`);
      setPapeisAtuaisEdicao(papeisAtualizados);
      setPapelSuspendendoId(null);
      mostrar('Papel suspenso com sucesso.', `"${papel.nomePapel}" suspenso até ${formatarData(ate)}`);
    } catch (erro) {
      reportarErroModal(erro);
    } finally {
      setEnviandoSuspensaoPapel(null);
    }
  };

  const aoReativarPapel = async (papel: UsuarioPapelResponse) => {
    if (idUsuarioEditandoPerfil === null) return;
    limparErroModal();
    setReativandoPapel(papel.idPapel);
    try {
      await chamarERegistrar<void>(`/usuario-papel/${idUsuarioEditandoPerfil}/${papel.idPapel}/revogar-suspensao`, {
        method: 'POST',
      });
      const papeisAtualizados = await chamarERegistrar<UsuarioPapelResponse[]>(`/usuario-papel/${idUsuarioEditandoPerfil}`);
      setPapeisAtuaisEdicao(papeisAtualizados);
      mostrar('Papel reativado com sucesso.', `"${papel.nomePapel}" voltou a valer normalmente`);
    } catch (erro) {
      reportarErroModal(erro);
    } finally {
      setReativandoPapel(null);
    }
  };

  const aoRevogarPapel = async (papel: UsuarioPapelResponse) => {
    if (idUsuarioEditandoPerfil === null) return;
    limparErroModal();
    setRevogandoPapel(papel.idPapel);
    try {
      await chamarERegistrar<void>(`/usuario-papel/${idUsuarioEditandoPerfil}/${papel.idPapel}`, { method: 'DELETE' });
      const papeisAtualizados = await chamarERegistrar<UsuarioPapelResponse[]>(`/usuario-papel/${idUsuarioEditandoPerfil}`);
      setPapeisAtuaisEdicao(papeisAtualizados);
      mostrar('Papel revogado com sucesso.', `ID: ${idUsuarioEditandoPerfil} perdeu o papel "${papel.nomePapel}"`);
      carregarPesquisadores();
    } catch (erro) {
      reportarErroModal(erro);
    } finally {
      setRevogandoPapel(null);
    }
  };

  // liberar_bloqueio_login() - mesmo botão/endpoint de alterar-usuario.tsx,
  // trazido pra dentro deste modal (12-09-2026).
  const aoDesbloquear = async () => {
    if (idUsuarioEditandoPerfil === null) return;
    limparErroModal();
    setDesbloqueando(true);
    try {
      await chamarERegistrar<void>(`/usuario/${idUsuarioEditandoPerfil}/desbloquear`, { method: 'POST' });
      mostrar('Login desbloqueado com sucesso.', `ID: ${idUsuarioEditandoPerfil} pode tentar logar novamente`);
    } catch (erro) {
      reportarErroModal(erro);
    } finally {
      setDesbloqueando(false);
    }
  };

  const aoRedefinirSenhaDev = async () => {
    if (idUsuarioEditandoPerfil === null) return;
    limparErroModal();
    setRedefinindoSenhaDev(true);
    try {
      await chamarERegistrar<void>(`/usuario/${idUsuarioEditandoPerfil}`, {
        method: 'PATCH',
        body: JSON.stringify({ novaSenha: SENHA_DEV }),
      });
      mostrar('Senha redefinida com sucesso.', `ID: ${idUsuarioEditandoPerfil} teve a senha redefinida para "${SENHA_DEV}"`);
    } catch (erro) {
      reportarErroModal(erro);
    } finally {
      setRedefinindoSenhaDev(false);
    }
  };

  // Consultar - mesmo botão de olho / setinha de logins de
  // consultar-usuario.tsx, trazidos pra dentro deste modal (12-09-2026).
  const abrirConsulta = (perfil: PesquisadorLinha) => {
    setPerfilConsultado(perfil);
    setAvatarConsultado(null);
    setPapeisConsultado(null);
    setLoginsConsultado(null);
    setLoginsAbertosConsultado(false);
    arquivoApi
      .buscarAvatarPorUsuario(perfil.idUsuario)
      .then((avatar) => setAvatarConsultado(avatar.url))
      .catch(() => {});
    chamarERegistrar<UsuarioPapelResponse[]>(`/usuario-papel/${perfil.idUsuario}`)
      .then(setPapeisConsultado)
      .catch(() => setPapeisConsultado([]));
  };

  const aoAlternarLoginsConsultado = async () => {
    if (loginsAbertosConsultado) {
      setLoginsAbertosConsultado(false);
      return;
    }
    setLoginsAbertosConsultado(true);
    if (loginsConsultado !== null || !perfilConsultado) return;
    setCarregandoLoginsConsultado(true);
    try {
      const resultado = await chamarERegistrar<UsuarioResponseLoginHistorico[]>(`/usuario/${perfilConsultado.idUsuario}/logins`);
      setLoginsConsultado(resultado);
    } catch {
      // Leitura auxiliar (mesmo padrão do resto do arquivo) - falha aqui
      // não deve travar o resto do modal de Consultar.
    } finally {
      setCarregandoLoginsConsultado(false);
    }
  };

  const abrirExclusao = (perfil: PesquisadorLinha) => {
    setUsuarioExcluindo(perfil);
    setConfirmacaoExclusaoUsuario('');
    limparErroModal();
  };

  // excluir_conta_usuario() - mesma exclusão lógica de excluir-usuario.tsx
  // (usuario.deletado = TRUE, login para de funcionar, registro continua
  // pra auditoria/LGPD), confirmada digitando o e-mail.
  const excluirUsuario = async () => {
    if (!usuarioExcluindo) return;
    limparErroModal();
    setExcluindoUsuario(true);
    try {
      await chamarERegistrar<void>(`/usuario/${usuarioExcluindo.idUsuario}`, { method: 'DELETE' });
      mostrar('Usuário excluído com sucesso.', `ID: ${usuarioExcluindo.idUsuario} foi excluído`);
      setUsuarioExcluindo(null);
      setConfirmacaoExclusaoUsuario('');
      carregarPesquisadores();
    } catch (erro) {
      reportarErroModal(erro);
    } finally {
      setExcluindoUsuario(false);
    }
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
            <th className="crud-tabela__celula--centralizada">status</th>
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
          {!carregandoLista && erroListagem && (
            <tr>
              <td colSpan={7} className="texto-erro font-bold">{erroListagem}</td>
            </tr>
          )}
          {!carregandoLista && !erroListagem && pesquisadoresPagina.length === 0 && (
            <tr>
              <td colSpan={7} className="texto-fraco">{filtroTexto ? 'Nenhum registro bate com o filtro.' : 'Nenhum registro.'}</td>
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
                  {/* CORRIGIDO (12-09-2026, pedido do Lucas: "abandonar
                      completamente esta coluna Escolher") - Alterar/
                      Consultar deixaram de depender de `statusPesquisador`:
                      TODO usuário (não só quem já é pesquisador) pode ser
                      alterado/consultado por aqui agora - o modal de
                      Alterar é quem decide, por dentro, se mostra as
                      seções de pesquisador ou o formulário "Criar Perfil
                      Pesquisador" (ver iniciarEdicaoPerfil). */}
                  <td className="crud-tabela__celula--centralizada">
                    {bloqueado ? (
                      <span title={motivoBloqueioPesquisador()}>
                        <i className="fa-solid fa-lock"></i> bloqueado
                      </span>
                    ) : (
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
                          onClick={() => abrirConsulta(perfil)}
                          aria-label="Consultar"
                        >
                          <i className="fa-solid fa-eye"></i>
                          <span className="crud-tabela__acao-texto">Consultar</span>
                          <span className="crud-tabela__acao-dica" role="tooltip">Consultar</span>
                        </button>
                        <button
                          type="button"
                          className="crud-tabela__acao crud-tabela__acao--excluir"
                          onClick={() => abrirExclusao(perfil)}
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
      {perfilConsultado && (() => {
        const loginsAnterioresConsultado = loginsConsultado?.slice(1) ?? [];
        return (
          <ModalFicha
            titulo={perfilConsultado.usuario.nome}
            subtitulo={perfilConsultado.usuario.email}
            avatar={
              <div className="relative shrink-0">
                <AvatarUsuario nome={perfilConsultado.usuario.nome} foto={avatarConsultado} tamanho="lg" />
                {avatarConsultado && (
                  <div className="absolute bottom-0 right-0">
                    <BotaoVerFotoPerfil url={avatarConsultado} badge />
                  </div>
                )}
              </div>
            }
            aoFechar={() => setPerfilConsultado(null)}
            rodape={
              <button type="button" onClick={() => setPerfilConsultado(null)} className="btn btn-secondary w-full">
                Fechar
              </button>
            }
          >
            {/* Dados da conta/Acesso/Papéis (12-09-2026, pedido do Lucas:
                trazer o CRUD de Usuário pra dentro deste modal) - mesmo
                conteúdo de consultar-usuario.tsx, só que buscado sob
                demanda ao abrir (ver abrirConsulta), não no carregamento
                da tabela inteira. */}
            <div className="grid lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">
                <SecaoFicha titulo="Dados da conta">
                  <CampoFicha rotulo="id" valor={perfilConsultado.usuario.idUsuario} />
                  <CampoFicha
                    rotulo="Foto de perfil"
                    valor={
                      avatarConsultado ? (
                        <span className="inline-flex items-center gap-2">
                          <BotaoVerFotoPerfil url={avatarConsultado} />
                          Foto cadastrada
                        </span>
                      ) : (
                        'Sem foto (usa iniciais)'
                      )
                    }
                  />
                  <CampoFicha rotulo="Criado em" valor={formatarData(perfilConsultado.usuario.criadoEm)} />
                  <CampoFicha rotulo="E-mail verificado" valor={perfilConsultado.usuario.emailVerificado ? 'Sim' : 'Não'} />
                </SecaoFicha>

                <SecaoFicha titulo="Acesso">
                  <CampoFicha
                    rotulo="Último login em"
                    largura="cheia"
                    valor={perfilConsultado.usuario.ultimoLoginEm ? formatarDataHora(perfilConsultado.usuario.ultimoLoginEm) : 'Nunca'}
                    acao={
                      perfilConsultado.usuario.ultimoLoginEm && (
                        <button
                          type="button"
                          onClick={aoAlternarLoginsConsultado}
                          aria-label="Ver logins anteriores"
                          title="Ver logins anteriores"
                          className="texto-fraco hover-texto-forte transition-colors shrink-0"
                        >
                          <i className={'fa-solid fa-chevron-down transition-transform' + (loginsAbertosConsultado ? ' rotate-180' : '')}></i>
                        </button>
                      )
                    }
                  >
                    {loginsAbertosConsultado && (
                      <div className="mt-2 rounded-lg border borda-padrao fundo-sutil p-3 text-sm max-h-64 overflow-y-auto">
                        {carregandoLoginsConsultado ? (
                          <p className="texto-fraco">Carregando...</p>
                        ) : loginsAnterioresConsultado.length === 0 ? (
                          <p className="texto-fraco">Nenhum login anterior registrado.</p>
                        ) : (
                          <ul className="space-y-1">
                            {loginsAnterioresConsultado.map((login, indice) => (
                              <li key={indice} className="texto-padrao">
                                {formatarDataHora(login.logadoEm)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </CampoFicha>
                </SecaoFicha>

                {perfilConsultado.statusPesquisador && (
                  <SecaoFicha titulo="Perfil de Pesquisador">
                    <CampoFicha rotulo="CPF" valor={formatarCpfOuMotivoOculto(perfilConsultado.cpf)} />
                    <CampoFicha
                      rotulo="Status"
                      valor={
                        <span className={'badge ' + classeBadgeStatusPesquisador(perfilConsultado.statusPesquisador)}>
                          {ROTULO_STATUS_PESQUISADOR[perfilConsultado.statusPesquisador]}
                        </span>
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
                )}
              </div>

              <div className="space-y-6">
                <SecaoFicha titulo="Papéis">
                  <CampoFicha
                    rotulo="Papéis atribuídos"
                    largura="cheia"
                    valor={
                      papeisConsultado === null
                        ? undefined
                        : papeisConsultado.length === 0
                          ? null
                          : papeisConsultado.map((papel) => papel.nomePapel).join(', ')
                    }
                  />
                </SecaoFicha>
              </div>
            </div>

            {/* Score "duplicado" pra dentro do Consultar (08-09-2026, pedido do
                Lucas) - mesmo card de baixo, agora também aqui, pra comparar
                os dois lugares antes de decidir (o card solto embaixo do Campo
                de Testes vai sumir em breve, ficando só dentro dos modais). */}
            {perfilConsultado.statusPesquisador && (
              <>
                <div className="border-t borda-padrao"></div>
                <PainelScore auth={auth} idUsuario={perfilConsultado.idUsuario} />
              </>
            )}
          </ModalFicha>
        );
      })()}

      {idUsuarioEditandoPerfil !== null && (() => {
        const perfilEmEdicao = pesquisadores.find((perfil) => perfil.idUsuario === idUsuarioEditandoPerfil) ?? null;
        // Sempre recarrega a lista ao fechar (X, backdrop ou Cancelar) - não
        // só depois de "Salvar" (achado 08-09-2026, revisão pós-rodada):
        // SecaoModeracaoPesquisador/SecaoModeracao chamam suas APIs direto,
        // sem avisar este componente pai - suspender/reativar por lá deixava
        // a tabela (e um Consultar aberto depois) com o status ANTIGO até
        // alguma outra ação disparar carregarPesquisadores() por acaso.
        const fecharModal = () => {
          setIdUsuarioEditandoPerfil(null);
          carregarPesquisadores();
        };
        return (
          <ModalFicha
            titulo={perfilEmEdicao?.usuario.nome ?? `#${idUsuarioEditandoPerfil}`}
            subtitulo={perfilEmEdicao?.usuario.email}
            avatar={
              <SeletorFotoPerfil
                authFetch={auth.authFetch}
                nome={perfilEmEdicao?.usuario.nome}
                url={idImagemPerfilNovoEdicao === undefined ? avatarUrlEdicao : avatarUrlNovoEdicao}
                tamanho="lg"
                aoAlterar={(idArquivo, novaUrl) => {
                  setIdImagemPerfilNovoEdicao(idArquivo);
                  setAvatarUrlNovoEdicao(novaUrl);
                }}
              />
            }
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
            {erroModal && <p className="texto-erro text-sm font-bold text-center">{erroModal}</p>}

            <div className="grid lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">
                {/* Dados da conta/Acesso (12-09-2026, pedido do Lucas: trazer
                    o CRUD de Usuário pra dentro deste modal) - mesmo
                    conteúdo de alterar-usuario.tsx (nome/senha/desbloquear),
                    agora batizando o "Salvar" único do rodapé junto com o
                    Perfil de Pesquisador logo abaixo. */}
                <SecaoFicha titulo="Dados da conta">
                  <div className="sm:col-span-2">
                    <label className="rotulo-campo">Nome</label>
                    <input
                      type="text"
                      value={nomeEdicao}
                      onChange={(evento) => setNomeEdicao(evento.target.value)}
                      className="input-padrao"
                    />
                  </div>
                </SecaoFicha>

                <SecaoFicha titulo="Acesso">
                  <div className="sm:col-span-2">
                    <label className="rotulo-campo">Nova senha (opcional)</label>
                    <input
                      type="password"
                      value={novaSenhaEdicao}
                      onChange={(evento) => setNovaSenhaEdicao(evento.target.value)}
                      className="input-padrao"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-lg border borda-forte p-3">
                    <p className="text-xs texto-fraco">
                      Zera o contador de tentativas de login falhas e libera a conta, caso esteja
                      bloqueada temporariamente.
                    </p>
                    <button
                      type="button"
                      onClick={aoDesbloquear}
                      disabled={desbloqueando}
                      className="btn btn-secondary shrink-0"
                    >
                      {desbloqueando ? 'Desbloqueando...' : 'Desbloquear login'}
                    </button>
                  </div>
                </SecaoFicha>

                {formEdicaoPerfil ? (
                  <>
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

                      {/* CORRIGIDO (13-09-2026, achado ao conferir a
                          completude do modal, pedido do Lucas) - "Score
                          atual" existia como campo simples na página real
                          (alterar-usuario.tsx, só-leitura) e sumiu quando
                          este bloco virou editável aqui; sem ele, só dava
                          pra ver o score fechando este modal e abrindo o
                          Consultar. O detalhe completo (tabela de
                          dimensões) continua só no Consultar via
                          <PainelScore>, de propósito - aqui é só o número,
                          igual a página real sempre mostrou. */}
                      <CampoFicha rotulo="Score atual" valor={perfilEmEdicao?.scoreAtual} />

                      {/* CPF em endpoint separado de propósito (RF-017, ação
                          de suporte/admin) - não faz parte do "Salvar" do
                          rodapé. CORRIGIDO (13-09-2026, mesmo achado acima)
                          - "CPF atual" não aparecia em lugar nenhum aqui, só
                          o campo em branco de correção; sem ele não dava pra
                          saber o que estava cadastrado antes de decidir
                          corrigir. */}
                      <CampoFicha rotulo="CPF atual" valor={formatarCpfOuMotivoOculto(perfilEmEdicao?.cpf)} largura="cheia" />
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

                    <PainelLinksAcademicos auth={auth} idUsuario={idUsuarioEditandoPerfil} tiposLink={tiposLink} />

                    {/* Linha divisória (08-09-2026, pedido do Lucas:
                        "insinuando que são coisas separadas") - Links
                        acadêmicos e Moderação são conceitos bem diferentes,
                        mesmo vizinhos no modal. */}
                    <div className="border-t borda-padrao"></div>

                    <SecaoModeracaoPesquisador auth={auth} idUsuario={idUsuarioEditandoPerfil} />
                  </>
                ) : (
                  // Criar Perfil Pesquisador (12-09-2026: ERA o painel solto
                  // embaixo da tabela, ligado ao antigo "Escolher" - agora
                  // mora aqui, condicionado a esta pessoa ainda não ser
                  // pesquisadora). Ao criar com sucesso, `criarPerfil` já
                  // troca `formEdicaoPerfil` pra não-nulo sozinho, sem
                  // precisar fechar/reabrir o modal.
                  <SecaoFicha titulo="Criar Perfil Pesquisador">
                    <div>
                      <label className="rotulo-campo">CPF</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formatarCpf(form.cpf)}
                          onChange={(evento) => setForm({ ...form, cpf: evento.target.value.replace(/\D/g, '').slice(0, 11) })}
                          className="input-padrao"
                        />
                        <button
                          type="button"
                          className="btn btn-secondary text-xs whitespace-nowrap"
                          onClick={() => setForm({ ...form, cpf: gerarCpfValido() })}
                        >
                          Gerar CPF válido
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="rotulo-campo">Tipo de vínculo</label>
                      <select
                        value={form.tipoVinculo}
                        onChange={(evento) => {
                          if (ehTipoVinculo(evento.target.value)) {
                            setForm({ ...form, tipoVinculo: evento.target.value });
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

                    {form.tipoVinculo === 'institucional' && (
                      <div>
                        <label className="rotulo-campo">Instituição</label>
                        <input
                          type="text"
                          value={form.vinculoInstitucional}
                          onChange={(evento) => setForm({ ...form, vinculoInstitucional: evento.target.value })}
                          className="input-padrao"
                        />
                      </div>
                    )}

                    <div>
                      <label className="rotulo-campo">Título acadêmico</label>
                      <select
                        value={form.tituloAcademico}
                        onChange={(evento) => {
                          if (ehTituloAcademico(evento.target.value)) {
                            setForm({ ...form, tituloAcademico: evento.target.value });
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

                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={criando || !form.cpf}
                        onClick={criarPerfil}
                      >
                        {criando ? 'Criando...' : 'Criar Perfil Pesquisador'}
                      </button>
                      {erroCriar && <p className="texto-erro text-xs mt-2">{erroCriar}</p>}
                    </div>
                  </SecaoFicha>
                )}

                <div className="border-t borda-padrao"></div>

                <SecaoModeracao auth={auth} idUsuario={idUsuarioEditandoPerfil} />
              </div>

              <div className="space-y-6">
                <SecaoFicha titulo="Metadados" colunas={1}>
                  <CampoSomenteLeitura rotulo="id" valor={idUsuarioEditandoPerfil} />
                  <CampoSomenteLeitura rotulo="E-mail" valor={perfilEmEdicao?.usuario.email} />
                  <CampoSomenteLeitura
                    rotulo="E-mail verificado"
                    valor={perfilEmEdicao?.usuario.emailVerificado ? 'Sim' : 'Não'}
                  />
                  <CampoSomenteLeitura
                    rotulo="Criado em"
                    valor={perfilEmEdicao?.usuario.criadoEm && formatarData(perfilEmEdicao.usuario.criadoEm)}
                  />
                  {formEdicaoPerfil && (
                    <CampoSomenteLeitura
                      rotulo="Status (pesquisador)"
                      valor={
                        perfilEmEdicao?.statusPesquisador
                          ? ROTULO_STATUS_PESQUISADOR[perfilEmEdicao.statusPesquisador]
                          : '-'
                      }
                    />
                  )}
                </SecaoFicha>

                {/* Papéis (12-09-2026, trazido de alterar-usuario.tsx) -
                    mesmo widget de badges com suspender/reativar/revogar +
                    atribuir novo, agora dentro deste modal também. */}
                <SecaoFicha titulo="Papéis">
                  <div className="sm:col-span-2">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {papeisAtuaisEdicao.length === 0 && (
                        <p className="text-xs texto-fraco">Nenhum papel atribuído ainda.</p>
                      )}
                      {papeisAtuaisEdicao.map((papel) => {
                        const suspenso = papel.suspensoAte && new Date(papel.suspensoAte) > new Date();
                        return (
                          <span key={papel.idPapel} className="inline-flex flex-col items-start gap-1">
                            <span
                              className={
                                'badge flex items-center gap-2 ' +
                                (suspenso ? 'fundo-aviso texto-aviso' : 'badge-neutro')
                              }
                            >
                              {papel.nomePapel}
                              {suspenso && <i className="fa-solid fa-clock text-[10px]"></i>}
                              {suspenso ? (
                                <button
                                  type="button"
                                  onClick={() => aoReativarPapel(papel)}
                                  disabled={reativandoPapel === papel.idPapel}
                                  className="font-bold hover:underline disabled:opacity-50"
                                  title="Reativar agora"
                                >
                                  {reativandoPapel === papel.idPapel ? '…' : 'reativar'}
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPapelSuspendendoId((atual) => (atual === papel.idPapel ? null : papel.idPapel))
                                    }
                                    className="texto-fraco hover-texto-forte"
                                    title={`Suspender "${papel.nomePapel}" por um tempo`}
                                  >
                                    <i className="fa-solid fa-clock text-[10px]"></i>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => aoRevogarPapel(papel)}
                                    disabled={revogandoPapel === papel.idPapel}
                                    className="texto-erro font-bold hover:text-red-800 disabled:opacity-50"
                                    title={`Revogar "${papel.nomePapel}"`}
                                  >
                                    ×
                                  </button>
                                </>
                              )}
                            </span>
                            {papelSuspendendoId === papel.idPapel && (
                              <span className="flex gap-1 fundo-cartao border borda-forte rounded-lg p-1.5">
                                {[1, 7, 30].map((dias) => (
                                  <button
                                    key={dias}
                                    type="button"
                                    onClick={() => aoSuspenderPapel(papel, dias)}
                                    disabled={enviandoSuspensaoPapel === papel.idPapel}
                                    className="text-[10px] font-bold texto-padrao hover-fundo-sutil px-1.5 py-0.5 rounded"
                                  >
                                    {dias}d
                                  </button>
                                ))}
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>

                    {papeisDisponiveis.length === 0 ? (
                      <p className="text-xs texto-fraco">
                        Nenhum papel adicional disponível pra atribuir (o catálogo ainda está
                        carregando, ou este usuário já tem todos os papéis existentes).
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <select
                          value={idPapelParaAtribuir}
                          onChange={(evento) => setIdPapelParaAtribuir(evento.target.value)}
                          className="input-padrao"
                        >
                          <option value="">Selecione um papel...</option>
                          {papeisDisponiveis.map((papel) => (
                            <option key={papel.idPapel} value={papel.idPapel}>
                              {papel.nome}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={aoAtribuirPapel}
                          disabled={!idPapelParaAtribuir || atribuindoPapel}
                          className="btn btn-primary"
                        >
                          {atribuindoPapel ? 'Atribuindo...' : 'Atribuir'}
                        </button>
                      </div>
                    )}
                  </div>
                </SecaoFicha>

                {/* Ferramentas de desenvolvimento (12-09-2026, trazido de
                    alterar-usuario.tsx) - mesmo card marcado com .badge-dev,
                    some antes de qualquer apresentação/deploy real. */}
                <div className="fundo-cartao border border-dashed borda-dev fundo-dev-sutil rounded-xl p-4">
                  <span className="badge badge-dev">&lt;dev&gt;</span>
                  <p className="text-xs texto-fraco mt-2 mb-3">
                    Redefine a senha direto pra "{SENHA_DEV}", sem digitar nada. Só pra testar login.
                  </p>
                  <button
                    type="button"
                    onClick={aoRedefinirSenhaDev}
                    disabled={redefinindoSenhaDev}
                    className="btn btn-secondary w-full"
                  >
                    {redefinindoSenhaDev ? 'Redefinindo...' : 'Redefinir senha dev'}
                  </button>
                </div>
              </div>
            </div>
          </ModalFicha>
        );
      })()}

      {usuarioExcluindo && (() => {
        const fecharModalExcluir = () => {
          setUsuarioExcluindo(null);
          setConfirmacaoExclusaoUsuario('');
          limparErroModal();
        };
        const confirmado = confirmacaoExclusaoUsuario.trim().toLowerCase() === usuarioExcluindo.usuario.email.toLowerCase();
        return (
          <ModalFicha
            titulo={`Excluir "${usuarioExcluindo.usuario.nome}"`}
            subtitulo="Não existe botão de desfazer no painel."
            aoFechar={fecharModalExcluir}
            rodape={
              <div className="flex gap-3 max-w-sm ml-auto">
                <button type="button" onClick={fecharModalExcluir} className="btn btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={excluirUsuario}
                  disabled={excluindoUsuario || !confirmado}
                  className="btn btn-danger flex-1"
                >
                  {excluindoUsuario ? 'Excluindo...' : 'Confirmar exclusão'}
                </button>
              </div>
            }
          >
            {erroModal && <p className="texto-erro text-sm font-bold text-center">{erroModal}</p>}

            <SecaoFicha titulo="O que será excluído">
              <CampoFicha rotulo="id" valor={usuarioExcluindo.idUsuario} />
              <CampoFicha rotulo="Nome" valor={usuarioExcluindo.usuario.nome} />
              <CampoFicha rotulo="E-mail" valor={usuarioExcluindo.usuario.email} largura="cheia" />
              <CampoFicha
                rotulo="E-mail verificado"
                valor={usuarioExcluindo.usuario.emailVerificado ? 'Sim' : 'Não'}
              />
            </SecaoFicha>

            <div className="rounded-lg border borda-forte fundo-aviso p-4 text-sm texto-aviso">
              <p className="font-bold mb-1">
                <i className="fa-solid fa-circle-info mr-1"></i> O que acontece de verdade
              </p>
              <p>
                A conta é marcada como excluída (exclusão lógica), não apagada do banco: o login
                deixa de funcionar e o perfil some do público na hora, mas o registro continua
                existindo pra auditoria e conformidade com a LGPD. Não existe um botão de
                "restaurar" no painel - reverter isso hoje exige acesso direto ao banco.
              </p>
            </div>

            <div>
              <label className="rotulo-campo">
                Digite o e-mail "{usuarioExcluindo.usuario.email}" pra confirmar
              </label>
              <input
                type="text"
                value={confirmacaoExclusaoUsuario}
                onChange={(evento) => setConfirmacaoExclusaoUsuario(evento.target.value)}
                className="input-padrao"
                placeholder={usuarioExcluindo.usuario.email}
                autoComplete="off"
              />
            </div>
          </ModalFicha>
        );
      })()}

      <div className="border-t borda-padrao my-8"></div>

      <RegistroChamadas />
      </section>
    </div>
  );
}
