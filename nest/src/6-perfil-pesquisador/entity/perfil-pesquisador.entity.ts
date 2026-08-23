import { Selectable } from 'kysely';
import { PerfilPesquisadorTable } from '../../commons/database/db.types';

export type PerfilPesquisadorEntity = Selectable<PerfilPesquisadorTable>;
