import { Selectable } from 'kysely';
import { ArquivoAtualizacaoTable } from '../../commons/database/db.types';

export type ArquivoAtualizacaoEntity = Selectable<ArquivoAtualizacaoTable>;
