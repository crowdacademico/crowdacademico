import { IsString } from 'class-validator';
import { IsCpf } from '../../../commons/seguranca/cpf-valido.decorator';

// Endpoint separado de propósito de PerfilPesquisadorRequestUpdate (que
// nunca inclui `cpf`, ver comentário lá) - correção de CPF é ação de
// suporte/admin (RF-017), gateada pela permissão
// 'perfil_pesquisador_corrigir_cpf' dentro de corrigir_cpf_pesquisador()
// (03_funcoes_seguranca.sql, [03-Q]), nunca pelo próprio pesquisador via
// PATCH comum. @IsCpf só confere FORMATO (dígito verificador) - mesmo
// decorator do cadastro inicial.
export class PerfilPesquisadorRequestCorrigirCpf {
  @IsString()
  @IsCpf()
  cpf: string;
}
