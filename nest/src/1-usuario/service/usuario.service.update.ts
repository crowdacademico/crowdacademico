import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ArquivoServiceRemove } from '../../25-arquivo/service/arquivo.service.remove';
import { ArquivoServiceResolverAvatar } from '../../25-arquivo/service/arquivo.service.resolver-avatar';
import { DatabaseService } from '../../commons/database/database.service';
import { USUARIO_COLUNAS_SELECT } from '../constants/usuario.constants';
import { UsuarioConverter } from '../dto/converter/usuario.converter';
import { UsuarioRequestUpdate } from '../dto/request/usuario.request-update';
import { UsuarioResponse } from '../dto/response/usuario.response';

const CUSTO_BCRYPT = 10;

@Injectable()
export class UsuarioServiceUpdate {
  private readonly logger = new Logger(UsuarioServiceUpdate.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly arquivoServiceRemove: ArquivoServiceRemove,
    private readonly resolverAvatar: ArquivoServiceResolverAvatar,
  ) {}

  async executar(
    idUsuario: number,
    dto: UsuarioRequestUpdate,
  ): Promise<UsuarioResponse> {
    const db = this.database.getDb();

    // `senhaAtual` presente = troca autoatendida (Minha Conta > Segurança) —
    // exige conferir a senha de verdade antes de trocar (09-08-2026, Bloco
    // E). Ausente = reset administrativo (AlterarUsuario, painel admin),
    // comportamento de sempre, sem essa checagem.
    if (dto.senhaAtual !== undefined) {
      const atual = await db
        .selectFrom('usuario')
        .select('senha_hash')
        .where('id_usuario', '=', idUsuario)
        .executeTakeFirst();
      const confere =
        atual && (await bcrypt.compare(dto.senhaAtual, atual.senha_hash));
      if (!confere) {
        throw new UnauthorizedException('Senha atual incorreta.');
      }
    }

    const senhaHash = dto.novaSenha
      ? await bcrypt.hash(dto.novaSenha, CUSTO_BCRYPT)
      : undefined;

    // ADICIONADO (módulo 25-arquivo) — limpa a foto ANTERIOR quando a
    // pessoa está trocando de foto (não apenas cadastrando pela primeira
    // vez). Sem isso, cada troca deixava a foto antiga órfã: linha
    // continuava `ativo=true` no banco e os bytes ficavam pra sempre no
    // bucket, sem nenhuma referência apontando pra eles.
    //
    // ORDEM IMPORTA: isto precisa rodar ANTES do UPDATE de usuario logo
    // abaixo, enquanto usuario.id_imagem_perfil AINDA aponta pra foto
    // antiga — pol_arquivo_update (04_rls_policies.sql) só permite
    // desativar um arquivo enquanto esse vínculo de posse existe. Depois
    // que o UPDATE trocar o vínculo pra foto nova, ninguém sem a permissão
    // 'arquivo_gerenciar' conseguiria mais desativar a antiga.
    if (dto.idImagemPerfil !== undefined) {
      const usuarioAtual = await db
        .selectFrom('usuario')
        .select('id_imagem_perfil')
        .where('id_usuario', '=', idUsuario)
        .executeTakeFirst();

      const fotoAntiga = usuarioAtual?.id_imagem_perfil ?? null;
      if (fotoAntiga !== null && fotoAntiga !== dto.idImagemPerfil) {
        // Best-effort: um problema aqui (corrida rara, permissão, etc.)
        // não pode travar o resto da atualização — nome/senha/foto nova
        // continuam valendo mesmo que a limpeza da antiga não role agora.
        // LOGADO, não mais engolido em silêncio (25-08-2026, achado do
        // Lucas: arquivo órfão sobrou no bucket sem NENHUM rastro do
        // motivo) — best-effort não é o mesmo que invisível.
        await this.arquivoServiceRemove.executar(fotoAntiga).catch((erro) => {
          this.logger.warn(
            `Falha ao limpar foto antiga (id_arquivo=${fotoAntiga}) do usuário ${idUsuario}: ${(erro as Error).message}`,
          );
        });
      }
    }

    const campos = {
      ...(dto.nome !== undefined ? { nome: dto.nome } : {}),
      ...(dto.idImagemPerfil !== undefined
        ? { id_imagem_perfil: dto.idImagemPerfil }
        : {}),
      ...(senhaHash !== undefined ? { senha_hash: senhaHash } : {}),
    };
    if (Object.keys(campos).length === 0) {
      // `UPDATE usuario SET WHERE ...` sem coluna nenhuma é SQL inválido —
      // melhor um 400 claro do que deixar o Postgres estourar um erro de
      // sintaxe genérico.
      throw new BadRequestException('Nenhum campo para atualizar.');
    }

    const usuario = await db
      .updateTable('usuario')
      .set(campos)
      .where('id_usuario', '=', idUsuario)
      .returning(USUARIO_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!usuario) {
      // pol_usuario_update (04_rls_policies.sql) exige id_usuario_atual() =
      // id_usuario (dono) OU permissão 'usuario_suspender'. Controller já
      // aplica RequireAuthGuard (3-auth), então chegar aqui sem afetar
      // linha nenhuma só acontece pra quem está logado mas não é dono nem
      // tem a permissão — RLS bloqueou o UPDATE (0 linhas, sem erro do
      // Postgres). Diferencia de "não existe" checando a existência à parte.
      const existe = await db
        .selectFrom('usuario')
        .select('id_usuario')
        .where('id_usuario', '=', idUsuario)
        .where('deletado', '=', false)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException(`Usuário ${idUsuario} não encontrado`);
      }
      throw new ForbiddenException('Sem permissão para editar este usuário.');
    }

    // ADICIONADO (25-08-2026, módulo 25-arquivo): resposta já vem com a
    // avatarUrl fresca — quem chama (ex.: Minha Conta > aoSalvar) só passa
    // este objeto pra auth.atualizarUsuarioLocal() e o cabeçalho/faixa de
    // identidade já refletem a troca na hora, sem precisar recalcular nada
    // no lado do cliente.
    const avatar = await this.resolverAvatar.executar(usuario.id_imagem_perfil);

    return {
      ...UsuarioConverter.paraResponseDto(usuario),
      avatarUrl: avatar.url,
    };
  }
}
