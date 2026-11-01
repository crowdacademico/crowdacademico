import { useCallback } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
import { modeloMensagemApi } from '../../services/27-notificacao/api/modelo-mensagem.api';
import {
  ROTULO_CANAL_NOTIFICACAO,
  rotuloTipoNotificacao,
} from '../../services/27-notificacao/constants/notificacao.constants';
import { logAuditoriaApi } from '../../services/28-log-auditoria/api/log-auditoria.api';
import { ModalAlterarModeloMensagem, ModalConsultarModeloMensagem } from './modal-modelo-mensagem';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { ModeloMensagemResponse } from '../../services/27-notificacao/type/modelo-mensagem.type';

type LinhaModelo = ModeloMensagemResponse & { aviso: string; canalRotulo: string };

// Configurações > Mensagens: o texto de cada aviso do sistema, por evento e canal (tabela modelo_mensagem). O admin
// muda o texto e liga/desliga o canal; sem Criar nem Excluir, porque cada aviso nasce de um gatilho do banco.
export function ListarModelosMensagem({ auth }: PropsPagina) {
  const { alterando, consultando, fecharAlterando, fecharConsultando, chaveRecarga, recarregar, acoesCompletas } =
    useCrudModais<LinhaModelo>();

  const listar = useCallback(
    () =>
      modeloMensagemApi.listar(auth.authFetch).then((lista) =>
        lista.map((modelo) => ({
          ...modelo,
          aviso: rotuloTipoNotificacao(modelo.tipoEvento),
          canalRotulo: ROTULO_CANAL_NOTIFICACAO[modelo.canal],
        })),
      ),
    [auth.authFetch],
  );
  const buscarLog = useCallback(
    (pagina: number, tamanho: number) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'modelo_mensagem', pagina, tamanho),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable<LinhaModelo>
        titulo="Mensagens"
        ajuda="O texto de cada aviso do sistema. Cada aviso pode sair por e-mail, pelo sino do painel ou pelos dois: desligar um canal vale para os próximos avisos. A mudança no texto vale a partir do próximo envio; no sino, também para os avisos antigos."
        colunas={[
          { chave: 'idModeloMensagem', rotulo: 'id', tipo: 'id' },
          { chave: 'aviso', rotulo: 'aviso', tipo: 'nome', umaLinha: true },
          { chave: 'canalRotulo', rotulo: 'canal', tipo: 'texto' },
          { chave: 'titulo', rotulo: 'assunto ou título', tipo: 'texto', umaLinha: true },
          { chave: 'ativo', rotulo: 'ligado', tipo: 'simNao' },
        ]}
        chavePrimaria="idModeloMensagem"
        filtrosFacetados={[{ chave: 'canalRotulo', rotulo: 'Canal' }]}
        listar={listar}
        chaveRecarga={chaveRecarga}
        acoes={{ alterar: acoesCompletas.alterar, consultar: acoesCompletas.consultar }}
      />
      <BlocoLogAuditoria buscar={buscarLog} chaveRecarga={chaveRecarga} />

      {alterando && (
        <ModalAlterarModeloMensagem auth={auth} modelo={alterando} aoFechar={fecharAlterando} aoAtualizado={recarregar} />
      )}
      {consultando && <ModalConsultarModeloMensagem modelo={consultando} aoFechar={fecharConsultando} />}
    </div>
  );
}
