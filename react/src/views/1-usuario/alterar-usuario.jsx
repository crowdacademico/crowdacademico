import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { useToast } from '../../components/layout/use-toast';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { papelApi, usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';

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
// Seção "Papéis" (03-08-2026) reaproveita os mesmos endpoints do widget
// "Papéis de um usuário" (usuario-papel-widget.jsx) — não é módulo novo,
// só uma UI melhor pro mesmo caso de uso (id_usuario já vem da URL, papel
// escolhido por nome num <select>, não digitado por ID). O widget antigo
// continua existindo, não foi removido — serve pra testar qualquer
// combinação usuário/papel sem navegar até a página de um usuário
// específico.
export function AlterarUsuario({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const [usuario, setUsuario] = useState(null);
  const [nome, setNome] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
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
      .catch((erroRequisicao) => setErro(traduzirErro(erroRequisicao)))
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
    setErro('');
    setAtribuindoPapel(true);
    try {
      const papelEscolhido = catalogoPapeis.find(
        (papel) => papel.idPapel === Number(idPapelParaAtribuir),
      );
      await usuarioPapelApi.atribuir(auth.authFetch, id, Number(idPapelParaAtribuir));
      const papeisAtualizados = await usuarioPapelApi.listarPorUsuario(auth.authFetch, id);
      setPapeisAtuais(papeisAtualizados);
      setIdPapelParaAtribuir('');
      mostrar(
        'Papel atribuído com sucesso.',
        `ID: ${id} agora tem o papel "${papelEscolhido?.nome}"`,
      );
    } catch (erroRequisicao) {
      setErro(traduzirErro(erroRequisicao));
    } finally {
      setAtribuindoPapel(false);
    }
  };

  const aoRevogarPapel = async (papel) => {
    setErro('');
    setRevogandoPapel(papel.idPapel);
    try {
      await usuarioPapelApi.remover(auth.authFetch, id, papel.idPapel);
      const papeisAtualizados = await usuarioPapelApi.listarPorUsuario(auth.authFetch, id);
      setPapeisAtuais(papeisAtualizados);
      mostrar('Papel revogado com sucesso.', `ID: ${id} perdeu o papel "${papel.nomePapel}"`);
    } catch (erroRequisicao) {
      setErro(traduzirErro(erroRequisicao));
    } finally {
      setRevogandoPapel(null);
    }
  };

  const aoSalvar = async (evento) => {
    evento.preventDefault();
    setErro('');
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
      setErro(traduzirErro(erroRequisicao));
    } finally {
      setEnviando(false);
    }
  };

  const aoRedefinirSenhaDev = async () => {
    setErro('');
    setRedefinindoSenhaDev(true);
    try {
      await usuarioApi.atualizar(auth.authFetch, id, { novaSenha: SENHA_DEV });
      mostrar('Senha redefinida com sucesso.', `ID: ${id} teve a senha redefinida para "${SENHA_DEV}"`);
    } catch (erroRequisicao) {
      setErro(traduzirErro(erroRequisicao));
    } finally {
      setRedefinindoSenhaDev(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-10 text-center border-b border-slate-100 bg-slate-50">
          <div className="w-14 h-14 bg-primary rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-5 shadow-lg">
            <i className="fa-solid fa-user-pen"></i>
          </div>
          <h2 className="text-3xl font-serif font-bold text-dark mb-2">Alterar Usuário</h2>
          <p className="text-sm text-slate-500 font-medium">
            Deixe a senha em branco para não alterá-la.
          </p>
        </div>

        {carregando ? (
          <p className="p-10 text-center text-sm text-slate-500">Carregando...</p>
        ) : !usuario ? (
          <p className="p-10 text-center text-red-600 text-sm font-bold">{erro}</p>
        ) : (
          <form onSubmit={aoSalvar} className="p-10 space-y-6">
            {erro && <p className="text-red-600 text-sm font-bold text-center">{erro}</p>}

            <CampoSomenteLeitura rotulo="id" valor={usuario.idUsuario} />
            <CampoSomenteLeitura rotulo="E-mail" valor={usuario.email} />
            <CampoSomenteLeitura
              rotulo="E-mail verificado"
              valor={usuario.emailVerificado ? 'Sim' : 'Não'}
            />

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
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

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
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

            <div className="rounded-lg border border-slate-200 p-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Papéis
              </label>

              <div className="flex flex-wrap gap-2 mb-3">
                {papeisAtuais.length === 0 && (
                  <p className="text-xs text-slate-500">Nenhum papel atribuído ainda.</p>
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

              {papeisDisponiveis.length > 0 && (
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

            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-purple-300 bg-purple-50 p-3">
              <div>
                <span className="badge badge-dev">&lt;dev&gt;</span>
                <p className="text-xs text-slate-500 mt-1">
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
      </div>
    </div>
  );
}
