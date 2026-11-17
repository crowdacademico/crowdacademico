import { Navigate, Route, Routes, useLocation } from 'react-router';
import { Layout } from './components/layout/layout';
import { useAuth } from './services/3-auth/hook/use-auth';
import { podeVerRota, ROTAS, ROTAS_ADMIN, ROTAS_CONTA } from './services/router/rotas.constants';
import { SemAcesso } from './components/layout/painel-admin/sem-acesso';
import { AdminLayout } from './components/layout/painel-admin/admin-layout';
import { campoTestes } from './services/router/campo-testes-opcional';
import { LayoutPublico } from './components/layout/layout-publico';
import { TituloDaPagina } from './components/layout/titulo-da-pagina';
import type { ReactNode } from 'react';

// useAuth() chamado uma vez só, aqui em cima: os layouts e cada página recebem o mesmo `auth`
// por prop, nunca cada um com sua própria sessão. Rotas vêm de services/router/rotas.constants (fonte única,
// compartilhada com o breadcrumb e o menu lateral): adicionar uma página nova é só acrescentar uma linha lá,
// não mexer aqui.
//
// A Home pública usa "/"; o painel administrativo mantém sua rota própria em "/admin/dashboard".
function App() {
  const auth = useAuth();

  const rotas = (
    <>
    <TituloDaPagina />
    <Routes>
      <Route element={<LayoutPublico auth={auth} />}>
        {ROTAS.map(({ caminho, elemento: Elemento }) => (
          <Route key={caminho} path={caminho} element={<Elemento auth={auth} />} />
        ))}
        {/* Minha Conta (área do usuário, fora do painel) no MESMO layout público: antes ficava no layout da restrita,
            e o cabeçalho trocava de repente ao entrar nela. Continua exigindo login. */}
        {ROTAS_CONTA.map(({ caminho, elemento: Elemento }) => (
          <Route
            key={caminho}
            path={caminho}
            element={(
              <ExigirLogin auth={auth}>
                <Elemento auth={auth} />
              </ExigirLogin>
            )}
          />
        ))}
      </Route>

      <Route element={<Layout auth={auth} />}>
        <Route path="/admin/minhas-campanhas" element={<Navigate to="/estudio-pesquisador" replace />} />
        <Route path="/minhas-campanhas" element={<Navigate to="/estudio-pesquisador" replace />} />
        <Route path="/apoiar" element={<RedirecionarMantendoBusca para="/checkout" />} />
        <Route path="/admin/minha-conta" element={<Navigate to="/minha-conta/perfil" replace />} />
        <Route path="/admin/minha-conta/:aba" element={<Navigate to="/minha-conta/perfil" replace />} />
        <Route path="/admin" element={<AdminLayout auth={auth} />}>
          {/* Endereços antigos (as telas ganharam o nome que aparece no menu): link salvo continua funcionando. */}
          <Route path="configuracoes" element={<Navigate to="/admin/parametros-sistema" replace />} />
          <Route path="encerramentos" element={<Navigate to="/admin/pedidos-encerramento" replace />} />

          {/* Tela que as permissões da conta não liberam (Rota.permissoes): o aviso no lugar da tela vazia (17-11-2026). */}
          {ROTAS_ADMIN.map((rota) => {
            const { caminhoRelativo, elemento: Elemento } = rota;
            return (
              <Route
                key={caminhoRelativo}
                path={caminhoRelativo}
                element={podeVerRota(rota, auth.permissoes) ? <Elemento auth={auth} /> : <SemAcesso permissoes={auth.permissoes} />}
              />
            );
          })}
        </Route>
      </Route>
    </Routes>
    </>
  );

  // Provider do Campo de Testes: só em desenvolvimento e só se a pasta existir (campo-testes-opcional.ts).
  const ProviderCampoTestes = campoTestes?.CampoTestesProvider;
  return ProviderCampoTestes ? <ProviderCampoTestes>{rotas}</ProviderCampoTestes> : rotas;
}

// Endereço antigo que leva parâmetro (`/apoiar?idCampanha=3`): sem repassar o `search`, o checkout abriria sem
// saber qual campanha apoiar.
function RedirecionarMantendoBusca({ para }: { para: string }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: para, search }} replace />;
}

function ExigirLogin({
  auth,
  children,
}: {
  auth: ReturnType<typeof useAuth>;
  children: ReactNode;
}) {
  if (auth.carregando) return null;
  if (!auth.usuario) return <Navigate to="/login" replace />;
  return children;
}

export default App;
