import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useToast } from '../../components/layout/use-toast';
import { papelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';

// Só existe (03-08-2026) porque `papel.codigo` (ver 01_extensoes_enums_
// tabelas.sql [01-B]) tornou seguro renomear um papel pelo painel — antes,
// 3 triggers de RBAC reconheciam 'admin'/'pesquisador'/'usuario' pelo TEXTO
// do nome, e renomear teria quebrado essas automações em silêncio. Agora
// as triggers leem `codigo` (nunca exposto/editável aqui), então `nome` (o
// rótulo) pode mudar livremente sem risco nenhum pro RBAC.
//
// Só "Alterar" existe pra papel (sem Consultar — a listagem já mostra
// id/nome, um 3º campo não ganharia nada; sem Excluir — apagar um papel
// usado em usuario_papel/papel_permissao é decisão maior, fora de escopo).
export function AlterarPapel({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const [nome, setNome] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [encontrado, setEncontrado] = useState(false);

  useEffect(() => {
    // Não existe GET /papel/:id (só findall) — a lista inteira é pequena
    // (7 papéis), buscar tudo e filtrar pelo id é mais simples que criar
    // um endpoint novo só pra isso.
    papelApi
      .listar(auth.authFetch)
      .then((papeis) => {
        const papel = papeis.find((p) => String(p.idPapel) === id);
        if (papel) {
          setNome(papel.nome);
          setEncontrado(true);
        }
      })
      .catch((erroRequisicao) => setErro(traduzirErro(erroRequisicao)))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const aoSalvar = async (evento) => {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await papelApi.atualizar(auth.authFetch, id, { nome });
      mostrar('Papel alterado com sucesso.', `ID: ${id} foi alterado`);
      navigate(-1);
    } catch (erroRequisicao) {
      setErro(traduzirErro(erroRequisicao));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-10 text-center border-b border-slate-100 bg-slate-50">
          <div className="w-14 h-14 bg-primary rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-5 shadow-lg">
            <i className="fa-solid fa-user-tag"></i>
          </div>
          <h2 className="text-3xl font-serif font-bold text-dark mb-2">Alterar Papel</h2>
          <p className="text-sm text-slate-500 font-medium">
            Só o nome exibido muda — o identificador interno usado pelas regras do
            sistema nunca é afetado.
          </p>
        </div>

        {carregando ? (
          <p className="p-10 text-center text-sm text-slate-500">Carregando...</p>
        ) : !encontrado ? (
          <p className="p-10 text-center text-red-600 text-sm font-bold">
            {erro || `Papel ${id} não encontrado.`}
          </p>
        ) : (
          <form onSubmit={aoSalvar} className="p-10 space-y-6">
            {erro && <p className="text-red-600 text-sm font-bold text-center">{erro}</p>}

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                id
              </label>
              <input type="text" value={id} disabled className="input-padrao opacity-60" />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Nome
              </label>
              <input
                type="text"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                required
                maxLength={50}
                className="input-padrao"
              />
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
