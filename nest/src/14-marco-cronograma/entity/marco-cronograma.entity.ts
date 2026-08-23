import { Selectable } from 'kysely';
import { MarcoCronogramaTable } from '../../commons/database/db.types';

export type MarcoCronogramaEntity = Selectable<MarcoCronogramaTable>;
