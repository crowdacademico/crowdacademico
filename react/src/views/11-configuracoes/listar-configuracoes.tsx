import { useCallback } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import { logAuditoriaApi } from '../../services/27-log-auditoria/api/log-auditoria.api';
import { ModalCriarConfiguracao } from './modal-criar-configuracao';
import {
  ModalAlterarConfiguracao,
  ModalConsultarConfiguracao,
} from './modal-configuracao';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { ConfiguracaoResponse } from '../../services/11-configuracoes/type/configuracao.type';

// Aba "Parâmetros do Sistema" do painel admin - rota /admin/configuracoes
// (URL/tabela/variáveis internas continuam "configuracoes" de propósito,
// só o nome visível na tela mudou, 11-08-2026 - ver rotas.constants.js).
//
// EM MODAL (14-09-2026, continuação da migração CRUD→Modal pedida pelo
// Lucas) - mesmo padrão de listar-usuarios.tsx/listar-motivos-denuncia.tsx.
export function ListarConfiguracoes({ auth }: PropsPagina) {
  const {
    criando,
    abrirCriando,
    fecharCriando,
    alterando,
    consultando,
    fecharAlterando,
    fecharConsultando,
    chaveRecarga,
    recarregar,
    acoesCompletas,
  } = useCrudModais<ConfiguracaoResponse>();

  const listarConfiguracoes = useCallback(
    () => configuracaoApi.listar(auth.authFetch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.authFetch, chaveRecarga],
  );
  // 'configuracoes' é o nome FÍSICO da tabela (plural, bate com o CREATE
  // TABLE em 01_extensoes_enums_tabelas.sql), não o nome da rota.
  const buscarLogConfiguracoes = useCallback(
    (pagina: number) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'configuracoes', pagina),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable<ConfiguracaoResponse>
        titulo="Parâmetros do Sistema"
        acaoTopo={
          <button type="button" className="btn btn-primary" onClick={abrirCriando}>
            Criar
          </button>
        }
        colunas={[
          { chave: 'idConfig', rotulo: 'id' },
          { chave: 'chave', rotulo: 'chave' },
          { chave: 'valor', rotulo: 'valor' },
          { chave: 'tipo', rotulo: 'tipo' },
          { chave: 'ativo', rotulo: 'ativo' },
          // ADICIONADA (05-09-2026, item 5 de PENDENCIAS) - se a linha
          // global aparece pra quem não tem 'configuracao_gerenciar'
          // (GET /configuracoes sem token). Sem efeito numa linha pessoal.
          { chave: 'publica', rotulo: 'pública' },
        ]}
        chavePrimaria="idConfig"
        listar={listarConfiguracoes}
        // Sem Excluir (24-09-2026): parâmetro global é contrato do sistema, o banco não deixa apagar
        // (pol_config_delete, 04); para desligar uma regra, muda-se o valor.
        acoes={{ alterar: acoesCompletas.alterar, consultar: acoesCompletas.consultar }}
      />
      {/* "De"/"Para" no VALOR (09-08-2026, pedido do Lucas) - é a coluna que
          mais importa aqui: configuracoes existe pra tirar regra de negócio
          hardcoded do .sql, então ver o valor antigo/novo de uma mudança
          (ex.: taxa, limite, prazo) é mais útil que "chave"/"descricao"/
          "ativo" mudaram. */}
      <BlocoLogAuditoria buscar={buscarLogConfiguracoes} campoRenomeio="valor" />

      {criando && (
        <ModalCriarConfiguracao auth={auth} aoFechar={fecharCriando} aoCriado={recarregar} />
      )}

      {alterando && (
        <ModalAlterarConfiguracao
          auth={auth}
          configuracao={alterando}
          aoFechar={fecharAlterando}
          aoAtualizado={recarregar}
        />
      )}

      {consultando && (
        <ModalConsultarConfiguracao configuracao={consultando} aoFechar={fecharConsultando} />
      )}
    </div>
  );
}
