import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginacaoQueryDto } from '../../../commons/database/dto/paginacao.query.dto';
import {
  STATUS_NOTIFICACAO,
  type StatusNotificacao,
} from '../../../commons/database/db.types';

export class NotificacaoRequestList extends PaginacaoQueryDto {
  @IsOptional()
  @IsIn(STATUS_NOTIFICACAO, {
    message: 'Situação desconhecida: pendente, enviado, falhou ou cancelado.',
  })
  status?: StatusNotificacao;

  // Procura no e-mail do destinatário e no tipo do e-mail.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  busca?: string;
}
