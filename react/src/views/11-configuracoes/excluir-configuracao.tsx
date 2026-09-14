import { useParams } from 'react-router';
import { CampoFicha } from '../../components/crud/ficha-consulta';
import { PaginaExcluir } from '../../components/crud/pagina-excluir';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { ConfiguracaoResponse } from '../../services/11-configuracoes/type/configuracao.type';

export function ExcluirConfiguracao({ auth }: PropsPagina) {
  const { id = '' } = useParams();

  return (
    <PaginaExcluir<ConfiguracaoResponse>
      id={id}
      titulo="Excluir Parâmetro"
      buscar={(id) => configuracaoApi.buscar(auth.authFetch, id)}
      excluir={(id) => configuracaoApi.remover(auth.authFetch, id)}
      mensagemSucesso="Parâmetro excluído com sucesso."
      detalheSucesso={`ID: ${id} foi excluído`}
      campos={(configuracao) => (
        <>
          <CampoFicha rotulo="Chave" valor={configuracao.chave} largura="cheia" />
          <CampoFicha rotulo="Valor" valor={configuracao.valor} />
          <CampoFicha rotulo="Tipo" valor={configuracao.tipo} />
          <CampoFicha rotulo="Ativo" valor={configuracao.ativo ? 'Sim' : 'Não'} />
          <CampoFicha rotulo="Descrição" valor={configuracao.descricao} largura="cheia" />
        </>
      )}
      // Diferente de Excluir Usuário: configuração não tem exclusão lógica
      // (sem coluna `deletado`) - remover aqui é DELETE de verdade na
      // tabela `configuracoes` (09-08-2026, Bloco I).
      aviso={(configuracao) => (
        <>
          Diferente de excluir um usuário, esta linha some do banco pra sempre - não é exclusão
          lógica. Se algum código ainda ler a chave &quot;{configuracao.chave}&quot;, ele vai
          passar a receber o valor padrão dele (ou dar erro, dependendo de como foi escrito).
          Confira se ela não está mais em uso antes de confirmar.
        </>
      )}
    />
  );
}
