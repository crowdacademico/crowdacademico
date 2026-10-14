import { Module } from '@nestjs/common';
import { PagamentoModule } from '../29-pagamento/pagamento.module';
import { CartaoTokenizadoControllerCreate } from './controllers/cartao-tokenizado.controller.create';
import { CartaoTokenizadoControllerDeactivate } from './controllers/cartao-tokenizado.controller.deactivate';
import { CartaoTokenizadoControllerFindAll } from './controllers/cartao-tokenizado.controller.findall';
import { CartaoTokenizadoServiceCreate } from './service/cartao-tokenizado.service.create';
import { CartaoTokenizadoServiceDeactivate } from './service/cartao-tokenizado.service.deactivate';
import { CartaoTokenizadoServiceFindAll } from './service/cartao-tokenizado.service.findall';

@Module({
  imports: [PagamentoModule],
  controllers: [
    CartaoTokenizadoControllerCreate,
    CartaoTokenizadoControllerFindAll,
    CartaoTokenizadoControllerDeactivate,
  ],
  providers: [
    CartaoTokenizadoServiceCreate,
    CartaoTokenizadoServiceFindAll,
    CartaoTokenizadoServiceDeactivate,
  ],
})
export class CartaoTokenizadoModule {}
