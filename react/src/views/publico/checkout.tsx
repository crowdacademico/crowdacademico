import { Navigate, useSearchParams } from 'react-router';

// O antigo checkout (/checkout?idCampanha=24&valor=50, e /apoiar, que já redireciona para cá). Desde 16-11-2026 o apoio é
// um modal na própria página da campanha (ModalApoiar), e o pagamento é na página do Asaas: este endereço só leva os links
// antigos para lá, com o modal aberto e o mesmo valor.
export function Checkout() {
  const [parametros] = useSearchParams();
  const id = parametros.get('idCampanha') ?? '';
  if (!/^[1-9]\d*$/.test(id)) {
    return <Navigate to="/explorar" replace />;
  }
  const valor = Number(parametros.get('valor'));
  const sufixoValor = Number.isFinite(valor) && valor > 0 ? `&valor=${valor}` : '';
  return <Navigate to={`/campanha/${id}?apoiar=1${sufixoValor}`} replace />;
}
