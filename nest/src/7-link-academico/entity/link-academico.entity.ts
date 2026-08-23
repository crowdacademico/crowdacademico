import { Selectable } from 'kysely';
import { LinkAcademicoTable } from '../../commons/database/db.types';

export type LinkAcademicoEntity = Selectable<LinkAcademicoTable>;
