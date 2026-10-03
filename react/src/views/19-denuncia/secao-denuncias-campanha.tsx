import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { TabelaDenuncias } from '../../components/crud/tabelas/12-tabela-denuncias';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { RodapePaginacao } from '../../components/pagination/rodape-paginacao';
import { denunciaApi } from '../../services/19-denuncia/api/denuncia.api';
import { usePaginaServidor } from '../../services/constant/hook/use-pagina-servidor';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';

// Denúncias de uma campanha no Consultar, paginadas pelo servidor (a gestão vê todas, pela permissão de julgar;
// outra conta só veria as próprias). Só aparece quando há alguma: a maioria das campanhas não tem denúncia.
// Julgar fica na tela Denúncias, da moderação.
export function SecaoDenunciasCampanha({ authFetch, idCampanha }: { authFetch: AuthFetch; idCampanha: number }) {
  const { reportarErro } = useErroToast();
  const { dados, total, rodape } = usePaginaServidor(
    (pagina, tamanho) => denunciaApi.listarPagina(authFetch, { idCampanha }, pagina, tamanho),
    String(idCampanha),
    reportarErro,
  );

  if (dados === null || total === 0) {
    return null;
  }
  return (
    <SecaoFicha titulo={`Denúncias (${total})`} colunas={1}>
      <p className="legenda texto-fraco">Julgar e encerrar a campanha por moderação ficam na tela Denúncias.</p>
      <TabelaDenuncias denuncias={dados} />
      <RodapePaginacao {...rodape} />
    </SecaoFicha>
  );
}
