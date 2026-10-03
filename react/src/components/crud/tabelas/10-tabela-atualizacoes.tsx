// Atualizações publicadas numa campanha (título, fase, se está visível), com o botão de ocultar/reverter. Usada no
// Campo de Testes (T4, views/campo-testes/vida-campanha-ativa.tsx), que busca e faz a alteração.

import { AcaoLinha } from '../acao-linha';

// `atualizacao-campanha` ainda não tem type/api formal em services/: formato do DTO do Nest.
export interface Atualizacao {
  idAtualizacao: number;
  idCampanha: number;
  titulo: string;
  conteudo: string;
  // `fase`/`tipo` são `null` de verdade no DTO do Nest.
  fase: string | null;
  tipo: string | null;
  ativo: boolean;
}

interface TabelaAtualizacoesProps {
  atualizacoes: Atualizacao[];
  aoAlternarAtivo: (atualizacao: Atualizacao) => void;
}

export function TabelaAtualizacoes({ atualizacoes, aoAlternarAtivo }: TabelaAtualizacoesProps) {
  return (
    <div className="crud-tabela__wrapper">
      <table className="crud-tabela mb-4">
        <thead>
          <tr>
            <th>Título</th>
            <th>Fase</th>
            <th className="crud-tabela__celula--centralizada">Ativo</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {atualizacoes.map((item) => (
            <tr key={item.idAtualizacao}>
              <td>{item.titulo}</td>
              <td>{item.fase ?? '-'}</td>
              <td className="crud-tabela__celula--centralizada">
                <span className={`badge ${item.ativo ? 'badge-sucesso' : 'badge-neutro'}`}>{item.ativo ? 'Sim' : 'Não'}</span>
              </td>
              <td>
                {/* AcaoLinha (ícone + texto), como nas outras tabelas: quando a tabela aperta, o texto some e o ícone
                    fica, em vez de o texto crescer junto com os ícones. */}
                <AcaoLinha
                  rotulo={item.ativo ? 'Ocultar' : 'Reverter'}
                  icone={item.ativo ? 'fa-eye-slash' : 'fa-rotate-left'}
                  onClick={() => aoAlternarAtivo(item)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
