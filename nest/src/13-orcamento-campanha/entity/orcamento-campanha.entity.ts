import { Selectable } from 'kysely';
import { OrcamentoCampanhaTable } from '../../commons/database/db.types';

export type OrcamentoCampanhaEntity = Selectable<OrcamentoCampanhaTable>;
