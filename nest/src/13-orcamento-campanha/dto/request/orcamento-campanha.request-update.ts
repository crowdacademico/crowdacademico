import { OmitType } from '@nestjs/swagger';
import { OrcamentoCampanhaRequestCreate } from './orcamento-campanha.request-create';

// Sem idCampanha - mover um item de orçamento pra outra campanha não faz
// sentido de produto (mesmo raciocínio de LinkAcademicoRequestUpdate sem
// idTipoLink).
// As regras de cada campo são as do criar (OmitType), escritas uma vez só; a campanha do item não muda.
export class OrcamentoCampanhaRequestUpdate extends OmitType(
  OrcamentoCampanhaRequestCreate,
  ['idCampanha'] as const,
) {}
