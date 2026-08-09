// Campo exibido (não editável) nas páginas de Alterar/Excluir — mesmo
// visual do <label> dos formulários (criar-usuario.jsx), só sem <input>.
// Usado sempre que a página precisa mostrar um dado que não faz parte do
// que pode ser alterado (ex.: e-mail em Alterar Usuário, chave/tipo em
// Alterar Configuração) ou que é só pra conferência (Excluir *).
export function CampoSomenteLeitura({ rotulo, valor }) {
  return (
    <div>
      <span className="rotulo-campo">{rotulo}</span>
      <p className="text-sm font-semibold texto-forte">{String(valor ?? '')}</p>
    </div>
  );
}
