import { Link } from 'react-router';

const COLUNAS = [
  {
    titulo: 'Explore projetos',
    links: [
      { rotulo: 'Explorar campanhas', to: '/explorar' },
      { rotulo: 'Sobre e curadoria', to: '/sobre' },
      { rotulo: 'Termos da plataforma', to: '/termos' },
    ],
  },
  {
    titulo: 'Para pesquisadores',
    links: [
      { rotulo: 'Como funciona', to: '/como-funciona' },
      { rotulo: 'Estúdio do pesquisador', to: '/estudio-pesquisador' },
    ],
  },
];

export function FooterPublico() {
  return (
    <footer className="footer-publico py-16 border-t mt-auto">
      <div className="largura-site grid grid-cols-1 md:grid-cols-4 gap-12">
        <div>
          <Link to="/" className="flex items-center gap-3 mb-5">
            <span className="header-publico__marca" aria-hidden="true">
              <i className="fa-solid fa-flask" />
            </span>
            <span className="font-bold text-2xl tracking-tight texto-rodape-forte">CrowdAcadêmico</span>
          </Link>
          <p className="paragrafo texto-herdado">
            Plataforma brasileira dedicada exclusivamente ao avanço da pesquisa científica
            e tecnológica. Transparente, validada e focada no Brasil.
          </p>
        </div>

        {COLUNAS.map(({ titulo, links }) => (
          <div key={titulo}>
            <h2 className="microrrotulo texto-rodape-forte mb-6">{titulo}</h2>
            <ul className="space-y-4 paragrafo">
              {links.map(({ rotulo, to }) => (
                <li key={to}>
                  <Link to={to} className="footer-publico__link hover-texto-marca transition-colors flex items-center gap-2">
                    <i className="fa-solid fa-angle-right icone-pequeno texto-rodape-apagado" aria-hidden="true" />
                    {rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h2 className="microrrotulo texto-rodape-forte mb-6">Segurança e pagamentos</h2>
          <div className="flex gap-5 icone-destaque texto-rodape-apagado mb-6" aria-label="Meios e segurança">
            <i className="fa-brands fa-pix" title="Pix" role="img" aria-label="Pix" />
            <i className="fa-brands fa-cc-visa" title="Cartões" role="img" aria-label="Cartões" />
            <i className="fa-solid fa-shield-halved" title="Segurança" role="img" aria-label="Segurança" />
          </div>
          <p className="legenda texto-herdado">
            Transações processadas em ambiente seguro e criptografado de ponta a ponta.
          </p>
        </div>
      </div>

      <div className="largura-site mt-16 pt-8 border-t borda-rodape legenda texto-herdado text-center uppercase">
        <span>&copy; 2026 CrowdAcadêmico. Protótipo UI TCC - TSI - IFSP.</span>
        <Link to="/termos" className="ml-4 hover-texto-marca transition-colors">
          Termos de uso
        </Link>
      </div>
    </footer>
  );
}
