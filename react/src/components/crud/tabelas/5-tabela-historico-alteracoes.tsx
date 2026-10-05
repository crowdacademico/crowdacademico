import { useState } from 'react';
import { formatarDataHora, textoSeguro } from '../../../services/constant/util/formatacao.util';
import type { LogAuditoriaResponse, OperacaoLogAuditoria } from '../../../services/27-log-auditoria/type/log-auditoria.type';
import { CaixaTabela } from './caixa-tabela';
import { TIPOS_COLUNA } from '../colunas/tipos-coluna';

// Últimas alterações de uma tabela do banco (log_auditoria), mais recente primeiro. Só leitura. Usada pelo
// painel "Ver log" (components/crud/log-auditoria-painel.tsx), que busca e pagina.
//
// Campo alterado, De e Para saem do próprio log, que guarda a linha inteira antes e depois. Toda linha nasce com a
// mesma altura (larguras fixas e uma linha só): numa alteração de vários campos aparece o primeiro e um "+N" em cada
// uma das três colunas, que expande a linha com todos, alinhados. Criar e excluir não têm "de/para" (a linha inteira nasce
// ou some). Coluna sensível (senha, CPF) nunca é gravada no log: aparece como "(protegido)".

// A coluna "id" com a mesma classe da coluna id das outras tabelas (largura e centralizada). Chave composta aparece
// como "8,3".
const CLASSE_ID = TIPOS_COLUNA.id.classe;

// Parcial de propósito: operação sem rótulo aqui (ex.: 'EXPORT') aparece com o nome cru.
const ROTULO_OPERACAO: Partial<Record<OperacaoLogAuditoria, string>> = {
  INSERT: 'Criado',
  UPDATE: 'Alterado',
  DELETE: 'Excluído',
};

function valor(dados: Record<string, unknown> | null, campo: string): string {
  if (!dados || !(campo in dados)) {
    return '(protegido)';
  }
  const bruto = dados[campo];
  if (bruto === null || bruto === undefined || bruto === '') {
    return '-';
  }
  return typeof bruto === 'string' || typeof bruto === 'number' || typeof bruto === 'boolean' ? String(bruto) : textoSeguro(bruto);
}

// Uma linha por campo alterado (cortada com reticências; inteira ao passar o mouse).
function Linhas({ textos }: { textos: string[] }) {
  if (textos.length === 0) {
    return <>-</>;
  }
  return (
    <>
      {textos.map((texto, indice) => (
        <span key={indice} className="tabela-log__linha" title={texto}>
          {texto}
        </span>
      ))}
    </>
  );
}

// Célula de uma coluna com várias linhas (Campo alterado, De, Para): fechada mostra a primeira e o "+N"; o botão é o
// mesmo nas três colunas e abre ou fecha a linha inteira. Só aparece se alguma linha escondida tem valor (no De de um
// campo que nasceu agora, as outras são só "-"); aberta, os "-" ficam para manter o alinhamento.
function CelulaLinhas({ textos, aberta, aoAlternar }: { textos: string[]; aberta: boolean; aoAlternar: () => void }) {
  return (
    <span className="tabela-log__campos">
      <span className="tabela-log__campos-lista">
        <Linhas textos={aberta ? textos : textos.slice(0, 1)} />
      </span>
      {textos.slice(1).some((texto) => texto !== '-') && (
        <button type="button" className="link-texto" aria-expanded={aberta} onClick={aoAlternar}>
          {aberta ? 'menos' : `+${textos.length - 1}`}
        </button>
      )}
    </span>
  );
}

export function TabelaHistoricoAlteracoes({ linhas, linhasVazias = 0 }: { linhas: LogAuditoriaResponse[]; linhasVazias?: number }) {
  const [abertas, setAbertas] = useState<ReadonlySet<number>>(new Set());
  const alternar = (idLog: number) =>
    setAbertas((atual) => {
      const nova = new Set(atual);
      if (nova.has(idLog)) nova.delete(idLog);
      else nova.add(idLog);
      return nova;
    });

  return (
    <CaixaTabela rotulo="Histórico de alterações">
      <table className="crud-tabela tabela-log">
        <colgroup>
          <col className="tabela-log__col-id" />
          <col className="tabela-log__col-acao" />
          <col className="tabela-log__col-campo" />
          <col className="tabela-log__col-valor" />
          <col className="tabela-log__col-valor" />
          <col className="tabela-log__col-quem" />
          <col className="tabela-log__col-quando" />
        </colgroup>
        <thead>
          <tr>
            <th className={CLASSE_ID}>id</th>
            <th>Ação</th>
            <th>Campo alterado</th>
            <th>De</th>
            <th>Para</th>
            <th>Quem</th>
            <th>Quando</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => {
            const campos = linha.operacao === 'UPDATE' ? (linha.camposAlterados ?? []) : [];
            const aberta = abertas.has(linha.idLog);
            const aoAlternar = () => alternar(linha.idLog);
            return (
              <tr key={linha.idLog}>
                <td className={CLASSE_ID}>{linha.identidadeRegistro}</td>
                <td>{ROTULO_OPERACAO[linha.operacao] ?? linha.operacao}</td>
                <td>
                  <CelulaLinhas textos={campos} aberta={aberta} aoAlternar={aoAlternar} />
                </td>
                <td>
                  <CelulaLinhas textos={campos.map((campo) => valor(linha.dadosAnteriores, campo))} aberta={aberta} aoAlternar={aoAlternar} />
                </td>
                <td>
                  <CelulaLinhas textos={campos.map((campo) => valor(linha.dadosNovos, campo))} aberta={aberta} aoAlternar={aoAlternar} />
                </td>
                <td className="tabela-log__uma-linha">{linha.nomeResponsavel ?? 'Sistema'}</td>
                <td className="tabela-log__uma-linha">{formatarDataHora(linha.ocorridoEm)}</td>
              </tr>
            );
          })}
          {Array.from({ length: linhasVazias }, (_, indice) => (
            <tr key={`vazia-${indice}`} className="crud-tabela__linha-vazia" aria-hidden="true">
              <td colSpan={7}>&nbsp;</td>
            </tr>
          ))}
          {linhas.length === 0 && (
            <tr>
              <td colSpan={7}>Nenhuma alteração registrada ainda.</td>
            </tr>
          )}
        </tbody>
      </table>
    </CaixaTabela>
  );
}
