import { useParams } from 'react-router';
import { CampoFicha } from '../../components/crud/ficha-consulta';
import { PaginaExcluir } from '../../components/crud/pagina-excluir';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';
import { ROTULO_TIPO_MOTIVO_DENUNCIA as ROTULO_TIPO } from '../../services/10-motivo-denuncia/constants/motivo-denuncia.constants';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { MotivoDenunciaResponse } from '../../services/10-motivo-denuncia/type/motivo-denuncia.type';

// Mesmo padrão de ExcluirConfiguracao (11-configuracoes), via PaginaExcluir
// (componente genérico extraído 14-09-2026 - ver comentário completo lá).
// Diferente de configuracao, motivo_denuncia é referenciado por denuncia
// (FK_DENUNCIA_MOTIVO) sem CASCADE - se estiver em uso, o backend responde
// 409 com uma mensagem própria (ver motivo-denuncia.service.remove.ts).
export function ExcluirMotivoDenuncia({ auth }: PropsPagina) {
  const { id = '' } = useParams();

  return (
    <PaginaExcluir<MotivoDenunciaResponse>
      id={id}
      titulo="Excluir Motivo de Denúncia"
      buscar={(id) => motivoDenunciaApi.buscar(auth.authFetch, id)}
      excluir={(id) => motivoDenunciaApi.remover(auth.authFetch, id)}
      mensagemSucesso="Motivo de denúncia excluído com sucesso."
      detalheSucesso={`ID: ${id} foi excluído`}
      campos={(motivo) => (
        <>
          <CampoFicha rotulo="Descrição" valor={motivo.descricao} largura="cheia" />
          <CampoFicha rotulo="Tipo" valor={ROTULO_TIPO[motivo.tipo]} />
        </>
      )}
      aviso={
        <>
          Se este motivo já tiver sido usado em alguma denúncia, a exclusão é bloqueada pelo
          próprio banco - desative-o em vez de excluir. Se não estiver em uso, some do catálogo
          pra sempre, sem exclusão lógica.
        </>
      }
    />
  );
}
