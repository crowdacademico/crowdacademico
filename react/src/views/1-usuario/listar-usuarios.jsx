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
        // "De"/"Para" (09-08-2026, pedido do Lucas depois de ver isso em
        // Papéis) — "nome" é o único campo de texto editável de usuario
        // que faz sentido rastrear assim (senha nunca entra no log, ver
        // fn_log_auditoria() [strip de senha_hash]; e-mail não é editável
        // pelo painel).
        campoRenomeioLog="nome"
      />
    </div>
  );
}
