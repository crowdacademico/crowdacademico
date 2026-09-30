import { useState } from 'react';
import { usuarioApi } from '../api/usuario.api';
import { usuarioPapelApi } from '../../2-papel-permissao/api/papel-permissao.api';
import { perfilPesquisadorApi } from '../../6-perfil-pesquisador/api/perfil-pesquisador.api';
import { arquivoApi } from '../../25-arquivo/api/arquivo.api';
import { useBuscar } from '../../constant/hook/use-buscar';
import type { useErroToast } from '../../../components/layout/toast/use-erro-toast';
import type { UseAuthReturn } from '../../3-auth/hook/use-auth';
import type { UsuarioResponse } from '../type/usuario.type';
import type { UsuarioPapelResponse } from '../../2-papel-permissao/type/papel-permissao.type';
import type { PerfilPesquisadorResponse } from '../../6-perfil-pesquisador/type/perfil-pesquisador.type';

export interface DadosUsuario {
  usuario: UsuarioResponse;
  perfilPesquisador: PerfilPesquisadorResponse | null;
  avatarUrl: string | null;
  papeis: UsuarioPapelResponse[];
}

// Consultar e Alterar Usuário abrem com a mesma busca: a conta, o avatar, os papéis e, só de quem é pesquisador, o
// perfil de pesquisador (pedir de todo mundo dava 404 para quem não é). `papeis` tem setter porque o Alterar muda os
// papéis na hora e mostra a lista nova. `erros` é o useErroToast do modal: o erro da busca cai no mesmo lugar dos
// outros. `aoChegar` preenche o formulário quando os dados chegam.
export function useDadosUsuario(
  idUsuario: number,
  auth: Pick<UseAuthReturn, 'authFetch'>,
  erros: ReturnType<typeof useErroToast>,
  aoChegar?: (dados: DadosUsuario) => void,
) {
  const [papeis, setPapeis] = useState<UsuarioPapelResponse[] | null>(null);
  const { dado, carregando } = useBuscar(
    async (): Promise<DadosUsuario> => {
      const [usuario, avatar, papeisDoUsuario] = await Promise.all([
        usuarioApi.buscar(auth.authFetch, idUsuario),
        arquivoApi.buscarAvatarPorUsuario(idUsuario).catch(() => null),
        usuarioPapelApi.listarPorUsuario(auth.authFetch, idUsuario).catch(() => []),
      ]);
      const perfilPesquisador =
        usuario.ehPesquisador === false
          ? null
          : await perfilPesquisadorApi.buscar(auth.authFetch, idUsuario).catch(() => null);
      return { usuario, perfilPesquisador, avatarUrl: avatar?.url ?? null, papeis: papeisDoUsuario };
    },
    [idUsuario],
    {
      erros,
      aoChegar: (dados) => {
        setPapeis(dados.papeis);
        aoChegar?.(dados);
      },
    },
  );

  return {
    usuario: dado?.usuario ?? null,
    perfilPesquisador: dado?.perfilPesquisador ?? null,
    avatarUrl: dado?.avatarUrl ?? null,
    papeis,
    setPapeis,
    carregando,
  };
}
