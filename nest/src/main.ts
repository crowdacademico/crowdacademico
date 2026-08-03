import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Necessário pro front (Vite, outra origem) conseguir chamar a API —
  // tutorial-rodar-projeto.md já avisava disso desde o "hello world".
  app.enableCors();
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
