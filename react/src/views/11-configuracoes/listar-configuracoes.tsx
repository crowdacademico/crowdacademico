import { useCallback } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
import { configuracoesApi } from '../../services/11-configuracoes/api/configuracoes.api';
import { grupoConfiguracao } from '../../services/11-configuracoes/constants/configuracoes-grupos.constants';
import { logAuditoriaApi } from '../../services/27-log-auditoria/api/log-auditoria.api';
import {
  ModalAlterarConfiguracao,
  ModalConsultarConfiguracao,
} from './modal-configuracao';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { ConfiguracoesResponse } from '../../services/11-configuracoes/type/configuracoes.type';

// Aba "Parâmetros do Sistema" do painel admin: rota /admin/configuracoes (URL/tabela/variáveis internas
// continuam "configuracoes" de propósito, só o nome visível na tela mudou; ver rotas.constants.ts).
// Alterar/Consultar em modal, mesmo padrão de listar-usuarios.tsx/listar-motivos-denuncia.tsx.
//
// Sem Criar: uma chave nova só tem efeito se alguma regra do banco ou do Nest a ler (config_numero('...')),
// então parâmetro novo entra por SQL (07_seed_dados.sql), junto com a regra que o usa.
// `assunto`: o grupo do parâmetro (Segurança, Financeiro, Campanha...), o mesmo da aba Regras do Negócio do
// Dashboard. Não vira coluna: serve ao filtro "Assunto", para achar um parâmetro sem rolar a lista inteira.
type LinhaParametro = ConfiguracoesResponse & { assunto: string };

export function ListarConfiguracoes({ auth }: PropsPagina) {
  const {
    alterando,
    consultando,
    fecharAlterando,
    fecharConsultando,
    chaveRecarga,
    recarregar,
    acoesCompletas,
  } = useCrudModais<LinhaParametro>();

  const listarConfiguracoes = useCallback(
    () =>
      configuracoesApi
        .listar(auth.authFetch)
        .then((lista) => lista.map((linha) => ({ ...linha, assunto: grupoConfiguracao(linha.chave) }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.authFetch, chaveRecarga],
  );
  // 'configuracoes' é o nome FÍSICO da tabela (plural, bate com o CREATE
  // TABLE em 01_extensoes_enums_tabelas.sql), não o nome da rota.
  const buscarLogConfiguracoes = useCallback(
    (pagina: number, tamanho: number) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'configuracoes', pagina, tamanho),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable<LinhaParametro>
        titulo="Parâmetros do Sistema"
        colunas={[
          { chave: 'idConfig', rotulo: 'id', tipo: 'id' },
          // A descrição é o que o admin lê; a chave fica ao lado, para quem precisa dela (documentação, suporte).
          { chave: 'descricao', rotulo: 'parâmetro', tipo: 'nome' },
          { chave: 'chave', rotulo: 'chave', tipo: 'texto' },
          { chave: 'valor', rotulo: 'valor', tipo: 'texto' },
          { chave: 'tipo', rotulo: 'tipo', tipo: 'status' },
          { chave: 'ativo', rotulo: 'ativo', tipo: 'simNao' },
          // `publica`: se a linha global aparece para quem não tem 'configuracao_gerenciar' (GET /configuracoes
          // sem token). Sem efeito numa linha pessoal.
          { chave: 'publica', rotulo: 'pública', tipo: 'simNao' },
        ]}
        chavePrimaria="idConfig"
        filtrosFacetados={[{ chave: 'assunto', rotulo: 'Assunto' }]}
        listar={listarConfiguracoes}
        // Sem Excluir: parâmetro global é contrato do sistema, o banco não deixa apagar (pol_config_delete,
        // 04); para desligar uma regra, muda-se o valor.
        acoes={{ alterar: acoesCompletas.alterar, consultar: acoesCompletas.consultar }}
      />
      {/* "De"/"Para" no VALOR: é a coluna que mais importa aqui: configuracoes existe para tirar regra de
          negócio hardcoded do .sql, então ver o valor antigo/novo de uma mudança (ex.: taxa, limite, prazo)
          é mais útil que "chave"/"descricao"/"ativo" mudaram. */}
      <BlocoLogAuditoria buscar={buscarLogConfiguracoes} />

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
