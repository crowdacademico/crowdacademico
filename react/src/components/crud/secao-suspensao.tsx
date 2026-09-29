import { useEffect, useState } from 'react';
import { SecaoFicha } from './ficha-consulta';
import { useErroToast } from '../layout/toast/use-erro-toast';
import { useToast } from '../layout/toast/use-toast';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';

export interface EstadoSuspensao {
  suspensoAte: string | null;
  motivoSuspensao: string | null;
}

interface SecaoSuspensaoProps {
  titulo: string;
  // O que a suspensão bloqueia, mostrado antes de suspender.
  explicacao: string;
  rotuloSuspenso: string;
  rotuloSuspender: string;
  mensagemSuspenso: string;
  mensagemRevogado: string;
  buscar: () => Promise<EstadoSuspensao>;
  suspender: (ate: string, motivo: string) => Promise<unknown>;
  revogar: () => Promise<unknown>;
}

const PADRAO_OPCOES_DIAS = '1,3,7,30';

// Card de moderação "suspender por X dias, com motivo" / "revogar", usado para a conta (1-usuario) e para o
// poder de pesquisador (6-perfil-pesquisador): a mecânica é a mesma, mudam só os textos e as chamadas de API,
// que cada módulo passa. As opções de prazo vêm de `configuracoes.suspensao_usuario_opcoes_dias` (a mesma
// política para os dois) + campo livre para qualquer outro número de dias.
export function SecaoSuspensao({
  titulo,
  explicacao,
  rotuloSuspenso,
  rotuloSuspender,
  mensagemSuspenso,
  mensagemRevogado,
  buscar,
  suspender,
  revogar,
}: SecaoSuspensaoProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const { ocupado: enviando, executar } = useEnvio(reportarErro, limparErro);
  const { obterConfiguracao } = useConfiguracoes();
  const valorOpcoesDias = obterConfiguracao('suspensao_usuario_opcoes_dias', PADRAO_OPCOES_DIAS);
  const opcoesDias = (typeof valorOpcoesDias === 'string' ? valorOpcoesDias : PADRAO_OPCOES_DIAS)
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  const [suspensao, setSuspensao] = useState<EstadoSuspensao | null>(null);
  const [dias, setDias] = useState('');
  const [motivo, setMotivo] = useState('');

  const carregar = () => {
    buscar()
      .then(setSuspensao)
      .catch(() => setSuspensao(null));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(carregar, []);

  const suspensoAte = suspensao?.suspensoAte ?? null;
  const suspensoAgora = suspensoAte !== null && new Date(suspensoAte) > new Date();

  const aoSuspender = async () => {
    const diasNumero = Number(dias);
    if (!diasNumero || diasNumero <= 0) {
      return;
    }
    await executar(async () => {
      const ate = new Date(Date.now() + diasNumero * 24 * 60 * 60 * 1000).toISOString();
      await suspender(ate, motivo);
      mostrar(mensagemSuspenso, `Até ${formatarDataHora(ate)}`);
      setDias('');
      setMotivo('');
      carregar();
    });
  };

  const aoRevogar = async () => {
    await executar(async () => {
      await revogar();
      mostrar(mensagemRevogado);
      carregar();
    });
  };

  return (
    <SecaoFicha titulo={titulo}>
      <div className="sm:col-span-2 space-y-3">
        {erro && <p className="text-xs texto-erro font-bold">{erro}</p>}

        {suspensoAgora ? (
          <div className="rounded-lg border borda-forte fundo-erro p-4">
            <p className="text-sm font-bold texto-erro">
              {rotuloSuspenso} {formatarDataHora(suspensoAte)}
            </p>
            <p className="text-xs texto-erro mt-1">Motivo: {suspensao?.motivoSuspensao}</p>
            <button type="button" onClick={() => void aoRevogar()} disabled={enviando} className="btn btn-secondary mt-3">
              {enviando ? 'Revogando...' : 'Revogar suspensão'}
            </button>
          </div>
        ) : (
          <div className="rounded-lg border borda-padrao p-4 space-y-3">
            <p className="text-xs texto-fraco">{explicacao}</p>
            <div className="flex flex-wrap gap-2 items-center">
              {opcoesDias.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDias(String(d))}
                  className={
                    'px-3 py-1.5 rounded-lg text-xs font-bold border ' +
                    (dias === String(d)
                      ? 'fundo-marca-forte text-white borda-marca'
                      : 'texto-padrao borda-forte hover-fundo-sutil')
                  }
                >
                  {d} {d === 1 ? 'dia' : 'dias'}
                </button>
              ))}
              <input
                type="number"
                min="1"
                placeholder="outro (dias)"
                aria-label="Outro prazo, em dias"
                value={dias}
                onChange={(evento) => setDias(evento.target.value)}
                className="input-padrao w-36 py-1.5"
              />
            </div>
            <textarea
              placeholder="Motivo da suspensão (obrigatório)"
              aria-label="Motivo da suspensão"
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              className="input-padrao"
              rows={2}
            />
            <button
              type="button"
              onClick={() => void aoSuspender()}
              disabled={!dias || !motivo.trim() || enviando}
              className="btn btn-danger"
            >
              {enviando ? 'Suspendendo...' : rotuloSuspender}
            </button>
          </div>
        )}
      </div>
    </SecaoFicha>
  );
}
