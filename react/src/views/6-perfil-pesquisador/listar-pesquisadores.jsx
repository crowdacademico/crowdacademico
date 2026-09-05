import { useCallback } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TITULO_ACADEMICO,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { logAuditoriaApi } from '../../services/27-log-auditoria/api/log-auditoria.api';

// Aba "Pesquisadores" (23-08-2026, pedido do Lucas: "algum outro que eu
// esqueci?" - 6-perfil-pesquisador estava pronto e testado desde
// 22-08-2026, mas sem NENHUMA entrada de menu, igual Motivos de Denúncia
// estava antes). Mesmo raciocínio de sem-Alterar/sem-Excluir de
// listar-campanhas.jsx: editar campos de pesquisador tem regra própria
// (RF-017, correção de CPF é só via função SECURITY DEFINER, não um PATCH
// livre) e não existe endpoint de exclusão (status ativo/suspenso).
export function ListarPesquisadores({ auth }) {
  const listarPesquisadores = useCallback(async () => {
    const [pesquisadores, usuarios] = await Promise.all([
      perfilPesquisadorApi.listar(auth.authFetch),
      usuarioApi.listar(auth.authFetch).catch(() => []),
    ]);

    const nomePorIdUsuario = new Map(usuarios.map((usuario) => [usuario.idUsuario, usuario.nome]));

    return pesquisadores.map((pesquisador) => ({
      ...pesquisador,
      nome: nomePorIdUsuario.get(pesquisador.idUsuario) ?? `#${pesquisador.idUsuario}`,
      tituloAcademico: ROTULO_TITULO_ACADEMICO[pesquisador.tituloAcademico] ?? pesquisador.tituloAcademico,
      statusPesquisador: ROTULO_STATUS_PESQUISADOR[pesquisador.statusPesquisador] ?? pesquisador.statusPesquisador,
    }));
  }, [auth.authFetch]);

  const buscarLogPerfil = useCallback(
    (pagina) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'perfil_pesquisador', pagina),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Pesquisadores"
        colunas={[
          { chave: 'idUsuario', rotulo: 'id' },
          { chave: 'nome', rotulo: 'nome' },
          // largura igual nas 3 (25-08-2026, pedido do Lucas: "título,
          // status e score, cada um de um tamanho diferente e espalhados"
          // - mesma causa e mesmo remédio de Tipos de Link, "9.25rem"
          // pras 4 colunas Sim/Não: sem largura fixa, table-layout: auto
          // mede cada coluna pelo próprio maior valor ("Especialista" é
          // bem mais comprido que "Doutor"/"Ativo"), então cada uma
          // ficava com um tamanho diferente. `centralizar` em título
          // também (não teria entrado sozinho - é texto, não
          // número/booleano) pra alinhar com status/score, que já
          // centralizavam.
          { chave: 'tituloAcademico', rotulo: 'título', centralizar: true, largura: '8rem' },
          { chave: 'statusPesquisador', rotulo: 'status', centralizar: true, largura: '8rem' },
          { chave: 'scoreAtual', rotulo: 'score', largura: '8rem' },
        ]}
        chavePrimaria="idUsuario"
        listar={listarPesquisadores}
        rotaBase="/admin/pesquisadores"
        acoes={['consultar']}
        filtrosFacetados={[{ chave: 'statusPesquisador', rotulo: 'Status' }]}
        buscarLog={buscarLogPerfil}
      />
    </div>
  );
}
