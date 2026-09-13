import { useState } from 'react';
import { LogAuditoriaPainel } from './log-auditoria-painel';
import type { ResultadoPaginado } from '../../services/constant/type/paginacao.type';
import type { LogAuditoriaResponse } from '../../services/27-log-auditoria/type/log-auditoria.type';

interface BlocoLogAuditoriaProps {
  buscar: (pagina: number) => Promise<ResultadoPaginado<LogAuditoriaResponse>>;
  campoRenomeio?: string;
}

// Extraído de dentro do GenericTable (13-09-2026, achado do Claude Web numa
// auditoria: "log de auditoria não é estrutura de tabela... é outra
// funcionalidade, com dados próprios, paginação própria e visual próprio,
// que por acaso costuma aparecer embaixo de uma tabela"). GenericTable
// tinha o botão "Ver log" + este painel embutidos (via `buscarLog`/
// `campoRenomeioLog`), mesmo sendo usado por 8 das 10 telas - o teste que
// importa não é "quantos usam", é "uma tela SEM tabela consegue mostrar log
// de auditoria hoje?" (não conseguia, sem montar um GenericTable falso).
// Agora é um componente irmão, colocado logo abaixo do `<GenericTable>` nas
// 8 telas que precisam - mesmo `mt-4` que o botão já tinha dentro do
// GenericTable, pra manter a aparência idêntica.
export function BlocoLogAuditoria({ buscar, campoRenomeio }: BlocoLogAuditoriaProps) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setAberto((atual) => !atual)} className="btn btn-secondary mt-4">
        {aberto ? 'Esconder log' : 'Ver log'}
      </button>
      {aberto && <LogAuditoriaPainel buscar={buscar} campoRenomeio={campoRenomeio} />}
    </>
  );
}
