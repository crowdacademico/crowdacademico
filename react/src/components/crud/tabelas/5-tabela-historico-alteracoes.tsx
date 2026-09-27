import type { ReactNode } from 'react';
import { formatarDataHora, textoSeguro } from '../../../services/constant/utils/formatacao.util';
import type { LogAuditoriaResponse, OperacaoLogAuditoria } from '../../../services/27-log-auditoria/type/log-auditoria.type';

// Últimas alterações de uma tabela do banco (log_auditoria), mais recente primeiro. Só leitura. Usada pelo
// painel "Ver log" (components/crud/log-auditoria-painel.tsx), que busca e pagina.

// Parcial de propósito: operação sem rótulo aqui (ex.: 'EXPORT') aparece com o nome cru.
const ROTULO_OPERACAO: Partial<Record<OperacaoLogAuditoria, string>> = {
  INSERT: 'Criado',
  UPDATE: 'Alterado',
  DELETE: 'Excluído',
};

// `dadosAnteriores`/`dadosNovos` guardam a linha inteira como Record<string, unknown>: o valor do campo
// renomeado é quase sempre texto, e o resto passa por textoSeguro.
function valorRenomeio(valor: unknown): ReactNode {
  if (valor === null || valor === undefined) {
    return '-';
  }
  if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
    return valor;
  }
  return textoSeguro(valor);
}

interface TabelaHistoricoAlteracoesProps {
  linhas: LogAuditoriaResponse[];
  // Quando informado (ex.: "nome"), troca a coluna "Campos alterados" por "De"/"Para" com o valor desse campo
  // antes e depois (o log já grava a linha inteira; nenhuma coluna nova no banco).
  campoRenomeio?: string;
}

export function TabelaHistoricoAlteracoes({ linhas, campoRenomeio }: TabelaHistoricoAlteracoesProps) {
  return (
    <div className="crud-tabela__wrapper">
      <table className="crud-tabela">
        <thead>
          <tr>
            <th>Registro</th>
            <th>Ação</th>
            {campoRenomeio ? (
              <>
                <th>De</th>
                <th>Para</th>
              </>
            ) : (
              <th>Campos alterados</th>
            )}
            <th>Quem</th>
            <th>Quando</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.idLog}>
              <td>{linha.identidadeRegistro}</td>
              <td>{ROTULO_OPERACAO[linha.operacao] ?? linha.operacao}</td>
              {campoRenomeio ? (
                <>
                  <td>{valorRenomeio(linha.dadosAnteriores?.[campoRenomeio])}</td>
                  <td>{valorRenomeio(linha.dadosNovos?.[campoRenomeio])}</td>
                </>
              ) : (
                <td>{linha.camposAlterados ? linha.camposAlterados.join(', ') : ''}</td>
              )}
              <td>{linha.nomeResponsavel ?? 'Sistema'}</td>
              <td>{formatarDataHora(linha.ocorridoEm)}</td>
            </tr>
          ))}
          {linhas.length === 0 && (
            <tr>
              <td colSpan={campoRenomeio ? 6 : 5}>Nenhuma alteração registrada ainda.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
