import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoTextboxConsulta } from '../../components/crud/campo-textbox-consulta';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';

// "Consultar" — botão do meio entre Alterar e Excluir (GenericTable).
// Mostra TODOS os dados do usuário ligados ao banco (UsuarioResponseDto
// inteiro), sempre em textbox desabilitado — não salva nada, campo sem
// valor fica vazio naturalmente.
export function ConsultarUsuario({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [papeis, setPapeis] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([
      usuarioApi.buscar(auth.authFetch, id),
      // Não existe (nem deveria existir) uma coluna "é pesquisador" em
      // usuario — isso já é decidido pelo RBAC (usuario_papel), então é
      // isso que a consulta usa, sem duplicar a informação em outro
      // lugar. Se um dia o módulo 6-perfil-pesquisador for construído, o
      // perfil completo (vínculo institucional, título acadêmico, links
      // etc.) entra aqui do mesmo jeito, sem precisar de coluna nova.
      usuarioPapelApi.listarPorUsuario(auth.authFetch, id).catch(() => []),
    ])
      .then(([dadosUsuario, papeisUsuario]) => {
        setUsuario(dadosUsuario);
        setPapeis(papeisUsuario);
      })
      .catch((erroRequisicao) => setErro(traduzirErro(erroRequisicao)))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const ehPesquisador = papeis?.some((papel) => papel.nomePapel === 'pesquisador');

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-10 text-center border-b border-slate-100 bg-slate-50">
          <div className="w-14 h-14 bg-primary rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-5 shadow-lg">
            <i className="fa-solid fa-circle-user"></i>
          </div>
          <h2 className="text-3xl font-serif font-bold text-dark mb-2">Consultar Usuário</h2>
        </div>

        {carregando ? (
          <p className="p-10 text-center text-sm text-slate-500">Carregando...</p>
        ) : !usuario ? (
          <p className="p-10 text-center text-red-600 text-sm font-bold">{erro}</p>
        ) : (
          <div className="p-10 space-y-6">
            <CampoTextboxConsulta rotulo="id" valor={usuario.idUsuario} />
            <CampoTextboxConsulta rotulo="Nome" valor={usuario.nome} />
            <CampoTextboxConsulta rotulo="E-mail" valor={usuario.email} />
            <CampoTextboxConsulta rotulo="Id da imagem de perfil" valor={usuario.idImagemPerfil} />
            <CampoTextboxConsulta
              rotulo="E-mail verificado"
              valor={usuario.emailVerificado ? 'Sim' : 'Não'}
            />
            <CampoTextboxConsulta
              rotulo="Criado em"
              valor={usuario.criadoEm && new Date(usuario.criadoEm).toLocaleString('pt-BR')}
            />
            <CampoTextboxConsulta
              rotulo="É pesquisador?"
              valor={papeis === null ? '' : ehPesquisador ? 'Sim' : 'Não'}
            />
            <CampoTextboxConsulta
              rotulo="Papéis"
              valor={papeis?.map((papel) => papel.nomePapel).join(', ')}
            />

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary w-full"
            >
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
