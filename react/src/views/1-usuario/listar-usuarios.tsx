import { useCallback, useState } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import {
  ORDEM_PODER_PAPEL,
  PAPEL_SEM_EXTRA,
} from '../../services/2-papel-permissao/constants/papel-ordem-poder';
import { logAuditoriaApi } from '../../services/27-log-auditoria/api/log-auditoria.api';
import { ModalAlterarUsuario, ModalConsultarUsuario, ModalExcluirUsuario } from './modal-usuario';
import { ModalCriarUsuario } from './modal-criar-usuario';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { UsuarioResponse } from '../../services/1-usuario/type/usuario.type';

interface UsuarioLinha extends UsuarioResponse {
  papel: string;
}

// Papel que TODO cadastro já ganha automaticamente (atribuir_papel_padrao,
// 08_trigger_signup_usuario.sql) - mostrar ele na coluna "papel" seria
// ruído (é o mesmo texto em toda linha da tabela). Só os papéis ALÉM do
// padrão aparecem na coluna; sem nenhum, mostra PAPEL_SEM_EXTRA.
const PAPEL_PADRAO = 'usuario';

// Aba "Usuários" do painel admin - vive na rota /admin/usuarios (ver
// services/router/rotas.constants.ts, ROTAS_ADMIN). Renderizada dentro do
// <Outlet/> de views/admin/admin-layout.tsx (sidebar + área de conteúdo já
// prontos por fora, esta view só cuida do próprio conteúdo).
//
// EM MODAL (13-09-2026, pedido do Lucas: "apagar as telas do CRUD de
// Usuário, fazer a completa migração do Modal") - Criar/Alterar/Consultar/
// Excluir deixaram de ser páginas próprias (`/admin/usuarios/:id/alterar`
// etc., removidas de rotas.constants.ts) e viraram os modais de
// `modal-usuario.tsx`/`modal-criar-usuario.tsx` - os MESMOS componentes
// que a Bancada do Pesquisador (Campo de Testes) usa, sem duplicar nada.
// `GenericTable` ganhou `aoAlterar`/`aoConsultar`/`aoExcluir` (aditivo, as
// outras ~10 telas que ainda usam `rotaBase` continuam navegando por
// página, sem mudança nenhuma) especificamente pra esta migração.
export function ListarUsuarios({ auth }: PropsPagina) {
  const [criando, setCriando] = useState(false);
  const [idAlterando, setIdAlterando] = useState<number | null>(null);
  const [idConsultando, setIdConsultando] = useState<number | null>(null);
  const [excluindo, setExcluindo] = useState<UsuarioLinha | null>(null);
  // Incrementar isto muda a IDENTIDADE de `listarUsuarios` (useCallback
  // abaixo) sem mudar o que ela faz - é assim que se força o `useEffect`
  // interno de GenericTable (`useEffect(() => {...}, [listar])`) a buscar
  // de novo depois que um modal altera dado (GenericTable não expõe um
  // "recarregar" próprio, de propósito: quem decide QUANDO recarregar é
  // sempre o componente pai, não a tabela genérica).
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const recarregar = () => setChaveRecarga((atual) => atual + 1);

  // useCallback aqui não é sobre performance - é porque GenericTable usa a
  // função em `useEffect([listar])`; sem isso, cada render criaria uma
  // função nova e recarregaria a tabela em loop.
  //
  // Coluna "papel" (03-08-2026, pedido do Lucas) - busca a lista de
  // usuários e o vínculo usuário↔papel de TODOS de uma vez (1 requisição
  // cada, não 1-por-linha), e junta os dois no navegador antes de devolver
  // pro GenericTable. `usuarioPapelApi.listarTudo` tem `.catch(() => [])`
  // de propósito: se falhar por qualquer motivo, a tabela continua
  // funcionando, só sem a coluna de papel preenchida.
  const listarUsuarios = useCallback(async (): Promise<UsuarioLinha[]> => {
    const [usuarios, vinculos] = await Promise.all([
      usuarioApi.listar(auth.authFetch),
      usuarioPapelApi.listarTudo(auth.authFetch).catch(() => []),
    ]);

    const papeisPorUsuario = new Map<number, string[]>();
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
      papel: papeisPorUsuario.get(usuario.idUsuario)?.join(', ') || PAPEL_SEM_EXTRA,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, chaveRecarga]);
  // 'usuario' é o nome FÍSICO da tabela no Postgres (bate com
  // fn_log_auditoria() via TG_TABLE_NAME), não o nome da rota.
  const buscarLogUsuario = useCallback(
    (pagina: number) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'usuario', pagina),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable<UsuarioLinha>
        titulo="Usuários"
        acaoTopo={
          <button type="button" className="btn btn-primary" onClick={() => setCriando(true)}>
            Criar
          </button>
        }
        colunas={[
          { chave: 'idUsuario', rotulo: 'id' },
          { chave: 'nome', rotulo: 'nome' },
          { chave: 'papel', rotulo: 'papel' },
          { chave: 'email', rotulo: 'email' },
          { chave: 'emailVerificado', rotulo: 'e-mail verificado', quebrarRotulo: true },
        ]}
        chavePrimaria="idUsuario"
        listar={listarUsuarios}
        aoAlterar={(linha) => setIdAlterando(linha.idUsuario)}
        aoConsultar={(linha) => setIdConsultando(linha.idUsuario)}
        aoExcluir={(linha) => setExcluindo(linha)}
        // Botão de filtro por papel (09-08-2026, pedido do Lucas), na mesma
        // linha do filtro de texto, padrão "Todos" (nenhum papel marcado),
        // marcar um ou mais esconde o resto. Opções vêm sozinhas dos
        // valores que já aparecem na coluna "papel" (ver GenericTable);
        // `ordem` só reordena (menor pro maior poder), não filtra nada.
        // Array de 1 elemento (a API é genérica pra 1+ facetas lado a
        // lado, ver GenericTable e a tabela Permissões).
        filtrosFacetados={[{ chave: 'papel', rotulo: 'Papel', ordem: ORDEM_PODER_PAPEL }]}
      />

      {/* "De"/"Para" (09-08-2026, pedido do Lucas depois de ver isso em
          Papéis) - "nome" é o único campo de texto editável de usuario que
          faz sentido rastrear assim (senha nunca entra no log, ver
          fn_log_auditoria() [strip de senha_hash]; e-mail não é editável
          pelo painel). */}
      <BlocoLogAuditoria buscar={buscarLogUsuario} campoRenomeio="nome" />

      {criando && (
        <ModalCriarUsuario auth={auth} aoFechar={() => setCriando(false)} aoCriado={recarregar} />
      )}

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
