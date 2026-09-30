import { BarraProgresso } from '../../components/crud/barra-progresso';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';

interface CelulaArrecadacaoProps {
  arrecadado: number;
  meta: number;
}

// Arrecadado com a barra de quanto da meta já foi atingido: o elemento principal de uma lista de crowdfunding
// (Kickstarter e Catarse mostram assim). Usada em Campanhas e em Minhas Campanhas.
export function CelulaArrecadacao({ arrecadado, meta }: CelulaArrecadacaoProps) {
  return (
    <span className="celula-arrecadacao">
      <span>{formatarMoeda(arrecadado)}</span>
      <BarraProgresso valor={arrecadado} total={meta} rotulo="Arrecadado em relação à meta" />
    </span>
  );
}
