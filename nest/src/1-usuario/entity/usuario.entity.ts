import { Selectable } from 'kysely';
import { UsuarioTable } from '../../commons/database/db.types';

// Era uma classe escrita à mão espelhando a tabela; agora que o módulo usa
// Kysely, a fonte da verdade da forma da linha é UsuarioTable
// (commons/database/db.types.ts) — isto só reexporta com o nome que
// converter/dto já esperavam, pra não precisar tocar em mais arquivos.
// Continua nunca incluindo senha_hash pelos mesmos motivos de sempre (ver
// USUARIO_COLUNAS_SELECT, constants/usuario.constants.ts).
export type UsuarioEntity = Selectable<UsuarioTable>;
