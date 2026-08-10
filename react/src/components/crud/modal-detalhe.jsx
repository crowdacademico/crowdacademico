// Modal genérico de "detalhe explicado" (09-08-2026, Bloco F do prompt do
// Claude Web) — nasceu pra explicar uma permissão (o quê, por que existe,
// quem tem hoje), mas não tem nada específico de permissão aqui: título,
// legenda em fonte mono (a "chave" técnica), um badge opcional e uma lista
// de seções título+conteúdo. Feito pra ser reaproveitado depois pra
// explicar configuração, papel, status de campanha etc — quem muda é só
// o conteúdo das seções, não este componente.
const CLASSE_BADGE_IMPACTO = {
  alto: 'fundo-erro texto-erro',
  médio: 'fundo-aviso texto-aviso',
  baixo: 'fundo-info texto-info',
};

export function ModalDetalhe({ titulo, chave, badgeImpacto, secoes, aoFechar }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40"
      onClick={aoFechar}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] fundo-elevado rounded-2xl shadow-2xl border borda-forte overflow-hidden flex flex-col"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="px-6 py-4 border-b borda-padrao flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="font-bold texto-forte truncate">{titulo}</p>
            {chave && <p className="text-xs font-mono texto-fraco mt-0.5">{chave}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {badgeImpacto && (
              <span
                className={
                  'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ' +
                  (CLASSE_BADGE_IMPACTO[badgeImpacto] ?? 'fundo-sutil texto-fraco')
                }
              >
                Impacto {badgeImpacto}
              </span>
            )}
            <button
              type="button"
              onClick={aoFechar}
              aria-label="Fechar"
              className="texto-fraco hover-texto-forte"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-4">
          {secoes.map((secao) => (
            <div key={secao.titulo}>
              <h4 className="text-xs font-bold uppercase tracking-widest texto-fraco mb-1.5">
                {secao.titulo}
              </h4>
              {/* ERA texto-padrao (slate-700) — muito claro pro corpo
                  principal do modal (09-08-2026, achado do Lucas: "o texto
                  deste dialogbox está muito cinza"). texto-forte é o mesmo
                  tom do título (slate-800/quase-branco no escuro), sem
                  perder a hierarquia com o rótulo da seção (que continua
                  texto-fraco, acima). */}
              <div className="text-sm texto-forte">{secao.conteudo}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
