import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';
import { SeletorFotoPerfil } from '../../components/input/seletor-foto-perfil';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { sessaoApi } from '../../services/3-auth/api/sessao.api';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';

// Minha Conta (09-08-2026, Bloco E do prompt do Claude Web) — não é um
// formulário só, é uma área com seções independentes, cada uma salva por
// conta própria.
//
// SEM SEÇÃO "Preferências" de propósito (existiu entre 09 e 10-08-2026,
// removida no mesmo dia) — decisão do Lucas com a Alexia: preferência
// pessoal (tema/fonte) por conta exigiria uma tabela própria pra guardar
// isso direito, e "estamos com tabelas demais no momento". Tema/fonte
// continuam ajustáveis, só que de novo só pelos botões do cabeçalho
// (ControleTema/ControleFonte), preferência de DISPOSITIVO via
// localStorage, sem ligação nenhuma com a conta logada.
//
// REDESENHADO (11-08-2026, pedido do Lucas: "portfólio profissional",
// referência ORCID/ResearchGate/Google Acadêmico — abrem com uma FAIXA DE
// IDENTIDADE larga no topo, não um cartãozinho de canto) — a versão
// anterior (10-08-2026) tinha 2 colunas: 5 seções empilhadas + um
// CartaoPerfil lateral pequeno tentando fazer de âncora visual. Duas
// falhas de raiz: (1) 5 <Painel> com o MESMO peso visual empilhados =
// parece formulário longo, não perfil; (2) CartaoPerfil discreto demais
// pra ancorar a tela. Virou: FaixaIdentidade (larga, topo, reúne o que
// antes estava espalhado entre CartaoPerfil e cada seção — avatar grande,
// nome, e-mail, badges de papel, "membro desde") + abas de verdade (rota
// /admin/minha-conta/:aba, não useState — mesma decisão já tomada quando
// as abas do painel admin viraram rota) substituindo a pilha de 5
// <Painel>. CartaoPerfil foi eliminado (virou redundante com a faixa).
const ABAS_MINHA_CONTA = [
  { chave: 'perfil', rotulo: 'Perfil', icone: 'fa-user' },
  { chave: 'seguranca', rotulo: 'Segurança', icone: 'fa-shield-halved' },
  { chave: 'papeis', rotulo: 'Papéis', icone: 'fa-user-tag' },
  { chave: 'academico', rotulo: 'Acadêmico', icone: 'fa-graduation-cap' },
  // Privacidade por último de propósito — o botão de excluir conta mora
  // aqui dentro, atrás da confirmação por digitação: ação destrutiva
  // nunca na primeira aba que a pessoa vê.
  { chave: 'privacidade', rotulo: 'Privacidade', icone: 'fa-lock' },
];
const CHAVES_ABAS = ABAS_MINHA_CONTA.map((item) => item.chave);

export function MinhaConta({ auth }) {
  const { aba } = useParams();

  if (!CHAVES_ABAS.includes(aba)) {
    return <Navigate to="/admin/minha-conta/perfil" replace />;
  }

  return (
    // `w-0 min-w-full` (11-08-2026, achado ao vivo no mobile) — não é
    // decorativo: sem isso, a barra de abas logo abaixo (overflow-x-auto,
    // com rótulo em whitespace-nowrap pra não quebrar linha) faz o
    // NAVEGADOR calcular a largura mínima deste bloco pelo CONTEÚDO da
    // barra (~600px) e empurra a página inteira pra largura horizontal,
    // em vez do próprio nav rolar sozinho — mesmo em telas pequenas.
    // `width: 0` tira este bloco do cálculo de "largura mínima pelo
    // conteúdo" (passa a ter uma largura EXPLÍCITA, não automática);
    // `min-width: 100%` devolve ele pro tamanho normal (cheio do
    // container, até o teto do max-w-5xl) na hora de desenhar de
    // verdade. Resultado igual a antes em qualquer largura de tela, só
    // que agora sem vazar — troque só se remover a barra de abas.
    <div className="w-0 min-w-full max-w-5xl mx-auto p-4 sm:p-8">
      {/* Um cartão só, do topo ao rodapé — SEM overflow-hidden (mesma
          lição já aprendida em cartao-formulario.jsx/ficha-consulta.jsx:
          overflow-hidden cria um contexto de scroll que o `sticky` do
          rodapé da aba Perfil não atravessa). A faixa (fundo-sutil,
          diferente do corpo) arredonda o PRÓPRIO canto de cima
          (rounded-t-2xl); o corpo de cada aba é transparente, deixa o
          fundo-cartao deste wrapper aparecer atrás — só a aba Perfil tem
          rodapé sticky com fundo próprio, e só ELE precisa arredondar o
          canto de baixo (rounded-b-2xl), as outras abas terminam lisas e
          o canto arredondado do wrapper já aparece sozinho por trás. */}
      <div className="fundo-cartao rounded-2xl shadow-lg border borda-padrao">
        <FaixaIdentidade auth={auth} />
        <BarraAbas abaAtiva={aba} />

        {aba === 'perfil' && <AbaPerfil auth={auth} />}
        {aba === 'seguranca' && <AbaSeguranca auth={auth} />}
        {aba === 'papeis' && <AbaPapeis auth={auth} />}
        {aba === 'academico' && <AbaAcademico />}
        {aba === 'privacidade' && <AbaPrivacidade auth={auth} />}
      </div>
    </div>
  );
}

// Faixa de identidade — substitui o <h2>Minha Conta</h2> solto E o antigo
// CartaoPerfil lateral (10-08-2026, agora redundante). Busca papéis por
// conta própria, mesmo espírito de sempre neste arquivo: a lista de
// papéis de uma pessoa é minúscula, duplicar essa requisição pequena é
// mais simples e mais seguro do que subir estado — a aba Papéis (abaixo)
// também busca a sua própria cópia, cada uma no seu tempo de vida.
function FaixaIdentidade({ auth }) {
  const usuario = auth.usuario;
  const [papeis, setPapeis] = useState(null);

  useEffect(() => {
    if (!usuario) {
      return;
    }
    usuarioPapelApi
      .listarPorUsuario(auth.authFetch, usuario.idUsuario)
      .then(setPapeis)
      .catch(() => setPapeis([]));
  }, [auth.authFetch, usuario]);

  const membroDesde = usuario?.criadoEm
    ? new Date(usuario.criadoEm).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
    : null;

  return (
    <div className="relative overflow-hidden rounded-t-2xl border-b borda-padrao fundo-sutil px-6 sm:px-8 py-8">
      {/* Gradiente MUITO discreto (10% de opacidade) em vez de fundo verde
          chapado — regra já estabelecida no projeto: verde é acento, não
          fundo. Mesmo truque decorativo do blob em login-page.jsx. */}
      <div className="pointer-events-none absolute -top-12 -right-12 w-56 h-56 bg-primary/10 rounded-full blur-3xl"></div>

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Anel ao redor do avatar via padding + fundo-cartao (não
            hardcoded em branco) — reage ao tema escuro sozinho, mesmos
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

// Abas de verdade, não useState (11-08-2026, pedido explícito do Lucas:
// "O projeto JÁ tomou essa decisão antes", quando as abas do painel admin
// viraram rota) — link direto funciona, F5 preserva a aba, botão Voltar
// navega. `overflow-x-auto` (não empilha) no mobile — pedido explícito.
function BarraAbas({ abaAtiva }) {
  return (
    <nav
      className="flex overflow-x-auto border-b borda-padrao px-2 sm:px-4"
      aria-label="Seções de Minha Conta"
    >
      {ABAS_MINHA_CONTA.map((item) => (
        <Link
          key={item.chave}
          to={`/admin/minha-conta/${item.chave}`}
          className={
            'flex items-center gap-2 px-4 py-3.5 text-sm font-bold whitespace-nowrap border-b-2 -mb-px transition-colors ' +
            (item.chave === abaAtiva
              ? 'border-primary text-primary'
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

// 1. PERFIL — a aba mais importante, é o "portfólio": foto, nome, e-mail,
// e um espaço já preparado (desabilitado, aviso honesto) pro dia que o
// módulo 6-perfil-pesquisador existir. 2 colunas dentro da aba (pedido
// explícito: "campo de nome não precisa de 900px de largura") + rodapé
// sticky Salvar/Cancelar, mesmo padrão de alterar-usuario.jsx.
function AbaPerfil({ auth }) {
  const [nome, setNome] = useState(auth.usuario?.nome ?? '');
  const [enviando, setEnviando] = useState(false);
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();

  // Mesmo padrão de 3 estados de alterar-usuario.jsx (25-08-2026, módulo
  // 25-arquivo + botão "Remover foto"): `undefined` = nenhuma escolha nova
  // (mostra a foto que já existe), número = foto nova (upload já
  // confirmado, só falta linkar no PATCH), `null` = removida de propósito.
  const [idImagemPerfilNovo, setIdImagemPerfilNovo] = useState(undefined);
  const [avatarUrlNovo, setAvatarUrlNovo] = useState(null);

  const sujo =
    (nome.trim() !== (auth.usuario?.nome ?? '') && nome.trim().length >= 2) ||
    idImagemPerfilNovo !== undefined;

  const aoSalvar = async (evento) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      const dados = { nome: nome.trim() };
      if (idImagemPerfilNovo !== undefined) {
        dados.idImagemPerfil = idImagemPerfilNovo;
      }
      const usuarioAtualizado = await usuarioApi.atualizar(auth.authFetch, auth.usuario.idUsuario, dados);
      auth.atualizarUsuarioLocal(usuarioAtualizado);
      setIdImagemPerfilNovo(undefined);
      setAvatarUrlNovo(null);
      mostrar('Perfil atualizado com sucesso.');
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  // "Cancelar" aqui não navega pra lugar nenhum (diferente de Alterar
  // Usuário) — dentro da mesma página não existe "voltar", só descartar o
  // que foi digitado/escolhido e voltar ao valor salvo.
  const aoCancelar = () => {
    setNome(auth.usuario?.nome ?? '');
    setIdImagemPerfilNovo(undefined);
    setAvatarUrlNovo(null);
    limparErro();
  };

  return (
    <form id="form-minha-conta-perfil" onSubmit={aoSalvar}>
      <div className="px-6 sm:px-8 py-8">
        {erro && <p className="text-sm texto-erro mb-6">{erro}</p>}

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <SecaoFicha titulo="Foto do perfil">
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

            <SecaoFicha titulo="Dados da conta">
              <div>
                <label className="rotulo-campo">Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(evento) => setNome(evento.target.value)}
                  className="input-padrao"
                />
              </div>
              <div>
                <label className="rotulo-campo">E-mail</label>
                <input type="email" value={auth.usuario?.email ?? ''} disabled className="input-padrao" />
              </div>
              <div className="sm:col-span-2 flex items-start gap-2 rounded-lg fundo-info texto-info p-3">
                <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
                <p className="text-xs">
                  Trocar o e-mail ainda não é possível neste protótipo, exigiria
                  reverificação, que depende do módulo de e-mail.
                </p>
              </div>
            </SecaoFicha>
          </div>

          {/* Espaço já preparado pro Perfil de Pesquisador (módulo 6) —
              demonstrativo, mesma linguagem visual dos outros placeholders
              do app (aviso honesto + campos desabilitados). */}
          <SecaoFicha titulo="Vínculo acadêmico" colunas={1}>
            <div className="flex items-start gap-2 rounded-lg fundo-info texto-info p-3">
              <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
              <p className="text-xs">
                Aparece aqui quando o papel de pesquisador existir — ver mais na aba
                "Acadêmico".
              </p>
            </div>
            <div>
              <label className="rotulo-campo">Título acadêmico</label>
              <select disabled className="input-padrao opacity-60 cursor-not-allowed">
                <option>Não informado</option>
              </select>
            </div>
            <div>
              <label className="rotulo-campo">Vínculo institucional</label>
              <input
                type="text"
                disabled
                placeholder="Ex.: IFSP - Câmpus Birigui"
                className="input-padrao opacity-60 cursor-not-allowed"
              />
            </div>
          </SecaoFicha>
        </div>
      </div>

      {/* Rodapé sticky, mesmo padrão de cartao-formulario.jsx/
          alterar-usuario.jsx — arredonda o PRÓPRIO canto de baixo
          (rounded-b-2xl), não depende do wrapper. */}
      <div className="px-6 sm:px-8 py-5 border-t borda-padrao fundo-cartao rounded-b-2xl sticky bottom-0 flex gap-3 justify-end">
        <button type="button" onClick={aoCancelar} disabled={!sujo} className="btn btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={!sujo || enviando} className="btn btn-primary">
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

function iconePorDispositivo(userAgent) {
  const ua = (userAgent ?? '').toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'fa-mobile-screen-button';
  }
  if (ua.includes('ipad') || ua.includes('tablet')) {
    return 'fa-tablet-screen-button';
  }
  return 'fa-desktop';
}

// 2. SEGURANÇA — senha (exige a atual) + Sessões Ativas (o item de maior
// impacto percebido, segundo o Claude Web, 10-08-2026). Polimento
// (11-08-2026): ícone de dispositivo por sessão, "sessão atual" já vem
// destacada em verde (badge-sucesso), encerrar virou ícone discreto em
// vez de botão cheio — antes era uma <ul> crua.
function AbaSeguranca({ auth }) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [enviandoSenha, setEnviandoSenha] = useState(false);
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();

  const aoTrocarSenha = async (evento) => {
    evento.preventDefault();
    limparErro();
    setEnviandoSenha(true);
    try {
      await usuarioApi.atualizar(auth.authFetch, auth.usuario.idUsuario, {
        senhaAtual,
        novaSenha,
      });
      mostrar('Senha alterada com sucesso.');
      setSenhaAtual('');
      setNovaSenha('');
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviandoSenha(false);
    }
  };

  const [sessoes, setSessoes] = useState(null);
  const [encerrando, setEncerrando] = useState(null);
  const [encerrandoTodas, setEncerrandoTodas] = useState(false);
  // Colapsada por padrão (10-08-2026, achado do Lucas: "imagina se o
  // usuário tiver 10, 20, 30 sessões abertas"). Expandida, a lista ainda
  // ganha scroll próprio (max-h-64) — nunca empurra a página.
  const [sessoesAbertas, setSessoesAbertas] = useState(false);

  const carregarSessoes = () => {
    sessaoApi
      .listar(auth.authFetch)
      .then(setSessoes)
      .catch(() => setSessoes([]));
  };
  useEffect(carregarSessoes, [auth.authFetch]);

  const aoEncerrarUma = async (idSessao) => {
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
    setEncerrandoTodas(true);
    try {
      const resultado = await sessaoApi.encerrarTodasMenosAtual(auth.authFetch);
      mostrar(`${resultado.encerradas} sessão(ões) encerrada(s).`);
      carregarSessoes();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEncerrandoTodas(false);
    }
  };

  return (
    <div className="px-6 sm:px-8 py-8 space-y-8">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest texto-fraco mb-3 pb-2 border-b borda-padrao">
          Trocar senha
        </h3>
        <form onSubmit={aoTrocarSenha} className="space-y-4 max-w-md">
          {erro && <p className="text-sm texto-erro">{erro}</p>}
          <div>
            <label className="rotulo-campo">Senha atual</label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(evento) => setSenhaAtual(evento.target.value)}
              className="input-padrao"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="rotulo-campo">Nova senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(evento) => setNovaSenha(evento.target.value)}
              className="input-padrao"
              autoComplete="new-password"
            />
          </div>
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
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest texto-fraco"
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
            <p className="text-sm texto-fraco">Carregando...</p>
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
                    {/* truncate no <span> do texto, não no <p> inteiro
                        (11-08-2026, achado ao vivo: user-agent de verdade
                        é longo, e `truncate` num flex container com 2
                        filhos corta a linha inteira sem dar espaço pro
                        badge — "Esta sessão" sumia. Mesma família do
                        achado de min-w-0/break-words em CampoFicha.) */}
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
                      {new Date(sessao.criadoEm).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {!sessao.atual && (
                    <button
                      type="button"
                      onClick={() => aoEncerrarUma(sessao.idSessao)}
                      disabled={encerrando === sessao.idSessao}
                      title="Encerrar sessão"
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center texto-erro hover-fundo-sutil transition-colors disabled:opacity-50"
                    >
                      <i
                        className={
                          'fa-solid text-sm ' + (encerrando === sessao.idSessao ? 'fa-spinner fa-spin' : 'fa-power-off')
                        }
                      ></i>
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

// 3. PAPÉIS — só leitura, como sempre foi.
function AbaPapeis({ auth }) {
  const [papeis, setPapeis] = useState(null);

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
        O que você é na plataforma, só leitura aqui — pra alterar, um administrador precisa
        fazer isso pelo painel de Usuários.
      </p>
      {papeis === null ? (
        <p className="text-sm texto-fraco">Carregando...</p>
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

// 4. ACADÊMICO — placeholder honesto (módulo 6-perfil-pesquisador ainda
// não existe), mas já com o desenho dos blocos que virão — mesmos campos
// demonstrativos de alterar-usuario.jsx (Perfil de Pesquisador), pra
// quando o módulo chegar ser só trocar `disabled` por estado de verdade.
function AbaAcademico() {
  return (
    <div className="px-6 sm:px-8 py-8 space-y-6">
      <div className="flex items-start gap-2 rounded-lg fundo-info texto-info p-3 text-xs">
        <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
        <p>
          Módulo de Perfil de Pesquisador ainda não foi implementado. Os campos abaixo são
          demonstrativos, mostram como vai ficar quando existir — não salvam nada ainda.
        </p>
      </div>

      <SecaoFicha titulo="Identificadores acadêmicos">
        <div>
          <label className="rotulo-campo">Tipo de link</label>
          <select disabled className="input-padrao opacity-60 cursor-not-allowed">
            <option>Lattes</option>
          </select>
        </div>
        <div>
          <label className="rotulo-campo">URL</label>
          <input
            type="text"
            disabled
            placeholder="https://lattes.cnpq.br/0000000000000000"
            className="input-padrao opacity-60 cursor-not-allowed"
          />
        </div>
        <div className="sm:col-span-2">
          <button type="button" disabled className="btn btn-secondary opacity-60 cursor-not-allowed">
            <i className="fa-solid fa-plus"></i> Adicionar link
          </button>
        </div>
      </SecaoFicha>

      <SecaoFicha titulo="Vínculo institucional">
        <div>
          <label className="rotulo-campo">Instituição</label>
          <input
            type="text"
            disabled
            placeholder="Ex.: IFSP - Câmpus Birigui"
            className="input-padrao opacity-60 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="rotulo-campo">Título acadêmico</label>
          <select disabled className="input-padrao opacity-60 cursor-not-allowed">
            <option>Não informado</option>
          </select>
        </div>
      </SecaoFicha>
    </div>
  );
}

// 5. PRIVACIDADE — última aba de propósito (ação destrutiva nunca na
// primeira). Exportar dados (LGPD Art. 18) ainda não existe (fica
// registrado honestamente); excluir conta reaproveita
// excluir_conta_usuario() (03_funcoes_seguranca.sql, [03-O]), que já
// valida que só o próprio dono (ou quem tem usuario_excluir) pode chamar.
function AbaPrivacidade({ auth }) {
  const navigate = useNavigate();
  const [confirmacao, setConfirmacao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const { erro, reportarErro, limparErro } = useErroToast();

  const confirmado = auth.usuario && confirmacao.trim().toLowerCase() === auth.usuario.email.toLowerCase();

  const aoExcluir = async () => {
    limparErro();
    setExcluindo(true);
    try {
      await usuarioApi.remover(auth.authFetch, auth.usuario.idUsuario);
      auth.logout();
      navigate('/');
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
        <label className="block text-xs font-bold texto-erro mb-1">
          Digite "{auth.usuario?.email}" pra confirmar
        </label>
        <input
          type="text"
          value={confirmacao}
          onChange={(evento) => setConfirmacao(evento.target.value)}
          className="input-padrao mb-3"
        />
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
