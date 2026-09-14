import { useParams } from 'react-router';
import { CampoFicha } from '../../components/crud/ficha-consulta';
import { PaginaExcluir } from '../../components/crud/pagina-excluir';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { AreaConhecimentoResponse } from '../../services/8-area-conhecimento/type/area-conhecimento.type';

// Mesmo padrão de ExcluirConfiguracao (11-configuracoes), via PaginaExcluir
// (componente genérico extraído 14-09-2026 - ver comentário completo lá).
// Diferente de configuracao, area_conhecimento é referenciada por
// campanha e por outras áreas filhas (id_pai) sem CASCADE - se estiver em
// uso, o backend responde 409 com uma mensagem própria (ver
// area-conhecimento.service.remove.ts).
export function ExcluirAreaConhecimento({ auth }: PropsPagina) {
  const { id = '' } = useParams();

  return (
    <PaginaExcluir<AreaConhecimentoResponse>
      id={id}
      titulo="Excluir Área de Conhecimento"
      buscar={(id) => areaConhecimentoApi.buscar(auth.authFetch, id)}
      excluir={(id) => areaConhecimentoApi.remover(auth.authFetch, id)}
      mensagemSucesso="Área de conhecimento excluída com sucesso."
      detalheSucesso={`ID: ${id} foi excluído`}
      campos={(area) => (
        <>
          <CampoFicha rotulo="Código CNPq" valor={area.codigoCnpq} />
          <CampoFicha rotulo="Nome" valor={area.nome} largura="cheia" />
          <CampoFicha rotulo="Grande área (pai)" valor={area.nomePai} largura="cheia" />
        </>
      )}
      aviso={
        <>
          Se esta área ainda estiver vinculada a alguma campanha (ou a outra área filha), a
          exclusão é bloqueada pelo próprio banco - desative-a em vez de excluir. Se não estiver
          em uso, some do catálogo pra sempre, sem exclusão lógica.
        </>
      }
    />
  );
}
