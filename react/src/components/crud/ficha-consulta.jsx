// Layout de FICHA pra telas "Consultar" (08-08-2026, pedido do Lucas: a
// versão antiga — pilha de textbox desabilitado, igual pra todo módulo —
// não escalava bem conforme o dado crescia, e "campo desabilitado" é o
// jeito errado de comunicar "isto nunca foi editável" (o desabilitado
// promete "você poderia editar, mas não pode" — aqui nada promete isso).
// Componente reutilizável de propósito (não específico de usuário) — o
// próximo módulo com tela de Consultar usa os mesmos 3 blocos abaixo, não
// escreve do zero.
//
// <FichaConsulta titulo="..." subtitulo="..." badges={...} acoes={...}>
//   <SecaoFicha titulo="Dados da conta">
//     <CampoFicha rotulo="..." valor={...} />
//   </SecaoFicha>
// </FichaConsulta>
export function FichaConsulta({ titulo, subtitulo, badges, acoes, children }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center p-4 sm:p-8 fundo-pagina">
      <div className="max-w-2xl w-full fundo-cartao rounded-2xl shadow-lg border borda-padrao overflow-hidden">
        {/* Cabeçalho: nome grande + e-mail abaixo, badges à direita — nada
            de campo de formulário aqui, de propósito. */}
        <div className="px-8 py-6 border-b borda-padrao fundo-sutil flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-2xl font-serif font-bold texto-forte truncate">{titulo}</h2>
            {subtitulo && <p className="text-sm texto-fraco mt-1">{subtitulo}</p>}
          </div>
          {badges && badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end shrink-0">{badges}</div>
          )}
        </div>

        <div className="px-8 py-6 space-y-6">{children}</div>

        {acoes && <div className="px-8 py-5 border-t borda-padrao fundo-sutil">{acoes}</div>}
      </div>
    </div>
  );
}

// Título pequeno em maiúsculo separando cada bloco ("Dados da conta",
// "Acesso", "Papéis"...) — grid de 2 colunas em telas >=sm pros pares
// rótulo/valor, 1 coluna no mobile.
export function SecaoFicha({ titulo, children }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest texto-fraco mb-3 pb-2 border-b borda-padrao">
        {titulo}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">{children}</div>
    </div>
  );
}

// Par rótulo/valor — SEM caixa de input desabilitada (campo desabilitado
// comunica "você poderia editar, mas não pode"; aqui nada é editável
// mesmo). Valor vazio vira "—" em cinza claro, nunca caixa em branco.
//
// `largura="cheia"` ocupa as 2 colunas da seção (campo com valor longo, ou
// que tem controle extra — ver `acao`/`children`).
// `acao` — controle pequeno ao lado do valor (ex.: a setinha de expandir
// histórico de login em consultar-usuario.jsx).
// `children` — conteúdo extra ABAIXO do valor (ex.: a lista expandida em
// si), continua fora do fluxo normal de rótulo/valor.
export function CampoFicha({ rotulo, valor, largura, acao, children }) {
  const temValor = valor !== null && valor !== undefined && valor !== '';

  return (
    <div className={largura === 'cheia' ? 'sm:col-span-2' : undefined}>
      <div className="text-[11px] font-bold texto-fraco uppercase tracking-widest mb-1">
        {rotulo}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span
          className={'text-sm ' + (temValor ? 'font-medium texto-forte' : 'texto-fraco opacity-50')}
        >
          {temValor ? valor : '-'}
        </span>
        {acao}
      </div>
      {children}
    </div>
  );
}
