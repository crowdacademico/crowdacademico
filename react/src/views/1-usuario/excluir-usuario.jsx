import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';

// Terceira view do padrão "uma página por operação de CRUD" — mostra os
// dados de verdade antes de excluir (em vez do window.confirm() genérico
// que só mostrava o nome), com botão de confirmar/cancelar no fim.
export function ExcluirUsuario({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    usuarioApi
      .buscar(auth.authFetch, id)
      .then(setUsuario)
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const aoConfirmar = async () => {
    limparErro();
    setExcluindo(true);
    try {
      await usuarioApi.remover(auth.authFetch, id);
      mostrar('Usuário excluído com sucesso.', `ID: ${id} foi excluído`);
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
      setExcluindo(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-triangle-exclamation"
      titulo="Excluir Usuário"
      subtitulo="Esta ação não pode ser desfeita."
      variante="perigo"
    >
      {carregando ? (
        <p className="p-10 text-center text-sm text-slate-600">Carregando...</p>
      ) : !usuario ? (
        <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>
      ) : (
        <div className="p-10 space-y-6">
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <CampoSomenteLeitura rotulo="id" valor={usuario.idUsuario} />
            <CampoSomenteLeitura rotulo="Nome" valor={usuario.nome} />
            <CampoSomenteLeitura rotulo="E-mail" valor={usuario.email} />
            <CampoSomenteLeitura
              rotulo="E-mail verificado"
              valor={usuario.emailVerificado ? 'Sim' : 'Não'}
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
    </CartaoFormulario>
  );
}
