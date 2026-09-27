import { useBuscar } from '../../constant/hook/use-buscar';
import { areaConhecimentoApi } from '../api/area-conhecimento.api';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { AreaConhecimentoResponse } from '../type/area-conhecimento.type';

const SEM_AREAS: AreaConhecimentoResponse[] = [];

// Áreas que uma campanha pode escolher: só as específicas (com pai); as grandes áreas CNPq são só agrupadoras.
// Um lugar só para Criar e Alterar Campanha.
export function useAreasDaCampanha(authFetch: AuthFetch): AreaConhecimentoResponse[] {
  const { dado } = useBuscar(
    () => areaConhecimentoApi.listar(authFetch).then((lista) => lista.filter((area) => area.idPai !== null)),
    [],
  );
  return dado ?? SEM_AREAS;
}
