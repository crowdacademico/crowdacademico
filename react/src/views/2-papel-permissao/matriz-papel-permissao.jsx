import { useEffect, useState } from 'react';
import { papelPermissaoApi } from '../../services/2-papel-permissao/api/papel-permissao.api';

// Substituiu a antiga tabela "Papel × Permissão" (linhas repetindo
// "admin | admin | ..." — achado do Claude Web: ~40 linhas pra mostrar o
// que uma matriz mostra em muito menos espaço). Não usa GenericTable — é
// um formato fundamentalmente diferente (matriz, não lista de linha+ações),
// só leitura, sem criar/editar/excluir (RBAC continua gerenciado direto no
// banco, ver 2-papel-permissao/papel-permissao.module.ts no Nest).
export function MatrizPapelPermissao({ authFetch }) {
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    papelPermissaoApi
      .listar(authFetch)
      .then(setLinhas)
      .catch((erroRequisicao) => setErro(erroRequisicao.message))
      .finally(() => setCarregando(false));
  }, [authFetch]);

  if (carregando) {
    return (
      <section className="crud-secao">
        <h2>Papel × Permissão</h2>
        <div className="animate-pulse h-32 bg-slate-100 rounded"></div>
      </section>
    );
  }

  if (erro) {
    return (
      <section className="crud-secao">
        <h2>Papel × Permissão</h2>
        <p className="crud-erro">{erro}</p>
      </section>
    );
  }

  const papeis = [...new Map(linhas.map((l) => [l.idPapel, l.nomePapel])).entries()].sort(
    (a, b) => a[1].localeCompare(b[1]),
  );
  const permissoes = [
    ...new Map(linhas.map((l) => [l.idPermissao, l.nomePermissao])).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const concedido = new Set(linhas.map((l) => `${l.idPapel}-${l.idPermissao}`));

  return (
    <section className="crud-secao">
      <h2>Papel × Permissão</h2>
      <div className="overflow-x-auto">
        <table className="crud-tabela">
          <thead>
            <tr>
              <th>Permissão</th>
              {papeis.map(([idPapel, nomePapel]) => (
                <th key={idPapel} className="text-center">
                  {nomePapel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissoes.map(([idPermissao, nomePermissao]) => (
              <tr key={idPermissao}>
                <td>{nomePermissao}</td>
                {papeis.map(([idPapel]) => (
                  <td key={idPapel} className="text-center">
                    {concedido.has(`${idPapel}-${idPermissao}`) ? (
                      <span className="text-emerald-600 font-bold">✓</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {permissoes.length === 0 && (
              <tr>
                <td colSpan={papeis.length + 1}>Nenhum vínculo papel/permissão.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
