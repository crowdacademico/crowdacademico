import { criarApiCatalogo } from '../../constant/api/api-catalogo';
import type {
  MotivoDenunciaRequestCreate,
  MotivoDenunciaRequestUpdate,
  MotivoDenunciaResponse,
  TipoMotivoDenuncia,
} from '../type/motivo-denuncia.type';

// Espelha nest/src/10-motivo-denuncia: GET (listar/buscar) é PÚBLICO no backend (pol_motivo_select é
// USING(true), 04_rls_policies.sql [04-C-3]); POST/PATCH/DELETE exigem a permissão 'motivo_denuncia_gerenciar',
// garantida pela RLS (o Nest só tem AuthGuardRequireAuth para exigir login; quem não tiver a permissão recebe 403
// do próprio Postgres, traduzido por postgres-exception.filter.ts). remover() pode voltar 409 se o motivo já
// tiver sido usado em alguma denúncia (ver motivo-denuncia.service.remove.ts).
interface FiltroMotivoDenuncia {
  ativo?: boolean;
  tipo?: TipoMotivoDenuncia;
}

export const motivoDenunciaApi = criarApiCatalogo<
  MotivoDenunciaResponse,
  MotivoDenunciaRequestCreate,
  MotivoDenunciaRequestUpdate,
  FiltroMotivoDenuncia
>('/motivo-denuncia', 'motivos de denúncia');
