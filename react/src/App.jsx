import { Route, Routes } from 'react-router';
import { Layout } from './components/layout/layout';
import { useAuth } from './services/3-auth/hook/use-auth';
import { AdminDashboard } from './views/admin/admin-dashboard';
import { LoginPage } from './views/3-auth/login-page';
import { CriarUsuario } from './views/1-usuario/criar-usuario';

// useAuth() chamado uma vez só, aqui em cima — Header (dentro de Layout) e
// cada página recebem o mesmo `auth` por prop, nunca cada um com sua
// própria sessão. "/" é a home (painel admin, temporariamente — vira a
// home de verdade do site mais pra frente); as outras são views próprias
// de ações específicas (login, criar usuário) — cada uma com seu
// breadcrumb (ver components/layout/breadcrumb.jsx).
function App() {
  const auth = useAuth();

  return (
    <Routes>
      <Route element={<Layout auth={auth} />}>
        <Route path="/" element={<AdminDashboard auth={auth} />} />
        <Route path="/login" element={<LoginPage auth={auth} />} />
        <Route path="/usuarios/criar" element={<CriarUsuario auth={auth} />} />
      </Route>
    </Routes>
  );
}

export default App;
