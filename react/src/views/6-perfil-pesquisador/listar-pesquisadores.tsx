import { useCallback } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
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

// Aba "Pesquisadores": Alterar/Consultar/Excluir EM MODAL, reaproveitando os MESMOS modais de Usuário: as 3
// ações agem sobre o USUÁRIO por trás da linha
// (`ModalAlterarUsuario`/`ModalConsultarUsuario`/`ModalExcluirUsuario`, os MESMOS de `listar-usuarios.tsx`),
// não sobre o perfil de pesquisador em si (mesmo raciocínio de T1, Bancada do Pesquisador, Campo de Testes),
// por isso não precisou de nenhum endpoint novo.
export function ListarPesquisadores({ auth }: PropsPagina) {
  const {
    alterando,
    consultando,
    excluindo,
    fecharAlterando,
    fecharConsultando,
    fecharExcluindo,
    chaveRecarga,
    recarregar,
    acoesCompletas,
  } = useCrudModais<PesquisadorLinha>();

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
          // Largura igual nas 3 colunas (título, status e score): mesma causa e mesmo remédio de Tipos de Link
          // ("9.25rem" para as 4 colunas Sim/Não): sem largura fixa, table-layout: auto mede cada coluna pelo
          // próprio maior valor ("Especialista" é bem mais comprido que "Doutor"/"Ativo"), então cada uma
          // ficaria com um tamanho diferente. `centralizar` em título também (não entraria sozinho: é texto,
          // não número/booleano) para alinhar com status/score, que já centralizam.
          { chave: 'tituloAcademico', rotulo: 'título', centralizar: true, largura: '8rem' },
          { chave: 'statusPesquisador', rotulo: 'status', centralizar: true, largura: '8rem' },
          { chave: 'scoreAtual', rotulo: 'score', largura: '8rem' },
        ]}
        chavePrimaria="idUsuario"
        listar={listarPesquisadores}
        acoes={acoesCompletas}
        filtrosFacetados={[{ chave: 'statusPesquisador', rotulo: 'Status' }]}
      />
      <BlocoLogAuditoria buscar={buscarLogPerfil} />

      {alterando && (
        <ModalAlterarUsuario
          auth={auth}
          idUsuario={alterando.idUsuario}
          aoFechar={fecharAlterando}
          aoAtualizado={recarregar}
        />
      )}

      {consultando && (
        <ModalConsultarUsuario auth={auth} idUsuario={consultando.idUsuario} aoFechar={fecharConsultando} />
      )}

      {excluindo && (
        <ModalExcluirUsuario
          auth={auth}
          idUsuario={excluindo.idUsuario}
          nome={excluindo.nome}
          email={excluindo.email}
          emailVerificado={excluindo.emailVerificado}
          aoFechar={fecharExcluindo}
          aoExcluido={recarregar}
        />
      )}
    </div>
  );
}
