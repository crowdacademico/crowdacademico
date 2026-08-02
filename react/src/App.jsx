import { Route, Routes } from 'react-router';
import { Layout } from './components/layout/layout';
import { useAuth } from './services/3-auth/hook/use-auth';
import { ROTAS } from './services/router/rotas.constants';

// useAuth() chamado uma vez só, aqui em cima — Header (dentro de Layout) e
// cada página recebem o mesmo `auth` por prop, nunca cada um com sua
// própria sessão. As rotas em si vêm de services/router/rotas.constants.js
// (fonte única, compartilhada com o breadcrumb) — adicionar uma página
// nova é só acrescentar uma linha lá, não mexer aqui.
function App() {
  const auth = useAuth();

  return (
    <Routes>
      <Route element={<Layout auth={auth} />}>
        {ROTAS.map(({ caminho, elemento: Elemento }) => (
          <Route key={caminho} path={caminho} element={<Elemento auth={auth} />} />
        ))}
      </Route>
    </Routes>
  );
}

export default App;
