import { useState } from 'react';
import { NavegacaoPagina } from '../pagination/navegacao-pagina';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { TabelaHistoricoAlteracoes } from './tabelas/5-tabela-historico-alteracoes';
import { Carregando } from '../layout/carregando';
import { MensagemErro } from './mensagem-erro';
import type { ResultadoPaginado } from '../../services/constant/type/paginacao.type';
import type { LogAuditoriaResponse } from '../../services/27-log-auditoria/type/log-auditoria.type';

interface LogAuditoriaPainelProps {
  buscar: (pagina: number) => Promise<ResultadoPaginado<LogAuditoriaResponse>>;
  campoRenomeio?: string;
}

// Painel "Ver log": um botão no fundo de cada tabela para ver a última alteração. Só busca quando abre
// (`buscar` é a mesma convenção de `listar` do GenericTable: função já vem pronta, pré-amarrada com authFetch e
// o nome da tabela, pelo componente pai). Mostra as últimas alterações de UMA tabela física
// (log_auditoria.tabela), mais recente primeiro; não filtra por registro específico (isso seria um 2º botão,
// "Ver log deste registro", dentro de Consultar). A tabela em si mora em tabelas/5-tabela-historico-alteracoes.tsx.
export function LogAuditoriaPainel({ buscar, campoRenomeio }: LogAuditoriaPainelProps) {
  // Página: o backend já pagina de verdade (LIMIT/OFFSET); sem isto o painel nunca pediria página nenhuma além
  // da 1ª e viraria uma "listona" conforme o sistema cresce.
  const [pagina, setPagina] = useState(1);
  const { dado, carregando, erro } = useBuscar(() => buscar(pagina), [buscar, pagina], { mostraTexto: true });
  const linhas = dado?.dados ?? [];
  const total = dado?.total ?? 0;
  const tamanho = dado?.tamanho ?? 20;

  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));

  return (
    <div className="mt-4 border-t borda-padrao pt-4">
      <h2 className="text-sm font-bold texto-padrao mb-2">
        Últimas alterações {total > 0 && `(${total} no total)`}
      </h2>

      {carregando && <Carregando />}
      <MensagemErro texto={erro} className="crud-erro" />

      {!carregando && !erro && <TabelaHistoricoAlteracoes linhas={linhas} campoRenomeio={campoRenomeio} />}

      {!carregando && !erro && totalPaginas > 1 && (
        <NavegacaoPagina
          total={total}
          paginaAtual={pagina}
          totalPaginas={totalPaginas}
          unidade="no total"
          aoMudarPagina={(novaPagina) => setPagina(novaPagina)}
        />
      )}
    </div>
  );
}
