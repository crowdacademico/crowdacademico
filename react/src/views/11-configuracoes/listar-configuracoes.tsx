import { useCallback, useState } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import { logAuditoriaApi } from '../../services/27-log-auditoria/api/log-auditoria.api';
import { ModalCriarConfiguracao } from './modal-criar-configuracao';
import {
  ModalAlterarConfiguracao,
  ModalConsultarConfiguracao,
  ModalExcluirConfiguracao,
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
  const [criando, setCriando] = useState(false);
  const [alterando, setAlterando] = useState<ConfiguracaoResponse | null>(null);
  const [consultando, setConsultando] = useState<ConfiguracaoResponse | null>(null);
  const [excluindo, setExcluindo] = useState<ConfiguracaoResponse | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const recarregar = () => setChaveRecarga((atual) => atual + 1);

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
          <button type="button" className="btn btn-primary" onClick={() => setCriando(true)}>
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
        aoAlterar={setAlterando}
        aoConsultar={setConsultando}
        aoExcluir={setExcluindo}
      />
      {/* "De"/"Para" no VALOR (09-08-2026, pedido do Lucas) - é a coluna que
          mais importa aqui: configuracoes existe pra tirar regra de negócio
          hardcoded do .sql, então ver o valor antigo/novo de uma mudança
          (ex.: taxa, limite, prazo) é mais útil que "chave"/"descricao"/
          "ativo" mudaram. */}
      <BlocoLogAuditoria buscar={buscarLogConfiguracoes} campoRenomeio="valor" />

      {criando && (
        <ModalCriarConfiguracao auth={auth} aoFechar={() => setCriando(false)} aoCriado={recarregar} />
      )}

      {alterando && (
        <ModalAlterarConfiguracao
          auth={auth}
          configuracao={alterando}
          aoFechar={() => setAlterando(null)}
          aoAtualizado={recarregar}
        />
      )}

      {consultando && (
        <ModalConsultarConfiguracao configuracao={consultando} aoFechar={() => setConsultando(null)} />
      )}

      {excluindo && (
        <ModalExcluirConfiguracao
          auth={auth}
          configuracao={excluindo}
          aoFechar={() => setExcluindo(null)}
          aoExcluido={recarregar}
        />
      )}
    </div>
  );
}
