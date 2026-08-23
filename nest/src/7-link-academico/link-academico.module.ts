import { Module } from '@nestjs/common';
import { LinkAcademicoControllerCreate } from './controllers/link-academico.controller.create';
import { LinkAcademicoControllerFindAll } from './controllers/link-academico.controller.findall';
import { LinkAcademicoControllerRemove } from './controllers/link-academico.controller.remove';
import { LinkAcademicoControllerUpdate } from './controllers/link-academico.controller.update';
import { LinkAcademicoServiceCreate } from './service/link-academico.service.create';
import { LinkAcademicoServiceFindAll } from './service/link-academico.service.findall';
import { LinkAcademicoServiceRemove } from './service/link-academico.service.remove';
import { LinkAcademicoServiceUpdate } from './service/link-academico.service.update';

@Module({
  controllers: [
    LinkAcademicoControllerCreate,
    LinkAcademicoControllerFindAll,
    LinkAcademicoControllerUpdate,
    LinkAcademicoControllerRemove,
  ],
  providers: [
    LinkAcademicoServiceCreate,
    LinkAcademicoServiceFindAll,
    LinkAcademicoServiceUpdate,
    LinkAcademicoServiceRemove,
  ],
})
export class LinkAcademicoModule {}
