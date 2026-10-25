import logoMarca from '../../assets/marca/logo-completo.png';

// O desenho da marca, igual em todo lugar: a altura vem de quem usa (40 px no cabeçalho e no rodapé, por padrão) e a
// largura é a que o desenho pede (ele é mais largo que alto; num quadrado ficaria miúdo). Decorativo: o nome vem de
// quem o envolve (o link para o início, o título da página).
export function LogoMarca({ className = 'h-10' }: { className?: string }) {
  return <img src={logoMarca} alt="" className={className + ' w-auto'} />;
}
