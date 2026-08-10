import { useEffect, useRef, useState } from 'react';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';

const CHAVE_LOCALSTORAGE = 'crowdacademico.escalaFonte';
const ESCALA_PADRAO = 1;
const ESCALA_MINIMA = 0.875;
const ESCALA_MAXIMA = 1.25;
const PASSO = 0.125;

function escalaValida(valor) {
  return typeof valor === 'number' && valor >= ESCALA_MINIMA && valor <= ESCALA_MAXIMA;
}

function lerEscalaSalva() {
  const salva = Number(localStorage.getItem(CHAVE_LOCALSTORAGE));
  return escalaValida(salva) ? salva : ESCALA_PADRAO;
}

// Botão A-/A+ no cabeçalho (09-08-2026, pedido do Lucas: acessibilidade,
// "botão de aumentar e diminuir fonte"). Muda --escala-fonte (1-base.css,
// aplicada no html inteiro) e guarda a escolha em localStorage — persiste
// entre sessões, mesmo padrão de CHAVE_REFRESH_TOKEN em use-auth.js.
// Estado inicial já lê o valor salvo (useState(lerEscalaSalva), não um
// useEffect que chama setState depois) — evita o flash de "voltou pro
// tamanho padrão" que aconteceria se a leitura ficasse pra depois do
// primeiro render.
//
// Preferência POR CONTA (10-08-2026) — mesmo raciocínio de ControleTema
// (ver comentário completo lá): `auth` opcional, localStorage continua
// sendo o padrão de DISPOSITIVO (deslogado, ou antes da conta carregar), a
// conta é a fonte de verdade assim que está logada.
export function ControleFonte({ auth }) {
  const [escala, setEscala] = useState(lerEscalaSalva);
  const estavaAutenticado = useRef(auth?.autenticado ?? false);

  // Aplica a preferência salva NA CONTA assim que ela chega (login, ou
  // reload com sessão já válida) — só quando a conta TEM uma preferência
  // salva (escalaFontePreferida NULL = nunca mexeu, mantém o que já estava).
  useEffect(() => {
    const salva = auth?.usuario?.escalaFontePreferida;
    if (escalaValida(salva)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEscala(salva);
    }
  }, [auth?.usuario?.idUsuario, auth?.usuario?.escalaFontePreferida]);

  // Reseta pro padrão ao deslogar (pedido do Lucas: "seria bom voltar ao
  // padrão ao deslogar") — só na TRANSIÇÃO logado→deslogado.
  useEffect(() => {
    const autenticadoAgora = auth?.autenticado ?? false;
    if (estavaAutenticado.current && !autenticadoAgora) {
      setEscala(ESCALA_PADRAO);
    }
    estavaAutenticado.current = autenticadoAgora;
  }, [auth?.autenticado]);

  useEffect(() => {
    document.documentElement.style.setProperty('--escala-fonte', escala);
    localStorage.setItem(CHAVE_LOCALSTORAGE, String(escala));
  }, [escala]);

  const mudar = (delta) => {
    const novaEscala = Number(
      Math.min(ESCALA_MAXIMA, Math.max(ESCALA_MINIMA, escala + delta)).toFixed(3),
    );
    setEscala(novaEscala);

    // Salva na conta em segundo plano — mesmo raciocínio de ControleTema
    // (sem travar o clique, sem toast de erro; merge LOCAL do valor
    // enviado, não da resposta do PATCH — ver comentário completo lá).
    if (auth?.autenticado) {
      usuarioApi
        .atualizar(auth.authFetch, auth.usuario.idUsuario, {
          escalaFontePreferida: novaEscala,
        })
        .then(() =>
          auth.atualizarUsuarioLocal({ ...auth.usuario, escalaFontePreferida: novaEscala }),
        )
        .catch(() => {});
    }
  };

  return (
    <div
      className="flex items-center border borda-forte rounded-lg overflow-hidden"
      role="group"
      aria-label="Tamanho da fonte"
    >
      <button
        type="button"
        onClick={() => mudar(-PASSO)}
        disabled={escala <= ESCALA_MINIMA}
        aria-label="Diminuir fonte"
        title="Diminuir fonte"
        className="px-2.5 py-1.5 text-xs font-bold texto-padrao hover-fundo-sutil transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        A-
      </button>
      <button
        type="button"
        onClick={() => mudar(PASSO)}
        disabled={escala >= ESCALA_MAXIMA}
        aria-label="Aumentar fonte"
        title="Aumentar fonte"
        className="px-2.5 py-1.5 text-xs font-bold texto-padrao hover-fundo-sutil transition-colors border-l borda-forte disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        A+
      </button>
    </div>
  );
}
