import { OmitType, PartialType } from '@nestjs/swagger';
import { CampanhaRequestCreate } from './campanha.request-create';

// Sem status/aprovado_em/id_admin/taxa_plataforma aqui de propósito - quem
// muda status são os endpoints de ação (aprovar/rejeitar), nunca este PATCH
// genérico. trg_campanha_valida_transicao (05) já bloquearia uma tentativa
// de mudar status por aqui mesmo que o DTO permitisse, mas nem chega a
// tentar. Sem modelo também, por enquanto: a regra decidida é que o modelo
// pode mudar até a aprovação (o banco congela depois), mas só o
// all-or-nothing é aceito até o módulo de pagamento existir.
// As regras de cada campo são as do criar, todas opcionais (PartialType), escritas uma vez só.
export class CampanhaRequestUpdate extends PartialType(
  OmitType(CampanhaRequestCreate, ['modelo'] as const),
) {}
