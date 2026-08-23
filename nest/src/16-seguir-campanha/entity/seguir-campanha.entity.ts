import { Selectable } from 'kysely';
import { SeguirCampanhaTable } from '../../commons/database/db.types';

export type SeguirCampanhaEntity = Selectable<SeguirCampanhaTable>;
