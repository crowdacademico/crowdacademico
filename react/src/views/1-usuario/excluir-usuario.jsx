import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { useToast } from '../../components/layout/use-toast';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';

// Terceira view do padrão "uma página por operação de CRUD" — mostra os
// dados de verdade antes de excluir (em vez do window.confirm() genérico
// que só mostrava o nome), com botão de confirmar/cancelar no fim.
export function ExcluirUsuario({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    usuarioApi
      .buscar(auth.authFetch, id)
      .then(setUsuario)
      .catch((erroRequisicao) => setErro(erroRequisicao.message))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const aoConfirmar = async () => {
    setErro('');
    setExcluindo(true);
    try {
      await usuarioApi.remover(auth.authFetch, id);
      mostrar('Usuário excluído com sucesso.');
      navigate(-1);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
      setExcluindo(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-10 text-center border-b border-slate-100 bg-slate-50">
          <div className="w-14 h-14 bg-red-100 rounded-2xl mx-auto flex items-center justify-center text-red-600 font-bold text-2xl mb-5 shadow-lg">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <h2 className="text-3xl font-serif font-bold text-dark mb-2">Excluir Usuário</h2>
          <p className="text-sm text-slate-500 font-medium">Esta ação não pode ser desfeita.</p>
        </div>

        {carregando ? (
          <p className="p-10 text-center text-sm text-slate-500">Carregando...</p>
        ) : !usuario ? (
          <p className="p-10 text-center text-red-600 text-sm font-bold">{erro}</p>
        ) : (
          <div className="p-10 space-y-6">
            {erro && <p className="text-red-600 text-sm font-bold text-center">{erro}</p>}

            <CampoSomenteLeitura rotulo="id" valor={usuario.idUsuario} />
            <CampoSomenteLeitura rotulo="Nome" valor={usuario.nome} />
            <CampoSomenteLeitura rotulo="E-mail" valor={usuario.email} />
            <CampoSomenteLeitura
              rotulo="E-mail verificado"
              valor={usuario.emailVerificado ? 'Sim' : 'Não'}
            />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={aoConfirmar}
                disabled={excluindo}
                className="btn btn-danger flex-1"
              >
                {excluindo ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
