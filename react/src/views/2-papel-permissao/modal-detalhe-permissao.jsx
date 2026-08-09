import { useEffect, useState } from 'react';
import { ModalDetalhe } from '../../components/crud/modal-detalhe';
import {
  papelApi,
  papelPermissaoApi,
} from '../../services/2-papel-permissao/api/papel-permissao.api';
import { detalhePermissao } from '../../services/2-papel-permissao/constants/permissao-nomes-amigaveis';

// "Quem tem hoje" (09-08-2026, Bloco F do prompt do Claude Web) — lido AO
// VIVO da matriz Papel × Permissão (mesmas 2 chamadas de
// matriz-papel-permissao.jsx), nunca do dicionário estático: o dicionário
// só sabe o que a permissão FAZ, não quem tem ela agora — isso muda toda
// vez que um admin mexe na matriz.
export function ModalDetalhePermissao({ permissao, authFetch, aoFechar }) {
  const detalhe = detalhePermissao(permissao.nome);
  const [papeisComEla, setPapeisComEla] = useState(null);

  useEffect(() => {
    Promise.all([papelApi.listar(authFetch), papelPermissaoApi.listar(authFetch)])
      .then(([papeis, vinculos]) => {
        const idsComEla = new Set(
          vinculos
            .filter((v) => v.idPermissao === permissao.idPermissao)
            .map((v) => v.idPapel),
        );
        setPapeisComEla(papeis.filter((p) => idsComEla.has(p.idPapel)).map((p) => p.nome));
      })
      .catch(() => setPapeisComEla([]));
  }, [authFetch, permissao.idPermissao]);

  return (
    <ModalDetalhe
      titulo={detalhe.nome}
      chave={permissao.nome}
      badgeImpacto={detalhe.impacto}
      aoFechar={aoFechar}
      secoes={[
        { titulo: 'O que faz', conteudo: detalhe.oQueFaz },
        { titulo: 'Por que existe', conteudo: detalhe.porQueExiste },
        {
          titulo: 'Quem tem hoje',
          conteudo:
            papeisComEla === null ? (
              'Carregando...'
            ) : papeisComEla.length === 0 ? (
              'Nenhum papel tem esta permissão no momento.'
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {papeisComEla.map((nomePapel) => (
                  <span key={nomePapel} className="badge badge-neutro">
                    {nomePapel}
                  </span>
                ))}
              </div>
            ),
        },
      ]}
    />
  );
}
