import { IsNotEmpty, IsString } from 'class-validator';
import { PaginacaoQueryDto } from '../../../commons/database/dto/paginacao.query.dto';

// `tabela` é o nome FÍSICO da tabela no Postgres (ex.: 'usuario',
// 'configuracoes'), o mesmo valor gravado em log_auditoria.tabela por
// TG_TABLE_NAME (ver fn_log_auditoria(), 05_regras_negocio.sql [05-L]) —
// não precisa de @IsIn com uma lista fixa: um nome que não bate com nada
// só devolve uma lista vazia, sem risco de injeção (sempre parametrizado
// via Kysely, nunca SQL cru).
export class LogAuditoriaQueryDto extends PaginacaoQueryDto {
  @IsString()
  @IsNotEmpty()
  tabela: string;
}
