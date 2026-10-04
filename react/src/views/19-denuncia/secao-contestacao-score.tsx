import { useState } from 'react';
import { EstadoVazio } from '../../components/crud/estado-vazio';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { Campo } from '../../components/input/campo';
import { ContadorCaracteres } from '../../components/input/contador-caracteres';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { denunciaApi } from '../../services/19-denuncia/api/denuncia.api';
import {
  CLASSE_BADGE_STATUS_CONTESTACAO,
  ROTULO_STATUS_CONTESTACAO,
} from '../../services/19-denuncia/constants/status-denuncia.constants';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';
import { contarCaracteres } from '../../services/constant/util/validacao.util';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { DenunciaContraMimResponse } from '../../services/19-denuncia/type/denuncia.type';

const LIMITE_TEXTO = 5000;

interface SecaoContestacaoScoreProps {
  authFetch: AuthFetch;
}

// Contestação do score (RF-033), na Minha Conta do pesquisador: as denúncias julgadas procedentes contra ele (contra o
// perfil ou contra uma campanha dele), que tiram pontos da reputação, sem quem denunciou. Cada uma pode ser
// contestada uma vez, uma esperando análise por vez; a moderação aceita (a denúncia deixa de contar) ou recusa, com
// justificativa. O resultado aparece aqui (o aviso por e-mail depende do módulo de e-mail).
export function SecaoContestacaoScore({ authFetch }: SecaoContestacaoScoreProps) {
  const erros = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(erros.reportarErro, erros.limparErro);
  const [contestando, setContestando] = useState<number | null>(null);
  const [texto, setTexto] = useState('');
  const [tentou, setTentou] = useState(false);
  const { dado: denuncias, recarregar } = useBuscar(() => denunciaApi.contraMim(authFetch), [authFetch], {
    erros,
    mostraTexto: true,
  });
  const temEsperando = (denuncias ?? []).some((denuncia) => denuncia.contestacaoStatus === 'pendente');
  const erroTexto =
    tentou && texto.trim() === ''
      ? 'Escreva por que a penalidade é injusta.'
      : contarCaracteres(texto) > LIMITE_TEXTO && 'A contestação pode ter no máximo 5.000 caracteres.';

  const abrir = (idDenuncia: number) => {
    setContestando(idDenuncia);
    setTexto('');
    setTentou(false);
  };
  const enviar = async (idDenuncia: number) => {
    setTentou(true);
    if (texto.trim() === '' || contarCaracteres(texto) > LIMITE_TEXTO) return;
    await executar(async () => {
      await denunciaApi.contestar(authFetch, idDenuncia, texto.trim());
      mostrar('Pedido de revisão enviado.', 'A moderação vai analisar; o resultado aparece aqui.');
      setContestando(null);
      recarregar();
    });
  };
  const alvo = (denuncia: DenunciaContraMimResponse) =>
    denuncia.idCampanhaAlvo === null ? 'Seu perfil' : `Campanha: ${denuncia.tituloCampanha ?? `#${denuncia.idCampanhaAlvo}`}`;

  return (
    <div>
      <h2 className="titulo-bloco titulo-bloco--linha">Denúncias procedentes contra você</h2>
      <p className="paragrafo texto-fraco mb-4">
        Estas denúncias foram julgadas procedentes pela moderação e tiram pontos da sua reputação. Se uma delas for
        injusta, peça a revisão: a moderação analisa e, se você tiver razão, ela deixa de contar e a sua pontuação se
        recalcula. Cada denúncia pode ser contestada uma vez, e uma por vez.
      </p>
      <MensagemErro texto={erros.erro} className="legenda-destaque texto-erro mb-3" />
      {denuncias === null ? (
        <p className="legenda texto-fraco">carregando...</p>
      ) : denuncias.length === 0 ? (
        <EstadoVazio icone="fa-circle-check" titulo="Nenhuma denúncia procedente contra você." compacto />
      ) : (
        <>
          {temEsperando && (
            <p className="legenda-destaque fundo-aviso texto-aviso rounded-lg p-3 mb-3">
              Você já tem uma contestação esperando análise. Quando a moderação decidir, você pode contestar outra.
            </p>
          )}
          <ul className="space-y-3">
            {denuncias.map((denuncia) => (
              <li key={denuncia.idDenuncia} className="border borda-padrao rounded-lg p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="enfase">{denuncia.motivo}</span>
                  {denuncia.contestacaoStatus && (
                    <span className={'badge ' + CLASSE_BADGE_STATUS_CONTESTACAO[denuncia.contestacaoStatus]}>
                      Contestação: {ROTULO_STATUS_CONTESTACAO[denuncia.contestacaoStatus]}
                    </span>
                  )}
                </div>
                <p className="legenda texto-fraco">
                  {alvo(denuncia)} · {formatarDataHora(denuncia.criadoEm)}
                </p>
                {denuncia.justificativaModeracao && (
                  <p className="paragrafo">
                    <span className="enfase">Decisão da moderação: </span>
                    {denuncia.justificativaModeracao}
                  </p>
                )}
                {denuncia.contestacao && (
                  <p className="paragrafo">
                    <span className="enfase">Sua contestação ({formatarDataHora(denuncia.contestadaEm)}): </span>
                    {denuncia.contestacao}
                  </p>
                )}
                {denuncia.justificativaContestacao && (
                  <p className="paragrafo">
                    <span className="enfase">Resposta da moderação: </span>
                    {denuncia.justificativaContestacao}
                  </p>
                )}
                {denuncia.contestacaoStatus === null &&
                  (contestando === denuncia.idDenuncia ? (
                    <div className="space-y-2">
                      <Campo rotulo="Por que esta penalidade é injusta" erro={erroTexto}>
                        {({ atributos, classeErro }) => (
                          <>
                            <textarea
                              {...atributos}
                              rows={4}
                              value={texto}
                              onChange={(evento) => setTexto(evento.target.value)}
                              className={'input-padrao' + classeErro}
                            />
                            <ContadorCaracteres texto={texto} limite={LIMITE_TEXTO} />
                          </>
                        )}
                      </Campo>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => setContestando(null)}>
                          Cancelar
                        </button>
                        <button type="button" className="btn btn-primary" disabled={ocupado} onClick={() => void enviar(denuncia.idDenuncia)}>
                          {ocupado ? 'Enviando...' : 'Enviar pedido de revisão'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        className="btn btn-pequeno btn-secondary"
                        disabled={temEsperando}
                        onClick={() => abrir(denuncia.idDenuncia)}
                      >
                        Pedir revisão
                      </button>
                    </div>
                  ))}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
