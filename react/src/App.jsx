import { DevDashboard } from './views/dev/dev-dashboard';

// Só a tela de devtools por enquanto, de propósito (pedido do Lucas): sem
// router, sem site público ainda — "básico do básico" pra ver CRUD +
// autenticação + RLS funcionando antes de qualquer tela de verdade.
function App() {
  return <DevDashboard />;
}

export default App;
