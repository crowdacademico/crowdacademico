import { useState } from 'react';
import { nomeDaColuna } from '../../../services/28-log-auditoria/constants/log-auditoria-nomes.constants';
import { formatarData, formatarDataHora, textoSeguro } from '../../../services/constant/util/formatacao.util';
import type { LogAuditoriaResponse, OperacaoLogAuditoria } from '../../../services/28-log-auditoria/type/log-auditoria.type';
import { CaixaTabela } from './caixa-tabela';
import { TIPOS_COLUNA } from '../colunas/tipos-coluna';
import { LinhasVazias } from '../linhas-vazias';
import { useLinhasVazias } from '../use-linhas-vazias';

// Últimas alterações de uma tabela do banco (log_auditoria), mais recente primeiro. Só leitura. Usada pelo
// painel "Ver log" (components/crud/log-auditoria-painel.tsx), que busca e pagina.
//
// Campo alterado, De e Para saem do próprio log, que guarda a linha inteira antes e depois. Toda linha nasce com a
// mesma altura (larguras fixas e uma linha só): numa alteração de vários campos aparece o primeiro e um "+N" em cada
// uma das três colunas, que expande a linha com todos, alinhados. Criar e excluir não têm "de/para" (a linha inteira nasce
// ou some). Coluna sensível (senha, CPF) nunca é gravada no log: aparece como "(protegido)".
//
// O nome da coluna sai em português (`nomeDaColuna`), e o valor como a pessoa leria: "Sim"/"Não" no lugar de
// true/false e data no formato brasileiro. Os outros valores (texto, número, o id de outro registro, a situação como o
// banco grava) aparecem como foram gravados.

// A coluna "id" com a mesma classe da coluna id das outras tabelas (largura e centralizada). Chave composta aparece
// como "8,3".
const CLASSE_ID = TIPOS_COLUNA.id.classe;

// Parcial de propósito: operação sem rótulo aqui (ex.: 'EXPORT') aparece com o nome cru.
const ROTULO_OPERACAO: Partial<Record<OperacaoLogAuditoria, string>> = {
  INSERT: 'Criado',
  UPDATE: 'Alterado',
  DELETE: 'Excluído',
};

// Data como o banco grava no log ("2026-10-25T14:30:45.123+00:00" ou "2026-10-25").
const DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const SO_DATA = /^\d{4}-\d{2}-\d{2}$/;

function valor(dados: Record<string, unknown> | null, campo: string): string {
  if (!dados || !(campo in dados)) {
    return '(protegido)';
  }
  const bruto = dados[campo];
  if (bruto === null || bruto === undefined || bruto === '') {
    return '-';
  }
  if (typeof bruto === 'boolean') {
    return bruto ? 'Sim' : 'Não';
  }
  if (typeof bruto === 'string' && DATA_HORA.test(bruto)) {
    return formatarDataHora(bruto);
  }
  if (typeof bruto === 'string' && SO_DATA.test(bruto)) {
    return formatarData(bruto);
  }
  return typeof bruto === 'string' || typeof bruto === 'number' ? String(bruto) : textoSeguro(bruto);
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
  const { corpoRef, alturaDa } = useLinhasVazias(linhas, linhasVazias);
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
        <tbody ref={corpoRef}>
          {linhas.map((linha) => {
            const campos = linha.operacao === 'UPDATE' ? (linha.camposAlterados ?? []) : [];
            const aberta = abertas.has(linha.idLog);
            const aoAlternar = () => alternar(linha.idLog);
            return (
              <tr key={linha.idLog}>
                <td className={CLASSE_ID}>{linha.identidadeRegistro}</td>
                <td>{ROTULO_OPERACAO[linha.operacao] ?? linha.operacao}</td>
                <td>
                  <CelulaLinhas textos={campos.map(nomeDaColuna)} aberta={aberta} aoAlternar={aoAlternar} />
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
          <LinhasVazias quantas={linhasVazias} colunas={7} alturaDa={alturaDa} />
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
