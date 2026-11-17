import { sql, type Kysely } from 'kysely';
import {
  decifrarCpf,
  mascararCpf,
} from '../../commons/seguranca/cpf-cifra.util';
import type { DB } from '../../commons/database/db.types';

// Quanto do CPF de um pesquisador a conta logada vê (17-11-2026). As rotas de perfil são públicas (o perfil público
// usa as mesmas), então são três níveis, e o CPF inteiro nunca sai do Nest para quem não pode vê-lo:
//   - 'completo': quem tem perfil_pesquisador_visualizar_sensivel ("Ver Dados Sensíveis do Pesquisador (CPF)", o admin)
//     e, fora daqui, o próprio pesquisador (o chamador confere o dono);
//   - 'mascarado' ("***.456.789-**"): quem trabalha com contas no painel, com usuario_visualizar_atendimento ou
//     usuario_visualizar_sensivel (Curador e Suporte, por exemplo): conferem a pessoa sem ver o número inteiro;
//   - 'oculto' (null na resposta): todo o resto, inclusive o visitante.
export type NivelAcessoCpf = 'completo' | 'mascarado' | 'oculto';

export async function nivelAcessoCpf(db: Kysely<DB>): Promise<NivelAcessoCpf> {
  const resultado = await sql<{ completo: boolean; mascarado: boolean }>`
    SELECT public.tem_permissao('perfil_pesquisador_visualizar_sensivel') AS completo,
           public.tem_permissao('usuario_visualizar_atendimento')
             OR public.tem_permissao('usuario_visualizar_sensivel') AS mascarado
  `.execute(db);
  // Um SELECT sem FROM devolve sempre uma linha.
  const [linha] = resultado.rows;
  if (linha.completo) return 'completo';
  if (linha.mascarado) return 'mascarado';
  return 'oculto';
}

// O CPF da resposta conforme o nível; o dono sempre vê o próprio inteiro.
export function cpfParaResposta(
  nivel: NivelAcessoCpf,
  ehDono: boolean,
  cpfCriptografado: string,
): string | null {
  if (ehDono || nivel === 'completo') return decifrarCpf(cpfCriptografado);
  if (nivel === 'mascarado') return mascararCpf(decifrarCpf(cpfCriptografado));
  return null;
}
