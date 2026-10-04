import { Dica } from '../../layout/tooltip';
import { nomeAmigavelPermissao } from '../../../services/2-papel-permissao/constants/permissao-nomes-amigaveis.constants';
import { chaveCelula } from '../../../services/2-papel-permissao/util/chave-celula-matriz.util';
import type { PapelResponse, PermissaoResponse } from '../../../services/2-papel-permissao/type/papel-permissao.type';

// Matriz Papel × Permissão: uma linha por permissão, uma coluna por papel, ✓ onde o papel tem a permissão.
// Cada célula é um botão que concede/revoga. Usada em Papéis (views/2-papel-permissao/matriz-papel-permissao.tsx),
// que busca os dados e faz a concessão.

interface TabelaPapelPermissaoProps {
  papeis: PapelResponse[];
  permissoes: PermissaoResponse[];
  concedidos: Set<string>;
  // Célula com a concessão/revogação em andamento (mostra "…" e fica desabilitada).
  celulaAlterando: string | null;
  aoAlternar: (papel: PapelResponse, permissao: PermissaoResponse, concedido: boolean) => void;
}

export function TabelaPapelPermissao({ papeis, permissoes, concedidos, celulaAlterando, aoAlternar }: TabelaPapelPermissaoProps) {
  return (
    <div className="overflow-x-auto">
      <table className="crud-tabela">
        <thead>
          <tr>
            <th>Permissão</th>
            {papeis.map((papel) => (
              <th key={papel.idPapel} className="text-center">
                {papel.nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissoes.map((permissao) => (
            <tr key={permissao.idPermissao}>
              {/* title com o código cru: a matriz é estreita demais para uma coluna "chave" própria; o hover
                  revela o valor literal. ÚNICO `title` nativo do sistema: `<td>` não é interativo nem focável,
                  e o propósito é revelar um valor cru, não nomear um controle (o resto usa `.dica`/`<Dica>`). */}
              <td title={permissao.nome}>{nomeAmigavelPermissao(permissao.nome)}</td>
              {papeis.map((papel, indice) => {
                const chave = chaveCelula(papel.idPapel, permissao.idPermissao);
                const temPermissao = concedidos.has(chave);
                const texto = temPermissao ? `Clique pra revogar de "${papel.nome}"` : `Clique pra conceder pra "${papel.nome}"`;
                return (
                  <td key={papel.idPapel} className="text-center">
                    <button
                      type="button"
                      onClick={() => aoAlternar(papel, permissao, temPermissao)}
                      disabled={celulaAlterando === chave}
                      aria-label={texto}
                      className={
                        'dica w-7 h-7 rounded-md enfase transition-colors disabled:opacity-60 disabled:cursor-wait ' +
                        (temPermissao
                          ? 'texto-sucesso hover-fundo-sucesso'
                          : 'texto-fraco opacity-50 hover-fundo-sutil hover:opacity-100')
                      }
                    >
                      {celulaAlterando === chave ? '…' : temPermissao ? '✓' : '-'}
                      <Dica texto={texto} direita={indice === papeis.length - 1} />
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
          {permissoes.length === 0 && (
            <tr>
              <td colSpan={papeis.length + 1}>Nenhuma permissão cadastrada.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
