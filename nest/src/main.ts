import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Express } from 'express';
import helmet from 'helmet';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Necessário pro front (Vite, outra origem) conseguir chamar a API —
  // tutorial-rodar-projeto.md já avisava disso desde o "hello world".
  app.enableCors();
  // ADICIONADO (03-08-2026, achado do Claude Web em revisão): sem isto, em
  // produção — atrás de QUALQUER proxy reverso (Render, Railway, Fly,
  // Cloudflare) — o Express enxerga o IP do PROXY em toda requisição, não
  // o do usuário de verdade. Dois efeitos ruins, silenciosos em localhost
  // (onde não há proxy, então nunca aparece testando aqui):
  // 1. ThrottlerGuard (auth.module.ts) passaria a contar TODO MUNDO como o
  //    mesmo IP — o limite de 5/60s vira global (uma pessoa tentando logar
  //    trava login pra todo mundo), e um atacante sozinho consegue travar
  //    a plataforma inteira com só 5 requisições.
  // 2. `sessao.ip`/`usuario.ultimo_login_ip` (registrados em
  //    auth.controller.login.ts via `request.ip`) gravariam sempre o IP do
  //    proxy, nunca o do usuário — auditoria de login ficaria inútil.
  // `1` = confia só no primeiro salto (o proxy imediato) — ajustar pra um
  // número maior só se o deploy final tiver mais de um proxy encadeado
  // (ex.: Cloudflare na frente de outro proxy).
  (app.getHttpAdapter().getInstance() as Express).set('trust proxy', 1);
  // helmet (achado do Claude Web, 03-08-2026): não muda nenhuma resposta,
  // só ACRESCENTA um conjunto de cabeçalhos HTTP de segurança que o
  // Express não manda sozinho (Strict-Transport-Security,
  // X-Content-Type-Options, X-Frame-Options, Content-Security-Policy
  // básico etc.) — ver o comentário detalhado sobre cada um em
  // temp_Nest_React.md (pra explicar pra Alexia). Uma linha, sem
  // configuração nenhuma pro caso de uso de vocês (API pura, sem servir
  // HTML) — os padrões do pacote já cobrem isso.
  app.use(helmet());
  // Achado do Claude da Alexia (02-08-2026): nenhum DTO tinha decorator de
  // validação e não existia ValidationPipe nenhum — e-mail vazio, senha de
  // 1 caractere, tudo passava direto pro Postgres. `whitelist` descarta
  // campo que não está no DTO; `forbidNonWhitelisted` rejeita a
  // requisição inteira se vier campo a mais (em vez de só ignorar, que
  // esconderia erro de digitação no corpo da requisição); `transform`
  // converte o corpo pra instância real da classe do DTO (decorator só
  // valida em cima disso).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((erro: unknown) => {
  // existir qualquer Logger configurado; é aqui que o health-check de
  // DatabaseModule.onModuleInit (conectar como app_nestjs, não postgres)
  // aparece se falhar.
  console.error('Falha ao iniciar a aplicação:', erro);
  process.exit(1);
});
