import { useEffect, useState } from 'react';
import { linkAcademicoApi } from '../../services/7-link-academico/api/link-academico.api';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';

// Links acadêmicos do pesquisador nas páginas públicas: RF-027/RF-072 (só o principal, o primeiro da lista, na página
// da campanha) e RF-028 (todos, na ordem que ele definiu, no perfil público). As duas leituras são públicas no Nest
// (GET /link-academico?idUsuario= e GET /tipo-link), então funcionam sem login.

export interface LinkAcademicoPublico {
  idLinkAcademico: number;
  url: string;
  // Rótulo personalizado ou, sem ele, o nome do tipo (RF-022).
  rotulo: string;
  icone: string;
}

// Ícone pelo código estável do tipo (tipo_link.codigo, seed [07-C-1]); tipo novo cadastrado pelo admin cai no genérico.
const ICONE_TIPO_LINK: Record<string, string> = {
  LATTES: 'fa-solid fa-graduation-cap',
  ORCID: 'fa-brands fa-orcid',
  RESEARCHGATE: 'fa-brands fa-researchgate',
  LINKEDIN: 'fa-brands fa-linkedin',
  GITHUB: 'fa-brands fa-github',
};

// `null` enquanto carrega; lista vazia quando o pesquisador não tem link (ou a leitura falhou: o link é um extra da
// página, a falha não deve esconder o resto).
export function useLinksAcademicos(authFetch: AuthFetch, idUsuario: number | null | undefined): LinkAcademicoPublico[] | null {
  const [links, setLinks] = useState<LinkAcademicoPublico[] | null>(null);

  useEffect(() => {
    if (!idUsuario) return;
    let ativo = true;
    Promise.all([linkAcademicoApi.listarDoUsuario(authFetch, idUsuario), tipoLinkApi.listarPublico()])
      .then(([lista, tipos]) => {
        if (!ativo) return;
        const tipoPorId = new Map(tipos.map((tipo) => [tipo.idTipolink, tipo]));
        setLinks(
          lista.map((link) => {
            const tipo = tipoPorId.get(link.idTipoLink);
            return {
              idLinkAcademico: link.idLinkAcademico,
              url: link.url,
              rotulo: link.rotulo?.trim() || tipo?.nome || 'Link acadêmico',
              icone: (tipo && ICONE_TIPO_LINK[tipo.codigo]) ?? 'fa-solid fa-link',
            };
          }),
        );
      })
      .catch(() => {
        if (ativo) setLinks([]);
      });
    return () => {
      ativo = false;
    };
  }, [authFetch, idUsuario]);

  return idUsuario ? links : [];
}

