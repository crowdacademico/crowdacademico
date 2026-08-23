import { Selectable } from 'kysely';
import { ComentarioTable } from '../../commons/database/db.types';

export type ComentarioEntity = Selectable<ComentarioTable>;
