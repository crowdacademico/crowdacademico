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
  perigo: 'fundo-erro texto-erro',
};

// `rodape` (09-08-2026, Bloco I do prompt do Claude Web sobre Alterar/
// Excluir) — separa as ações finais (Salvar/Cancelar, Confirmar exclusão)
// do corpo do formulário: o card ganha altura MÁXIMA (não mais só
// "cresce o quanto precisar") e vira flex-column com 3 fatias —
// cabeçalho fixo, corpo com scroll próprio, rodapé fixo. Sem isso, um
// formulário longo (Alterar Usuário, com Dados/Acesso/Papéis) empurrava
// o botão Salvar pra fora da tela em telas baixas, obrigando rolar a
// PÁGINA inteira só pra achar o botão — problema clássico de formulário
// modal sem rodapé fixo (Notion/Linear resolvem assim). Opcional: quem
// não passa `rodape` (telas de Criar, mais curtas) continua exatamente
// como antes, sem nenhuma mudança visual.
export function CartaoFormulario({ icone, titulo, subtitulo, variante = 'padrao', rodape, children }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 fundo-pagina">
      <div className="max-w-md w-full max-h-[calc(100vh-2rem)] fundo-cartao rounded-3xl shadow-2xl border borda-forte overflow-hidden flex flex-col">
        <div className="p-10 text-center border-b borda-padrao fundo-sutil shrink-0">
          <div
            className={
              'w-14 h-14 rounded-2xl mx-auto flex items-center justify-center font-bold text-2xl mb-5 shadow-lg ' +
              VARIANTES_ICONE[variante]
            }
          >
            <i className={'fa-solid ' + icone}></i>
          </div>
          <h2 className="text-3xl font-serif font-bold texto-forte mb-2">{titulo}</h2>
          {subtitulo && <p className="text-sm texto-padrao font-medium">{subtitulo}</p>}
        </div>

        <div className="overflow-y-auto min-h-0 flex-1">{children}</div>

        {rodape && (
          <div className="p-6 border-t borda-padrao fundo-cartao shrink-0">{rodape}</div>
        )}
      </div>
    </div>
  );
}
