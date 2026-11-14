interface BarraBuscaPublicaProps {
  id: string;
  rotulo: string;
  placeholder: string;
  valor: string;
  aoAlterar: (valor: string) => void;
  className?: string;
  campoClassName?: string;
}

export function BarraBuscaPublica({
  id,
  rotulo,
  placeholder,
  valor,
  aoAlterar,
  className = '',
  campoClassName = '',
}: BarraBuscaPublicaProps) {
  return (
    <div className={`busca-catalogo ${className}`}>
      <span className="busca-catalogo__indice" aria-hidden="true">
        <i className="fa-solid fa-magnifying-glass" />
      </span>
      <label htmlFor={id} className="sr-only">
        {rotulo}
      </label>
      <input
        id={id}
        type="search"
        placeholder={placeholder}
        value={valor}
        onChange={(evento) => aoAlterar(evento.target.value)}
        className={`busca-catalogo__campo ${campoClassName}`}
      />
    </div>
  );
}
