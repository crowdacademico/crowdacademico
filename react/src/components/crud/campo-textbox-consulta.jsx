// Campo da tela "Consultar" (components/crud/generic-table.jsx, botão entre
// Alterar e Excluir) — pedido do Lucas, 02-08-2026: mostrar TODOS os dados
// do registro ligado ao banco, num textbox (não um <p>, como
// campo-somente-leitura.jsx) que fica naturalmente vazio quando o valor é
// nulo/ausente. Sempre desabilitado — só visualização, não salva nada.
export function CampoTextboxConsulta({ rotulo, valor }) {
  return (
    <div>
      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
        {rotulo}
      </label>
      <input type="text" value={valor ?? ''} disabled readOnly className="input-padrao" />
    </div>
  );
}
