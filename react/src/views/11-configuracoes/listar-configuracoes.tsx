import { useCallback } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
import { configuracoesApi } from '../../services/11-configuracoes/api/configuracoes.api';
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
export function ListarConfiguracoes({ auth }: PropsPagina) {
  const {
    alterando,
    consultando,
    fecharAlterando,
    fecharConsultando,
    chaveRecarga,
    recarregar,
    acoesCompletas,
  } = useCrudModais<ConfiguracoesResponse>();

  const listarConfiguracoes = useCallback(
    () => configuracoesApi.listar(auth.authFetch),
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
      <GenericTable<ConfiguracoesResponse>
        titulo="Parâmetros do Sistema"
        subtitulo="Regras do sistema que o administrador ajusta sem mexer no código."
        colunas={[
          { chave: 'idConfig', rotulo: 'id', tipo: 'id' },
          // A descrição é o que o admin lê; a chave técnica vem embaixo, pequena, para quem precisa dela
          // (documentação, suporte). Na mesma célula, não numa coluna própria: com ela a tabela não cabia e a
          // coluna "tipo" ficava cortada atrás de "Ações". O filtro continua achando pela chave (`busca`).
          {
            chave: 'descricao',
            rotulo: 'parâmetro',
            tipo: 'nome',
            renderizar: (linha) => (
              <>
                <span className="block">{linha.descricao}</span>
                <code className="block text-xs texto-fraco mt-0.5 break-all">{linha.chave}</code>
              </>
            ),
            busca: (linha) => linha.chave,
          },
          { chave: 'valor', rotulo: 'valor', tipo: 'texto' },
          { chave: 'tipo', rotulo: 'tipo', tipo: 'status' },
          { chave: 'ativo', rotulo: 'ativo', tipo: 'simNao' },
          // `publica`: se a linha global aparece para quem não tem 'configuracao_gerenciar' (GET /configuracoes
          // sem token). Sem efeito numa linha pessoal.
          { chave: 'publica', rotulo: 'pública', tipo: 'simNao' },
        ]}
        chavePrimaria="idConfig"
        listar={listarConfiguracoes}
        // Sem Excluir: parâmetro global é contrato do sistema, o banco não deixa apagar (pol_config_delete,
        // 04); para desligar uma regra, muda-se o valor.
        acoes={{ alterar: acoesCompletas.alterar, consultar: acoesCompletas.consultar }}
      />
      {/* "De"/"Para" no VALOR: é a coluna que mais importa aqui: configuracoes existe para tirar regra de
          negócio hardcoded do .sql, então ver o valor antigo/novo de uma mudança (ex.: taxa, limite, prazo)
          é mais útil que "chave"/"descricao"/"ativo" mudaram. */}
      <BlocoLogAuditoria buscar={buscarLogConfiguracoes} campoRenomeio="valor" />

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
