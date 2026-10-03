import type { ReactNode } from 'react';

export interface ConteudoEstadoVazio {
  // Classe Font Awesome sem o prefixo de estilo (ex.: 'fa-inbox').
  icone: string;
  titulo: string;
  texto?: ReactNode;
}

// Lista sem nada para mostrar: ícone, uma frase que diz o que apareceria ali e, se houver, o próximo passo. No
// lugar do "Nenhum registro." seco: a lista vazia é o momento de orientar quem chegou (padrão de mercado para
// estado vazio).
export function EstadoVazio({ icone, titulo, texto }: ConteudoEstadoVazio) {
  return (
    <div className="estado-vazio">
      <span className="estado-vazio__icone" aria-hidden="true">
        <i className={`fa-solid ${icone}`} aria-hidden="true"></i>
      </span>
      <p className="estado-vazio__titulo">{titulo}</p>
      {texto && <p className="estado-vazio__texto">{texto}</p>}
    </div>
  );
}
