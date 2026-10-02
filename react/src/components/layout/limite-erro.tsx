import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useLocation } from 'react-router';

// Limite de erro (o "ErrorBoundary" do React): um erro de renderização dentro de `children` mostra um aviso no
// lugar só daquele trecho, em vez de desmontar a aplicação inteira e deixar a tela em branco. Precisa ser
// componente de classe: o React só oferece `getDerivedStateFromError`/`componentDidCatch` em classe.
interface LimiteErroInternoProps {
  children: ReactNode;
}

interface LimiteErroInternoState {
  erro: Error | null;
}

class LimiteErroInterno extends Component<LimiteErroInternoProps, LimiteErroInternoState> {
  state: LimiteErroInternoState = { erro: null };

  static getDerivedStateFromError(erro: Error): LimiteErroInternoState {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('[LimiteErro]', erro, info.componentStack);
  }

  render() {
    const { erro } = this.state;
    if (!erro) {
      return this.props.children;
    }
    return (
      <div role="alert" className="fundo-cartao rounded-2xl border borda-padrao p-8 my-8 text-center space-y-4">
        <p className="texto-erro enfase">Algo deu errado ao mostrar esta tela.</p>
        <p className="paragrafo texto-fraco">Os outros menus continuam funcionando. Recarregar a página costuma resolver.</p>
        <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
          Recarregar página
        </button>
        {/* Detalhe técnico só em desenvolvimento: em produção a mensagem crua não é para o usuário. */}
        {import.meta.env.DEV && (
          <pre className="legenda text-left texto-fraco fundo-sutil rounded p-3 whitespace-pre-wrap">{erro.message}</pre>
        )}
      </div>
    );
  }
}

// `key` pelo caminho: ao trocar de tela, o limite começa de novo, senão o aviso de erro de uma tela ficaria
// preso ao navegar para outra.
export function LimiteErro({ children }: LimiteErroInternoProps) {
  const { pathname } = useLocation();
  return <LimiteErroInterno key={pathname}>{children}</LimiteErroInterno>;
}
