// Casca compartilhada de Criar/Alterar/Excluir (09-08-2026) — era a MESMA
// estrutura (ícone circular + título + subtítulo + cartão branco
// centralizado) copiada e colada em 7 arquivos (criar/alterar-usuario,
// alterar-papel, criar/alterar/excluir-configuracao, excluir-usuario), já
// levemente divergente entre eles (algumas com border-slate-200, outras
// não escurecidas). Extraído aqui pelo mesmo motivo de FichaConsulta —
// "mesmo estilo que já usei em Consultar" (pedido do Lucas): um lugar só
// pra ajustar o visual do "cartão de formulário" inteiro do painel.
//
// `variante="perigo"` é só o ícone (vermelho, pra Excluir) — o resto do
// cartão é idêntico, não é um componente "de exclusão" separado.
const VARIANTES_ICONE = {
  padrao: 'bg-primary text-white',
  perigo: 'bg-red-100 text-red-600',
};

export function CartaoFormulario({ icone, titulo, subtitulo, variante = 'padrao', children }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-300 overflow-hidden">
        <div className="p-10 text-center border-b border-slate-100 bg-slate-50">
          <div
            className={
              'w-14 h-14 rounded-2xl mx-auto flex items-center justify-center font-bold text-2xl mb-5 shadow-lg ' +
              VARIANTES_ICONE[variante]
            }
          >
            <i className={'fa-solid ' + icone}></i>
          </div>
          <h2 className="text-3xl font-serif font-bold text-dark mb-2">{titulo}</h2>
          {subtitulo && <p className="text-sm text-slate-600 font-medium">{subtitulo}</p>}
        </div>

        {children}
      </div>
    </div>
  );
}
