import { useEffect, useState } from 'react';
import { useErroToast } from '../layout/use-erro-toast';

const ROTULO_OPERACAO = {
  INSERT: 'Criado',
  UPDATE: 'Alterado',
  DELETE: 'Excluído',
};

// Painel "Ver log" (pedido do Lucas, 03-08-2026: "um botão no fundo de
// cada tabela... pra vermos a última alteração") — vive dentro de
// GenericTable, só busca quando abre (`buscar` é a mesma convenção de
// `listar` do GenericTable: função já vem pronta, pré-amarrada com
// authFetch e o nome da tabela, pelo componente pai). Mostra as últimas
// alterações de UMA tabela física (log_auditoria.tabela), mais recente
// primeiro — não filtra por registro específico ainda (isso seria um 2º
// botão, "Ver log deste registro", dentro de Consultar — fica pra quando
// o Lucas quiser essa granularidade).
//
// `campoRenomeio` (09-08-2026, pedido do Lucas: "log da tabela Papéis com
// duas colunas, nome antigo e nome atual") — opt-in, não específico de
// papel: quando informado (ex.: "nome"), troca a coluna genérica "Campos
// alterados" por duas colunas de verdade ("De"/"Para") lendo o valor
// daquele campo em `dadosAnteriores`/`dadosNovos` (o log_auditoria já
// grava a linha inteira antes/depois, não precisou de coluna nova no
// banco — só o React passou a ler o que já existia). Lucas comentou que
// esse conceito serve pra outros logs no futuro — qualquer tela que
// passe `buscarLog`/`campoRenomeioLog` pro GenericTable ganha o mesmo
// recurso de graça, não é hardcoded pra papel.
export function LogAuditoriaPainel({ buscar, campoRenomeio }) {
  const [linhas, setLinhas] = useState([]);
  const [total, setTotal] = useState(0);
  const [tamanho, setTamanho] = useState(20);
  // Página (11-08-2026, achado da parceira do Lucas: "vai virar aquela
  // listona conforme o sistema cresce") — o backend já paginava de
  // verdade (LIMIT/OFFSET), só o painel nunca pedia página nenhuma além
  // da 1ª.
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
      <h3 className="text-sm font-bold texto-padrao mb-2">
        Últimas alterações {total > 0 && `(${total} no total)`}
      </h3>

      {carregando && <p className="text-sm texto-fraco">Carregando...</p>}
      {erro && <p className="crud-erro">{erro}</p>}

      {!carregando && !erro && (
        <table className="crud-tabela">
          <thead>
            <tr>
              {/* Registro antes de Ação (09-08-2026, pedido do Lucas: "fica
                  mais bonito o registro vindo primeiro") — mesma ordem nos
                  dois <tr>, cabeçalho e corpo. */}
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
                    <td>{linha.dadosAnteriores?.[campoRenomeio] ?? '-'}</td>
                    <td>{linha.dadosNovos?.[campoRenomeio] ?? '-'}</td>
                  </>
                ) : (
                  <td>{linha.camposAlterados ? linha.camposAlterados.join(', ') : ''}</td>
                )}
                <td>{linha.nomeResponsavel ?? 'Sistema'}</td>
                <td>{new Date(linha.ocorridoEm).toLocaleString('pt-BR')}</td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={campoRenomeio ? 6 : 5}>Nenhuma alteração registrada ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {!carregando && !erro && totalPaginas > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-3 mt-3 text-sm texto-padrao">
          <span>
            Página {pagina} de {totalPaginas} ({total} no total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="btn btn-secondary"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="btn btn-secondary"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
