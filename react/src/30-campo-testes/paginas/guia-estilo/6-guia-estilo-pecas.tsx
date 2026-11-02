import { useState, type ReactNode } from 'react';
import { BarraProgresso, TextoComBarraProgresso } from '../../../components/crud/barra-progresso';
import { EstadoVazio } from '../../../components/crud/estado-vazio';
import { CampoFicha, FichaLadoALado, SecaoFicha } from '../../../components/crud/ficha-consulta';
import { IndicadorEtapas } from '../../../components/crud/indicador-etapas';
import { Campo } from '../../../components/input/campo';
import { Interruptor } from '../../../components/input/interruptor';
import { MedidorSenha } from '../../../components/input/medidor-senha';
import { BarraAbasBotoes } from '../../../components/layout/barra-abas-botoes';

// Peças do painel que antes só apareciam nas telas (regra do Lucas, 01-11-2026: o que a área restrita usa aparece no
// Guia). Cada uma é o componente de verdade, com dados de exemplo; a linha do tempo e a régua de faixas, que não têm
// componente próprio, repetem a marcação das telas onde moram (Revisar Campanha e Pontuação).

const ABAS = [
  { chave: 'geral', rotulo: 'Geral', icone: 'fa-circle-info' },
  { chave: 'dados', rotulo: 'Dados' },
  { chave: 'auditoria', rotulo: 'Auditoria' },
] as const;

const ETAPAS = [
  { chave: 'dados', rotulo: 'Dados' },
  { chave: 'orcamento', rotulo: 'Orçamento' },
  { chave: 'cronograma', rotulo: 'Cronograma' },
  { chave: 'revisao', rotulo: 'Revisão' },
] as const;

const MARCOS = [
  { data: '14/11/2026', titulo: 'Contato com as lideranças' },
  { data: '27/11/2026', titulo: 'Aplicação dos questionários' },
  { data: '12/12/2026', titulo: 'Devolutiva às comunidades' },
];

// As 4 faixas padrão da pontuação, de 0 a 100 (a tela Pontuação calcula a posição do mesmo jeito).
const FAIXAS = [
  { rotulo: 'Em Construção', minimo: 0, maximo: 24 },
  { rotulo: 'Em Desenvolvimento', minimo: 25, maximo: 49 },
  { rotulo: 'Consolidado', minimo: 50, maximo: 74 },
  { rotulo: 'Referência', minimo: 75, maximo: 100 },
];

function Exemplo({ nome, children }: { nome: string; children: ReactNode }) {
  return (
    <div>
      <p className="rotulo-leitura mb-2">{nome}</p>
      {children}
    </div>
  );
}

export function PecasDoPainel() {
  const [aba, setAba] = useState<(typeof ABAS)[number]['chave']>('geral');
  const [etapa, setEtapa] = useState<(typeof ETAPAS)[number]['chave']>('orcamento');
  const [ligado, setLigado] = useState(true);
  const [senha, setSenha] = useState('Senha1');

  return (
    <div className="space-y-6">
      <Exemplo nome="Barra de abas (BarraAbasBotoes)">
        <BarraAbasBotoes abas={[...ABAS]} ativa={aba} aoTrocar={setAba} />
      </Exemplo>

      <Exemplo nome="Indicador de etapas (IndicadorEtapas)">
        <IndicadorEtapas etapas={ETAPAS} atual={etapa} aoEscolher={setEtapa} />
      </Exemplo>

      <Exemplo nome="Interruptor (Interruptor)">
        <div className="flex flex-wrap items-center gap-4">
          <Interruptor ligado={ligado} aoAlternar={() => setLigado((atual) => !atual)} rotulo="Exemplo de interruptor" />
          <Interruptor ligado={false} aoAlternar={() => undefined} rotulo="Interruptor indisponível" indisponivel="Exemplo de motivo" />
        </div>
      </Exemplo>

      <Exemplo nome="Barra de progresso (BarraProgresso e TextoComBarraProgresso)">
        <div className="flex flex-wrap items-center gap-8">
          <div className="w-48">
            <BarraProgresso valor={4300} total={6000} rotulo="Arrecadado em relação à meta" />
          </div>
          <TextoComBarraProgresso texto="R$ 4.300,00" valor={4300} total={6000} rotulo="Arrecadado em relação à meta" />
        </div>
      </Exemplo>

      <Exemplo nome="Barra de carregamento (BarraCarregamento: no topo da tela, enquanto houver requisição)">
        <div className="relative h-4 rounded border borda-padrao transform-gpu">
          <div className="barra-carregamento" role="progressbar" aria-label="Exemplo de carregando" />
        </div>
      </Exemplo>

      <Exemplo nome="Estado vazio (EstadoVazio), normal e compacto">
        <div className="grid gap-4 sm:grid-cols-2">
          <EstadoVazio icone="fa-inbox" titulo="Nenhuma contribuição ainda." texto="Quando alguém apoiar, aparece aqui." />
          <EstadoVazio compacto icone="fa-calendar-days" titulo="Nenhum marco no cronograma ainda." />
        </div>
      </Exemplo>

      <Exemplo nome="Erro de campo (Campo com erro) e medidor de senha (MedidorSenha)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="E-mail" erro="Informe um e-mail válido.">
            {({ atributos, classeErro }) => <input {...atributos} type="email" defaultValue="exemplo@" className={'input-padrao' + classeErro} />}
          </Campo>
          <Campo rotulo="Senha">
            {({ atributos }) => (
              <>
                <input {...atributos} type="text" value={senha} onChange={(evento) => setSenha(evento.target.value)} className="input-padrao" />
                <MedidorSenha senha={senha} />
              </>
            )}
          </Campo>
        </div>
      </Exemplo>

      <Exemplo nome="Fichas (SecaoFicha, CampoFicha, centralizada, FichaLadoALado e grade-ficha)">
        <div className="space-y-6">
          <div className="grade-ficha">
            <div className="lg:col-span-2">
              <SecaoFicha titulo="Dados">
                <CampoFicha rotulo="Área do conhecimento" valor="Ciência da Informação" />
                <CampoFicha rotulo="Modelo" valor="Tudo ou nada" dica="Com dica: a ⓘ fica logo depois do rótulo, como nos formulários." />
                <CampoFicha rotulo="Descrição" valor="Questionário com usuárias do transporte público noturno." largura="cheia" />
              </SecaoFicha>
            </div>
            <SecaoFicha titulo="Auditoria" colunas={1}>
              <CampoFicha rotulo="Criada em" valor="17/09/2026, 13:17" />
            </SecaoFicha>
          </div>
          <SecaoFicha titulo="Financeiro (centralizada)" centralizada>
            <CampoFicha rotulo="Valor" valor="R$ 1.500,00" />
            <CampoFicha rotulo="Tarifa" valor="R$ 4,57" />
            <CampoFicha rotulo="Total" valor="R$ 1.504,57" />
          </SecaoFicha>
          <FichaLadoALado
            tituloEsquerda="Dados"
            tituloDireita="Auditoria"
            linhas={[
              { esquerda: [<CampoFicha key="t" rotulo="Título" valor="Percepção de Segurança no Transporte Público Noturno" />], direita: [<CampoFicha key="c" rotulo="Criada em" valor="17/09/2026" />] },
              { esquerda: [<CampoFicha key="m" rotulo="Modelo" valor="Flexível" />, <CampoFicha key="a" rotulo="Área" valor="Saúde" />], direita: [<CampoFicha key="p" rotulo="Aprovada em" valor="20/09/2026" />] },
            ]}
          />
        </div>
      </Exemplo>

      <Exemplo nome="Linha do tempo (linha-tempo, Revisar Campanha)">
        <ol className="linha-tempo">
          {MARCOS.map((marco) => (
            <li key={marco.titulo} className="linha-tempo__item">
              <p className="linha-tempo__data">{marco.data}</p>
              <p className="linha-tempo__titulo">{marco.titulo}</p>
            </li>
          ))}
        </ol>
      </Exemplo>

      <Exemplo nome="Régua de faixas (regua-faixas, Pontuação)">
        <div className="regua-faixas" role="img" aria-label="Exemplo: as 4 faixas da pontuação de 0 a 100">
          {FAIXAS.map((faixa, indice) => (
            <span
              key={faixa.rotulo}
              className={`regua-faixas__parte regua-faixas__parte--${indice + 1}`}
              style={{ left: `${(faixa.minimo / 101) * 100}%`, width: `${((faixa.maximo - faixa.minimo + 1) / 101) * 100}%` }}
            ></span>
          ))}
        </div>
        <ul className="distribuicao-score__legenda">
          {FAIXAS.map((faixa, indice) => (
            <li key={faixa.rotulo} className="distribuicao-score__item legenda">
              <span className={`distribuicao-score__cor regua-faixas__parte--${indice + 1}`}></span>
              {faixa.rotulo} <span className="enfase">de {faixa.minimo} a {faixa.maximo}</span>
            </li>
          ))}
        </ul>
      </Exemplo>

      <Exemplo nome="Cartão do painel (cartao-painel), cartão solto (sombra-cartao-solto, brilho-marca) e botão na altura do campo (altura-de-campo)">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="cartao-painel p-4 space-y-1">
            <p className="enfase">Recompensa ganha</p>
            <p className="legenda texto-fraco">Cartão de lista dentro do painel.</p>
          </div>
          <div className="fundo-cartao rounded-2xl p-4 sombra-cartao-solto">
            <p className="enfase">Cartão solto</p>
            <p className="legenda texto-fraco">O das páginas de entrada (Login, Cadastro).</p>
          </div>
        </div>
        <div className="flex items-end gap-2 mt-4">
          <input aria-label="Exemplo de campo" className="input-padrao" placeholder="Campo" />
          <button type="button" className="btn btn-secondary altura-de-campo">Ação</button>
        </div>
      </Exemplo>
    </div>
  );
}

// Atalhos de cor: classes que aplicam um token (o token em si está em "Cores do sistema"). Passe o mouse nos de
// "hover" para ver a mudança.
// Os fundos fortes levam o texto claro; os outros, o texto normal. A borda fina deixa o fundo-escuro (o do rodapé,
// escuro nos dois temas) visível no tema escuro.
const ATALHOS_FUNDO = [
  ['fundo-marca', 'texto-sobre-cor'],
  ['fundo-marca-forte', 'texto-sobre-cor'],
  ['fundo-erro-forte', 'texto-sobre-cor'],
  ['fundo-escuro', 'texto-sobre-cor'],
  ['fundo-realce', ''],
];
const ATALHOS_BORDA = ['borda-marca', 'borda-aviso', 'borda-cartao', 'borda-dev'];
const ATALHOS_HOVER = ['hover-fundo-sutil', 'hover-fundo-marca-suave', 'hover-fundo-sucesso', 'hover-fundo-dev-sutil', 'hover-texto-erro', 'hover-texto-forte'];
const ATALHOS_BRILHO = ['brilho-marca', 'brilho-marca-forte'];

// Classes de estrutura: só fazem sentido na página ou no modal inteiro, então aqui ficam descritas.
const ESTRUTURA = [
  ['pagina-centralizada', 'Página solta centralizada na tela (Login, Cadastro, Esqueci a senha, Criar nova senha).'],
  ['ficha-bloco-com-foto', 'Bloco da foto ao lado dos dados da conta (Alterar Usuário).'],
  ['rolagem-estavel', 'Reserva o lugar da barra de rolagem do modal, para o conteúdo não pular quando ela aparece.'],
  ['camadas', 'Versões de um trecho uma em cima da outra: o trecho tem a altura da maior, e trocar de versão não empurra nada (Alterar Usuário).'],
  ['requisito-transborda', 'Requisito do medidor de senha que não cabe na linha (ver o medidor acima).'],
  ['aviso-envoltorio, aviso-pulso', 'O aviso flutuante (toast): use os botões de exemplo em "Modal, toast, dica e tabela".'],
];

export function AtalhosEEstrutura() {
  return (
    <div className="space-y-4">
      <div>
        <p className="rotulo-leitura mb-2">Fundo e borda</p>
        <div className="flex flex-wrap gap-2">
          {ATALHOS_FUNDO.map(([classe, texto]) => (
            <span key={classe} className={`${classe} ${texto} border borda-padrao rounded-lg px-3 py-2 legenda enfase`}>{classe}</span>
          ))}
          {ATALHOS_BORDA.map((classe) => (
            <span key={classe} className={`${classe} border-2 rounded-lg px-3 py-2 legenda`}>{classe}</span>
          ))}
        </div>
      </div>
      <div>
        <p className="rotulo-leitura mb-2">Ao passar o mouse e brilho</p>
        <div className="flex flex-wrap gap-2">
          {ATALHOS_HOVER.map((classe) => (
            <span key={classe} className={`${classe} border borda-padrao rounded-lg px-3 py-2 legenda transition-colors`}>{classe}</span>
          ))}
          {ATALHOS_BRILHO.map((classe) => (
            <span key={classe} className={`${classe} fundo-cartao rounded-lg px-3 py-2 legenda`}>{classe}</span>
          ))}
        </div>
      </div>
      <div>
        <p className="rotulo-leitura mb-2">Estrutura de página e de modal</p>
        <ul className="space-y-1">
          {ESTRUTURA.map(([classe, oQueE]) => (
            <li key={classe} className="paragrafo">
              <code className="enfase">{classe}</code>: {oQueE}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
