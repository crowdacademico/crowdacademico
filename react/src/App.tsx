import { Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/layout/layout';
import { useAuth } from './services/3-auth/hook/use-auth';
import { ROTAS, ROTAS_ADMIN, ROTAS_CONTA } from './services/router/rotas.constants';
import { AdminLayout } from './components/layout/painel-admin/admin-layout';
import { campoTestes } from './services/router/campo-testes-opcional';
import { LayoutPublico } from './components/layout/layout-publico';
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
    <Routes>
      <Route element={<LayoutPublico auth={auth} />}>
        {ROTAS.map(({ caminho, elemento: Elemento }) => (
          <Route key={caminho} path={caminho} element={<Elemento auth={auth} />} />
        ))}
      </Route>

      <Route element={<Layout auth={auth} />}>
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
        <Route path="/admin/minhas-campanhas" element={<Navigate to="/minhas-campanhas" replace />} />
        <Route path="/admin/minha-conta" element={<Navigate to="/minha-conta/perfil" replace />} />
        <Route path="/admin/minha-conta/:aba" element={<Navigate to="/minha-conta/perfil" replace />} />
        <Route path="/admin" element={<AdminLayout auth={auth} />}>
          {/* Endereços antigos (as telas ganharam o nome que aparece no menu): link salvo continua funcionando. */}
          <Route path="configuracoes" element={<Navigate to="/admin/parametros-sistema" replace />} />
          <Route path="encerramentos" element={<Navigate to="/admin/pedidos-encerramento" replace />} />

          {ROTAS_ADMIN.map(({ caminhoRelativo, elemento: Elemento }) => (
            <Route
              key={caminhoRelativo}
              path={caminhoRelativo}
              element={<Elemento auth={auth} />}
            />
          ))}
        </Route>
      </Route>
    </Routes>
  );

  // Provider do Campo de Testes: só em desenvolvimento e só se a pasta existir (campo-testes-opcional.ts).
  const ProviderCampoTestes = campoTestes?.CampoTestesProvider;
  return ProviderCampoTestes ? <ProviderCampoTestes>{rotas}</ProviderCampoTestes> : rotas;
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
