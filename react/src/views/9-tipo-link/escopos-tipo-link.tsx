import { CaixaMarcacao } from '../../components/input/caixa-marcacao';

interface EscoposTipoLinkProps {
  permitePerfil: boolean;
  permiteAtualizacao: boolean;
  aoMudarPerfil: (marcado: boolean) => void;
  aoMudarAtualizacao: (marcado: boolean) => void;
  className?: string;
}

// "Onde este tipo pode ser usado", igual em Criar e Alterar tipo de link. Pelo menos um precisa ficar marcado
// (CK_TIPO_LINK_ALGUM_ESCOPO no banco); o aviso aparece aqui, e cada tela não salva enquanto ele estiver visível.
export function EscoposTipoLink({
  permitePerfil,
  permiteAtualizacao,
  aoMudarPerfil,
  aoMudarAtualizacao,
  className,
}: EscoposTipoLinkProps) {
  const nenhumMarcado = !permitePerfil && !permiteAtualizacao;
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
      </div>
      {nenhumMarcado && (
        <p className="legenda enfase erro-campo">Pelo menos uma opção precisa ficar marcada.</p>
      )}
    </fieldset>
  );
}
