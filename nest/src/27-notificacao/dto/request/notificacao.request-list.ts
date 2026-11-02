import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginacaoQueryDto } from '../../../commons/database/dto/paginacao.query.dto';
import {
  CANAIS_NOTIFICACAO,
  STATUS_NOTIFICACAO,
  type CanalNotificacao,
  type StatusNotificacao,
} from '../../../commons/database/db.types';

export class NotificacaoRequestList extends PaginacaoQueryDto {
  @IsOptional()
  @IsIn(CANAIS_NOTIFICACAO, {
    message: 'Canal desconhecido: email ou interna.',
  })
  canal?: CanalNotificacao;

  @IsOptional()
  @IsIn(STATUS_NOTIFICACAO, {
    message: 'Situação desconhecida: pendente, enviado, falhou ou cancelado.',
  })
  status?: StatusNotificacao;

  // Procura no e-mail do destinatário, no nome da conta e no tipo do aviso.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  busca?: string;
}
