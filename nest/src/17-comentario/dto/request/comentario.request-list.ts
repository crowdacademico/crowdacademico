import { IsBoolean, IsOptional } from 'class-validator';
import { PorCampanhaQueryDto } from '../../../commons/database/dto/por-campanha.query.dto';
import { BooleanoDaQuery } from '../../../commons/validacao/transformacoes.decorator';

// Comentários de uma campanha (?idCampanha=12&pagina=1&tamanho=10). `endossado=true` traz só os endossados, na
// ordem do endosso (o que a página pública mostra).
export class ComentarioRequestList extends PorCampanhaQueryDto {
  @IsOptional()
  @BooleanoDaQuery()
  @IsBoolean()
  endossado?: boolean;
}
