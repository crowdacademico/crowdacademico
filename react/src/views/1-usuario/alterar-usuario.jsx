import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { useToast } from '../../components/layout/use-toast';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';

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

  useEffect(() => {
    usuarioApi
      .buscar(auth.authFetch, id)
      .then((dados) => {
        setUsuario(dados);
        setNome(dados.nome);
      })
      .catch((erroRequisicao) => setErro(erroRequisicao.message))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      mostrar('Usuário atualizado com sucesso.');
      navigate(-1);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setEnviando(false);
    }
  };

  const aoRedefinirSenhaDev = async () => {
    setErro('');
    setRedefinindoSenhaDev(true);
    try {
      await usuarioApi.atualizar(auth.authFetch, id, { novaSenha: SENHA_DEV });
      mostrar(`Senha redefinida para a senha de desenvolvimento (${SENHA_DEV}).`);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
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
