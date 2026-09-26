import { Selectable } from 'kysely';
import { UsuarioTable } from '../../commons/database/db.types';

// A fonte da verdade da forma da linha é UsuarioTable (commons/database/db.types.ts); isto só reexporta com o
// nome que converter/dto esperam. Nunca inclui senha_hash (ver USUARIO_COLUNAS_SELECT,
// constants/usuario.constants.ts).
export type UsuarioEntity = Selectable<UsuarioTable>;
