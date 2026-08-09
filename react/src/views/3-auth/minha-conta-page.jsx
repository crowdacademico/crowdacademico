import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';
import { ControleFonte } from '../../components/layout/controle-fonte';
import { ControleTema } from '../../components/layout/controle-tema';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { sessaoApi } from '../../services/3-auth/api/sessao.api';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';

// Minha Conta (09-08-2026, Bloco E do prompt do Claude Web) — não é um
// formulário só, é uma área com seções independentes (reaproveita o
// espírito de SecaoFicha: título pequeno separando blocos), cada uma
// salva por conta própria. Ordem seguida: Perfil, Segurança (recomendação
// do Claude Web — "Sessões Ativas é o item de maior impacto percebido"),
// Preferências, Meus Papéis, Privacidade, Perfil Acadêmico.
export function MinhaConta({ auth }) {
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <AvatarUsuario nome={auth.usuario?.nome} tamanho="lg" />
        <div className="min-w-0">
          <h2 className="text-2xl font-serif font-bold texto-forte truncate">Minha Conta</h2>
          <p className="text-sm texto-fraco truncate">{auth.usuario?.email}</p>
        </div>
      </div>

      <SecaoPerfil auth={auth} />
      <SecaoSeguranca auth={auth} />
      <SecaoPreferencias />
      <SecaoMeusPapeis auth={auth} />
      <SecaoPrivacidade auth={auth} />
      <SecaoPerfilAcademico />
    </div>
  );
}

function Painel({ icone, titulo, subtitulo, children }) {
  return (
    <section className="fundo-cartao border borda-padrao rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b borda-padrao fundo-sutil flex items-center gap-3">
        <i className={'fa-solid ' + icone + ' text-primary'}></i>
        <div>
          <h3 className="font-bold texto-forte">{titulo}</h3>
          {subtitulo && <p className="text-xs texto-fraco">{subtitulo}</p>}
        </div>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </section>
  );
}

// 1. PERFIL — nome editável; e-mail só leitura (trocar e-mail exigiria
// reverificação — caminho deixado preparado pro dia que existir, ver
// verificacao_email/módulo 4-mail, mas não implementado agora).
function SecaoPerfil({ auth }) {
  const [nome, setNome] = useState(auth.usuario?.nome ?? '');
  const [enviando, setEnviando] = useState(false);
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();

  const sujo = nome.trim() !== (auth.usuario?.nome ?? '') && nome.trim().length >= 2;

  const aoSalvar = async (evento) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      const usuarioAtualizado = await usuarioApi.atualizar(auth.authFetch, auth.usuario.idUsuario, {
        nome: nome.trim(),
      });
      auth.atualizarUsuarioLocal(usuarioAtualizado);
      mostrar('Perfil atualizado com sucesso.');
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Painel icone="fa-user" titulo="Perfil">
      <form onSubmit={aoSalvar} className="space-y-4">
        {erro && <p className="text-sm texto-erro">{erro}</p>}
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
          <p className="text-xs texto-fraco mt-1">
            Trocar o e-mail ainda não é possível neste protótipo — exigiria reverificação, que
            depende do módulo de e-mail.
          </p>
        </div>
        <button type="submit" disabled={!sujo || enviando} className="btn btn-primary">
          {enviando ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </form>
    </Painel>
  );
}

// 2. SEGURANÇA — senha (exige a atual) + Sessões Ativas (o item de maior
// impacto percebido, segundo o próprio Claude Web).
function SecaoSeguranca({ auth }) {
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
    <Painel icone="fa-shield-halved" titulo="Segurança">
      <form onSubmit={aoTrocarSenha} className="space-y-4 pb-4 border-b borda-padrao">
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

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold texto-padrao">Sessões ativas</h4>
          {sessoes && sessoes.length > 1 && (
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

        {sessoes === null ? (
          <p className="text-sm texto-fraco">Carregando...</p>
        ) : sessoes.length === 0 ? (
          <p className="text-sm texto-fraco">Nenhuma sessão ativa encontrada.</p>
        ) : (
          <ul className="space-y-2">
            {sessoes.map((sessao) => (
              <li
                key={sessao.idSessao}
                className="flex items-center justify-between gap-3 rounded-lg border borda-padrao p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="texto-forte truncate">
                    {sessao.userAgent ?? 'Dispositivo desconhecido'}
                    {sessao.atual && (
                      <span className="ml-2 badge badge-sucesso">Esta sessão</span>
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
                    className="text-xs font-bold texto-erro hover:underline shrink-0"
                  >
                    {encerrando === sessao.idSessao ? 'Encerrando...' : 'Encerrar'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Painel>
  );
}

// 3. PREFERÊNCIAS — tema/fonte já existem soltas no cabeçalho
// (acessibilidade não deve exigir dois cliques, recomendação do Claude
// Web) — aqui é só o mesmo controle, visível e explicado, não uma cópia
// duplicada de estado (os dois componentes leem/escrevem o mesmo
// localStorage, ficam sincronizados sozinhos).
function SecaoPreferencias() {
  return (
    <Painel
      icone="fa-sliders"
      titulo="Preferências"
      subtitulo="Os mesmos controles do cabeçalho — mudar aqui ou lá dá no mesmo."
    >
      <div className="flex items-center gap-6">
        <div>
          <p className="rotulo-campo mb-2">Tema</p>
          <ControleTema />
        </div>
        <div>
          <p className="rotulo-campo mb-2">Tamanho da fonte</p>
          <ControleFonte />
        </div>
      </div>
    </Painel>
  );
}

// 4. MEUS PAPÉIS — só leitura.
function SecaoMeusPapeis({ auth }) {
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
    <Painel
      icone="fa-user-tag"
      titulo="Meus papéis"
      subtitulo="O que você é na plataforma — só leitura aqui."
    >
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
    </Painel>
  );
}

// 5. PRIVACIDADE — exportar dados (LGPD Art. 18) ainda não existe (fica
// registrado honestamente, não fingido); excluir conta reaproveita
// excluir_conta_usuario() (03_funcoes_seguranca.sql, [03-F]), que já
// valida que só o próprio dono (ou quem tem usuario_excluir) pode chamar.
function SecaoPrivacidade({ auth }) {
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
    <Painel icone="fa-lock" titulo="Privacidade">
      <div className="flex items-center justify-between gap-3 rounded-lg border borda-padrao p-3">
        <div>
          <p className="text-sm font-semibold texto-padrao">Exportar meus dados</p>
          <p className="text-xs texto-fraco">
            Direito de portabilidade (LGPD Art. 18) — ainda não implementado neste protótipo.
          </p>
        </div>
        <button type="button" disabled className="btn btn-secondary opacity-50 cursor-not-allowed">
          Exportar
        </button>
      </div>

      <div className="rounded-lg border borda-forte fundo-erro p-4">
        <p className="text-sm font-bold texto-erro mb-2">Excluir minha conta</p>
        <p className="text-xs texto-erro mb-3">
          Marca sua conta como excluída (exclusão lógica) — o login para de funcionar na hora.
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
    </Painel>
  );
}

// 6. PERFIL ACADÊMICO — só relevante pra quem é pesquisador; módulo
// 6-perfil-pesquisador ainda não existe (só a pasta reservada).
function SecaoPerfilAcademico() {
  return (
    <Painel icone="fa-graduation-cap" titulo="Perfil acadêmico">
      <p className="text-sm texto-fraco">
        Módulo de perfil de pesquisador ainda não foi implementado — quando existir, aparece
        aqui pra quem tiver o papel "pesquisador".
      </p>
    </Painel>
  );
}
