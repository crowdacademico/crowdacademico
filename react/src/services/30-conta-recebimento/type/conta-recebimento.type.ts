import type { StatusRepasse, TipoChavePix } from '../../constant/type/enums-do-banco.gerado';

// Espelha nest/src/30-conta-recebimento/dto/response/conta-recebimento.response.ts.
export interface ContaRecebimentoResponse {
  tipoChave: TipoChavePix;
  // Mascarada (ex.: ***.456.789-**): a chave inteira pode ser o CPF e nunca volta numa resposta.
  chaveMascarada: string;
  titularidadeVerificada: boolean;
  titularidadeVerificadaEm: string | null;
}

// Espelha nest/src/30-conta-recebimento/dto/response/cartao-a-liberar.response.ts.
export interface CartaoALiberarResponse {
  idCampanha: number;
  tituloCampanha: string;
  valor: number;
  previstoPara: string;
}

// Espelha nest/src/30-conta-recebimento/dto/response/repasse.response.ts.
export interface RepasseResponse {
  idRepasse: number;
  idCampanha: number;
  tituloCampanha: string;
  valorBruto: number;
  valorLiquido: number;
  taxaPlataforma: number | null;
  status: StatusRepasse;
  repassadoEm: string | null;
}
