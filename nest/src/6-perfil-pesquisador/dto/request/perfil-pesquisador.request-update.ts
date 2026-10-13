import { PickType } from '@nestjs/swagger';
import { PerfilPesquisadorRequestCreate } from './perfil-pesquisador.request-create';

// Nunca inclui `cpf` de propósito: cpf_criptografado/cpf_hash não estão no GRANT UPDATE direto (06_grants.sql):
// correção de CPF é só via corrigir_cpf_pesquisador() (SECURITY DEFINER), gateada por
// perfil_pesquisador_corrigir_cpf, pensada para suporte/admin, não para o próprio pesquisador (RF-017). Se um
// dia existir uma rota de correção de CPF, é um DTO/endpoint separado, nunca este.
// As regras de cada campo são as do criar (PickType), escritas uma vez só.
export class PerfilPesquisadorRequestUpdate extends PickType(
  PerfilPesquisadorRequestCreate,
  ['tipoVinculo', 'vinculoInstitucional', 'tituloAcademico'] as const,
) {}
