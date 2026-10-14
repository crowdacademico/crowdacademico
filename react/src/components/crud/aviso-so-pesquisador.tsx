import { Link } from 'react-router';
import type { SituacaoPesquisador } from '../../services/6-perfil-pesquisador/hook/use-situacao-pesquisador';

interface AvisoSoPesquisadorProps {
  situacao: SituacaoPesquisador;
  // O que só pesquisador faz, nas duas formas da frase: "criam campanhas" / "criar campanhas".
  fazem: string;
  fazer: string;
  className?: string;
}

// Aviso para quem não é pesquisador ativo, com o caminho do upgrade. O mesmo texto em toda tela que só pesquisador
// usa (Minhas Campanhas, comentar campanha), em vez de um botão que o banco recusaria.
export function AvisoSoPesquisador({ situacao, fazem, fazer, className = '' }: AvisoSoPesquisadorProps) {
  return (
    <div className={`paragrafo flex items-start gap-2 rounded-lg fundo-info texto-info p-3 ${className}`}>
      <i className="fa-solid fa-circle-info mt-0.5 shrink-0" aria-hidden="true"></i>
      {situacao === 'suspenso' ? (
        <p>Seu perfil de pesquisador está suspenso: enquanto durar a suspensão, não é possível {fazer}.</p>
      ) : (
        <p>
          Só pesquisadores {fazem}.{' '}
          <Link to="/admin/minha-conta/academico" className="link-texto link-texto--cor-herdada">
            Tornar-me pesquisador
          </Link>{' '}
          (Minha Conta, aba Acadêmico).
        </p>
      )}
    </div>
  );
}
