import { useState } from 'react';
import type { ReactNode } from 'react';
import { ModalFicha } from './modal-ficha';
import { TelaCheia } from './tela-cheia';

// O padrão de todo termo para ler (o do Criar conta): modal largo, título, a versão embaixo, "Tela cheia" no
// cabeçalho e o texto rolando por dentro. As peças saem separadas para o upgrade de pesquisador, que mostra o termo
// numa etapa do próprio modal.

export function BotaoTelaCheia({ aoClicar }: { aoClicar: () => void }) {
  return (
    <button type="button" onClick={aoClicar} className="btn-pilula btn-pilula-rotulo">
      <i className="fa-solid fa-expand" aria-hidden="true"></i> Tela cheia
    </button>
  );
}

interface TextoTermoProps {
  // Título da barra da tela cheia (ex.: "Termo de Uso - versão v5").
  titulo: string;
  conteudo: string;
  telaCheia: boolean;
  aoSairTelaCheia: () => void;
}

export function TextoTermo({ titulo, conteudo, telaCheia, aoSairTelaCheia }: TextoTermoProps) {
  return (
    <TelaCheia ativa={telaCheia} titulo={titulo} aoSair={aoSairTelaCheia}>
      <div className="flex-1 overflow-y-auto paragrafo texto-padrao whitespace-pre-line" tabIndex={0} aria-label={titulo}>
        {conteudo}
      </div>
    </TelaCheia>
  );
}

interface ModalTermoProps {
  titulo: string;
  versao?: string;
  // `null` enquanto não chegou (ou se não pôde ser carregado: aparece o aviso).
  conteudo: string | null;
  carregando?: boolean;
  badges?: ReactNode[];
  erro?: string;
  rodape?: ReactNode;
  fecharAoClicarFora?: boolean;
  aoFechar: () => void;
}

export function ModalTermo({ titulo, versao, conteudo, carregando, badges, erro, rodape, fecharAoClicarFora, aoFechar }: ModalTermoProps) {
  const [telaCheia, setTelaCheia] = useState(false);
  const tituloTelaCheia = versao ? `${titulo} - versão ${versao}` : titulo;

  return (
    <ModalFicha
      titulo={titulo}
      subtitulo={versao ? `Versão ${versao}` : undefined}
      badges={badges}
      carregando={carregando}
      variasTelas
      erro={erro}
      fecharAoClicarFora={fecharAoClicarFora}
      aoFechar={aoFechar}
      acoesCabecalho={conteudo !== null && <BotaoTelaCheia aoClicar={() => setTelaCheia(true)} />}
      rodape={rodape}
    >
      {conteudo === null ? (
        <p className="paragrafo texto-erro">Não foi possível carregar o termo.</p>
      ) : (
        <TextoTermo titulo={tituloTelaCheia} conteudo={conteudo} telaCheia={telaCheia} aoSairTelaCheia={() => setTelaCheia(false)} />
      )}
    </ModalFicha>
  );
}
