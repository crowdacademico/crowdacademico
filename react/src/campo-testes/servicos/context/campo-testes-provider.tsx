import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CampoTestesContext } from './campo-testes-context';
import type { EntradaRegistroChamada, RegistroChamada } from './campo-testes-context';

const LIMITE_REGISTRO_CHAMADAS = 200;

interface CampoTestesProviderProps {
  children: ReactNode;
}

// Guarda o Registro de Chamadas (alimentado por use-chamada-registrada.ts), sem sessão paralela: toda chamada do
// Campo de Testes usa a MESMA sessão real do painel (`auth`), então o registro tem um único "ator" possível.
export function CampoTestesProvider({ children }: CampoTestesProviderProps) {
  const [registroChamadas, setRegistroChamadas] = useState<RegistroChamada[]>([]);

  const registrarChamada = useCallback((entrada: EntradaRegistroChamada) => {
    setRegistroChamadas((atual) => {
      const proxima: RegistroChamada[] = [
        { id: crypto.randomUUID(), hora: new Date(), ...entrada },
        ...atual,
      ];
      return proxima.slice(0, LIMITE_REGISTRO_CHAMADAS);
    });
  }, []);

  const limparRegistro = useCallback(() => setRegistroChamadas([]), []);

  const valor = useMemo(
    () => ({
      registroChamadas,
      registrarChamada,
      limparRegistro,
    }),
    [registroChamadas, registrarChamada, limparRegistro],
  );

  return <CampoTestesContext.Provider value={valor}>{children}</CampoTestesContext.Provider>;
}
