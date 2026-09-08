import type { ReactNode } from 'react';

interface ModalFichaProps {
  titulo: string;
  subtitulo?: string;
  avatar?: ReactNode;
  rodape?: ReactNode;
  aoFechar: () => void;
  children?: ReactNode;
}

// Mesma moldura de ModalDetalhe (backdrop + cartão + botão fechar), só que
// largo (max-w-5xl, igual FichaConsulta largura="larga") e recebendo
// children livre em vez de uma lista fixa de `secoes` - pensado pra
// Consultar/Alterar que já usam <SecaoFicha>/<CampoFicha> (os MESMOS
// blocos da página real), só que dentro de um modal (07-09-2026, Campo de
// Testes: T1 replicando a aparência exata de Consultar/Alterar Usuário,
// sem reinventar o layout).
export function ModalFicha({ titulo, subtitulo, avatar, rodape, aoFechar, children }: ModalFichaProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40"
      onClick={aoFechar}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] fundo-cartao rounded-2xl shadow-2xl border borda-padrao overflow-hidden flex flex-col"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="px-8 py-6 border-b borda-padrao fundo-sutil flex items-start justify-between gap-4 flex-wrap shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {avatar}
            <div className="min-w-0">
              <h2 className="titulo-secao truncate">{titulo}</h2>
              {subtitulo && <p className="text-sm texto-fraco mt-1 break-words">{subtitulo}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="texto-fraco hover-texto-forte shrink-0"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="px-8 py-6 space-y-6 overflow-y-auto">{children}</div>

        {rodape && <div className="px-8 py-5 border-t borda-padrao fundo-cartao shrink-0">{rodape}</div>}
      </div>
    </div>
  );
}
