import { Type } from 'class-transformer';
import { IsInt, IsString, Matches, MaxLength } from 'class-validator';

// Pedir o encerramento antecipado (ou encerrar direto, sem contribuição confirmada): a campanha e o porquê
// (RF-064). O banco confere que é o dono, que a campanha está ativa e que não há outro pedido pendente.
export class SolicitacaoEncerramentoRequestCreate {
  @Type(() => Number)
  @IsInt({ message: 'Informe a campanha.' })
  idCampanha: number;

  @IsString({ message: 'Escreva por que a campanha está sendo encerrada.' })
  @Matches(/\S/, {
    message: 'Escreva por que a campanha está sendo encerrada.',
  })
  @MaxLength(10000, {
    message: 'A justificativa pode ter no máximo 10.000 caracteres.',
  })
  justificativa: string;
}
