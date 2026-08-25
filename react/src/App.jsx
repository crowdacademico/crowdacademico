import { Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/layout/layout';
import { useAuth } from './services/3-auth/hook/use-auth';
import { ElencoProvider } from './services/campo-testes/context/elenco-provider';
import { ROTAS, ROTAS_ADMIN } from './services/router/rotas.constants';
import { AdminLayout } from './views/admin/admin-layout';

// useAuth() chamado uma vez só, aqui em cima — Header (dentro de Layout) e
// cada página recebem o mesmo `auth` por prop, nunca cada um com sua
// própria sessão. Rotas vêm de services/router/rotas.constants.js (fonte
// única, compartilhada com o breadcrumb e o menu lateral) — adicionar uma
// página nova é só acrescentar uma linha lá, não mexer aqui.
//
// "/" redireciona pra /admin/dashboard (a aba padrão, 08-08-2026 — ERA
// /admin/usuarios até o Dashboard existir) — antes era a própria home;
// virou redirect porque as abas do painel agora são rotas de verdade, não
// dava mais pra "/" ser todas ao mesmo tempo.
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
          {/* Redirect da rota base sem aba (11-08-2026) — mesmo espírito do
              redirect de "/" pro Dashboard logo acima: "/admin/minha-conta"
              sozinho não é mais uma página própria, é só o link antigo
              (menu-usuario.jsx) apontando pra cá; a aba padrão é Perfil. */}
          <Route
            path="minha-conta"
            element={<Navigate to="/admin/minha-conta/perfil" replace />}
          />

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

  // ElencoProvider (Campo de Testes) só existe em build de desenvolvimento
  // — mesmo raciocínio do `import.meta.env.DEV` em rotas.constants.js
  // (guarda refresh token de várias contas reais, não é coisa pra existir
  // em produção nem "de graça e inerte"). Fora disso, `rotas` renderiza
  // igual a antes, sem nenhum provider novo por cima.
  return import.meta.env.DEV ? <ElencoProvider>{rotas}</ElencoProvider> : rotas;
}

export default App;
