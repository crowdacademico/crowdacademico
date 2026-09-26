import { useId } from 'react';
import { formatarCpf } from '../../services/constant/utils/formatacao.util';

interface CampoCpfProps {
  // Sempre só dígitos (até 11), nunca formatado: quem formata para exibição é este componente por dentro.
  valor: string;
  onChange: (digitos: string) => void;
  // Ausente por padrão - só quem chama de dentro do Campo de Testes passa
  // isso (mesmo raciocínio de `gerarCpfDeTeste` em ModalAlterarUsuario/
  // ModalUpgradePesquisador: nunca faz sentido num formulário de verdade).
  gerarCpfDeTeste?: () => string;
}

// Campo de CPF + botão "Gerar CPF válido", compartilhado pelo card "Criar Perfil Pesquisador" de
// ModalAlterarUsuario e por ModalUpgradePesquisador (idêntico byte a byte nos dois: um bug/ajuste num só
// corrigiria o que alguém lembrasse de mexer).
export function CampoCpf({ valor, onChange, gerarCpfDeTeste }: CampoCpfProps) {
  const idCampo = useId();
  return (
    <div>
      <label htmlFor={idCampo} className="rotulo-campo">CPF</label>
      <div className="flex gap-2">
        <input
          id={idCampo}
          type="text"
          value={formatarCpf(valor)}
          onChange={(evento) => onChange(evento.target.value.replace(/\D/g, '').slice(0, 11))}
          className="input-padrao"
        />
        {gerarCpfDeTeste && (
          <button
            type="button"
            className="btn btn-secondary text-xs whitespace-nowrap"
            onClick={() => onChange(gerarCpfDeTeste())}
          >
            Gerar CPF válido
          </button>
        )}
      </div>
    </div>
  );
}
