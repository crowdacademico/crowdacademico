import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { papelApi, usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';

// Precisa bater com o hash seedado em arquivos_banco_dados/07_seed_dados.sql
// ([07-D-1]) — se alguém trocar a senha de dev do seed, troca aqui também.
// Só existe pra dar um jeito rápido de voltar a ter uma senha CONHECIDA pra
// testar login depois que a senha real de alguém foi trocada/esquecida —
// nunca em produção (ver selo <dev> no botão abaixo).
const SENHA_DEV = 'DevTcc123!';

// Segunda view do padrão "uma página por operação de CRUD" (a primeira foi
// criar-usuario.jsx) — pedido do Lucas, 02-08-2026: Alterar/Excluir saem de
// dentro da tabela (GenericTable) e viram rota própria, com todos os dados
// visíveis e um botão de confirmar/cancelar no fim, em vez de edição em
// linha misturada com a listagem.
//
// Seções via <SecaoFicha> (09-08-2026, "mesmo estilo que já usei em
// Consultar" — pedido do Lucas) — reaproveita o MESMO componente de
// ficha-consulta.jsx aqui, mesmo sendo formulário editável: o "estilo" que
// o Lucas gostou (título pequeno maiúsculo separando blocos) não é
// exclusivo de campo somente-leitura, serve pra organizar qualquer grupo
// de campos.
export function AlterarUsuario({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [usuario, setUsuario] = useState(null);
  const [nome, setNome] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [redefinindoSenhaDev, setRedefinindoSenhaDev] = useState(false);
  // Papéis do usuário — pedido do Lucas (03-08-2026): "criar um usuário e
  // promover ele a um cargo, incluindo o de administrador", pela interface,
  // não digitando ID cru (o widget "Papéis de um usuário" já fazia isso,
  // mas pedindo o id_usuario na mão — aqui já se sabe de quem é).
  const [papeisAtuais, setPapeisAtuais] = useState([]);
  const [catalogoPapeis, setCatalogoPapeis] = useState([]);
  const [idPapelParaAtribuir, setIdPapelParaAtribuir] = useState('');
  const [atribuindoPapel, setAtribuindoPapel] = useState(false);
  const [revogandoPapel, setRevogandoPapel] = useState(null);
  const [desbloqueando, setDesbloqueando] = useState(false);

  useEffect(() => {
    Promise.all([
      usuarioApi.buscar(auth.authFetch, id),
      usuarioPapelApi.listarPorUsuario(auth.authFetch, id).catch(() => []),
      papelApi.listar(auth.authFetch),
    ])
      .then(([dadosUsuario, papeisDoUsuario, catalogo]) => {
        setUsuario(dadosUsuario);
        setNome(dadosUsuario.nome);
        setPapeisAtuais(papeisDoUsuario);
        setCatalogoPapeis(catalogo);
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Só os papéis que este usuário AINDA não tem — evita tentar atribuir de
  // novo um papel que já está na lista de cima (o backend recusaria com
  // 409, mas nem oferecer a opção é mais claro que deixar tentar e falhar).
  const papeisDisponiveis = catalogoPapeis.filter(
    (papel) => !papeisAtuais.some((atual) => atual.idPapel === papel.idPapel),
  );

  const aoAtribuirPapel = async () => {
    if (!idPapelParaAtribuir) {
      return;
    }
    limparErro();
    setAtribuindoPapel(true);
    try {
      const papelEscolhido = catalogoPapeis.find(
        (papel) => papel.idPapel === Number(idPapelParaAtribuir),
      );
      // `id` vem de useParams() — SEMPRE string, mesmo quando a URL só tem
      // dígitos (ex.: "/usuarios/8/alterar" → id === "8", não 8). O corpo
      // desta requisição é validado por AtribuirPapelRequestDto com
      // `@IsInt()` de verdade (diferente da URL de baixo, em
      // aoRevogarPapel, onde o Nest converte sozinho via ParseIntPipe) —
      // sem o Number() aqui, "idUsuario" chegava como texto e a validação
      // rejeitava com "idUsuario must be an integer number".
      await usuarioPapelApi.atribuir(auth.authFetch, Number(id), Number(idPapelParaAtribuir));
      const papeisAtualizados = await usuarioPapelApi.listarPorUsuario(auth.authFetch, id);
      setPapeisAtuais(papeisAtualizados);
      setIdPapelParaAtribuir('');
      mostrar(
        'Papel atribuído com sucesso.',
        `ID: ${id} agora tem o papel "${papelEscolhido?.nome}"`,
      );
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setAtribuindoPapel(false);
    }
  };

  const aoRevogarPapel = async (papel) => {
    limparErro();
    setRevogandoPapel(papel.idPapel);
    try {
      await usuarioPapelApi.remover(auth.authFetch, id, papel.idPapel);
      const papeisAtualizados = await usuarioPapelApi.listarPorUsuario(auth.authFetch, id);
      setPapeisAtuais(papeisAtualizados);
      mostrar('Papel revogado com sucesso.', `ID: ${id} perdeu o papel "${papel.nomePapel}"`);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setRevogandoPapel(null);
    }
  };

  const aoSalvar = async (evento) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      const dados = { nome };
      if (novaSenha) {
        dados.novaSenha = novaSenha;
      }
      await usuarioApi.atualizar(auth.authFetch, id, dados);
      mostrar('Usuário alterado com sucesso.', `ID: ${id} foi alterado`);
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  // liberar_bloqueio_login() (03_funcoes_seguranca.sql) existia no banco
  // desde sempre, mas nenhum endpoint chamava ela — achado ao investigar
  // "o que falta no painel admin" (03-08-2026, pedido do Lucas): uma
  // conta bloqueada por excesso de tentativas de login não tinha NENHUM
  // jeito de ser desbloqueada pelo painel, só direto no banco. Botão
  // sempre visível (não é recurso <dev> — é uma ação administrativa de
  // verdade); clicar numa conta que não está bloqueada é inofensivo (só
  // zera campos que já estavam zerados).
  const aoDesbloquear = async () => {
    limparErro();
    setDesbloqueando(true);
    try {
      await usuarioApi.desbloquear(auth.authFetch, id);
      mostrar('Login desbloqueado com sucesso.', `ID: ${id} pode tentar logar novamente`);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setDesbloqueando(false);
    }
  };

  const aoRedefinirSenhaDev = async () => {
    limparErro();
    setRedefinindoSenhaDev(true);
    try {
      await usuarioApi.atualizar(auth.authFetch, id, { novaSenha: SENHA_DEV });
      mostrar('Senha redefinida com sucesso.', `ID: ${id} teve a senha redefinida para "${SENHA_DEV}"`);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setRedefinindoSenhaDev(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-user-pen"
      titulo="Alterar Usuário"
      subtitulo="Deixe a senha em branco para não alterá-la."
    >
      {carregando ? (
        <p className="p-10 text-center text-sm text-slate-600">Carregando...</p>
      ) : !usuario ? (
        <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>
      ) : (
        <form onSubmit={aoSalvar} className="p-10 space-y-6">
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          <SecaoFicha titulo="Dados da conta">
            <CampoSomenteLeitura rotulo="id" valor={usuario.idUsuario} />
            <CampoSomenteLeitura rotulo="E-mail" valor={usuario.email} />
            <CampoSomenteLeitura
              rotulo="E-mail verificado"
              valor={usuario.emailVerificado ? 'Sim' : 'Não'}
            />
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Nome
              </label>
              <input
                type="text"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                required
                className="input-padrao"
              />
            </div>
          </SecaoFicha>

          <SecaoFicha titulo="Acesso">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Nova senha (opcional)
              </label>
              <input
                type="password"
                value={novaSenha}
                onChange={(evento) => setNovaSenha(evento.target.value)}
                className="input-padrao"
                placeholder="••••••••"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-lg border border-slate-300 p-3">
              <p className="text-xs text-slate-600">
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

            <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-lg border border-dashed border-purple-300 bg-purple-50 p-3">
              <div>
                <span className="badge badge-dev">&lt;dev&gt;</span>
                <p className="text-xs text-slate-600 mt-1">
                  Redefine a senha direto pra "{SENHA_DEV}", sem digitar nada. Só pra testar
                  login.
                </p>
              </div>
              <button
                type="button"
                onClick={aoRedefinirSenhaDev}
                disabled={redefinindoSenhaDev}
                className="btn btn-secondary shrink-0"
              >
                {redefinindoSenhaDev ? 'Redefinindo...' : 'Redefinir senha dev'}
              </button>
            </div>
          </SecaoFicha>

          <SecaoFicha titulo="Papéis">
            <div className="sm:col-span-2">
              <div className="flex flex-wrap gap-2 mb-3">
                {papeisAtuais.length === 0 && (
                  <p className="text-xs text-slate-600">Nenhum papel atribuído ainda.</p>
                )}
                {papeisAtuais.map((papel) => (
                  <span
                    key={papel.idPapel}
                    className="badge badge-neutro flex items-center gap-2"
                  >
                    {papel.nomePapel}
                    <button
                      type="button"
                      onClick={() => aoRevogarPapel(papel)}
                      disabled={revogandoPapel === papel.idPapel}
                      className="text-red-600 font-bold hover:text-red-800 disabled:opacity-50"
                      title={`Revogar "${papel.nomePapel}"`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {papeisDisponiveis.length === 0 ? (
                // ANTES (achado do Lucas, 03-08-2026: "não consigo atribuir
                // papel pra ninguém"): este bloco inteiro só existia
                // `{papeisDisponiveis.length > 0 && (...)}` — quando não
                // sobrava nenhum papel pra atribuir (ex.: catálogo ainda não
                // carregou, ou o usuário já tem todos), o seletor E o botão
                // simplesmente SUMIAM da tela, sem nenhuma mensagem
                // explicando por quê — parecia "atribuir não funciona", não
                // "não há nada pra atribuir agora". Corrigido: sempre mostra
                // alguma coisa, nunca um vazio sem explicação.
                <p className="text-xs text-slate-600">
                  Nenhum papel adicional disponível pra atribuir (o catálogo ainda
                  está carregando, ou este usuário já tem todos os papéis existentes).
                </p>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={idPapelParaAtribuir}
                    onChange={(evento) => setIdPapelParaAtribuir(evento.target.value)}
                    className="input-padrao flex-1"
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
                    className="btn btn-primary shrink-0"
                  >
                    {atribuindoPapel ? 'Atribuindo...' : 'Atribuir'}
                  </button>
                </div>
              )}
            </div>
          </SecaoFicha>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button type="submit" disabled={enviando} className="btn btn-primary flex-1">
              {enviando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </CartaoFormulario>
  );
}
