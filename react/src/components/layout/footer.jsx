// Rodapé único do site — mesmo em toda tela, igual ao header. Versão
// simplificada do componentes/footer.html real (ver 3-footer.css pro
// porquê: sem colunas de link pra telas que não existem ainda).
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__conteudo">
        <div className="site-footer__marca">
          <div className="site-footer__logo">CA</div>
          <span className="site-footer__nome">CrowdAcadêmico</span>
        </div>
        <div className="site-footer__creditos">
          &copy; 2026 CrowdAcadêmico — Protótipo de TCC, IFSP Birigui.
        </div>
      </div>
    </footer>
  );
}
