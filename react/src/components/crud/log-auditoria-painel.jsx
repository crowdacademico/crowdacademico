import { useEffect, useState } from 'react';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';

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
export function LogAuditoriaPainel({ buscar }) {
  const [linhas, setLinhas] = useState([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    setErro('');
    buscar()
      .then((resposta) => {
        setLinhas(resposta.dados);
        setTotal(resposta.total);
      })
      .catch((erroRequisicao) => setErro(traduzirErro(erroRequisicao)))
      .finally(() => setCarregando(false));
  }, [buscar]);

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <h3 className="text-sm font-bold text-slate-700 mb-2">
        Últimas alterações {total > 0 && `(${total} no total)`}
      </h3>

      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}
      {erro && <p className="crud-erro">{erro}</p>}

      {!carregando && !erro && (
        <table className="crud-tabela">
          <thead>
            <tr>
              <th>Ação</th>
              <th>Registro</th>
              <th>Campos alterados</th>
              <th>Quem</th>
              <th>Quando</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.idLog}>
                <td>{ROTULO_OPERACAO[linha.operacao] ?? linha.operacao}</td>
                <td>{linha.identidadeRegistro}</td>
                <td>{linha.camposAlterados ? linha.camposAlterados.join(', ') : ''}</td>
                <td>{linha.nomeResponsavel ?? 'Sistema'}</td>
                <td>{new Date(linha.ocorridoEm).toLocaleString('pt-BR')}</td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhuma alteração registrada ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
