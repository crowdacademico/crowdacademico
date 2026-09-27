interface BadgeBooleanoProps {
  valor: boolean;
  rotuloTrue?: string;
  rotuloFalse?: string;
}

// O par `'badge ' + (valor ? 'badge-sucesso' : 'badge-neutro')` aparecia reescrito em Consultar Área de
// Conhecimento/Configuração (x2)/Motivo de Denúncia/Tipo de Link. Usado também pela coluna Sim/Não da
// GenericTable (colunas/formatos.tsx) e dentro de `badges` de FichaConsulta.
export function BadgeBooleano({ valor, rotuloTrue = 'Sim', rotuloFalse = 'Não' }: BadgeBooleanoProps) {
  return (
    <span className={'badge ' + (valor ? 'badge-sucesso' : 'badge-neutro')}>
      {valor ? rotuloTrue : rotuloFalse}
    </span>
  );
}
