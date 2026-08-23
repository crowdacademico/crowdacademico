import { Selectable } from 'kysely';
import { LinkAtualizacaoTable } from '../../commons/database/db.types';

export type LinkAtualizacaoEntity = Selectable<LinkAtualizacaoTable>;
