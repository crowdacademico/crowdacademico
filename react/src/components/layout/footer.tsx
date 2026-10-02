import { Link } from 'react-router';

// Cópia fiel de componentes/footer.html do Projeto de Interface real (mesmas
// classes Tailwind, mesmo conteúdo, inclusive os links das colunas - eles
// apontam pra "#" no original também, são parte do protótipo visual, não
// promessa de rota real). Único em toda tela (App.tsx). Marca agora navega
// pra "/" (home), igual o logo do cabeçalho já fazia.
// As duas colunas de links: só os dados; o visual mora uma vez em ColunaDeLinks.
const COLUNAS_DE_LINKS = [
  { titulo: 'Explore Projetos', links: ['Ciências Biológicas', 'Exatas e Engenharias', 'Ciências Humanas'] },
  { titulo: 'Para Pesquisadores', links: ['Diretrizes de Submissão', 'Validação via Lattes', 'Taxas e Repasses'] },
];

function ColunaDeLinks({ titulo, links }: { titulo: string; links: string[] }) {
  return (
    <div>
      <h2 className="rotulo-campo texto-rodape-forte mb-6">{titulo}</h2>
      <ul className="space-y-4 paragrafo texto-herdado">
        {links.map((rotulo) => (
          <li key={rotulo}>
            <a href="#" className="hover-texto-marca transition-colors flex items-center gap-2">
              <i className="fa-solid fa-angle-right icone-pequeno texto-rodape-apagado"></i> {rotulo}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="rodape py-16 border-t borda-rodape mt-auto">
      {/* Mesma caixa do cabeçalho (.largura-site): a marca começa onde a de cima começa e a última coluna termina
          onde o cabeçalho termina. Na tela larga, as 4 colunas ficam com o MESMO espaço entre elas
          (justify-between); a marca e "Segurança" têm largura limitada, as duas de links ocupam só o que precisam.
          Na média, 2 por linha; no celular, uma embaixo da outra. */}
      <div className="largura-site grid grid-cols-1 sm:grid-cols-2 gap-12 lg:flex lg:justify-between">
        <div className="lg:max-w-(--largura-coluna-rodape)">
          <Link to="/" className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 fundo-marca rounded-lg flex items-center justify-center texto-sobre-cor">
              <i className="fa-solid fa-flask"></i>
            </div>
            <span className="titulo-secao texto-rodape-forte">CrowdAcadêmico</span>
          </Link>
          <p className="paragrafo texto-herdado">
            Plataforma brasileira dedicada exclusivamente ao avanço da pesquisa científica e
            tecnológica. Transparente, validado e focado no Brasil.
          </p>
        </div>

        {COLUNAS_DE_LINKS.map((coluna) => (
          <ColunaDeLinks key={coluna.titulo} {...coluna} />
        ))}

        <div className="lg:max-w-(--largura-coluna-rodape)">
          <h2 className="rotulo-campo texto-rodape-forte mb-6">
            Segurança e Pagamentos
          </h2>
          <div className="flex gap-5 icone-destaque texto-rodape-apagado mb-6">
            <i
              className="fa-brands fa-pix hover-texto-marca transition-colors cursor-pointer"
              title="PIX Instantâneo"
            ></i>
            <i
              className="fa-brands fa-cc-visa hover-texto-marca transition-colors cursor-pointer"
              title="Cartões de Crédito"
            ></i>
            <i
              className="fa-solid fa-shield-check hover-texto-marca transition-colors cursor-pointer"
              title="Conformidade LGPD"
            ></i>
          </div>
          <p className="legenda texto-herdado">
            Transações processadas em ambiente seguro e criptografado de ponta a ponta.
          </p>
        </div>
      </div>

      <div className="largura-site mt-16 pt-8 border-t borda-rodape legenda texto-herdado text-center uppercase">
        &copy; 2026 CrowdAcadêmico. Protótipo UI TCC - TSI - IFSP.
      </div>
    </footer>
  );
}
