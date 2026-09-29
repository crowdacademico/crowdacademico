import { criarApiCatalogo } from '../../constant/api/api-catalogo';
import type {
  AreaConhecimentoRequestCreate,
  AreaConhecimentoRequestUpdate,
  AreaConhecimentoResponse,
} from '../type/area-conhecimento.type';

// Espelha nest/src/8-area-conhecimento: GET (listar/buscar) é PÚBLICO no backend (pol_area_select é
// USING(true), 04_rls_policies.sql [04-C-2]); POST/PATCH/DELETE exigem a permissão
// 'area_conhecimento_gerenciar', garantida pela RLS (o Nest só tem AuthGuardRequireAuth para exigir login; quem não
// tiver a permissão recebe 403 do próprio Postgres, traduzido por postgres-exception.filter.ts). remover() pode
// voltar 409 se a área ainda estiver em uso por campanha/área filha (ver area-conhecimento.service.remove.ts).
//
// Filtro: `raiz: true` lista só as grandes áreas; `idPai` lista as filhas de uma grande área.
interface FiltroAreaConhecimento {
  raiz?: boolean;
  idPai?: number;
  ativo?: boolean;
}

export const areaConhecimentoApi = criarApiCatalogo<
  AreaConhecimentoResponse,
  AreaConhecimentoRequestCreate,
  AreaConhecimentoRequestUpdate,
  FiltroAreaConhecimento
>('/area-conhecimento', 'áreas do conhecimento');
