import { Link } from 'react-router';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';

interface CartaoEndossoProps {
  nome: string | null;
  foto: string | null;
  idPesquisador: number | null;
  conteudo: string;
  // Prévia (Alterar do Estúdio): o nome não vira link, para não tirar o pesquisador do modal.
  previa?: boolean;
}

// O cartão de um comentário endossado, igual na página da campanha (bloco Endosso) e na prévia do Alterar do Estúdio
// (14-11-2026): o que o pesquisador vê na prévia é exatamente o que vai ao ar. O avatar não encolhe (shrink-0): numa
// linha flexível com texto longo, o círculo era espremido e virava uma oval.
export function CartaoEndosso({ nome, foto, idPesquisador, conteudo, previa = false }: CartaoEndossoProps) {
  const rotulo = nome ?? 'Pesquisador';
  return (
    <div className="rounded-xl fundo-sutil border borda-padrao p-4 flex items-start gap-4">
      <div className="shrink-0">
        <AvatarUsuario nome={nome} foto={foto} tamanho="lg" />
      </div>
      <div className="min-w-0 flex-1">
        {idPesquisador !== null && !previa ? (
          <Link to={`/pesquisador/${idPesquisador}`} className="paragrafo enfase texto-forte hover:underline">
            {rotulo}
          </Link>
        ) : (
          <span className="paragrafo enfase texto-forte">{rotulo}</span>
        )}
        <p className="paragrafo texto-padrao whitespace-pre-wrap break-words mt-1">{conteudo}</p>
      </div>
    </div>
  );
}
