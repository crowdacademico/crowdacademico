import { useCallback, useState } from 'react';
import { BotaoMostrarEsconder } from './botao-mostrar-esconder';
import { LogAuditoriaPainel } from './log-auditoria-painel';
import { logAuditoriaApi } from '../../services/28-log-auditoria/api/log-auditoria.api';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';

interface BlocoLogAuditoriaProps {
  authFetch: AuthFetch;
  // O nome FÍSICO da tabela no Postgres, o mesmo que fn_log_auditoria() grava (TG_TABLE_NAME), não o nome da rota.
  // Uma tela que junta mais de uma passa as duas separadas por vírgula ('score_config,score_rotulo').
  tabela: string;
  // A mesma chaveRecarga da tabela: salvar num modal não recarrega a página, e sem ela o log aberto ficava velho.
  chaveRecarga?: number;
}

// Log de auditoria não é estrutura de tabela: é outra funcionalidade, com dados próprios, paginação própria e
// visual próprio, que por acaso costuma aparecer embaixo de uma tabela. Por isso é um componente irmão,
// colocado logo abaixo do `<GenericTable>` nas telas que precisam (mesmo `mt-4` que o botão "Ver log" tinha
// dentro do GenericTable). O teste que importa não é "quantos usam", é "uma tela SEM tabela consegue mostrar
// log de auditoria hoje?": embutido no GenericTable, não conseguia, sem montar um GenericTable falso.
export function BlocoLogAuditoria({ authFetch, tabela, chaveRecarga }: BlocoLogAuditoriaProps) {
  const [aberto, setAberto] = useState(false);
  const buscar = useCallback(
    (pagina: number, tamanho: number) => logAuditoriaApi.listarPorTabela(authFetch, tabela, pagina, tamanho),
    [authFetch, tabela],
  );

  return (
    <>
      <BotaoMostrarEsconder aberto={aberto} aoAlternar={() => setAberto((atual) => !atual)} rotulo="log" className="mt-4" />
      {aberto && <LogAuditoriaPainel buscar={buscar} chaveRecarga={chaveRecarga} />}
    </>
  );
}
