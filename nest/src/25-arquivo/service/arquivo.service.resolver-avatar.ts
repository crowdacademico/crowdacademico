import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ARMAZENAMENTO_SERVICE } from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';

// Chave em `configuracoes` (07_seed_dados.sql, grupo A) que guarda a
// CHAVE do objeto (não a URL completa) usado como avatar padrão - editável
// pelo painel Admin > Configurações (módulo 11-configuracoes, já pronto),
// sem precisar de deploy novo.
const CHAVE_CONFIG_AVATAR_PADRAO = 'avatar_padrao_chave';

export interface AvatarResolvido {
  // `null` só acontece se ninguém configurou avatar padrão AINDA (seed
  // inicial: valor NULL, "definir depois de decidir a imagem") - o front
  // trata isso com o próprio placeholder local (ex.: ícone genérico de
  // pessoa), sem precisar de outra chamada de API pra saber disso.
  url: string | null;
  // true quando a URL devolvida é o avatar padrão (usuário não tem foto,
  // ou a foto cadastrada foi desativada) - o front pode usar isto pra
  // decidir se mostra um botão "trocar foto" com texto diferente, por
  // exemplo. Não é obrigatório o front usar este campo.
  padrao: boolean;
}

// Exportado do módulo (ver arquivo.module.ts) - hoje só usado pelo
// endpoint GET /arquivo/avatar/:idUsuario, mas pensado pra 1-usuario (ou
// qualquer outro módulo que precise mostrar um avatar) poder injetar isto
// diretamente no futuro, sem duplicar a regra de fallback em dois lugares.
@Injectable()
export class ArquivoServiceResolverAvatar {
  constructor(
    private readonly database: DatabaseService,
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  async executar(idImagemPerfil: number | null): Promise<AvatarResolvido> {
    const db = this.database.getDb();

    if (idImagemPerfil !== null) {
      const arquivo = await db
        .selectFrom('arquivo')
        .select('chave')
        .where('id_arquivo', '=', idImagemPerfil)
        .where('ativo', '=', true)
        .executeTakeFirst();

      if (arquivo) {
        return {
          url: this.armazenamento.montarUrlPublica(arquivo.chave),
          padrao: false,
        };
      }
      // id_imagem_perfil aponta pra um arquivo removido/desativado - cai
      // no mesmo fallback de quem nunca cadastrou nenhuma foto, em vez de
      // devolver um link quebrado.
    }

    const config = await db
      .selectFrom('configuracoes')
      .select('valor')
      .where('chave', '=', CHAVE_CONFIG_AVATAR_PADRAO)
      .where('ativo', '=', true)
      .executeTakeFirst();

    if (!config?.valor) {
      return { url: null, padrao: true };
    }
    return { url: this.armazenamento.montarUrlPublica(config.valor), padrao: true };
  }
}
