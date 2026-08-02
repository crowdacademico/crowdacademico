// Campo exibido (não editável) nas páginas de Alterar/Excluir — mesmo
// visual do <label> dos formulários (criar-usuario.jsx), só sem <input>.
// Usado sempre que a página precisa mostrar um dado que não faz parte do
// que pode ser alterado (ex.: e-mail em Alterar Usuário, chave/tipo em
// Alterar Configuração) ou que é só pra conferência (Excluir *).
export function CampoSomenteLeitura({ rotulo, valor }) {
  return (
    <div>
      <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
        {rotulo}
      </span>
      <p className="text-sm font-semibold text-slate-800">{String(valor ?? '')}</p>
    </div>
  );
}
