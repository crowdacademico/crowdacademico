import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, type LoginTicket } from 'google-auth-library';
import type { DatabaseService } from '../../commons/database/database.service';
import {
  MENSAGEM_GOOGLE_EMAIL_NAO_VERIFICADO,
  MENSAGEM_GOOGLE_SEM_CONTA,
  MENSAGEM_GOOGLE_TOKEN_INVALIDO,
} from '../constants/auth.constants';
import type { AuthResponseLogin } from '../dto/response/auth.response-login';
import { entrarComGoogleNoBanco } from '../util/auth.util.entrar-com-google';
import { AuthServiceGoogle } from './auth.service.google';
import { AuthServiceGoogleToken } from './auth.service.google-token';
import type { AuthServiceLogin } from './auth.service.login';

// Login com Google (18-11-2026), com o Google e o banco falsos: verifyIdToken devolve o payload que cada caso quer, e
// entrar_com_google (o banco) devolve o id que cada caso quer. As regras do banco (vincular, criar, recusar) são da
// suíte PGlite 70; aqui fica o que é do Nest: conferir o token, exigir e-mail confirmado e aplicar as barreiras do
// login por senha.
// Fábricas, não o módulo de verdade: os três puxam o Kysely, que só existe como ESM e o Jest daqui carrega CommonJS. Os
// três são trocados por falsos neste teste de qualquer jeito.
jest.mock('../util/auth.util.entrar-com-google', () => ({
  entrarComGoogleNoBanco: jest.fn(),
}));
jest.mock('../../commons/database/database.service', () => ({
  DatabaseService: class {},
}));
jest.mock('./auth.service.login', () => ({ AuthServiceLogin: class {} }));
const banco = jest.mocked(entrarComGoogleNoBanco);

const ID_CLIENTE = 'cliente-de-teste.apps.googleusercontent.com';
const IP = '203.0.113.7';
const NAVEGADOR = 'jest';

const sessao = (id: number, aceitePendente: boolean): AuthResponseLogin =>
  ({
    accessToken: 'acesso',
    refreshToken: '1.segredo',
    usuario: { idUsuario: id },
    papeis: ['usuario'],
    permissoes: [],
    aceitePendente,
  }) as unknown as AuthResponseLogin;

const ticket = (payload: Record<string, unknown>) =>
  ({ getPayload: () => payload }) as unknown as LoginTicket;

function montar(idCliente: string | null = ID_CLIENTE) {
  const login = {
    barrarContaImpedida: jest.fn().mockResolvedValue(undefined),
    abrirSessao: jest.fn(),
    buscarExclusaoAgendada: jest.fn().mockResolvedValue(undefined),
    responderExclusaoAgendada: jest.fn(),
  };
  const database = { getDb: jest.fn().mockReturnValue({}) };
  const googleToken = new AuthServiceGoogleToken(
    new ConfigService(idCliente ? { GOOGLE_CLIENT_ID: idCliente } : {}),
  );
  const service = new AuthServiceGoogle(
    database as unknown as DatabaseService,
    googleToken,
    login as unknown as AuthServiceLogin,
  );
  return { service, login };
}

const verificar = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
const tokenDoGoogle = (payload: Record<string, unknown>) =>
  verificar.mockResolvedValue(ticket(payload) as never);

beforeEach(() => {
  verificar.mockReset();
  banco.mockReset();
});

describe('AuthServiceGoogle', () => {
  it('token inválido: 401, sem tocar no banco', async () => {
    verificar.mockRejectedValue(new Error('Wrong recipient') as never);
    const { service, login } = montar();
    await expect(
      service.executar({ credential: 'forjado' }, IP, NAVEGADOR),
    ).rejects.toThrow(
      new UnauthorizedException(MENSAGEM_GOOGLE_TOKEN_INVALIDO),
    );
    expect(banco).not.toHaveBeenCalled();
    expect(login.abrirSessao).not.toHaveBeenCalled();
  });

  it('confere o token com audience = GOOGLE_CLIENT_ID', async () => {
    tokenDoGoogle({
      sub: 's1',
      email: 'a@gmail.com',
      email_verified: true,
      name: 'A',
    });
    banco.mockResolvedValue(7);
    const { service, login } = montar();
    login.abrirSessao.mockResolvedValue(sessao(7, false));
    await service.executar({ credential: 'token-bom' }, IP, NAVEGADOR);
    expect(verificar).toHaveBeenCalledWith({
      idToken: 'token-bom',
      audience: ID_CLIENTE,
    });
  });

  it('token sem sub ou sem e-mail: 401', async () => {
    tokenDoGoogle({ email: 'a@gmail.com', email_verified: true });
    const { service } = montar();
    await expect(
      service.executar({ credential: 't' }, IP, NAVEGADOR),
    ).rejects.toThrow(
      new UnauthorizedException(MENSAGEM_GOOGLE_TOKEN_INVALIDO),
    );
    expect(banco).not.toHaveBeenCalled();
  });

  it('e-mail não verificado pelo Google: 401, sem tocar no banco', async () => {
    tokenDoGoogle({
      sub: 's1',
      email: 'a@gmail.com',
      email_verified: false,
      name: 'A',
    });
    const { service } = montar();
    await expect(
      service.executar({ credential: 't' }, IP, NAVEGADOR),
    ).rejects.toThrow(
      new UnauthorizedException(MENSAGEM_GOOGLE_EMAIL_NAO_VERIFICADO),
    );
    expect(banco).not.toHaveBeenCalled();
  });

  it('e-mail já cadastrado: entra na conta existente, com as barreiras e a sessão do login por senha', async () => {
    tokenDoGoogle({
      sub: 's-fernanda',
      email: 'fernanda.souza@gmail.com',
      email_verified: true,
      name: 'Fernanda',
    });
    banco.mockResolvedValue(8);
    const { service, login } = montar();
    login.abrirSessao.mockResolvedValue(sessao(8, false));
    const r = await service.executar({ credential: 't' }, IP, NAVEGADOR);
    // Só sub, e-mail e nome chegam ao banco (LGPD).
    expect(banco).toHaveBeenCalledWith(
      {},
      {
        sub: 's-fernanda',
        email: 'fernanda.souza@gmail.com',
        emailVerificado: true,
        nome: 'Fernanda',
      },
    );
    expect(login.barrarContaImpedida).toHaveBeenCalledWith(8);
    expect(login.abrirSessao).toHaveBeenCalledWith(8, IP, NAVEGADOR);
    expect(r).toMatchObject({ aceitePendente: false });
  });

  it('e-mail novo: a conta criada volta com o Termo de Uso pendente (RF-015)', async () => {
    tokenDoGoogle({
      sub: 's-nova',
      email: 'nova@gmail.com',
      email_verified: true,
    });
    banco.mockResolvedValue(42);
    const { service, login } = montar();
    login.abrirSessao.mockResolvedValue(sessao(42, true));
    const r = await service.executar({ credential: 't' }, IP, NAVEGADOR);
    expect(banco).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ sub: 's-nova', nome: null }),
    );
    expect(r).toMatchObject({ aceitePendente: true });
  });

  it('conta suspensa: continua barrada (403), sem abrir sessão', async () => {
    tokenDoGoogle({
      sub: 's1',
      email: 'suspensa@gmail.com',
      email_verified: true,
    });
    banco.mockResolvedValue(9);
    const { service, login } = montar();
    login.barrarContaImpedida.mockRejectedValue(
      new ForbiddenException('Conta suspensa até 01/12/2026'),
    );
    await expect(
      service.executar({ credential: 't' }, IP, NAVEGADOR),
    ).rejects.toThrow(ForbiddenException);
    expect(login.abrirSessao).not.toHaveBeenCalled();
  });

  it('conta excluída pela própria pessoa, dentro do prazo: devolve a exclusão agendada (prazo de carência)', async () => {
    tokenDoGoogle({
      sub: 's1',
      email: 'agendada@gmail.com',
      email_verified: true,
    });
    banco.mockResolvedValue(null);
    const { service, login } = montar();
    const conta = {
      id_usuario: 11,
      senha_hash: null,
      bloqueado_ate: null,
      exclusao_definitiva_em: new Date('2026-12-22T12:00:00Z'),
    };
    login.buscarExclusaoAgendada.mockResolvedValue(conta);
    login.responderExclusaoAgendada.mockResolvedValue({
      exclusaoAgendada: true,
      exclusaoDefinitivaEm: '2026-12-22T12:00:00.000Z',
    });
    const r = await service.executar(
      { credential: 't', reativar: true },
      IP,
      NAVEGADOR,
    );
    expect(login.buscarExclusaoAgendada).toHaveBeenCalledWith(
      'agendada@gmail.com',
      's1',
    );
    expect(login.barrarContaImpedida).toHaveBeenCalledWith(11, null);
    expect(login.responderExclusaoAgendada).toHaveBeenCalledWith(
      conta,
      true,
      IP,
      NAVEGADOR,
    );
    expect(r).toMatchObject({ exclusaoAgendada: true });
  });

  it('e-mail de conta excluída (o banco devolve null): 401', async () => {
    tokenDoGoogle({
      sub: 's1',
      email: 'excluida@gmail.com',
      email_verified: true,
    });
    banco.mockResolvedValue(null);
    const { service, login } = montar();
    await expect(
      service.executar({ credential: 't' }, IP, NAVEGADOR),
    ).rejects.toThrow(new UnauthorizedException(MENSAGEM_GOOGLE_SEM_CONTA));
    expect(login.abrirSessao).not.toHaveBeenCalled();
  });

  it('sem GOOGLE_CLIENT_ID: 503, sem consultar o Google', async () => {
    const { service } = montar(null);
    await expect(
      service.executar({ credential: 't' }, IP, NAVEGADOR),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(verificar).not.toHaveBeenCalled();
  });
});
