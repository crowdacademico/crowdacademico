import { Link } from 'react-router';
import { LogoMarca } from './logo-marca';

// Rodapé ÚNICO do sistema (14-11-2026): o mesmo na área restrita (layout.tsx) e na pública (layout-publico.tsx).
// Antes eram dois: o da restrita era a cópia do protótipo, com links para "#"; o da pública tinha os links de verdade.
// Ficou o conteúdo da pública com o visual da restrita (.rodape, "restrita manda") e a marca oficial (LogoMarca).
const COLUNAS = [
  {
    titulo: 'Explore projetos',
    links: [
      { rotulo: 'Explorar campanhas', to: '/explorar' },
      { rotulo: 'Como funciona', to: '/como-funciona' },
      { rotulo: 'Perguntas frequentes', to: '/perguntas-frequentes' },
      { rotulo: 'Transparência e taxas', to: '/transparencia' },
      { rotulo: 'Termos da plataforma', to: '/termos' },
    ],
  },
  {
    titulo: 'O CrowdAcadêmico',
    links: [
      { rotulo: 'Sobre o projeto', to: '/sobre' },
      { rotulo: 'Estúdio do pesquisador', to: '/estudio-pesquisador' },
      { rotulo: 'Termos da plataforma', to: '/termos' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="rodape py-16 border-t borda-rodape mt-auto">
      {/* Mesma caixa do cabeçalho (.largura-site). Tela larga: as 4 colunas com o mesmo espaço entre elas; média: 2 por
          linha; celular: uma embaixo da outra. */}
      <div className="largura-site grid grid-cols-1 sm:grid-cols-2 gap-12 lg:flex lg:justify-between">
        <div className="lg:max-w-(--largura-coluna-rodape)">
          <Link to="/" className="flex items-center gap-3 mb-5">
            <LogoMarca />
            <span className="titulo-secao texto-rodape-forte">CrowdAcadêmico</span>
          </Link>
          <p className="paragrafo texto-herdado">
            Plataforma brasileira dedicada exclusivamente ao avanço da pesquisa científica e tecnológica. Transparente,
            validada e focada no Brasil.
          </p>
        </div>

        {COLUNAS.map(({ titulo, links }) => (
          <div key={titulo}>
            <h2 className="rotulo-campo texto-rodape-forte mb-6">{titulo}</h2>
            <ul className="space-y-4 paragrafo texto-herdado">
              {links.map(({ rotulo, to }) => (
                <li key={to}>
                  <Link to={to} className="hover-texto-marca transition-colors flex items-center gap-2">
                    <i className="fa-solid fa-angle-right icone-pequeno texto-rodape-apagado" aria-hidden="true" />
                    {rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="lg:max-w-(--largura-coluna-rodape)">
          <h2 className="rotulo-campo texto-rodape-forte mb-6">Segurança e pagamentos</h2>
          <div className="flex gap-5 icone-destaque texto-rodape-apagado mb-6">
            <i className="fa-brands fa-pix" title="Pix" role="img" aria-label="Pix" />
            <i className="fa-brands fa-cc-visa" title="Cartões de crédito" role="img" aria-label="Cartões de crédito" />
            <i className="fa-solid fa-shield-halved" title="Conformidade LGPD" role="img" aria-label="Conformidade LGPD" />
          </div>
          <p className="legenda texto-herdado">Transações processadas em ambiente seguro e criptografado de ponta a ponta.</p>
        </div>
      </div>

      <div className="largura-site mt-16 pt-8 border-t borda-rodape legenda texto-herdado text-center uppercase">
        &copy; 2026 CrowdAcadêmico. TCC - TSI - IFSP.
      </div>
    </footer>
  );
}