import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import type { DadosVitrine } from './use-dados-vitrine';
import { percentualArrecadado } from './util-campanhas';

type ChavePerfil = 'visitante' | 'apoiador' | 'pesquisador';

interface MockupPerfilProps {
  chave: ChavePerfil;
  dados: DadosVitrine | null;
  taxaPlataforma: number;
}

// O "print" de cada perfil no Como funciona, com dados de verdade da plataforma (use-dados-vitrine). Sem dado
// (carregando, falhou ou a plataforma ainda vazia), mostra o desenho abstrato de antes: nunca dado inventado.
export function MockupPerfil({ chave, dados, taxaPlataforma }: MockupPerfilProps) {
  const titulo = { visitante: 'Explorar projetos', apoiador: 'Recompensas para quem apoia', pesquisador: 'A plataforma em números' }[chave];

  if (chave === 'visitante' && dados && dados.campanhas.length > 0) {
    return (
      <Moldura titulo={titulo}>
        {dados.campanhas.map((campanha) => (
          <div key={campanha.idCampanha} className="perfil-vitrine__mockup-linha py-1">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold texto-forte truncate">{campanha.titulo}</p>
              <p className="legenda truncate">{campanha.instituicaoPesquisador ?? campanha.nomeArea ?? 'Pesquisa'}</p>
            </div>
            <span className="numero text-sm font-bold texto-marca shrink-0">{percentualArrecadado(campanha) ?? 0}%</span>
          </div>
        ))}
      </Moldura>
    );
  }

  if (chave === 'apoiador' && dados && dados.recompensas.length > 0) {
    return (
      <Moldura titulo={titulo}>
        {dados.recompensas.map((recompensa) => (
          <div key={recompensa.idRecompensa} className="perfil-vitrine__mockup-linha py-1">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold texto-forte truncate">{recompensa.titulo}</p>
              <p className="legenda truncate">{recompensa.tituloCampanha}</p>
            </div>
            <span className="legenda font-bold texto-forte shrink-0">a partir de {formatarMoeda(recompensa.valorMinimo)}</span>
          </div>
        ))}
      </Moldura>
    );
  }

  if (chave === 'pesquisador' && dados) {
    const metricas = [
      { rotulo: 'Campanhas ativas', valor: String(dados.campanhasAtivas) },
      { rotulo: 'Arrecadado', valor: formatarMoeda(dados.totalArrecadado) },
      { rotulo: 'Pesquisadores', valor: dados.pesquisadoresAtivos === null ? '—' : String(dados.pesquisadoresAtivos) },
      { rotulo: 'Taxa da plataforma', valor: `${taxaPlataforma}%` },
    ];
    return (
      <Moldura titulo={titulo}>
        <div className="grid grid-cols-2 gap-3 pt-3">
          {metricas.map((metrica) => (
            <div key={metrica.rotulo} className="rounded-lg fundo-sutil border borda-padrao p-3 text-center min-w-0">
              <p className="numero text-lg font-bold texto-forte truncate">{metrica.valor}</p>
              <p className="legenda texto-fraco">{metrica.rotulo}</p>
            </div>
          ))}
        </div>
      </Moldura>
    );
  }

  return <MockupAbstrato chave={chave} />;
}

function Moldura({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="perfil-vitrine__mockup">
      <p className="legenda font-bold texto-fraco uppercase tracking-wide mb-2">{titulo}</p>
      <div className="perfil-vitrine__mockup-linhas">{children}</div>
    </div>
  );
}

function MockupAbstrato({ chave }: { chave: ChavePerfil }) {
  return (
    <div className={`perfil-vitrine__mockup perfil-vitrine__mockup--${chave}`} aria-hidden="true">
      <span className="perfil-vitrine__mockup-cabecalho" />
      <div className="perfil-vitrine__mockup-linhas">
        {[0, 1, 2].map((linha) => (
          <span key={linha} className="perfil-vitrine__mockup-linha">
            <i />
            <span>
              <b />
              <b />
            </span>
            <em />
          </span>
        ))}
      </div>
      <div className="perfil-vitrine__mockup-indicadores">
        {Array.from({ length: chave === 'pesquisador' ? 4 : 3 }, (_, indicador) => (
          <span key={indicador} />
        ))}
      </div>
    </div>
  );
}
