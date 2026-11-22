import { Controller, Get } from '@nestjs/common';
import { Publico } from '../../commons/auth/publico.decorator';
import { PerfilPesquisadorServiceInstitutions } from '../service/perfil-pesquisador.service.institutions';

// GET /perfil-pesquisador/instituicoes. @Publico(): o cadastro de pesquisador acontece antes do login, e só sai o nome
// da instituição, que já é público no perfil. Registrado antes de PerfilPesquisadorControllerFindOne no módulo, para
// "instituicoes" não ser lido como :id.
@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerInstitutions {
  constructor(private readonly service: PerfilPesquisadorServiceInstitutions) {}

  @Get('instituicoes')
  @Publico()
  listar() {
    return this.service.executar();
  }
}
