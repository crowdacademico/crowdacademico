import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';
import { Dica } from '../../components/layout/tooltip';
import { SeletorFotoPerfil } from '../../components/input/seletor-foto-perfil';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { confirmarSaida } from '../../components/crud/use-alteracao-nao-salva';
import { Campo } from '../../components/input/campo';
import { ConfirmacaoDigitada } from '../../components/input/confirmacao-digitada';
import { confirmacaoConfere } from '../../components/input/confirmacao-confere';
import { sessaoApi } from '../../services/3-auth/api/sessao.api';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TIPO_VINCULO,
  ROTULO_TITULO_ACADEMICO,
  classeBadgeStatusPesquisador,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { formatarCpfExibicao, formatarDataHora, formatarMesAno } from '../../services/constant/util/formatacao.util';
import { useEnvio } from '../../services/constant/hook/use-envio';
import type { PropsPagina } from '../../services/router/pagina.type';
import { ModalUpgradePesquisador } from '../6-perfil-pesquisador/modal-upgrade-pesquisador';
import { gerarCpfValido } from '../../services/campo-testes/util/gerar-cpf-valido.util';
import { Carregando } from '../../components/layout/carregando';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { SessaoResponse } from '../../services/3-auth/type/auth.type';
import type { UsuarioPapelResponse } from '../../services/2-papel-permissao/type/papel-permissao.type';
import type { PerfilPesquisadorResponse } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';
import type { SuspensaoResponseDto } from '../../services/constant/type/suspensao.type';

// Minha Conta: não é um formulário só, é uma área com seções independentes, cada uma salva por conta própria.
//
// SEM seção "Preferências" de propósito: preferência pessoal (tema/fonte) por conta exigiria uma tabela própria
// para guardar isso direito (o projeto já tem tabelas demais). Tema/fonte são ajustáveis só pelos botões do
// cabeçalho (ControleTema/ControleFonte), preferência de DISPOSITIVO via localStorage, sem ligação nenhuma com
// a conta logada.
//
// Estrutura (referência ORCID/ResearchGate/Google Acadêmico: "portfólio profissional", abrem com uma FAIXA DE
// IDENTIDADE larga no topo, não um cartãozinho de canto): FaixaIdentidade (larga, topo: avatar grande, nome,
// e-mail, badges de papel, "membro desde") + abas de verdade (rota /admin/minha-conta/:aba, não useState: mesma
// decisão das abas do painel admin). Cinco <Painel> com o MESMO peso visual empilhados parecem um formulário
// longo, não um perfil, e um cartão lateral discreto não ancora a tela.
const ABAS_MINHA_CONTA = [
  { chave: 'perfil', rotulo: 'Perfil', icone: 'fa-user' },
  { chave: 'seguranca', rotulo: 'Segurança', icone: 'fa-shield-halved' },
  { chave: 'papeis', rotulo: 'Papéis', icone: 'fa-user-tag' },
  { chave: 'academico', rotulo: 'Acadêmico', icone: 'fa-graduation-cap' },
  // Privacidade por último de propósito - o botão de excluir conta mora
  // aqui dentro, atrás da confirmação por digitação: ação destrutiva
  // nunca na primeira aba que a pessoa vê.
  { chave: 'privacidade', rotulo: 'Privacidade', icone: 'fa-lock' },
];
const CHAVES_ABAS = ABAS_MINHA_CONTA.map((item) => item.chave);

// Posição da entrada atual no histórico do navegador, gravada pelo próprio react-router (history.state.idx).
function posicaoNoHistorico(): number | null {
  const estado: unknown = window.history.state;
  if (estado && typeof estado === 'object' && 'idx' in estado && typeof estado.idx === 'number') {
    return estado.idx;
  }
  return null;
}

export function MinhaConta({ auth }: PropsPagina) {
  const { aba } = useParams();
  const navigate = useNavigate();

  // Cada aba é uma rota, então trocar de aba empilha histórico. "Voltar" volta para a tela de ANTES de Minha
  // Conta, não para a aba anterior: guarda a posição de entrada e pula de volta até a entrada anterior a ela.
  // Sem entrada anterior (aberta por link direto ou F5 na primeira tela), vai para a página inicial.
  const posicaoEntrada = useRef(posicaoNoHistorico());
  const voltar = useCallback(() => {
    const entrada = posicaoEntrada.current;
    const atual = posicaoNoHistorico();
    if (entrada === null || atual === null || entrada === 0) {
      void navigate('/');
      return;
    }
    void navigate(entrada - 1 - atual);
  }, [navigate]);

  if (!aba || !CHAVES_ABAS.includes(aba)) {
    return <Navigate to="/admin/minha-conta/perfil" replace />;
  }

  return (
    // `w-0 min-w-full`: não é decorativo. Sem isso, a barra de abas logo abaixo (rola na horizontal, com rótulo em
    // whitespace-nowrap para não quebrar linha) faz o NAVEGADOR calcular a largura mínima deste bloco pelo
    // CONTEÚDO da barra (~600px) e empurra a página inteira para a largura horizontal, em vez do próprio nav
    // rolar sozinho, mesmo em telas pequenas. `width: 0` tira este bloco do cálculo de "largura mínima pelo
    // conteúdo" (passa a ter uma largura EXPLÍCITA, não automática); `min-width: 100%` devolve ele ao tamanho
    // normal (cheio do container, até o teto do max-w-5xl) na hora de desenhar de verdade. Troque só se remover
    // a barra de abas.
    <div className="w-0 min-w-full max-w-5xl mx-auto p-4 sm:p-8">
      {/* Um cartão só, do topo ao rodapé - SEM overflow-hidden (mesma
          lição já aprendida em cartao-formulario.tsx/ficha-consulta.tsx:
          overflow-hidden cria um contexto de scroll que o `sticky` do
          rodapé da aba Perfil não atravessa). A faixa (fundo-sutil,
          diferente do corpo) arredonda o PRÓPRIO canto de cima
          (rounded-t-2xl); o corpo de cada aba é transparente, deixa o
          fundo-cartao deste wrapper aparecer atrás - só a aba Perfil tem
          rodapé sticky com fundo próprio, e só ELE precisa arredondar o
          canto de baixo (rounded-b-2xl), as outras abas terminam lisas e
          o canto arredondado do wrapper já aparece sozinho por trás. */}
      <div className="fundo-cartao rounded-2xl shadow-lg border borda-padrao">
        <FaixaIdentidade auth={auth} />
        <BarraAbas abaAtiva={aba} />

        {/* `key`: aberta direto pela URL (ou depois de F5), a aba monta antes de a sessão terminar de carregar e
            o formulário nasceria com o nome vazio. Trocar a key quando o usuário chega remonta a aba já com o
            nome certo. */}
        {aba === 'perfil' && (
          <AbaPerfil key={auth.usuario?.idUsuario ?? 'carregando'} auth={auth} aoVoltar={voltar} />
        )}
        {aba === 'seguranca' && <AbaSeguranca auth={auth} />}
        {aba === 'papeis' && <AbaPapeis auth={auth} />}
        {aba === 'academico' && <AbaAcademico auth={auth} />}
        {aba === 'privacidade' && <AbaPrivacidade auth={auth} />}
      </div>
    </div>
  );
}

// Faixa de identidade: busca papéis por conta própria, mesmo espírito de sempre neste arquivo: a lista de
// papéis de uma pessoa é minúscula, duplicar essa requisição pequena é mais simples e mais seguro do que subir
// estado (a aba Papéis, abaixo, também busca a sua própria cópia, cada uma no seu tempo de vida).
interface FaixaIdentidadeProps {
  auth: Pick<UseAuthReturn, 'usuario' | 'authFetch'>;
}

function FaixaIdentidade({ auth }: FaixaIdentidadeProps) {
  const usuario = auth.usuario;
  const [papeis, setPapeis] = useState<UsuarioPapelResponse[] | null>(null);

  useEffect(() => {
    if (!usuario) {
      return;
    }
    usuarioPapelApi
      .listarPorUsuario(auth.authFetch, usuario.idUsuario)
      .then(setPapeis)
      .catch(() => setPapeis([]));
  }, [auth.authFetch, usuario]);

  const membroDesde = usuario?.criadoEm ? formatarMesAno(usuario.criadoEm) : null;

  return (
    <div className="relative overflow-hidden rounded-t-2xl border-b borda-padrao fundo-sutil px-6 sm:px-8 py-8">
      {/* Gradiente MUITO discreto (10% de opacidade) em vez de fundo verde
          chapado - regra já estabelecida no projeto: verde é acento, não
          fundo. Mesmo truque decorativo do blob em login-page.tsx. */}
      <div className="pointer-events-none absolute -top-12 -right-12 w-56 h-56 brilho-marca rounded-full blur-3xl"></div>

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Anel ao redor do avatar via padding + fundo-cartao (não
            hardcoded em branco) - reage ao tema escuro sozinho, mesmos
            tokens de sempre. */}
        <div className="p-1 rounded-full fundo-cartao shadow-md shrink-0 w-fit">
          <AvatarUsuario nome={usuario?.nome} foto={usuario?.avatarUrl} tamanho="xxl" forma="circulo" />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold texto-forte break-words">
            {usuario?.nome}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-sm texto-fraco">
            <span className="break-words">{usuario?.email}</span>
            <span
              className={
                'badge flex items-center gap-1 ' +
                (usuario?.emailVerificado ? 'badge-sucesso' : 'fundo-aviso texto-aviso')
              }
            >
              <i
                className={
                  'fa-solid text-[10px] ' +
                  (usuario?.emailVerificado ? 'fa-check' : 'fa-triangle-exclamation')
                }
              ></i>
              {usuario?.emailVerificado ? 'E-mail verificado' : 'E-mail não verificado'}
            </span>
            {membroDesde && <span>Membro desde {membroDesde}</span>}
          </div>

          {papeis && papeis.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {papeis.map((papel) => (
                <span key={papel.idPapel} className="badge badge-neutro">
                  {papel.nomePapel}
                </span>
              ))}
            </div>
          )}
        </div>

        <Link to="/admin/minha-conta/perfil" className="btn btn-secondary shrink-0 sm:self-start">
          <i className="fa-solid fa-pen"></i> Editar perfil
        </Link>
      </div>
    </div>
  );
}

// Abas de verdade, não useState (mesma decisão das abas do painel admin): link direto funciona, F5 preserva a
// aba, botão Voltar navega. Rola na horizontal (não empilha) no mobile, ver `.barra-abas`.
interface BarraAbasProps {
  abaAtiva: string;
}

function BarraAbas({ abaAtiva }: BarraAbasProps) {
  return (
    <nav
      className="barra-abas px-2 sm:px-4"
      aria-label="Seções de Minha Conta"
    >
      {ABAS_MINHA_CONTA.map((item) => (
        <Link
          key={item.chave}
          to={`/admin/minha-conta/${item.chave}`}
          className={
            'flex items-center gap-2 px-4 py-3.5 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ' +
            (item.chave === abaAtiva
              ? 'borda-marca texto-marca'
              : 'border-transparent texto-fraco hover-texto-forte')
          }
        >
          <i className={'fa-solid ' + item.icone}></i>
          {item.rotulo}
        </Link>
      ))}
    </nav>
  );
}

// 1. PERFIL - a aba mais importante, é o "portfólio": foto, nome, e-mail e o vínculo acadêmico (só leitura,
// vem do perfil de pesquisador; quem não é pesquisador vê o convite para a aba Acadêmico). 2 colunas dentro da
// aba (pedido explícito: "campo de nome não precisa de 900px de largura") + rodapé sticky Salvar/Cancelar,
// mesmo padrão de modal-usuario.tsx (ModalAlterarUsuario).
interface AbaPerfilProps {
  auth: Pick<UseAuthReturn, 'usuario' | 'authFetch' | 'atualizarUsuarioLocal'>;
  aoVoltar: () => void;
}

interface DadosAtualizarPerfil {
  nome: string;
  idImagemPerfil?: number | null;
}

function AbaPerfil({ auth, aoVoltar }: AbaPerfilProps) {
  const [nome, setNome] = useState(auth.usuario?.nome ?? '');
  // undefined = carregando; null = não é pesquisador (404, mesma tolerância da aba Acadêmico).
  const [perfil, setPerfil] = useState<PerfilPesquisadorResponse | null | undefined>(undefined);

  useEffect(() => {
    if (!auth.usuario) {
      return;
    }
    perfilPesquisadorApi
      .buscar(auth.authFetch, auth.usuario.idUsuario)
      .then(setPerfil)
      .catch(() => setPerfil(null));
  }, [auth.authFetch, auth.usuario]);
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);

  // Mesmo padrão de 3 estados de modal-usuario.tsx (botão "Remover foto"): `undefined` = nenhuma escolha nova
  // (mostra a foto que já existe), número = foto nova (upload já confirmado, só falta linkar no PATCH), `null`
  // = removida de propósito.
  const [idImagemPerfilNovo, setIdImagemPerfilNovo] = useState<number | null | undefined>(undefined);
  const [avatarUrlNovo, setAvatarUrlNovo] = useState<string | null>(null);

  const sujo =
    (nome.trim() !== (auth.usuario?.nome ?? '') && nome.trim().length >= 2) ||
    idImagemPerfilNovo !== undefined;

  const aoSalvar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    // `auth.usuario` só é null antes do 1º carregamento de sessão - o
    // formulário nem aparece nesse estado, mas o TypeScript não sabe
    // disso; guarda defensiva, nunca dispara na prática.
    const usuario = auth.usuario;
    if (!usuario) {
      return;
    }
    await executarEnviando(async () => {
      const dados: DadosAtualizarPerfil = { nome: nome.trim() };
      if (idImagemPerfilNovo !== undefined) {
        dados.idImagemPerfil = idImagemPerfilNovo;
      }
      const usuarioAtualizado = await usuarioApi.atualizar(auth.authFetch, usuario.idUsuario, dados);
      auth.atualizarUsuarioLocal(usuarioAtualizado);
      setIdImagemPerfilNovo(undefined);
      setAvatarUrlNovo(null);
      mostrar('Perfil atualizado com sucesso.');
    });
  };

  // "Cancelar" volta para a tela de antes de Minha Conta (pergunta antes, se houver alteração não salva).
  const aoCancelar = () => {
    if (!confirmarSaida(sujo)) {
      return;
    }
    aoVoltar();
  };

  return (
    <form id="form-minha-conta-perfil" onSubmit={aoSalvar}>
      <div className="px-6 sm:px-8 py-8">
        {erro && <p className="text-sm texto-erro mb-6">{erro}</p>}

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <SecaoFicha titulo="Foto do perfil" nivel={2}>
              <div className="sm:col-span-2 flex items-center gap-4">
                <SeletorFotoPerfil
                  authFetch={auth.authFetch}
                  nome={auth.usuario?.nome}
                  url={idImagemPerfilNovo === undefined ? auth.usuario?.avatarUrl : avatarUrlNovo}
                  tamanho="xxl"
                  aoAlterar={(idArquivo, novaUrl) => {
                    setIdImagemPerfilNovo(idArquivo);
                    setAvatarUrlNovo(novaUrl);
                  }}
                />
                <p className="text-xs texto-forte">
                  Clique no ícone de câmera pra trocar, ou no de lixeira pra remover.
                  Lembre de clicar em "Salvar" no fim da página pra confirmar.
                </p>
              </div>
            </SecaoFicha>

            <SecaoFicha titulo="Dados da conta" nivel={2}>
              <Campo rotulo="Nome">
                {({ atributos }) => (
                  <input
                    {...atributos}
                    type="text"
                    value={nome}
                    onChange={(evento) => setNome(evento.target.value)}
                    className="input-padrao"
                  />
                )}
              </Campo>
              <Campo rotulo="E-mail">
                {({ atributos }) => (
                  <input {...atributos} type="email" value={auth.usuario?.email ?? ''} disabled className="input-padrao" />
                )}
              </Campo>
              <div className="sm:col-span-2 flex items-start gap-2 rounded-lg fundo-info texto-info p-3">
                <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
                <p className="text-xs">
                  Trocar o e-mail ainda não é possível neste protótipo, exigiria
                  reverificação, que depende do módulo de e-mail.
                </p>
              </div>
            </SecaoFicha>
          </div>

          <SecaoFicha titulo="Vínculo acadêmico" colunas={1} nivel={2}>
            {perfil === undefined && <Carregando />}
            {perfil === null && (
              <div className="flex items-start gap-2 rounded-lg fundo-info texto-info p-3">
                <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
                <p className="text-xs">
                  Você ainda não é pesquisador. O upgrade fica na aba{' '}
                  <Link to="/admin/minha-conta/academico" className="font-bold underline">
                    Acadêmico
                  </Link>
                  .
                </p>
              </div>
            )}
            {perfil && (
              <>
                <CampoFicha rotulo="Título acadêmico" valor={ROTULO_TITULO_ACADEMICO[perfil.tituloAcademico]} />
                <CampoFicha rotulo="Tipo de vínculo" valor={ROTULO_TIPO_VINCULO[perfil.tipoVinculo]} />
                <CampoFicha rotulo="Vínculo institucional" valor={perfil.vinculoInstitucional} />
                <p className="text-xs texto-fraco">
                  O perfil completo de pesquisador fica na aba{' '}
                  <Link to="/admin/minha-conta/academico" className="font-bold underline">
                    Acadêmico
                  </Link>
                  .
                </p>
              </>
            )}
          </SecaoFicha>
        </div>
      </div>

      {/* Rodapé sticky, mesmo padrão de cartao-formulario.tsx/
          modal-usuario.tsx - arredonda o PRÓPRIO canto de baixo
          (rounded-b-2xl), não depende do wrapper. */}
      <div className="px-6 sm:px-8 py-5 border-t borda-padrao fundo-cartao rounded-b-2xl sticky bottom-0 flex gap-3 justify-end">
        <button type="button" onClick={aoCancelar} className="btn btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={!sujo || enviando} className="btn btn-primary">
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

function iconePorDispositivo(userAgent: string | null): string {
  const ua = (userAgent ?? '').toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'fa-mobile-screen-button';
  }
  if (ua.includes('ipad') || ua.includes('tablet')) {
    return 'fa-tablet-screen-button';
  }
  return 'fa-desktop';
}

// 2. SEGURANÇA: senha (exige a atual) + Sessões Ativas (ícone de dispositivo por sessão, "sessão atual" já vem
// destacada em verde (badge-sucesso), encerrar é um ícone discreto em vez de botão cheio).
interface AbaSegurancaProps {
  auth: Pick<UseAuthReturn, 'usuario' | 'authFetch'>;
}

function AbaSeguranca({ auth }: AbaSegurancaProps) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const { ocupado: encerrandoTodas, executar: executarEncerrandoTodas } = useEnvio(reportarErro);
  const { ocupado: enviandoSenha, executar: executarEnviandoSenha } = useEnvio(reportarErro, limparErro);

  const aoTrocarSenha = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const usuario = auth.usuario;
    if (!usuario) {
      return;
    }
    await executarEnviandoSenha(async () => {
      await usuarioApi.atualizar(auth.authFetch, usuario.idUsuario, {
        senhaAtual,
        novaSenha,
      });
      mostrar('Senha alterada com sucesso.');
      setSenhaAtual('');
      setNovaSenha('');
    });
  };

  const [sessoes, setSessoes] = useState<SessaoResponse[] | null>(null);
  const [encerrando, setEncerrando] = useState<number | null>(null);
  // Colapsada por padrão: imagine um usuário com 10, 20, 30 sessões abertas. Expandida, a lista ainda ganha
  // scroll próprio (max-h-64): nunca empurra a página.
  const [sessoesAbertas, setSessoesAbertas] = useState(false);

  const carregarSessoes = () => {
    sessaoApi
      .listar(auth.authFetch)
      .then(setSessoes)
      .catch(() => setSessoes([]));
  };
  useEffect(carregarSessoes, [auth.authFetch]);

  const aoEncerrarUma = async (idSessao: number) => {
    setEncerrando(idSessao);
    try {
      await sessaoApi.encerrarUma(auth.authFetch, idSessao);
      mostrar('Sessão encerrada.');
      carregarSessoes();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEncerrando(null);
    }
  };

  const aoEncerrarTodas = async () => {
    if (!window.confirm('Encerrar todas as outras sessões ativas?')) {
      return;
    }
    await executarEncerrandoTodas(async () => {
      const resultado = await sessaoApi.encerrarTodasMenosAtual(auth.authFetch);
      mostrar(`${resultado.encerradas} sessão(ões) encerrada(s).`);
      carregarSessoes();
    });
  };

  return (
    <div className="px-6 sm:px-8 py-8 space-y-8">
      <div>
        <h2 className="titulo-bloco mb-3 pb-2 border-b borda-padrao">
          Trocar senha
        </h2>
        <form onSubmit={aoTrocarSenha} className="space-y-4 max-w-md">
          {erro && <p className="text-sm texto-erro">{erro}</p>}
          <Campo rotulo="Senha atual">
            {({ atributos }) => (
              <input
                {...atributos}
                type="password"
                value={senhaAtual}
                onChange={(evento) => setSenhaAtual(evento.target.value)}
                className="input-padrao"
                autoComplete="current-password"
              />
            )}
          </Campo>
          <Campo rotulo="Nova senha">
            {({ atributos }) => (
              <input
                {...atributos}
                type="password"
                value={novaSenha}
                onChange={(evento) => setNovaSenha(evento.target.value)}
                className="input-padrao"
                autoComplete="new-password"
              />
            )}
          </Campo>
          <button
            type="submit"
            disabled={!senhaAtual || novaSenha.length < 8 || enviandoSenha}
            className="btn btn-secondary"
          >
            {enviandoSenha ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 pb-2 border-b borda-padrao">
          <button
            type="button"
            onClick={() => setSessoesAbertas((atual) => !atual)}
            className="titulo-bloco flex items-center gap-2"
          >
            Sessões ativas
            {sessoes && <span className="font-normal normal-case tracking-normal">({sessoes.length})</span>}
            <i
              className={
                'fa-solid fa-chevron-down text-[10px] transition-transform' +
                (sessoesAbertas ? ' rotate-180' : '')
              }
            ></i>
          </button>
          {sessoesAbertas && sessoes && sessoes.length > 1 && (
            <button
              type="button"
              onClick={aoEncerrarTodas}
              disabled={encerrandoTodas}
              className="text-xs font-bold texto-erro hover:underline"
            >
              {encerrandoTodas ? 'Encerrando...' : 'Encerrar todas as outras'}
            </button>
          )}
        </div>

        {sessoesAbertas &&
          (sessoes === null ? (
            <Carregando />
          ) : sessoes.length === 0 ? (
            <p className="text-sm texto-fraco">Nenhuma sessão ativa encontrada.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {sessoes.map((sessao) => (
                <li
                  key={sessao.idSessao}
                  className="flex items-center gap-3 rounded-lg border borda-padrao p-3 text-sm"
                >
                  <i
                    className={
                      'fa-solid ' + iconePorDispositivo(sessao.userAgent) + ' texto-fraco text-lg shrink-0'
                    }
                  ></i>
                  <div className="min-w-0 flex-1">
                    {/* truncate no <span> do texto, não no <p> inteiro: user-agent de verdade é longo, e
                        `truncate` num flex container com 2 filhos corta a linha inteira sem dar espaço para
                        o badge ("Esta sessão" sumia). Mesma família de min-w-0/break-words em CampoFicha. */}
                    <p className="texto-forte flex items-center gap-2 min-w-0">
                      <span className="truncate min-w-0">
                        {sessao.userAgent ?? 'Dispositivo desconhecido'}
                      </span>
                      {sessao.atual && (
                        <span className="badge badge-sucesso shrink-0">Esta sessão</span>
                      )}
                    </p>
                    <p className="text-xs texto-fraco">
                      {sessao.ip ?? 'IP desconhecido'} · desde{' '}
                      {formatarDataHora(sessao.criadoEm)}
                    </p>
                  </div>
                  {!sessao.atual && (
                    <button
                      type="button"
                      onClick={() => aoEncerrarUma(sessao.idSessao)}
                      disabled={encerrando === sessao.idSessao}
                      aria-label="Encerrar sessão"
                      className="dica shrink-0 w-8 h-8 rounded-full flex items-center justify-center texto-erro hover-fundo-sutil transition-colors disabled:opacity-50"
                    >
                      <i
                        className={
                          'fa-solid text-sm ' + (encerrando === sessao.idSessao ? 'fa-spinner fa-spin' : 'fa-power-off')
                        }
                      ></i>
                      <Dica texto="Encerrar sessão" curta />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ))}
      </div>
    </div>
  );
}

// 3. PAPÉIS - só leitura, como sempre foi.
interface AbaPapeisProps {
  auth: Pick<UseAuthReturn, 'usuario' | 'authFetch'>;
}

function AbaPapeis({ auth }: AbaPapeisProps) {
  const [papeis, setPapeis] = useState<UsuarioPapelResponse[] | null>(null);

  useEffect(() => {
    if (!auth.usuario) {
      return;
    }
    usuarioPapelApi
      .listarPorUsuario(auth.authFetch, auth.usuario.idUsuario)
      .then(setPapeis)
      .catch(() => setPapeis([]));
  }, [auth.authFetch, auth.usuario]);

  return (
    <div className="px-6 sm:px-8 py-8">
      <p className="text-sm texto-fraco mb-4">
        O que você é na plataforma, só leitura aqui - pra alterar, um administrador precisa
        fazer isso pelo painel de Usuários.
      </p>
      {papeis === null ? (
        <Carregando />
      ) : papeis.length === 0 ? (
        <p className="text-sm texto-fraco">Nenhum papel atribuído.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {papeis.map((papel) => (
            <span key={papel.idPapel} className="badge badge-neutro">
              {papel.nomePapel}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// 4. ACADÊMICO: quem é suspenso PRECISA ver o motivo em algum lugar próprio, não só descobrir tentando fazer
// algo e sendo barrado sem explicação (a suspensão de pesquisador NUNCA bloqueia login: a pessoa continua tendo
// acesso normal a Minha Conta). Quem não é pesquisador faz o upgrade aqui (ver abaixo).
interface AbaAcademicoProps {
  auth: Pick<UseAuthReturn, 'usuario' | 'authFetch'>;
}

function AbaAcademico({ auth }: AbaAcademicoProps) {
  const [perfil, setPerfil] = useState<PerfilPesquisadorResponse | null>(null);
  const [fazendoUpgrade, setFazendoUpgrade] = useState(false);
  const [suspensao, setSuspensao] = useState<SuspensaoResponseDto | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!auth.usuario) {
      return;
    }
    const idUsuario = auth.usuario.idUsuario;
    void Promise.all([
      // 404 = não é pesquisador (upgrade nunca feito) - mesma tolerância
      // já usada em modal-usuario.tsx (Consultar/Alterar).
      perfilPesquisadorApi.buscar(auth.authFetch, idUsuario).catch(() => null),
      perfilPesquisadorApi.buscarSuspensao(auth.authFetch, idUsuario).catch(() => null),
    ])
      .then(([dadosPerfil, dadosSuspensao]) => {
        setPerfil(dadosPerfil);
        setSuspensao(dadosSuspensao);
      })
      .finally(() => setCarregando(false));
  }, [auth.authFetch, auth.usuario]);

  const suspensoAte = suspensao?.suspensoAte ?? null;
  const suspensoAgora = suspensoAte !== null && new Date(suspensoAte) > new Date();

  if (carregando) {
    return <Carregando className="px-6 sm:px-8 py-8" />;
  }

  // Quem ainda não é pesquisador faz o upgrade da PRÓPRIA conta aqui (termos, CPF, vínculo, título): o mesmo
  // modal do Campo de Testes (T1), que usa o endpoint self-service quando o alvo é a própria conta. O T1 lista
  // todos os usuários e por isso só funciona para quem administra; esta é a porta do usuário comum.
  if (!perfil) {
    return (
      <div className="px-6 sm:px-8 py-8 space-y-4">
        <div className="flex items-start gap-2 rounded-lg fundo-info texto-info p-3 text-xs">
          <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
          <p>Você ainda não é pesquisador nesta plataforma. Como pesquisador, você pode criar campanhas para financiar suas pesquisas.</p>
        </div>
        {auth.usuario && (
          <button type="button" className="btn btn-primary" onClick={() => setFazendoUpgrade(true)}>
            <i className="fa-solid fa-flask"></i> Tornar-me pesquisador
          </button>
        )}
        {fazendoUpgrade && auth.usuario && (
          <ModalUpgradePesquisador
            auth={auth}
            idUsuarioAlvo={auth.usuario.idUsuario}
            aoFechar={() => setFazendoUpgrade(false)}
            aoConcluido={setPerfil}
            // Botão "Gerar CPF válido" só em desenvolvimento (some no build de produção), para testar o upgrade.
            gerarCpfDeTeste={import.meta.env.DEV ? gerarCpfValido : undefined}
          />
        )}
      </div>
    );
  }

  return (
    <div className="px-6 sm:px-8 py-8 space-y-6">
      {suspensoAgora && (
        <div className="rounded-lg border borda-forte fundo-erro p-4">
          <p className="text-sm font-bold texto-erro">
            Seu poder de pesquisador está suspenso até {formatarDataHora(suspensoAte)}
          </p>
          <p className="text-xs texto-erro mt-1">Motivo: {suspensao?.motivoSuspensao}</p>
          <p className="text-xs texto-erro mt-2">
            Sua conta continua funcionando normalmente - só a autoridade de pesquisador (criar
            campanha, endossar, etc.) fica suspensa até o prazo acima.
          </p>
        </div>
      )}

      <SecaoFicha titulo="Perfil de Pesquisador" nivel={2}>
        <CampoFicha rotulo="CPF" valor={perfil.cpf ? formatarCpfExibicao(perfil.cpf) : null} />
        <CampoFicha
          rotulo="Status"
          valor={
            <span className={'badge ' + classeBadgeStatusPesquisador(perfil.statusPesquisador)}>
              {ROTULO_STATUS_PESQUISADOR[perfil.statusPesquisador]}
            </span>
          }
        />
        <CampoFicha rotulo="Título acadêmico" valor={ROTULO_TITULO_ACADEMICO[perfil.tituloAcademico]} />
        <CampoFicha rotulo="Tipo de vínculo" valor={ROTULO_TIPO_VINCULO[perfil.tipoVinculo]} />
        <CampoFicha rotulo="Vínculo institucional" valor={perfil.vinculoInstitucional} />
        <CampoFicha rotulo="Score atual" valor={perfil.scoreAtual} />
      </SecaoFicha>
    </div>
  );
}

// 5. PRIVACIDADE - última aba de propósito (ação destrutiva nunca na
// primeira). Exportar dados (LGPD Art. 18) ainda não existe (fica
// registrado honestamente); excluir conta reaproveita
// excluir_conta_usuario() (03_funcoes_seguranca.sql, [03-O]), que já
// valida que só o próprio dono (ou quem tem usuario_excluir) pode chamar.
interface AbaPrivacidadeProps {
  auth: Pick<UseAuthReturn, 'usuario' | 'authFetch' | 'logout'>;
}

function AbaPrivacidade({ auth }: AbaPrivacidadeProps) {
  const navigate = useNavigate();
  const [confirmacao, setConfirmacao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const { erro, reportarErro, limparErro } = useErroToast();

  const confirmado = auth.usuario && confirmacaoConfere(confirmacao, auth.usuario.email);

  const aoExcluir = async () => {
    if (!auth.usuario) {
      return;
    }
    limparErro();
    setExcluindo(true);
    try {
      await usuarioApi.remover(auth.authFetch, auth.usuario.idUsuario);
      void auth.logout();
      void navigate('/');
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
      setExcluindo(false);
    }
  };

  return (
    <div className="px-6 sm:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-lg border borda-padrao p-4">
        <div>
          <p className="text-sm font-semibold texto-padrao">Exportar meus dados</p>
          <p className="text-xs texto-fraco">
            Direito de portabilidade (LGPD Art. 18), ainda não implementado neste protótipo.
          </p>
        </div>
        <button type="button" disabled className="btn btn-secondary opacity-50 cursor-not-allowed">
          Exportar
        </button>
      </div>

      <div className="rounded-lg border borda-forte fundo-erro p-4">
        <p className="text-sm font-bold texto-erro mb-2">Excluir minha conta</p>
        <p className="text-xs texto-erro mb-3">
          Marca sua conta como excluída (exclusão lógica), o login para de funcionar na hora.
          Não existe desfazer pelo painel.
        </p>
        {erro && <p className="text-xs texto-erro mb-2 font-bold">{erro}</p>}
        <div className="mb-3">
          <ConfirmacaoDigitada
            oQue="o e-mail"
            esperado={auth.usuario?.email ?? ''}
            valor={confirmacao}
            aoMudar={setConfirmacao}
          />
        </div>
        <button
          type="button"
          onClick={aoExcluir}
          disabled={!confirmado || excluindo}
          className="btn btn-danger"
        >
          {excluindo ? 'Excluindo...' : 'Excluir minha conta'}
        </button>
      </div>
    </div>
  );
}
