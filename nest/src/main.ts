import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Necessário pro front (Vite, outra origem) conseguir chamar a API —
  // tutorial-rodar-projeto.md já avisava disso desde o "hello world".
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((erro: unknown) => {
  // existir qualquer Logger configurado; é aqui que o health-check de
  // DatabaseModule.onModuleInit (conectar como app_nestjs, não postgres)
  // aparece se falhar.
  console.error('Falha ao iniciar a aplicação:', erro);
  process.exit(1);
});
