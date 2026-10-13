import { Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/layout/layout';
import { useAuth } from './services/3-auth/hook/use-auth';
import { ROTAS, ROTAS_ADMIN } from './services/router/rotas.constants';
import { AdminLayout } from './views/admin/admin-layout';
import { campoTestes } from './services/router/campo-testes-opcional';

// useAuth() chamado uma vez só, aqui em cima: Header (dentro de Layout) e cada página recebem o mesmo `auth`
// por prop, nunca cada um com sua própria sessão. Rotas vêm de services/router/rotas.constants (fonte única,
// compartilhada com o breadcrumb e o menu lateral): adicionar uma página nova é só acrescentar uma linha lá,
// não mexer aqui.
//
// "/" redireciona para /admin/dashboard (a aba padrão): as abas do painel são rotas de verdade, então "/" não
// pode ser todas ao mesmo tempo.
function App() {
  const auth = useAuth();

  const rotas = (
    <Routes>
      <Route element={<Layout auth={auth} />}>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

        {ROTAS.map(({ caminho, elemento: Elemento }) => (
          <Route key={caminho} path={caminho} element={<Elemento auth={auth} />} />
        ))}

        <Route path="/admin" element={<AdminLayout auth={auth} />}>
          {/* Redirect da rota base sem aba: "/admin/minha-conta" sozinho não é uma página própria (só o link
              antigo, menu-usuario.tsx, aponta para cá); a aba padrão é Perfil. */}
          <Route
            path="minha-conta"
            element={<Navigate to="/admin/minha-conta/perfil" replace />}
          />

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

export default App;
