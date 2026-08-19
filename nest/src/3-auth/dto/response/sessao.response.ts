export class SessaoResponseDto {
  idSessao: number;
  criadoEm: Date;
  expiraEm: Date;
  ip: string | null;
  userAgent: string | null;
  origem: string;
  // true = a sessão da aba/dispositivo que está fazendo esta própria
  // requisição (ver usuario-autenticado.interface.ts, claim `sid` do JWT).
  atual: boolean;
}
