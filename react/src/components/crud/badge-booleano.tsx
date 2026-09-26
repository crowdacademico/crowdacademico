interface BadgeBooleanoProps {
  valor: boolean;
  rotuloTrue?: string;
  rotuloFalse?: string;
}

// O par `'badge ' + (valor ? 'badge-sucesso' : 'badge-neutro')` aparecia reescrito em Consultar Área de
// Conhecimento/Configuração (x2)/Motivo de Denúncia/Tipo de Link, sempre fora de GenericTable (que já tem o
// próprio equivalente para colunas automáticas, `celulaValor` em generic-table.tsx): esta é a versão avulsa,
// para usar dentro de `badges` de FichaConsulta ou qualquer lugar que não seja uma coluna de tabela.
export function BadgeBooleano({ valor, rotuloTrue = 'Sim', rotuloFalse = 'Não' }: BadgeBooleanoProps) {
  return (
    <span className={'badge ' + (valor ? 'badge-sucesso' : 'badge-neutro')}>
      {valor ? rotuloTrue : rotuloFalse}
    </span>
  );
}
