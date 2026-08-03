import { useState } from 'react';
import { Tooltip } from '../../components/layout/tooltip';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';

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
      setErro(traduzirErro(erroRequisicao));
    }
  };

  const atribuir = async () => {
    setErro('');
    try {
      await usuarioPapelApi.atribuir(authFetch, Number(idUsuario), Number(idPapel));
      buscar();
    } catch (erroRequisicao) {
      setErro(traduzirErro(erroRequisicao));
    }
  };

  const revogar = async (papel) => {
    setErro('');
    try {
      await usuarioPapelApi.remover(authFetch, Number(idUsuario), papel.idPapel);
      buscar();
    } catch (erroRequisicao) {
      setErro(traduzirErro(erroRequisicao));
    }
  };

  return (
    <section className="crud-secao">
      <h2 className="flex items-center">
        Papéis de um usuário (usuario_papel)
        <Tooltip
          texto="Normalmente estas 3 ações (ver, atribuir, revogar) exigem login, porque a regra de acesso é: só o próprio dono ou quem tem a permissão 'papel_gerenciar' pode ver ou mudar papel de outro usuário. Está desativado agora só para facilitar o desenvolvimento."
        />
      </h2>
      {erro && <p className="crud-erro">{erro}</p>}

      <div className="crud-form-criar">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Id do usuário
          <input
            className="input-padrao"
            value={idUsuario}
            onChange={(evento) => setIdUsuario(evento.target.value)}
          />
        </label>
        <button className="btn btn-primary" onClick={buscar} disabled={!idUsuario}>
          Ver papéis
        </button>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Id do papel pra atribuir
          <input
            className="input-padrao"
            value={idPapel}
            onChange={(evento) => setIdPapel(evento.target.value)}
          />
        </label>
        <button
          className="btn btn-primary"
          onClick={atribuir}
          disabled={!idUsuario || !idPapel}
        >
          Atribuir
        </button>
      </div>

      {papeis && (
        <table className="crud-tabela mt-3">
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
                  <button className="btn btn-danger" onClick={() => revogar(papel)}>
                    Revogar
                  </button>
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
