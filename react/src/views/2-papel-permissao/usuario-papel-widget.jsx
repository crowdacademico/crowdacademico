import { useState } from 'react';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';

// Não cabe no GenericTable — não é "lista tudo", é "lista os papéis DE UM
// usuário específico" (pol_usuariopapel_select: só o próprio dono ou quem
// tem 'papel_gerenciar' vê). Widget separado, de propósito.
export function UsuarioPapelWidget({ authFetch }) {
  const [idUsuario, setIdUsuario] = useState('');
  const [idPapel, setIdPapel] = useState('');
  const [papeis, setPapeis] = useState(null);
  const [erro, setErro] = useState('');

  const buscar = async () => {
    setErro('');
    try {
      const resultado = await usuarioPapelApi.listarPorUsuario(authFetch, idUsuario);
      setPapeis(resultado);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    }
  };

  const atribuir = async () => {
    setErro('');
    try {
      await usuarioPapelApi.atribuir(authFetch, Number(idUsuario), Number(idPapel));
      buscar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    }
  };

  const revogar = async (papel) => {
    setErro('');
    try {
      await usuarioPapelApi.remover(authFetch, Number(idUsuario), papel.idPapel);
      buscar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    }
  };

  return (
    <section className="crud-secao">
      <h2>Papéis de um usuário (usuario_papel)</h2>
      {erro && <p className="crud-erro">{erro}</p>}
      <div className="crud-form-criar">
        <input
          placeholder="id do usuário"
          value={idUsuario}
          onChange={(evento) => setIdUsuario(evento.target.value)}
        />
        <button onClick={buscar} disabled={!idUsuario}>
          Ver papéis
        </button>
        <input
          placeholder="id do papel pra atribuir"
          value={idPapel}
          onChange={(evento) => setIdPapel(evento.target.value)}
        />
        <button onClick={atribuir} disabled={!idUsuario || !idPapel}>
          Atribuir
        </button>
      </div>
      {papeis && (
        <table className="crud-tabela">
          <thead>
            <tr>
              <th>id_papel</th>
              <th>nome</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {papeis.map((papel) => (
              <tr key={papel.idPapel}>
                <td>{papel.idPapel}</td>
                <td>{papel.nomePapel}</td>
                <td>
                  <button onClick={() => revogar(papel)}>Revogar</button>
                </td>
              </tr>
            ))}
            {papeis.length === 0 && (
              <tr>
                <td colSpan={3}>
                  Nenhum papel visível (ou o usuário não tem nenhum, ou você
                  não tem permissão pra ver os papéis de outro usuário).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
