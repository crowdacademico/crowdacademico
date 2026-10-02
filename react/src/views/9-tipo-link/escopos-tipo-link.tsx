import { CaixaMarcacao } from '../../components/input/caixa-marcacao';

interface EscoposTipoLinkProps {
  permitePerfil: boolean;
  permiteAtualizacao: boolean;
  permiteRecompensa: boolean;
  aoMudarPerfil: (marcado: boolean) => void;
  aoMudarAtualizacao: (marcado: boolean) => void;
  aoMudarRecompensa: (marcado: boolean) => void;
  className?: string;
}

// "Onde este tipo pode ser usado", igual em Criar e Alterar tipo de link. Pelo menos um precisa ficar marcado
// (CK_TIPO_LINK_ALGUM_ESCOPO no banco); o aviso aparece aqui, e cada tela não salva enquanto ele estiver visível.
export function EscoposTipoLink({
  permitePerfil,
  permiteAtualizacao,
  permiteRecompensa,
  aoMudarPerfil,
  aoMudarAtualizacao,
  aoMudarRecompensa,
  className,
}: EscoposTipoLinkProps) {
  const nenhumMarcado = !permitePerfil && !permiteAtualizacao && !permiteRecompensa;
  return (
    <fieldset className={className}>
      <legend className="rotulo-campo">Onde este tipo pode ser usado</legend>
      <div className="space-y-2 mt-1">
        <CaixaMarcacao
          rotulo="Perfil do pesquisador (links de identidade acadêmica)"
          marcado={permitePerfil}
          aoMudar={aoMudarPerfil}
        />
        <CaixaMarcacao
          rotulo="Atualização de campanha (prova de progresso)"
          marcado={permiteAtualizacao}
          aoMudar={aoMudarAtualizacao}
        />
        <CaixaMarcacao
          rotulo="Recompensa (ex.: acesso antecipado a um repositório)"
          marcado={permiteRecompensa}
          aoMudar={aoMudarRecompensa}
        />
      </div>
      {nenhumMarcado && (
        <p className="legenda-destaque erro-campo">Pelo menos uma opção precisa ficar marcada.</p>
      )}
    </fieldset>
  );
}
