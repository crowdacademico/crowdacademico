import { OmitType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { PerfilPesquisadorRequestCreate } from '../../6-perfil-pesquisador/dto/request/perfil-pesquisador.request-create';

// Ação diferente do self-service (admin criando perfil PARA OUTRA pessoa, via criar_perfil_pesquisador_para_outro()),
// com os mesmos campos: as regras vêm do criar de verdade (OmitType), escritas uma vez só; muda só o aceite.
export class PerfilPesquisadorRequestCreateForOther extends OmitType(
  PerfilPesquisadorRequestCreate,
  ['aceiteTermos'] as const,
) {
  // O Upgrade do T1 mostra o Termo de Uso vigente ANTES do formulário para QUALQUER conta, inclusive a de outra
  // pessoa, e sempre manda `true` (o aceite fica em nome do ALVO, não de quem preencheu). Opcional aqui, e não
  // `@Equals(true)` como no self-service; o T1 é o único que chama esta rota.
  @IsOptional()
  @IsBoolean()
  aceiteTermos?: boolean;
}
