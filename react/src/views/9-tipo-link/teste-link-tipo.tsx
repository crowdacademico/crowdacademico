import { useState } from 'react';
import { Campo } from '../../components/input/campo';
import { paraDominios, regexValida } from '../../services/9-tipo-link/constants/tipo-link.constants';

interface TesteLinkTipoProps {
  dominioTexto: string;
  regex: string;
}

// "Testar com um link": sem isto, o admin só descobria que o domínio ou a regex estavam errados quando um pesquisador
// fosse recusado. Mesma conferência do banco (trg_valida_escopo_tipolink): o endereço precisa ser de um dos domínios
// (ou de um subdomínio dele) e, com regex, a URL inteira precisa seguir o formato. Não grava nada.
export function TesteLinkTipo({ dominioTexto, regex }: TesteLinkTipoProps) {
  const [url, setUrl] = useState('');
  const resultado = conferir(url.trim(), paraDominios(dominioTexto), regex);
  return (
    <Campo
      rotulo="Testar com um link (opcional)"
      dica={
        resultado && (
          <span className={resultado.ok ? 'texto-sucesso' : 'texto-erro'}>
            <i className={'fa-solid ' + (resultado.ok ? 'fa-circle-check' : 'fa-circle-xmark')}></i> {resultado.texto}
          </span>
        )
      }
    >
      {({ atributos }) => (
        <input
          {...atributos}
          type="text"
          value={url}
          onChange={(evento) => setUrl(evento.target.value)}
          placeholder="Cole um link de exemplo para ver se ele seria aceito"
          className="input-padrao"
        />
      )}
    </Campo>
  );
}

function conferir(url: string, dominios: string[], regex: string): { ok: boolean; texto: string } | null {
  if (url === '') {
    return null;
  }
  if (dominios.length > 0) {
    const host = /^[A-Za-z][A-Za-z0-9+.-]*:\/\/([^/:?#@]+)/.exec(url)?.[1]?.toLowerCase();
    const doDominio = host !== undefined && dominios.some((d) => host === d.toLowerCase() || host.endsWith('.' + d.toLowerCase()));
    if (!doDominio) {
      return { ok: false, texto: `Seria recusado: o endereço precisa ser de ${dominios.join(' ou ')}.` };
    }
  }
  if (regex.trim() !== '') {
    if (!regexValida(regex)) {
      return null;
    }
    if (!new RegExp(regex).test(url)) {
      return { ok: false, texto: 'Seria recusado: o link não segue o formato da regex.' };
    }
  }
  return { ok: true, texto: 'Este link seria aceito.' };
}
