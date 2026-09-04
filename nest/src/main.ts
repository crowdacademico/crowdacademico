import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Express } from 'express';
import helmet from 'helmet';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Necessário pro front (Vite, outra origem) conseguir chamar a API -
  // tutorial-rodar-projeto.md já avisava disso desde o "hello world".
  app.enableCors();
  // ADICIONADO (03-08-2026, achado em auditoria de IA): sem isto, em
  // produção - atrás de QUALQUER proxy reverso (Render, Railway, Fly,
  // Cloudflare) - o Express enxerga o IP do PROXY em toda requisição, não
  // o do usuário de verdade. Dois efeitos ruins, silenciosos em localhost
  // (onde não há proxy, então nunca aparece testando aqui):
  // 1. ThrottlerGuard (auth.module.ts) passaria a contar TODO MUNDO como o
  //    mesmo IP - o limite de 5/60s vira global (uma pessoa tentando logar
  //    trava login pra todo mundo), e um atacante sozinho consegue travar
  //    a plataforma inteira com só 5 requisições.
  // 2. `sessao.ip`/`usuario.ultimo_login_ip` (registrados em
  //    auth.controller.login.ts via `request.ip`) gravariam sempre o IP do
  //    proxy, nunca o do usuário - auditoria de login ficaria inútil.
  // `1` = confia só no primeiro salto (o proxy imediato) - ajustar pra um
  // número maior só se o deploy final tiver mais de um proxy encadeado
  // (ex.: Cloudflare na frente de outro proxy).
  (app.getHttpAdapter().getInstance() as Express).set('trust proxy', 1);
  // helmet (achado em auditoria de IA, 03-08-2026): não muda nenhuma
  // resposta, só ACRESCENTA um conjunto de cabeçalhos HTTP de segurança que
  // o Express não manda sozinho (Strict-Transport-Security,
  // X-Content-Type-Options, X-Frame-Options, Content-Security-Policy
  // básico etc.) - ver o comentário detalhado sobre cada um em
  // DOCUMENTACAO_BACKEND.md, seção 11. Uma linha, sem configuração nenhuma
  // pro caso de uso do projeto (API pura, sem servir HTML) - os padrões do
  // pacote já cobrem isso.
  app.use(helmet());
  // Achado em auditoria de IA (02-08-2026): nenhum DTO tinha decorator de
  // validação e não existia ValidationPipe nenhum - e-mail vazio, senha de
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
  // Swagger/OpenAPI (04-09-2026) - documentação interativa da API em
  // `/api`, gerada sozinha a partir dos DTOs (`class-validator` já
  // decorado neles) e dos controllers, via o plugin do compilador
  // configurado em `nest-cli.json` (`classValidatorShim` lê os decorators
  // de validação que já existem, sem precisar duplicar tudo com
  // `@ApiProperty`; `introspectComments` usa o comentário JSDoc acima de
  // cada campo/rota como descrição, se houver). Detalhe completo em
  // `DOCUMENTACAO_BACKEND.md`, seção 11.
  //
  // SÓ fora de produção, de propósito - mesmo raciocínio do `DevLoginRapido`
  // no React (`import.meta.env.DEV`): documentação interativa da API inteira
  // é ferramenta de desenvolvimento, não algo pra ficar exposto num domínio
  // público depois do deploy.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('CrowdAcadêmico - API')
      .setDescription(
        'Documentação interativa da API do CrowdAcadêmico. Gerada automaticamente a partir dos DTOs e controllers - não é escrita à mão, então reflete sempre o código atual.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Cole aqui só o token (sem a palavra "Bearer" na frente) - o valor de accessToken devolvido por POST /auth/login.',
        },
        'accessToken',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    // Marca 'accessToken' como exigido por padrão em toda rota, sem precisar
    // decorar cada um dos ~94 controllers com @ApiBearerAuth() na mão - é o
    // campo `security` de nível de documento do próprio OpenAPI (schemas/
    // openapi/security-requirement-object), que vale como padrão pra
    // qualquer operação que não declare o próprio `security`. Sem isto, o
    // botão "Authorize" apareceria mas o botão "Try it out" de cada rota
    // não mandaria o token de verdade.
    document.security = [{ accessToken: [] }];
    SwaggerModule.setup('api', app, document);
  }
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((erro: unknown) => {
  // existir qualquer Logger configurado; é aqui que o health-check de
  // DatabaseModule.onModuleInit (conectar como app_nestjs, não postgres)
  // aparece se falhar.
  console.error('Falha ao iniciar a aplicação:', erro);
  process.exit(1);
});
