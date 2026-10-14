// Resposta de uma consulta de chave Pix no diretório do Banco Central (DICT), traduzida pelo adapter: nada aqui carrega
// formato de provedor.
export interface ResultadoConsultaChavePix {
  // A chave existe e está ativa no diretório.
  existe: boolean;
  // Documento (CPF/CNPJ) do titular da chave, como o provedor informar: pode vir MASCARADO (ex.: "***.456.789-**").
  // Para comparar com o documento da pessoa use documentosCompativeis(), que trata a máscara.
  documentoTitular?: string;
  nomeTitular?: string;
}
