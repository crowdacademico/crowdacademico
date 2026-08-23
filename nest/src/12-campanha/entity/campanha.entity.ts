import { Selectable } from 'kysely';
import { CampanhaTable } from '../../commons/database/db.types';

export type CampanhaEntity = Selectable<CampanhaTable>;
