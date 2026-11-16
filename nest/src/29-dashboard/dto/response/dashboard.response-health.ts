// GET /dashboard/saude (aba Saúde do Dashboard, 16-11-2026): os serviços de fora de que o sistema depende, conferidos
// na hora. `ok` = respondeu e aceitou a credencial; `mensagem` = o motivo da falha (vazia quando ok; sem chave nem senha);
// `ms` = quanto demorou (cada verificação tem limite de tempo, para a tela não travar).
export interface VerificacaoServicoExterno {
  ok: boolean;
  mensagem: string;
  ms: number;
}

export interface DashboardResponseHealth {
  pagamento: VerificacaoServicoExterno & {
    provedor: string;
    // null quando não deu para falar com o provedor.
    ambiente: 'sandbox' | 'producao' | 'teste' | null;
    saldo: number | null;
  };
  email: VerificacaoServicoExterno & {
    provedor: string;
    // Trava de teste: todo e-mail vai para um endereço só (EMAIL_REDIRECIONAR_PARA).
    redirecionado: boolean;
  };
  verificadoEm: string;
}
