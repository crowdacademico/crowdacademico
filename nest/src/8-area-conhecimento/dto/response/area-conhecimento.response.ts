export class AreaConhecimentoResponse {
  idAreaConhecimento: number;
  codigoCnpq: string;
  nome: string;
  // NULL = grande área raiz (nível 1 da tabela CNPq); preenchido = área de
  // nível 2, filha da grande área apontada — ver hierarquia em
  // 01_extensoes_enums_tabelas.sql [01-... area_conhecimento] e a regra de
  // 2 níveis em 05_regras_negocio.sql [05-K-1] (fn_valida_area_conhecimento_
  // nivel2).
  idPai: number | null;
  // Nome da grande área raiz, quando `idPai` está preenchido — poupa o
  // front de um segundo GET só pra montar o breadcrumb "Grande Área >
  // Área" no formulário de campanha. NULL pra grande área raiz (não tem
  // pai) ou quando o pai não foi carregado.
  nomePai: string | null;
  ativo: boolean;
}
