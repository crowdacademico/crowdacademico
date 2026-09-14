import { useCallback, useState } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TITULO_ACADEMICO,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { logAuditoriaApi } from '../../services/27-log-auditoria/api/log-auditoria.api';
import { ModalAlterarUsuario, ModalConsultarUsuario, ModalExcluirUsuario } from '../1-usuario/modal-usuario';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { PerfilPesquisadorResponse } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';

interface PesquisadorLinha extends Omit<PerfilPesquisadorResponse, 'tituloAcademico' | 'statusPesquisador'> {
  nome: string;
  email: string;
  emailVerificado: boolean;
  tituloAcademico: string;
  statusPesquisador: string;
}

// Aba "Pesquisadores" (23-08-2026, pedido do Lucas: "algum outro que eu
// esqueci?" - 6-perfil-pesquisador estava pronto e testado desde
// 22-08-2026, mas sem NENHUMA entrada de menu, igual Motivos de Denúncia
// estava antes).
//
// Alterar/Consultar/Excluir EM MODAL, reaproveitando os MESMOS modais de
// Usuário (14-09-2026, pedido do Lucas: "Pesquisadores é o mesmo que
// Usuário, é praticamente duas telas de Usuário uma embaixo da outra") -
// mesmo raciocínio de T1 (Bancada do Pesquisador, Campo de Testes): as 3
// ações agem sobre o USUÁRIO por trás da linha (`ModalAlterarUsuario`/
// `ModalConsultarUsuario`/`ModalExcluirUsuario`, os MESMOS de
// `listar-usuarios.tsx`), não sobre o perfil de pesquisador em si - por
// isso não precisou de nenhum endpoint novo. `consultar-pesquisador.tsx`
// (página própria) já tinha sido apagada em 13-09-2026 por esse motivo;
// Alterar/Excluir seguem o mesmo caminho agora.
export function ListarPesquisadores({ auth }: PropsPagina) {
  const [idConsultando, setIdConsultando] = useState<number | null>(null);
  const [idAlterando, setIdAlterando] = useState<number | null>(null);
  const [excluindo, setExcluindo] = useState<PesquisadorLinha | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const recarregar = () => setChaveRecarga((atual) => atual + 1);

  const listarPesquisadores = useCallback(async (): Promise<PesquisadorLinha[]> => {
    const [pesquisadores, usuarios] = await Promise.all([
      perfilPesquisadorApi.listar(auth.authFetch),
      usuarioApi.listar(auth.authFetch).catch(() => []),
    ]);

    const usuarioPorId = new Map(usuarios.map((usuario) => [usuario.idUsuario, usuario]));

    return pesquisadores.map((pesquisador) => {
      const usuario = usuarioPorId.get(pesquisador.idUsuario);
      return {
        ...pesquisador,
        nome: usuario?.nome ?? `#${pesquisador.idUsuario}`,
        email: usuario?.email ?? '',
        emailVerificado: usuario?.emailVerificado ?? false,
        tituloAcademico: ROTULO_TITULO_ACADEMICO[pesquisador.tituloAcademico],
        statusPesquisador: ROTULO_STATUS_PESQUISADOR[pesquisador.statusPesquisador],
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, chaveRecarga]);

  const buscarLogPerfil = useCallback(
    (pagina: number) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'perfil_pesquisador', pagina),
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
        aoAlterar={(linha) => setIdAlterando(linha.idUsuario)}
        aoConsultar={(linha) => setIdConsultando(linha.idUsuario)}
        aoExcluir={setExcluindo}
        filtrosFacetados={[{ chave: 'statusPesquisador', rotulo: 'Status' }]}
      />
      <BlocoLogAuditoria buscar={buscarLogPerfil} />

      {idAlterando !== null && (
        <ModalAlterarUsuario
          auth={auth}
          idUsuario={idAlterando}
          aoFechar={() => setIdAlterando(null)}
          aoAtualizado={recarregar}
        />
      )}

      {idConsultando !== null && (
        <ModalConsultarUsuario auth={auth} idUsuario={idConsultando} aoFechar={() => setIdConsultando(null)} />
      )}

      {excluindo && (
        <ModalExcluirUsuario
          auth={auth}
          idUsuario={excluindo.idUsuario}
          nome={excluindo.nome}
          email={excluindo.email}
          emailVerificado={excluindo.emailVerificado}
          aoFechar={() => setExcluindo(null)}
          aoExcluido={recarregar}
        />
      )}
    </div>
  );
}
