import { SetMetadata } from '@nestjs/common';

export const CHAVE_LIBERADO_COM_TERMO_PENDENTE = 'liberadoComTermoPendente';

// RF-015: enquanto a pessoa não aceitar a versão vigente do Termo de Uso, só pode ler o Termo, aceitar ou sair.
// Rota marcada com isto continua liberada nesse estado; toda outra rota que exige login responde 403
// (AuthGuardRequireAuth). Rota @Publico() já é liberada de qualquer jeito.
export const LiberadoComTermoPendente = () =>
  SetMetadata(CHAVE_LIBERADO_COM_TERMO_PENDENTE, true);
