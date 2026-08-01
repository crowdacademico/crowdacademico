import { AdminDashboard } from './views/admin/admin-dashboard';

// Só o painel admin por enquanto, de propósito (pedido do Lucas): sem
// router, sem site público ainda — este É o painel de admin de verdade
// (não uma ferramenta descartável à parte), com header/footer fixos e
// menu lateral, prontos pra crescer junto com o resto do site.
function App() {
  return <AdminDashboard />;
}

export default App;
