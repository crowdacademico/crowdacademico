import { useCallback, useState } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { papelApi, permissaoApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { detalhePermissao } from '../../services/2-papel-permissao/constants/permissao-nomes-amigaveis';
import { logAuditoriaApi } from '../../services/28-log-auditoria/api/log-auditoria.api';
import { MatrizPapelPermissao } from './matriz-papel-permissao';
import { ModalDetalhePermissao } from './modal-detalhe-permissao';

// Aba "Papéis & Permissões" do painel admin — rota /admin/papeis. Reúne 3
// blocos read-only/de gestão do módulo 2-papel-permissao (ver nest/src/
// 2-papel-permissao) numa página só, porque nenhum dos 3 sozinho justifica
// uma aba própria no menu.
//
// REMOVIDO (07-08-2026, pedido do Lucas: "não consigo usar, é confuso"): o
// 4º bloco era UsuarioPapelWidget — digitar id_usuario/id_papel cru pra
// atribuir/revogar. Redundante desde que alterar-usuario.jsx ganhou uma
// seção "Papéis" de verdade (etiquetas + menu suspenso só com o que falta
// atribuir) — a mesma ação, só que mais clara. Não sobrou nenhuma
// funcionalidade órfã: tudo que o widget fazia, Alterar Usuário já faz.
export function ListarPapeis({ auth }) {
  const listarPapeis = useCallback(() => papelApi.listar(auth.authFetch), [auth.authFetch]);
  // Nome amigável + descrição (09-08-2026, pedido do Lucas: "campanha_
  // aprovar parece linha de código, pq é linha de código") — tradução
  // 100% no frontend (ver permissao-nomes-amigaveis.js), o `nome` cru do
  // banco não muda em lugar nenhum, só ganha uma 2ª coluna "chave" pra
  // quem precisa do valor literal.
  const listarPermissoes = useCallback(
    () =>
      permissaoApi.listar(auth.authFetch).then((permissoes) =>
        permissoes.map((p) => {
          const detalhe = detalhePermissao(p.nome);
          return { ...p, nomeAmigavel: detalhe.nome, resumo: detalhe.resumo };
        }),
      ),
    [auth.authFetch],
  );
  const [permissaoDetalhada, setPermissaoDetalhada] = useState(null);
  // 'papel' é o nome FÍSICO da tabela no Postgres (bate com TG_TABLE_NAME
  // em fn_log_auditoria(), trg_log_auditoria_papel, 07-08-2026) — mesma
  // convenção de buscarLogUsuario em listar-usuarios.jsx.
  const buscarLogPapel = useCallback(
    () => logAuditoriaApi.listarPorTabela(auth.authFetch, 'papel'),
    [auth.authFetch],
  );

  return (
    <>
      <div className="admin-content-painel">
        <GenericTable
          titulo="Papéis"
          colunas={[
            { chave: 'idPapel', rotulo: 'id' },
            { chave: 'nome', rotulo: 'nome' },
          ]}
          chavePrimaria="idPapel"
          listar={listarPapeis}
          rotaBase="/papeis"
          acoes={['alterar']}
          buscarLog={buscarLogPapel}
          // "De"/"Para" em vez de "Campos alterados" (09-08-2026, pedido
          // do Lucas) — só "nome" muda em papel hoje (codigo é fixo), mas
          // o recurso é genérico (ver LogAuditoriaPainel), não hardcoded
          // aqui além do nome do campo.
          campoRenomeioLog="nome"
        />
      </div>
      <div className="admin-content-painel">
        <GenericTable
          titulo="Permissões (catálogo, só leitura)"
          colunas={[
            { chave: 'idPermissao', rotulo: 'id' },
            { chave: 'nomeAmigavel', rotulo: 'nome' },
            { chave: 'resumo', rotulo: 'descrição' },
            { chave: 'nome', rotulo: 'chave' },
          ]}
          chavePrimaria="idPermissao"
          listar={listarPermissoes}
          // Botão "ⓘ" (09-08-2026, Bloco F do prompt do Claude Web) — abre
          // o modal de detalhe (o que faz, por que existe, quem tem hoje).
          colunaExtra={{
            rotulo: '',
            renderizar: (linha) => (
              <button
                type="button"
                onClick={() => setPermissaoDetalhada(linha)}
                aria-label={`Detalhes de "${linha.nomeAmigavel}"`}
                title="Ver detalhes"
                className="texto-fraco hover-texto-forte"
              >
                <i className="fa-solid fa-circle-info"></i>
              </button>
            ),
          }}
        />
      </div>
      <div className="admin-content-painel">
        <MatrizPapelPermissao authFetch={auth.authFetch} />
      </div>

      {permissaoDetalhada && (
        <ModalDetalhePermissao
          permissao={permissaoDetalhada}
          authFetch={auth.authFetch}
          aoFechar={() => setPermissaoDetalhada(null)}
        />
      )}
    </>
  );
}
