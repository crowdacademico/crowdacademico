import { Selectable } from 'kysely';
import { AtualizacaoCampanhaTable } from '../../commons/database/db.types';

export type AtualizacaoCampanhaEntity = Selectable<AtualizacaoCampanhaTable>;
