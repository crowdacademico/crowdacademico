import { useParams } from 'react-router';
import { CampoFicha } from '../../components/crud/ficha-consulta';
import { PaginaExcluir } from '../../components/crud/pagina-excluir';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { TipoLinkResponse } from '../../services/9-tipo-link/type/tipo-link.type';

// Mesmo padrão de ExcluirConfiguracao (11-configuracoes), via PaginaExcluir
// (componente genérico extraído 14-09-2026 - ver comentário completo lá).
// Diferente de configuracao, tipo_link é referenciado por
// link_academico/link_atualizacao/link_recompensa sem CASCADE - se
// estiver em uso, o backend responde 409 com uma mensagem própria (ver
// tipo-link.service.remove.ts), exibida pelo useErroToast normal dentro
// de PaginaExcluir.
export function ExcluirTipoLink({ auth }: PropsPagina) {
  const { id = '' } = useParams();

  return (
    <PaginaExcluir<TipoLinkResponse>
      id={id}
      titulo="Excluir Tipo de Link"
      buscar={(id) => tipoLinkApi.buscar(auth.authFetch, id)}
      excluir={(id) => tipoLinkApi.remover(auth.authFetch, id)}
      mensagemSucesso="Tipo de link excluído com sucesso."
      detalheSucesso={`ID: ${id} foi excluído`}
      campos={(tipo) => (
        <>
          <CampoFicha rotulo="Código" valor={tipo.codigo} />
          <CampoFicha rotulo="Nome" valor={tipo.nome} largura="cheia" />
        </>
      )}
      aviso={
        <>
          Se este tipo ainda estiver em uso em algum perfil, atualização de campanha ou
          recompensa, a exclusão é bloqueada pelo próprio banco - desative-o em vez de excluir.
          Se não estiver em uso, some do catálogo pra sempre, sem exclusão lógica.
        </>
      }
    />
  );
}
