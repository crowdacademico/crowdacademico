import { PartialType } from '@nestjs/swagger';
import { CampanhaRequestCreate } from './campanha.request-create';

// Sem status/aprovado_em/id_admin/taxa_plataforma aqui de propósito - quem
// muda status são os endpoints de ação (aprovar/rejeitar), nunca este PATCH
// genérico. trg_campanha_valida_transicao (05) já bloquearia uma tentativa
// de mudar status por aqui mesmo que o DTO permitisse, mas nem chega a
// tentar. O modelo pode mudar até a aprovação; depois o banco o congela (91005).
// As regras de cada campo são as do criar, todas opcionais (PartialType), escritas uma vez só.
export class CampanhaRequestUpdate extends PartialType(CampanhaRequestCreate) {}
