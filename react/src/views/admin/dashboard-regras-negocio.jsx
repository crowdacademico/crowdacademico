import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import { agruparConfiguracoes } from '../../services/11-configuracoes/constants/configuracao-grupos';

// Aba "Regras do Negócio" (09-08-2026, Bloco H do prompt do Claude Web) —
// as ~28 chaves de `configuracoes` viravam uma tabela CRUD crua (Aba
// Configurações, ainda existe, sem mudança) — aqui é uma segunda forma de
// olhar pro MESMO dado, agrupado por assunto, mais fácil de escanear.
// "Alterar" continua sendo a tela de sempre (/configuracoes/:id/alterar) —
// não duplica o formulário de edição aqui, só organiza a leitura.
export function DashboardRegrasNegocio({ auth }) {
  const [grupos, setGrupos] = useState(null);

  useEffect(() => {
    configuracaoApi
      .listar(auth.authFetch)
      .then((lista) => setGrupos(agruparConfiguracoes(lista)))
      .catch(() => setGrupos([]));
  }, [auth.authFetch]);

  if (grupos === null) {
    return <p className="text-sm texto-fraco">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      {grupos.map(({ grupo, itens }) => (
        <div key={grupo} className="fundo-cartao border borda-forte rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b borda-padrao fundo-sutil">
            <h3 className="text-sm font-bold texto-forte">{grupo}</h3>
          </div>
          <div className="divide-y divide-solid" style={{ borderColor: 'var(--cor-borda)' }}>
            {itens.map((config) => (
              <div
                key={config.idConfig}
                className="px-5 py-3 flex items-center justify-between gap-4 border-b borda-padrao last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold texto-padrao">{config.descricao || config.chave}</p>
                  <p className="text-xs font-mono texto-fraco truncate">{config.chave}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold texto-forte">
                    {config.valor ?? '—'}
                  </span>
                  <Link
                    to={`/configuracoes/${config.idConfig}/alterar`}
                    className="crud-tabela__acao crud-tabela__acao--alterar"
                  >
                    <i className="fa-solid fa-pen"></i> Alterar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
