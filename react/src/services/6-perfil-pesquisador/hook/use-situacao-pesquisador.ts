import { useEffect, useState } from 'react';
import { perfilPesquisadorApi } from '../api/perfil-pesquisador.api';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { UsuarioResponse } from '../../1-usuario/type/usuario.type';
import type { StatusPesquisador } from '../constants/status-pesquisador.constants';

export type SituacaoPesquisador = StatusPesquisador | 'sem-perfil';

// A situação de pesquisador da conta logada: só 'ativo' cria campanha e comenta (a mesma condição das regras de
// acesso do banco); 'suspenso' e 'sem-perfil' não. `null` enquanto busca.
export function useSituacaoPesquisador(authFetch: AuthFetch, usuario: UsuarioResponse | null): SituacaoPesquisador | null {
  const idUsuario = usuario?.idUsuario ?? null;
  const ehPesquisador = usuario?.ehPesquisador;
  const [buscada, setBuscada] = useState<SituacaoPesquisador | null>(null);

  useEffect(() => {
    if (idUsuario === null || ehPesquisador === false) {
      return;
    }
    perfilPesquisadorApi
      .buscar(authFetch, idUsuario)
      .then((perfil) => setBuscada(perfil.statusPesquisador))
      .catch(() => setBuscada('sem-perfil'));
  }, [authFetch, idUsuario, ehPesquisador]);

  // Quem não é pesquisador nem pede o perfil (seria um 404 certo). `undefined` (sessão antiga) ainda pede.
  return ehPesquisador === false ? 'sem-perfil' : buscada;
}
