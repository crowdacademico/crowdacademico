import { useCallback, useState } from 'react';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
import { configuracoesApi } from '../../services/11-configuracoes/api/configuracoes.api';
import { grupoConfiguracao } from '../../services/11-configuracoes/constants/configuracoes-grupos.constants';
import {
  ModalAlterarConfiguracao,
  ModalConsultarConfiguracao,
} from './modal-configuracao';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { ConfiguracoesResponse } from '../../services/11-configuracoes/type/configuracoes.type';
import { tarifasApi } from '../../services/23-pagamento/api/tarifas.api';
import { useToast } from '../../components/layout/toast/use-toast';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';

// Aba "Parâmetros do Sistema" do painel admin: rota /admin/parametros-sistema (a tabela, a API e as variáveis
// internas continuam "configuracoes"; ver rotas.constants.ts).
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

  // Sincronizar as tarifas com o provedor (16-11-2026): as 4 de pagamento passam a ser as que o provedor cobra hoje (com o
  // desconto enquanto vale). A tarefa diária das 5h faz o mesmo; o botão é para não esperar. O log abaixo mostra o de/para.
  const { mostrar } = useToast();
  const [sincronizando, setSincronizando] = useState(false);
  const sincronizarTarifas = async () => {
    setSincronizando(true);
    try {
      const r = await tarifasApi.sincronizar(auth.authFetch);
      if (!r.sincronizado) {
        mostrar('Nada a sincronizar.', 'O provedor de teste não tem tarifa própria: os parâmetros ficam como estão.', 'aviso');
      } else {
        mostrar(
          r.alterados > 0 ? `Tarifas atualizadas: ${r.alterados} parâmetro(s).` : 'As tarifas já estavam iguais às do provedor.',
          r.tarifas
            ? `Pix ${formatarMoeda(r.tarifas.pix)} · cartão ${r.tarifas.cartaoPercentual}% + ${formatarMoeda(r.tarifas.cartaoFixa)} · boleto ${formatarMoeda(r.tarifas.boleto)}`
            : undefined,
          'sucesso',
        );
        if (r.alterados > 0) recarregar();
      }
    } catch (erro) {
      mostrar(traduzirErro(erro), undefined, 'erro');
    } finally {
      setSincronizando(false);
    }
  };

  const listarConfiguracoes = useCallback(
    () =>
      configuracoesApi
        .listar(auth.authFetch)
        .then((lista) => lista.map((linha) => ({ ...linha, assunto: grupoConfiguracao(linha.chave) }))),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable<LinhaParametro>
        titulo="Parâmetros do Sistema"
        acaoTopo={
          <button type="button" className="btn btn-secondary" disabled={sincronizando} onClick={() => void sincronizarTarifas()} title="Lê no provedor de pagamento as tarifas de hoje (Pix, cartão e boleto) e atualiza os parâmetros. Roda sozinho todo dia às 5h.">
            <i className="fa-solid fa-rotate" aria-hidden="true" />
            {sincronizando ? 'Sincronizando...' : 'Sincronizar tarifas com o provedor'}
          </button>
        }
        colunas={[
          { chave: 'idConfig', rotulo: 'id', tipo: 'id' },
          // A descrição é o que o admin lê; a chave fica ao lado, para quem precisa dela (documentação, suporte).
          { chave: 'descricao', rotulo: 'parâmetro', tipo: 'nome', umaLinha: true },
          { chave: 'chave', rotulo: 'chave', tipo: 'texto' },
          {
            chave: 'valor',
            rotulo: 'valor',
            tipo: 'texto',
            // Parâmetro em reais aparece como R$; os outros, como estão gravados.
            renderizar: (linha: ConfiguracoesResponse) =>
              linha.tipo === 'dinheiro' && linha.valor !== null ? formatarMoeda(linha.valor) : linha.valor,
            textoExibido: (linha: ConfiguracoesResponse) =>
              linha.tipo === 'dinheiro' && linha.valor !== null ? formatarMoeda(linha.valor) : (linha.valor ?? ''),
          },
          { chave: 'tipo', rotulo: 'tipo', tipo: 'texto' },
          { chave: 'ativo', rotulo: 'ativo', tipo: 'simNao' },
          // `publica`: se a linha global aparece para quem não tem 'configuracao_gerenciar' (GET /configuracoes
          // sem token). Sem efeito numa linha pessoal.
          { chave: 'publica', rotulo: 'pública', tipo: 'simNao' },
        ]}
        chavePrimaria="idConfig"
        filtrosFacetados={[{ chave: 'assunto', rotulo: 'Assunto' }]}
        listar={listarConfiguracoes}
          chaveRecarga={chaveRecarga}
        // Sem Excluir: parâmetro global é contrato do sistema, o banco não deixa apagar (pol_config_delete,
        // 04); para desligar uma regra, muda-se o valor.
        acoes={{ alterar: acoesCompletas.alterar, consultar: acoesCompletas.consultar }}
      />
      {/* "De"/"Para" no VALOR: é a coluna que mais importa aqui: configuracoes existe para tirar regra de
          negócio hardcoded do .sql, então ver o valor antigo/novo de uma mudança (ex.: taxa, limite, prazo)
          é mais útil que "chave"/"descricao"/"ativo" mudaram. */}
      <BlocoLogAuditoria authFetch={auth.authFetch} tabela="configuracoes" chaveRecarga={chaveRecarga} />

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
