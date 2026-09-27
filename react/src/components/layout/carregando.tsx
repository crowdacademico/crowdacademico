// "Carregando..." de toda tela, anunciado pelo leitor de tela (role="status"). `className` só acrescenta
// espaçamento e alinhamento de cada lugar.
export function Carregando({ className = '' }: { className?: string }) {
  return (
    <p role="status" className={'text-sm texto-fraco ' + className}>
      Carregando...
    </p>
  );
}
