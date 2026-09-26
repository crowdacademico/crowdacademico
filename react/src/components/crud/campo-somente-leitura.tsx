import { textoSeguro } from '../../services/constant/utils/formatacao.util';

// Campo exibido (não editável) nas páginas de Alterar/Excluir - mesmo
// visual do <label> dos formulários (modal-criar-usuario.tsx), só sem <input>.
// Usado sempre que a página precisa mostrar um dado que não faz parte do
// que pode ser alterado (ex.: e-mail em Alterar Usuário, chave/tipo em
// Alterar Configuração) ou que é só pra conferência (Excluir *).
interface CampoSomenteLeituraProps {
  rotulo: string;
  valor?: unknown;
}

export function CampoSomenteLeitura({ rotulo, valor }: CampoSomenteLeituraProps) {
  return (
    <div>
      <span className="rotulo-campo">{rotulo}</span>
      {/* break-words: sem isso, um valor sem espaço nenhum (e-mail, token) não tem onde quebrar linha
          sozinho e estica o card na horizontal (e-mail comprido saindo para fora do card "Metadados", coluna
          lateral estreita). */}
      <p className="text-sm font-semibold texto-forte break-words">{textoSeguro(valor)}</p>
    </div>
  );
}
