import { useId, useState } from 'react';
import { Tooltip } from '../layout/tooltip';

export interface OpcaoFiltroPublico {
  value: string;
  label: string;
  count?: number;
}

interface GrupoFiltroExpansivelProps {
  titulo: string;
  opcoes: OpcaoFiltroPublico[];
  valoresSelecionados: string[];
  aoAlterar: (valores: string[]) => void;
  expandidoPorPadrao?: boolean;
  desabilitado?: boolean;
  mensagemDesabilitado?: string;
}

function normalizarTexto(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function GrupoFiltroExpansivel({
  titulo,
  opcoes,
  valoresSelecionados,
  aoAlterar,
  expandidoPorPadrao = false,
  desabilitado = false,
  mensagemDesabilitado,
}: GrupoFiltroExpansivelProps) {
  const [expandido, setExpandido] = useState(expandidoPorPadrao);
  const [busca, setBusca] = useState('');
  const baseId = useId();
  const idLista = `${baseId}-list`;
  const idAjuda = `${baseId}-hint`;
  const estaAberto = expandido && !desabilitado;
  const opcoesSelecionadas = opcoes.filter((opcao) => valoresSelecionados.includes(opcao.value));
  const buscaNormalizada = normalizarTexto(busca);
  const opcoesFiltradas = buscaNormalizada
    ? opcoes.filter((opcao) => normalizarTexto(opcao.label).includes(buscaNormalizada))
    : opcoes;

  function alternarOpcao(valor: string) {
    aoAlterar(
      valoresSelecionados.includes(valor)
        ? valoresSelecionados.filter((item) => item !== valor)
        : [...valoresSelecionados, valor],
    );
  }

  return (
    <section className="group/filter relative rounded-lg border borda-padrao fundo-cartao">
      <button
        type="button"
        onClick={() => {
          if (!desabilitado) setExpandido((atual) => !atual);
        }}
        aria-expanded={estaAberto}
        aria-controls={idLista}
        aria-disabled={desabilitado}
        aria-describedby={desabilitado && mensagemDesabilitado ? idAjuda : undefined}
        className={`flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
          desabilitado ? 'cursor-not-allowed opacity-50' : 'hover-fundo-sutil'
        }`}
      >
        <span className="text-sm font-semibold texto-forte">{titulo}</span>
        <span className="flex shrink-0 items-center gap-2">
          {valoresSelecionados.length > 0 && (
            <span
              className="flex h-6 min-w-6 items-center justify-center rounded-full fundo-marca-sutil px-2 text-xs font-medium texto-marca"
              aria-label={`${valoresSelecionados.length} selecionado(s)`}
            >
              {valoresSelecionados.length}
            </span>
          )}
          <i
            aria-hidden="true"
            className={`fa-solid fa-chevron-down text-xs texto-fraco transition-transform ${
              estaAberto ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>

      {opcoesSelecionadas.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-4 pb-3" aria-label={`Selecionados em ${titulo}`}>
          {opcoesSelecionadas.map((opcao) => (
            <li
              key={opcao.value}
              className="inline-flex max-w-full items-center gap-1 rounded-full border borda-marca fundo-marca-sutil py-1 pl-3 pr-1 text-xs texto-padrao"
            >
              <span className="max-w-44 truncate" title={opcao.label}>
                {opcao.label}
              </span>
              <button
                type="button"
                onClick={() => alternarOpcao(opcao.value)}
                aria-label={`Remover ${opcao.label}`}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full texto-fraco transition-colors hover-fundo-sutil hover:text-primary"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div id={idLista} className={`flex flex-col gap-3 px-4 pb-4 ${estaAberto ? '' : 'hidden'}`}>
        <label className="relative flex w-full items-center">
          <i
            className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 texto-fraco"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar opção..."
            aria-label={`Buscar opções de ${titulo}`}
            className="input-padrao h-9 py-2 pl-9"
          />
        </label>

        <div className="max-h-44 overflow-y-auto pr-2">
          {opcoesFiltradas.length > 0 ? (
            opcoesFiltradas.map((opcao) => (
              <label
                key={opcao.value}
                className="group flex cursor-pointer select-none items-center justify-between gap-2 py-1.5 text-sm"
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={valoresSelecionados.includes(opcao.value)}
                    onChange={() => alternarOpcao(opcao.value)}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <span className="texto-padrao transition-colors group-hover:text-primary">{opcao.label}</span>
                </span>
                {opcao.count !== undefined && <span className="text-xs texto-fraco">({opcao.count})</span>}
              </label>
            ))
          ) : (
            <p className="py-3 text-center text-sm texto-fraco">Nenhuma opção encontrada.</p>
          )}
        </div>

        {valoresSelecionados.length > 0 && (
          <div className="flex justify-end border-t borda-padrao pt-2">
            <button
              type="button"
              onClick={() => aoAlterar([])}
              className="text-xs font-medium texto-fraco transition-colors hover-texto-forte"
            >
              Limpar seleção
            </button>
          </div>
        )}
      </div>

      {desabilitado && mensagemDesabilitado && (
        <>
          <span id={idAjuda} className="sr-only">{mensagemDesabilitado}</span>
          <span className="absolute right-3 top-3">
            <Tooltip texto={mensagemDesabilitado} />
          </span>
        </>
      )}
    </section>
  );
}
