import { RodapePaginacao } from '../pagination/rodape-paginacao';
import { usePaginaServidor } from '../../services/constant/hook/use-pagina-servidor';
import { useErroToast } from '../layout/toast/use-erro-toast';
import { TabelaHistoricoAlteracoes } from './tabelas/5-tabela-historico-alteracoes';
import { Carregando } from '../layout/carregando';
import { MensagemErro } from './mensagem-erro';
import { quantasLinhasVazias } from './use-linhas-vazias';
import type { ResultadoPaginado } from '../../services/constant/type/paginacao.type';
import type { LogAuditoriaResponse } from '../../services/27-log-auditoria/type/log-auditoria.type';

interface LogAuditoriaPainelProps {
  buscar: (pagina: number, tamanho: number) => Promise<ResultadoPaginado<LogAuditoriaResponse>>;
}

// Painel "Ver log": as últimas alterações de UMA tabela física (log_auditoria.tabela), mais recente primeiro. Só
// busca quando abre (`buscar` já vem amarrada com authFetch e o nome da tabela, pelo componente pai). Paginado pelo
// servidor, com o mesmo rodapé (Mostrar 10/20/30/todos) do Registro de Chamadas e das tabelas.
export function LogAuditoriaPainel({ buscar }: LogAuditoriaPainelProps) {
  const { erro, reportarErro } = useErroToast({ mostraTexto: true });
  const { dados, total, rodape } = usePaginaServidor(buscar, 'log', reportarErro);

  return (
    <div className="mt-4 border-t borda-padrao pt-4">
      <h2 className="paragrafo-destaque texto-padrao mb-2">
        Últimas alterações {total > 0 && `(${total} no total)`}
      </h2>

      <MensagemErro texto={erro} className="crud-erro" />
      {!erro && dados === null && <Carregando />}
      {!erro && dados !== null && (
        <>
          <TabelaHistoricoAlteracoes linhas={dados} linhasVazias={quantasLinhasVazias(rodape.totalPaginas, rodape.tamanhoPagina, dados.length)} />
          <RodapePaginacao {...rodape} />
        </>
      )}
    </div>
  );
}
