import { Dica } from '../../components/layout/tooltip';

interface BotaoVerFotoPerfilProps {
  url: string;
  tamanho?: string;
  badge?: boolean;
}

// Botão de olho: abre a foto de perfil em outra guia. Não existe "tamanho máximo" de verdade: é a MESMA url do
// avatar pequeno, já processada pelo `sharp` no upload (RNF-016). `badge` desenha o selo circular sobreposto no
// canto inferior direito do avatar (cabeçalho do modal); sem `badge`, é o ícone inline usado dentro de "Dados
// da conta".
export function BotaoVerFotoPerfil({ url, tamanho = 'icone-grande', badge = false }: BotaoVerFotoPerfilProps) {
  if (badge) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir imagem em outra guia"
        className="dica w-7 h-7 rounded-full flex items-center justify-center border-2 fundo-escuro borda-cartao texto-sobre-cor transition-opacity hover:opacity-80"
      >
        <i className="fa-solid fa-eye icone-pequeno" aria-hidden="true"></i>
        <Dica texto="Abrir imagem em outra guia" curta />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir imagem em outra guia"
      className={'dica texto-forte hover:opacity-70 transition-opacity shrink-0 ' + tamanho}
    >
      <i className="fa-solid fa-eye" aria-hidden="true"></i>
      <Dica texto='Abrir imagem em outra guia (no tamanho "máximo" - já reduzido pelo servidor, o original não é guardado)' />
    </a>
  );
}
