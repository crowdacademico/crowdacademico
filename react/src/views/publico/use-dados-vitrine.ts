import { useEffect, useState } from 'react';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import { recompensaApi } from '../../services/18-recompensa/api/recompensa.api';
import type { RecompensaResponse } from '../../services/18-recompensa/type/recompensa.type';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { campanhaVisivelNoCatalogo, percentualArrecadado } from './util-campanhas';

export interface DadosVitrine {
  // Visitante: as campanhas ativas que mais avançaram rumo à meta.
  campanhas: CampanhaResponse[];
  // Apoiador: recompensas ativas dessas campanhas, com o título da campanha.
  recompensas: (RecompensaResponse & { tituloCampanha: string })[];
  // Pesquisador: números da plataforma.
  campanhasAtivas: number;
  totalArrecadado: number;
  pesquisadoresAtivos: number | null;
}

// Dados REAIS para os painéis de "Três perfis" do Como funciona (decisão de 14-11-2026: nada inventado na área
// pública). Só rotas públicas. null = ainda carregando ou falhou: o painel mostra o desenho abstrato no lugar.
export function useDadosVitrine(authFetch: AuthFetch): DadosVitrine | null {
  const [dados, setDados] = useState<DadosVitrine | null>(null);

  useEffect(() => {
    const controle = { ativo: true };
    void (async () => {
      try {
        const [lista, perfis] = await Promise.all([
          campanhaApi.listar(authFetch),
          perfilPesquisadorApi.listar(authFetch, { statusPesquisador: 'ativo' }).catch(() => null),
        ]);
        const visiveis = lista.filter(campanhaVisivelNoCatalogo);
        const ativas = visiveis.filter((campanha) => campanha.status === 'ativo');
        const destaque = [...ativas]
          .sort((a, b) => (percentualArrecadado(b) ?? 0) - (percentualArrecadado(a) ?? 0))
          .slice(0, 3);
        const listas = await Promise.all(
          destaque.map((campanha) =>
            recompensaApi
              .listar(authFetch, campanha.idCampanha)
              .then((itens) => itens.filter((item) => item.ativo).map((item) => ({ ...item, tituloCampanha: campanha.titulo })))
              .catch(() => []),
          ),
        );
        if (!controle.ativo) return;
        setDados({
          campanhas: destaque,
          recompensas: listas.flat().sort((a, b) => a.valorMinimo - b.valorMinimo).slice(0, 3),
          campanhasAtivas: ativas.length,
          totalArrecadado: visiveis.reduce((soma, campanha) => soma + campanha.valorBrutoArrecadado, 0),
          pesquisadoresAtivos: perfis ? perfis.length : null,
        });
      } catch (erro: unknown) {
        // Em desenvolvimento, mostra o motivo no console (o painel cai no desenho abstrato sem avisar).
        if (import.meta.env.DEV) console.error('[Como funciona] falha ao carregar os painéis:', erro);
        if (controle.ativo) setDados(null);
      }
    })();
    return () => {
      controle.ativo = false;
    };
  }, [authFetch]);

  return dados;
}
