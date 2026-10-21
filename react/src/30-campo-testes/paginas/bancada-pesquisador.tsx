import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { listarUsuariosVisiveis } from '../servicos/util/usuarios-visiveis.util';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { ORDEM_PODER_PAPEL, PAPEL_SEM_EXTRA } from '../../services/2-papel-permissao/constants/papel-ordem-poder.constants';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TITULO_ACADEMICO,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
import { seguirPesquisadorApi } from '../../services/16-seguir/api/seguir-pesquisador.api';
import { useToast } from '../../components/layout/toast/use-toast';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { gerarCpfValido } from '../servicos/util/gerar-cpf-valido.util';
import { ORIGEM_NORMAL, origemUsuario } from '../servicos/util/registros-demonstracao.util';
import { useAuthFetchRegistrado } from '../servicos/hook/use-chamada-registrada';
import { ModaisUsuario } from '../../views/1-usuario/modais-usuario';
import { ModalUpgradePesquisador } from '../../views/6-perfil-pesquisador/modal-upgrade-pesquisador';
import { ModalDenunciar } from '../../views/19-denuncia/modal-denunciar';
import { RegistroChamadas } from './registro-chamadas';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { UsuarioResponse } from '../../services/1-usuario/type/usuario.type';
import type { PerfilPesquisadorResponse } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';

// Perfil pode não existir (upgrade nunca feito): os campos do perfil ficam opcionais.
interface PesquisadorLinha extends Partial<PerfilPesquisadorResponse> {
  idUsuario: number;
  // null: pesquisador cuja conta a sessão não pode ler (quem não tem usuario_visualizar_sensivel vê só a própria).
  usuario: UsuarioResponse | null;
  nome: string;
  // Papéis além do padrão 'usuario', separados por vírgula (ou PAPEL_SEM_EXTRA).
  papel: string;
  titulo: string;
  status: string;
  origem: string;
}

// T1, Bancada do Pesquisador. Trabalha em cima de REGISTROS REAIS (todos os usuários, com o perfil de
// pesquisador quando existe). Toda escrita usa a sessão REAL do painel (`auth`), de qualquer papel: sem permissão de
// listar usuários, a tabela mostra a própria conta (Upgrade, Alterar) e os pesquisadores (Seguir, Denunciar).
//
// Os modais são os de Usuário (`views/1-usuario/`, o CRUD real), não duplicados aqui. O Upgrade abre o mesmo
// ModalUpgradePesquisador de qualquer conta, que decide sozinho entre o endpoint self-service e o "para outro".
export function BancadaPesquisador({ auth }: PropsPagina) {
  // Os modais de Usuário não sabem que o Registro de Chamadas existe: recebem uma `auth` cujo `authFetch` registra
  // cada chamada.
  const authRegistrado = { authFetch: useAuthFetchRegistrado(auth) };
  const { alterando, setAlterando, consultando, setConsultando, excluindo, setExcluindo, chaveRecarga, recarregar } =
    useCrudModais<PesquisadorLinha>();
  const [upgrade, setUpgrade] = useState<PesquisadorLinha | null>(null);
  const [denunciando, setDenunciando] = useState<PesquisadorLinha | null>(null);
  // Os pesquisadores que a conta logada segue (RF-028): o coração alterna, como o de campanha na T2.
  const [seguidos, setSeguidos] = useState<Set<number>>(new Set());
  const { mostrar } = useToast();
  const { reportarErro } = useErroToast();
  const carregarSeguidos = () =>
    seguirPesquisadorApi
      .listarMinhas(auth.authFetch)
      .then((lista) => setSeguidos(new Set(lista.map((item) => item.idPesquisador))))
      .catch(reportarErro);
  useEffect(() => {
    void carregarSeguidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch]);
  const alternarSeguir = (linha: PesquisadorLinha) => {
    const segue = seguidos.has(linha.idUsuario);
    const chamada = segue
      ? seguirPesquisadorApi.deixarDeSeguir(authRegistrado.authFetch, linha.idUsuario)
      : seguirPesquisadorApi.seguir(authRegistrado.authFetch, linha.idUsuario);
    chamada
      .then(() => {
        mostrar(segue ? 'Deixou de seguir.' : 'Seguindo o pesquisador.', linha.nome);
        void carregarSeguidos();
      })
      .catch(reportarErro);
  };

  // Faceta Origem pré-marcada em "normal": esconde as 7 contas "Sistema".
  const [parametros, setParametros] = useSearchParams();
  useEffect(() => {
    if (!parametros.has('origem')) setParametros({ origem: ORIGEM_NORMAL }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Papéis de todo mundo numa requisição só; papel padrão 'usuario' não conta como "extra".
  const listar = useCallback(async (): Promise<PesquisadorLinha[]> => {
    const [usuarios, perfis, vinculos] = await Promise.all([
      listarUsuariosVisiveis(auth),
      perfilPesquisadorApi.listar(auth.authFetch).catch(() => []),
      usuarioPapelApi.listarTudo(auth.authFetch).catch(() => []),
    ]);
    const usuarioPorId = new Map(usuarios.map((usuario) => [usuario.idUsuario, usuario]));
    const perfilPorId = new Map(perfis.map((perfil) => [perfil.idUsuario, perfil]));
    // Contas visíveis e perfis de pesquisador (a RLS mostra todos): sem a lista de usuários, o pesquisador ainda
    // aparece para seguir e denunciar, só sem o nome.
    const ids = [...new Set([...usuarioPorId.keys(), ...perfilPorId.keys()])].sort((a, b) => a - b);
    return ids.map((idUsuario) => {
      const usuario = usuarioPorId.get(idUsuario) ?? null;
      const perfil = perfilPorId.get(idUsuario);
      const papeis = vinculos.filter((v) => v.idUsuario === idUsuario && v.nomePapel !== 'usuario');
      return {
        ...perfil,
        idUsuario,
        usuario,
        nome: usuario?.nome ?? `Pesquisador #${idUsuario}`,
        papel: papeis.map((v) => v.nomePapel).join(', ') || PAPEL_SEM_EXTRA,
        titulo: perfil?.tituloAcademico ? ROTULO_TITULO_ACADEMICO[perfil.tituloAcademico] : '',
        status: perfil?.statusPesquisador ? ROTULO_STATUS_PESQUISADOR[perfil.statusPesquisador] : '',
        origem: origemUsuario(idUsuario),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch]);

  return (
    <div className="admin-content-painel">
      <GenericTable<PesquisadorLinha>
        titulo="Campo de Testes - Bancada do Pesquisador"
        colunas={[
          { chave: 'idUsuario', rotulo: 'id', tipo: 'id' },
          { chave: 'nome', rotulo: 'nome', tipo: 'nome', umaLinha: true },
          { chave: 'papel', rotulo: 'papel', tipo: 'texto' },
          { chave: 'titulo', rotulo: 'título', tipo: 'texto' },
          { chave: 'status', rotulo: 'status', tipo: 'status' },
          { chave: 'scoreAtual', rotulo: 'score', tipo: 'numero' },
        ]}
        chavePrimaria="idUsuario"
        listar={listar}
          chaveRecarga={chaveRecarga}
        acoes={{
          alterar: setAlterando,
          consultar: setConsultando,
          upgrade: (linha) => setUpgrade(linha),
          denunciar: setDenunciando,
          seguir: alternarSeguir,
          deixarDeSeguir: alternarSeguir,
          excluir: setExcluindo,
        }}
        acoesEmColuna={[
          { rotulo: 'upgrade', acoes: ['upgrade'] },
          { rotulo: 'seguir', acoes: ['seguir', 'deixarDeSeguir'] },
          { rotulo: 'denunciar', acoes: ['denunciar'] },
        ]}
        // Upgrade só para quem não é pesquisador; seguir e denunciar só perfil de pesquisador, nunca o próprio.
        acaoIndisponivel={(linha, acao) => {
          const ehPesquisador = linha.statusPesquisador !== undefined;
          if (linha.usuario === null && (acao === 'alterar' || acao === 'consultar' || acao === 'excluir' || acao === 'upgrade')) {
            return 'Sem permissão para ver os dados desta conta.';
          }
          if (acao === 'upgrade') return ehPesquisador ? null : undefined;
          if (acao === 'seguir' || acao === 'deixarDeSeguir') {
            if (!ehPesquisador || acao === (seguidos.has(linha.idUsuario) ? 'seguir' : 'deixarDeSeguir')) return null;
            return linha.idUsuario === auth.usuario?.idUsuario ? 'Não dá para seguir a si mesmo.' : undefined;
          }
          if (acao !== 'denunciar') return undefined;
          if (!ehPesquisador) return null;
          return linha.idUsuario === auth.usuario?.idUsuario ? 'Não dá para denunciar o próprio perfil.' : undefined;
        }}
        filtrosFacetados={[
          { chave: 'papel', rotulo: 'Papel', ordem: ORDEM_PODER_PAPEL },
          { chave: 'origem', rotulo: 'Origem' },
        ]}
      />

      <ModaisUsuario
        auth={authRegistrado}
        alterando={alterando}
        consultando={consultando}
        excluindo={excluindo?.usuario ?? null}
        fecharAlterando={() => setAlterando(null)}
        fecharConsultando={() => setConsultando(null)}
        fecharExcluindo={() => setExcluindo(null)}
        aoMudar={recarregar}
      />

      {upgrade !== null && (
        <ModalUpgradePesquisador
          auth={auth}
          idUsuarioAlvo={upgrade.idUsuario}
          nomeAlvo={upgrade.nome}
          gerarCpfDeTeste={gerarCpfValido}
          aoFechar={() => setUpgrade(null)}
          aoConcluido={recarregar}
        />
      )}

      {denunciando && (
        <ModalDenunciar
          authFetch={authRegistrado.authFetch}
          alvo={{ idPesquisadorAlvo: denunciando.idUsuario }}
          nomeAlvo={denunciando.nome}
          aoFechar={() => setDenunciando(null)}
        />
      )}

      <RegistroChamadas />
    </div>
  );
}
