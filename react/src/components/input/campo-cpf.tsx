import { useId } from 'react';
import { formatarCpf } from '../../services/constant/utils/formatacao.util';

interface CampoCpfProps {
  // Sempre só dígitos (até 11), nunca formatado - quem formata pra
  // exibição é este componente por dentro, igual já era em cada
  // consumidor antes de existir.
  valor: string;
  onChange: (digitos: string) => void;
  // Ausente por padrão - só quem chama de dentro do Campo de Testes passa
  // isso (mesmo raciocínio de `gerarCpfDeTeste` em ModalAlterarUsuario/
  // ModalUpgradePesquisador: nunca faz sentido num formulário de verdade).
  gerarCpfDeTeste?: () => string;
}

// Extraído (14-09-2026, pedido do Lucas na auditoria de componentes) - o
// campo de CPF + botão "Gerar CPF válido" existia idêntico, byte a byte,
// em 2 lugares (o card "Criar Perfil Pesquisador" de ModalAlterarUsuario e
// ModalUpgradePesquisador) - um bug/ajuste num dos dois só corrigia o que
// alguém lembrasse de mexer, o outro ficava desatualizado.
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
