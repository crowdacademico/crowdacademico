import { AdminDashboard } from '../../views/admin/admin-dashboard';
import { LoginPage } from '../../views/3-auth/login-page';
import { CriarUsuario } from '../../views/1-usuario/criar-usuario';

// Fonte única de verdade pra "quais páginas existem": App.jsx monta as
// <Route> a partir daqui, e breadcrumb.jsx monta o rótulo a partir daqui —
// antes eram 2 listas mantidas à mão, com risco de desalinhar conforme
// crescer (cada view nova de criar/alterar/consultar/excluir, por módulo,
// ia precisar lembrar de atualizar os dois lugares). Agora uma rota nova é
// uma linha só, aqui.
//
// rotuloBreadcrumb: null = não aparece no breadcrumb (é o caso da home).
export const ROTAS = [
  { caminho: '/', elemento: AdminDashboard, rotuloBreadcrumb: null },
  { caminho: '/login', elemento: LoginPage, rotuloBreadcrumb: 'Login' },
  { caminho: '/usuarios/criar', elemento: CriarUsuario, rotuloBreadcrumb: 'Criar Usuário' },
];
