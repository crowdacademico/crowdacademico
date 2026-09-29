// Espelha SuspensaoRequestDto e SuspensaoResponseDto (nest/src/commons/moderacao/dto/): o mesmo formato para a
// suspensão da CONTA (bloqueia o login) e a do PODER de pesquisador (o login continua).

// `ate` é data ISO 8601, montada a partir do seletor de dias ou de um campo livre; `motivo` é obrigatório.
export interface SuspensaoRequestDto {
  ate: string;
  motivo: string;
}

export interface SuspensaoResponseDto {
  suspensoAte: string | null;
  motivoSuspensao: string | null;
  suspensoPor: number | null;
}
