import { Link } from 'react-router';

// Cópia fiel de componentes/footer.html do Projeto de Interface real (mesmas
// classes Tailwind, mesmo conteúdo, inclusive os links das colunas — eles
// apontam pra "#" no original também, são parte do protótipo visual, não
// promessa de rota real). Único em toda tela (App.jsx). Marca agora navega
// pra "/" (home), igual o logo do cabeçalho já fazia.
export function Footer() {
  return (
    <footer className="bg-dark text-slate-400 py-16 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-1">
          <Link to="/" className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              <i className="fa-solid fa-flask"></i>
            </div>
            <span className="font-bold text-2xl tracking-tight text-white">CrowdAcadêmico</span>
          </Link>
          <p className="text-sm leading-relaxed font-medium">
            Plataforma brasileira dedicada exclusivamente ao avanço da pesquisa científica e
            tecnológica. Transparente, validado e focado no Brasil.
          </p>
        </div>

        <div>
          <h4 className="text-white font-black mb-6 text-[11px] tracking-widest uppercase">
            Explore Projetos
          </h4>
          <ul className="space-y-4 text-sm font-medium">
            <li>
              <a href="#" className="hover:text-primary transition-colors flex items-center gap-2">
                <i className="fa-solid fa-angle-right text-[10px] text-slate-600"></i> Ciências
                Biológicas
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-primary transition-colors flex items-center gap-2">
                <i className="fa-solid fa-angle-right text-[10px] text-slate-600"></i> Exatas e
                Engenharias
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-primary transition-colors flex items-center gap-2">
                <i className="fa-solid fa-angle-right text-[10px] text-slate-600"></i> Ciências
                Humanas
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-black mb-6 text-[11px] tracking-widest uppercase">
            Para Pesquisadores
          </h4>
          <ul className="space-y-4 text-sm font-medium">
            <li>
              <a href="#" className="hover:text-primary transition-colors flex items-center gap-2">
                <i className="fa-solid fa-angle-right text-[10px] text-slate-600"></i> Diretrizes de
                Submissão
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-primary transition-colors flex items-center gap-2">
                <i className="fa-solid fa-angle-right text-[10px] text-slate-600"></i> Validação via
                Lattes
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-primary transition-colors flex items-center gap-2">
                <i className="fa-solid fa-angle-right text-[10px] text-slate-600"></i> Taxas e
                Repasses
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-black mb-6 text-[11px] tracking-widest uppercase">
            Segurança e Pagamentos
          </h4>
          <div className="flex gap-5 text-3xl text-slate-600 mb-6">
            <i
              className="fa-brands fa-pix hover:text-emerald-500 transition-colors cursor-pointer"
              title="PIX Instantâneo"
            ></i>
            <i
              className="fa-brands fa-cc-visa hover:text-blue-500 transition-colors cursor-pointer"
              title="Cartões de Crédito"
            ></i>
            <i
              className="fa-solid fa-shield-check hover:text-white transition-colors cursor-pointer"
              title="Conformidade LGPD"
            ></i>
          </div>
          <p className="text-xs font-medium leading-relaxed">
            Transações processadas em ambiente seguro e criptografado de ponta a ponta.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-slate-800 text-xs text-center font-medium uppercase tracking-wider text-slate-500">
        &copy; 2026 CrowdAcadêmico. Protótipo UI TCC - TSI - IFSP.
      </div>
    </footer>
  );
}
