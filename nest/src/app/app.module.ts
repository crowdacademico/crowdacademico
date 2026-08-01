import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../commons/database/database.module';
import { UsuarioModule } from '../1-usuario/usuario.module';
import { PapelPermissaoModule } from '../2-papel-permissao/papel-permissao.module';
import { AuthModule } from '../3-auth/auth.module';
import { ConfiguracoesModule } from '../11-configuracoes/configuracoes.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsuarioModule,
    PapelPermissaoModule,
    AuthModule,
    ConfiguracoesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
