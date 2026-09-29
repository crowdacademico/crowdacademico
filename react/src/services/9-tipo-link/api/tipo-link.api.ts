import { criarApiCatalogo } from '../../constant/api/api-catalogo';
import type {
  EscopoTipoLink,
  TipoLinkRequestCreate,
  TipoLinkRequestUpdate,
  TipoLinkResponse,
} from '../type/tipo-link.type';

// Espelha nest/src/9-tipo-link: GET (listar/buscar) é PÚBLICO no backend (pol_tipolink_select é USING(true),
// 04_rls_policies.sql [04-C-2]); POST/PATCH/DELETE exigem a permissão 'tipolink_gerenciar', garantida pela RLS
// (o Nest só tem AuthGuardRequireAuth para exigir login). remover() pode voltar 409 se o tipo ainda estiver em uso
// em algum link (ver tipo-link.service.remove.ts).
//
// Filtro: `escopo` é 'perfil' | 'atualizacao' | 'recompensa', os mesmos valores de TipoLinkRequestList no
// backend (filtra pelo campo permite_* correspondente).
interface FiltroTipoLink {
  ativo?: boolean;
  escopo?: EscopoTipoLink;
}

export const tipoLinkApi = criarApiCatalogo<TipoLinkResponse, TipoLinkRequestCreate, TipoLinkRequestUpdate, FiltroTipoLink>(
  '/tipo-link',
  'tipos de link',
);
