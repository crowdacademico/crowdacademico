import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ARMAZENAMENTO_SERVICE } from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';

export interface AvatarResolvido {
  // `null` = usuário não tem foto cadastrada (ou a que tinha foi
  // desativada). SIMPLIFICADO (30-08-2026): antes isso caía num "avatar
  // padrão" configurável via `configuracoes` (chave `avatar_padrao_chave`)
  // — removido porque o front já resolve isso sozinho e melhor:
  // AvatarUsuario (components/layout/avatar-usuario.jsx) desenha iniciais
  // com fundo colorido quando `foto` é null, sem precisar de nenhuma
  // imagem hospedada nem de round-trip nenhum pra saber disso. Manter os
  // dois (imagem padrão no bucket E fallback de iniciais no front) era
  // complexidade duplicada pro mesmo problema.
  url: string | null;
}

// Exportado do módulo (ver arquivo.module.ts) — hoje usado pelo endpoint
// GET /arquivo/avatar/:idUsuario, mas pensado pra 1-usuario (ou qualquer
// outro módulo que precise mostrar um avatar) poder injetar isto
// diretamente no futuro, sem duplicar a regra de fallback em dois lugares.
@Injectable()
export class ArquivoServiceResolverAvatar {
  constructor(
    private readonly database: DatabaseService,
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  async executar(idImagemPerfil: number | null): Promise<AvatarResolvido> {
    if (idImagemPerfil === null) {
      return { url: null };
    }

    const arquivo = await this.database
      .getDb()
      .selectFrom('arquivo')
      .select('chave')
      .where('id_arquivo', '=', idImagemPerfil)
      .where('ativo', '=', true)
      .executeTakeFirst();

    // Sem `arquivo` (removido/desativado) cai no mesmo `null` de quem
    // nunca cadastrou nenhuma foto — o front trata os dois casos do
    // mesmo jeito (iniciais com fundo colorido).
    return { url: arquivo ? this.armazenamento.montarUrlPublica(arquivo.chave) : null };
  }
}