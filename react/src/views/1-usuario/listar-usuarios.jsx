import { useCallback } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { logAuditoriaApi } from '../../services/28-log-auditoria/api/log-auditoria.api';

// Papel que TODO cadastro já ganha automaticamente (atribuir_papel_padrao,
// 08_trigger_signup_usuario.sql) — mostrar ele na coluna "papel" seria
// ruído (é o mesmo texto em toda linha da tabela). Só os papéis ALÉM do
// padrão aparecem na coluna; sem nenhum, mostra "-".
const PAPEL_PADRAO = 'usuario';
const SEM_PAPEL_EXTRA = '-';

// Aba "Usuários" do painel admin — vive na rota /admin/usuarios (ver
// services/router/rotas.constants.js, ROTAS_ADMIN). Renderizada dentro do
// <Outlet/> de views/admin/admin-layout.jsx (sidebar + área de conteúdo já
// prontos por fora, esta view só cuida do próprio conteúdo).
export function ListarUsuarios({ auth }) {
  // useCallback aqui não é sobre performance — é porque GenericTable usa a
  // função em `useEffect([listar])`; sem isso, cada render criaria uma
  // função nova e recarregaria a tabela em loop.
  //
  // Coluna "papel" (03-08-2026, pedido do Lucas) — busca a lista de
  // usuários e o vínculo usuário↔papel de TODOS de uma vez (1 requisição
  // cada, não 1-por-linha), e junta os dois no navegador antes de devolver
  // pro GenericTable. `usuarioPapelApi.listarTudo` tem `.catch(() => [])`
  // de propósito: se falhar por qualquer motivo, a tabela continua
  // funcionando, só sem a coluna de papel preenchida.
  const listarUsuarios = useCallback(async () => {
    const [usuarios, vinculos] = await Promise.all([
      usuarioApi.listar(auth.authFetch),
      usuarioPapelApi.listarTudo(auth.authFetch).catch(() => []),
    ]);

    const papeisPorUsuario = new Map();
    for (const vinculo of vinculos) {
      if (vinculo.nomePapel === PAPEL_PADRAO) {
        continue;
      }
      const atuais = papeisPorUsuario.get(vinculo.idUsuario) ?? [];
      atuais.push(vinculo.nomePapel);
      papeisPorUsuario.set(vinculo.idUsuario, atuais);
    }

    return usuarios.map((usuario) => ({
      ...usuario,
      papel: papeisPorUsuario.get(usuario.idUsuario)?.join(', ') || SEM_PAPEL_EXTRA,
    }));
  }, [auth.authFetch]);
  // 'usuario' é o nome FÍSICO da tabela no Postgres (bate com
  // fn_log_auditoria() via TG_TABLE_NAME), não o nome da rota.
  const buscarLogUsuario = useCallback(
    () => logAuditoriaApi.listarPorTabela(auth.authFetch, 'usuario'),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      {/* TEMPORÁRIO (pedido do Lucas, 07-08-2026): coluna "papel" mostra o
          papel de QUALQUER usuário pra QUALQUER sessão logada (pol_usuariopapel_select
          virou USING(true) enquanto o sistema está em construção) — nota
          visível de propósito, pra não passar a impressão de que isto já é
          o comportamento final. */}
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
        A coluna <strong>papel</strong> está visível para todos temporariamente,
        só para facilitar os testes durante o desenvolvimento. No futuro, cada
        papel só vai conseguir visualizar o que lhe couber.
      </p>
      <GenericTable
        titulo="Usuários"
        acaoTopo={
          <Link to="/usuarios/criar" className="btn btn-primary">
            Criar
          </Link>
        }
        colunas={[
          { chave: 'idUsuario', rotulo: 'id' },
          { chave: 'nome', rotulo: 'nome' },
          { chave: 'papel', rotulo: 'papel' },
          { chave: 'email', rotulo: 'email' },
          { chave: 'emailVerificado', rotulo: 'e-mail verificado' },
        ]}
        chavePrimaria="idUsuario"
        listar={listarUsuarios}
        rotaBase="/usuarios"
        buscarLog={buscarLogUsuario}
      />
    </div>
  );
}
