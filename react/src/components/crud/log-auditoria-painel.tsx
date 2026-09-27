import { useEffect, useState } from 'react';
import { NavegacaoPagina } from '../pagination/navegacao-pagina';
import { useErroToast } from '../layout/toast/use-erro-toast';
import { TabelaHistoricoAlteracoes } from './tabelas/5-tabela-historico-alteracoes';
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
  const [linhas, setLinhas] = useState<LogAuditoriaResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [tamanho, setTamanho] = useState(20);
  // Página: o backend já pagina de verdade (LIMIT/OFFSET); sem isto o painel nunca pediria página nenhuma além
  // da 1ª e viraria uma "listona" conforme o sistema cresce.
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const { erro, reportarErro, limparErro } = useErroToast();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    limparErro();
    buscar(pagina)
      .then((resposta) => {
        setLinhas(resposta.dados);
        setTotal(resposta.total);
        setTamanho(resposta.tamanho);
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscar, pagina]);

  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));

  return (
    <div className="mt-4 border-t borda-padrao pt-4">
      <h2 className="text-sm font-bold texto-padrao mb-2">
        Últimas alterações {total > 0 && `(${total} no total)`}
      </h2>

      {carregando && <p className="text-sm texto-fraco">Carregando...</p>}
      {erro && <p className="crud-erro">{erro}</p>}

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
