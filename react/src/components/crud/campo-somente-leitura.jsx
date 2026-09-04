// Campo exibido (não editável) nas páginas de Alterar/Excluir - mesmo
// visual do <label> dos formulários (criar-usuario.jsx), só sem <input>.
// Usado sempre que a página precisa mostrar um dado que não faz parte do
// que pode ser alterado (ex.: e-mail em Alterar Usuário, chave/tipo em
// Alterar Configuração) ou que é só pra conferência (Excluir *).
export function CampoSomenteLeitura({ rotulo, valor }) {
  return (
    <div>
      <span className="rotulo-campo">{rotulo}</span>
      {/* break-words (10-08-2026, achado do Lucas: e-mail comprido saindo
          pra fora do card "Metadados", coluna lateral estreita) - sem
          isso, um valor sem espaço nenhum (e-mail, token) não tem onde
          quebrar linha sozinho e estica o card na horizontal. */}
      <p className="text-sm font-semibold texto-forte break-words">{String(valor ?? '')}</p>
    </div>
  );
}
