import { SetMetadata } from '@nestjs/common';

export const CHAVE_ROTA_PUBLICA = 'rotaPublica';

// Toda rota exige login por padrão (RequireAuthGuard é global). `@Publico()` libera uma rota para quem não está
// logado: login, cadastro, leituras públicas de catálogo, e as rotas de login opcional (a JwtAuthGuard continua
// reconhecendo quem mandou token, então a rota ainda pode mostrar mais para quem está logado).
export const Publico = () => SetMetadata(CHAVE_ROTA_PUBLICA, true);
