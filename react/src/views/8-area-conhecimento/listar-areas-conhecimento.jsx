import { useCallback } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import { logAuditoriaApi } from '../../services/28-log-auditoria/api/log-auditoria.api';

// Aba (futura) "Áreas do Conhecimento" do painel admin — rota
// /admin/areas-conhecimento. Já registrada em rotas.constants.js e
// funcional por URL direta, só ainda sem rotuloMenu/grupoMenu ativos (o
// Lucas não decidiu em que grupo do menu lateral ela entra) — ver
// comentário lá pra ativar depois.
export function ListarAreasConhecimento({ auth }) {
  // `nomePai` vem vazio pras 9 grandes áreas de verdade (topo da hierarquia
  // CNPq, sem pai nenhum) — "Base" (25-08-2026, pedido do Lucas) no lugar
  // do vazio, tanto na célula quanto como opção clicável no filtro
  // "Grande área" (ver `ordem` abaixo, pra ela aparecer primeiro).
  //
  // ACHADO (mesmo dia): filtrar por "Ciências Agrárias" só mostrava as
  // FILHAS dela, não ela mesma — errado, ela também "é" Ciências Agrárias.
  // Fix: pras 9 raízes, `nomePai` guarda os DOIS valores separados por
  // vírgula ("Base, Ciências Agrárias") — mesmo truque multivalor que a
  // coluna "papel" de Usuários já usa (GenericTable separa por vírgula
  // pra achar as opções de faceta E pra decidir quem bate com o filtro
  // ativo). Assim a própria linha aparece tanto no filtro "Base" quanto
  // no filtro do próprio nome dela. A CÉLULA continua mostrando só "Base"
  // (ver `renderizar` na coluna, abaixo) — a vírgula é só pro filtro
  // enxergar, não pra pessoa ler.
  const listarAreas = useCallback(
    () =>
      areaConhecimentoApi.listar(auth.authFetch).then((lista) =>
        lista.map((area) => ({
          ...area,
          nomePai: area.idPai === null ? `Base, ${area.nome}` : area.nomePai,
        })),
      ),
    [auth.authFetch],
  );
  // 'area_conhecimento' é o nome FÍSICO da tabela (bate com
  // trg_log_auditoria_area_conhecimento, 05_regras_negocio.sql), não o
  // nome da rota — mesma convenção de buscarLogConfiguracoes/
  // buscarLogUsuario.
  const buscarLogAreas = useCallback(
    (pagina) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'area_conhecimento', pagina),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Áreas do Conhecimento"
        acaoTopo={
          <Link to="/admin/areas-conhecimento/criar" className="btn btn-primary">
            Criar
          </Link>
        }
        // Ordem "id, nome, ..." (25-08-2026, pedido do Lucas: padronizar
        // com as outras tabelas — Usuários/Pesquisadores/Campanhas todas
        // colocam "nome" logo depois de "id"; código CNPq vindo antes
        // era a única fora do padrão) — código CNPq só trocou de lugar
        // com nome, nenhum dado mudou.
        colunas={[
          { chave: 'idAreaConhecimento', rotulo: 'id' },
          { chave: 'nome', rotulo: 'nome' },
          { chave: 'codigoCnpq', rotulo: 'código CNPq', centralizar: true },
          {
            chave: 'nomePai',
            rotulo: 'grande área',
            // Célula mostra só "Base" pras 9 raízes — o valor de verdade
            // (com a vírgula, ver listarAreas acima) é só pro filtro.
            renderizar: (linha) => (linha.idPai === null ? 'Base' : linha.nomePai),
          },
          { chave: 'ativo', rotulo: 'ativo' },
        ]}
        chavePrimaria="idAreaConhecimento"
        listar={listarAreas}
        rotaBase="/admin/areas-conhecimento"
        buscarLog={buscarLogAreas}
        campoRenomeioLog="nome"
        // Escolher uma grande área de verdade no filtro mostra só as áreas
        // filhas dela. "Base" (25-08-2026) é a opção especial pras 9
        // grandes áreas em si (topo da hierarquia, sem pai) — antes elas
        // simplesmente somiam de qualquer filtro ativo, sem nenhum jeito
        // de isolar só elas; `ordem: ['Base']` fixa essa opção primeiro na
        // lista, o resto continua alfabético.
        filtrosFacetados={[{ chave: 'nomePai', rotulo: 'Grande área', ordem: ['Base'] }]}
      />
    </div>
  );
}
