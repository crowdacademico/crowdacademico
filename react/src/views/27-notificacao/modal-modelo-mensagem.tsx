import { useId, useState } from 'react';
import { BadgeBooleano } from '../../components/crud/badge-booleano';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { ModalDetalhe } from '../../components/crud/modal-detalhe';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { useFecharComAviso } from '../../components/crud/use-alteracao-nao-salva';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { Campo } from '../../components/input/campo';
import { CaixaMarcacao } from '../../components/input/caixa-marcacao';
import { ContadorCaracteres } from '../../components/input/contador-caracteres';
import { modeloMensagemApi } from '../../services/27-notificacao/api/modelo-mensagem.api';
import {
  ROTULO_CANAL_NOTIFICACAO as ROTULO_CANAL,
  rotuloTipoNotificacao,
} from '../../services/27-notificacao/constants/notificacao.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { ModeloMensagemResponse } from '../../services/27-notificacao/type/modelo-mensagem.type';

const LIMITE_TITULO = 200;
const LIMITE_CORPO = 5000;

// "Guia de formatação": longo demais para a bolha da dica (que o corpo do modal cortaria), então abre numa janela
// por cima, pelo botão de mesmo nome ao lado do rótulo Texto. Um bloco por marca,
// cada um com exemplo e o resultado.
function Exemplo({ escrito, resultado }: { escrito: string; resultado: string }) {
  return (
    <div className="mt-2 space-y-1">
      <p className="paragrafo-denso">{escrito}</p>
      <p className="legenda texto-fraco">Sai assim: {resultado}</p>
    </div>
  );
}

function ModalComoEscrever({ modelo, aoFechar }: { modelo: ModeloMensagemResponse; aoFechar: () => void }) {
  return (
    <ModalDetalhe
      titulo="Guia de formatação"
      aoFechar={aoFechar}
      secoes={[
        {
          titulo: 'Parágrafos',
          conteudo: <p className="paragrafo">Deixe uma linha em branco entre um parágrafo e outro.</p>,
        },
        {
          titulo: 'Valor de um campo',
          conteudo: (
            <>
              <p className="paragrafo">
                Escreva o nome do campo entre chaves duplas. Dinheiro sai em reais e data em dia/mês/ano.
              </p>
              <Exemplo escrito={'A campanha "{{titulo}}" foi aprovada.'} resultado={'A campanha "Abelhas Nativas" foi aprovada.'} />
            </>
          ),
        },
        {
          titulo: 'Trecho que só aparece com o campo preenchido',
          conteudo: (
            <>
              <p className="paragrafo">Abra com # e feche com /. Sem o campo, o trecho inteiro some.</p>
              <Exemplo escrito="{{#motivo}}Motivo: {{motivo}}{{/motivo}}" resultado="Motivo: Plágio confirmado." />
            </>
          ),
        },
        {
          titulo: 'Trecho que só aparece com o campo vazio',
          conteudo: (
            <>
              <p className="paragrafo">Abra com ^ e feche com /. Zero e "não" também contam como vazio.</p>
              <Exemplo
                escrito="{{^tem_chave_verificada}}Cadastre a sua chave Pix.{{/tem_chave_verificada}}"
                resultado="Cadastre a sua chave Pix. (só para quem ainda não tem)"
              />
            </>
          ),
        },
        {
          titulo: 'Campos deste aviso',
          conteudo: <p className="paragrafo-denso">{camposDisponiveis(modelo)}</p>,
        },
        {
          titulo: 'O que entra sozinho',
          conteudo: (
            <p className="paragrafo">
              {modelo.canal === 'email'
                ? 'No e-mail: a saudação ("Olá, Ana!"), o botão e o rodapé. Escreva só o miolo.'
                : 'No sino: o título aparece em destaque e o texto logo abaixo, com a data.'}
            </p>
          ),
        },
      ]}
    />
  );
}

const camposDisponiveis = (modelo: ModeloMensagemResponse) => modelo.campos.map((c) => `{{${c}}}`).join('  ');

interface ModalConsultarModeloMensagemProps {
  modelo: ModeloMensagemResponse;
  aoFechar: () => void;
}

export function ModalConsultarModeloMensagem({ modelo, aoFechar }: ModalConsultarModeloMensagemProps) {
  return (
    <ModalFicha
      titulo={rotuloTipoNotificacao(modelo.tipoEvento)}
      subtitulo={ROTULO_CANAL[modelo.canal]}
      badges={[
        <BadgeBooleano key="ativo" valor={modelo.ativo} rotuloTrue="Ligado" rotuloFalse="Desligado" />,
        ...(modelo.obrigatoria ? [<BadgeBooleano key="obrigatoria" valor rotuloTrue="Obrigatório" rotuloFalse="" />] : []),
      ]}
      aoFechar={aoFechar}
      rodape={<RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />}
    >
      <SecaoFicha titulo="Dados">
        <CampoFicha rotulo="id" valor={modelo.idModeloMensagem} />
        <CampoFicha rotulo="Código" valor={modelo.tipoEvento} />
        <CampoFicha rotulo="Alterado em" valor={formatarDataHora(modelo.atualizadoEm)} />
        <CampoFicha rotulo={modelo.canal === 'email' ? 'Assunto' : 'Título'} valor={modelo.titulo} largura="cheia" />
        <CampoFicha rotulo="Texto" largura="cheia">
          <p className="paragrafo whitespace-pre-line">{modelo.corpo}</p>
        </CampoFicha>
        <CampoFicha rotulo="Campos disponíveis" valor={camposDisponiveis(modelo)} largura="cheia" />
      </SecaoFicha>
    </ModalFicha>
  );
}

interface ModalAlterarModeloMensagemProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  modelo: ModeloMensagemResponse;
  aoFechar: () => void;
  aoAtualizado: () => void;
}

export function ModalAlterarModeloMensagem({ auth, modelo, aoFechar, aoAtualizado }: ModalAlterarModeloMensagemProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { ocupado: enviando, executar } = useEnvio(reportarErro, limparErro);
  const [titulo, setTitulo] = useState(modelo.titulo);
  const [corpo, setCorpo] = useState(modelo.corpo);
  const [ativo, setAtivo] = useState(modelo.ativo);
  const [ajudaAberta, setAjudaAberta] = useState(false);
  const idTexto = useId();
  const idCampos = useId();

  const sujo = titulo !== modelo.titulo || corpo !== modelo.corpo || ativo !== modelo.ativo;
  const vazio = titulo.trim() === '' || corpo.trim() === '';
  const fechar = useFecharComAviso(sujo, aoFechar);

  const aoSalvar = () =>
    executar(async () => {
      await modeloMensagemApi.atualizar(auth.authFetch, modelo.idModeloMensagem, { titulo, corpo, ativo });
      mostrar('Mensagem alterada com sucesso.', `${rotuloTipoNotificacao(modelo.tipoEvento)} (${ROTULO_CANAL[modelo.canal]})`);
      aoAtualizado();
      aoFechar();
    });

  return (
    <>
      <ModalFicha
        titulo={`Alterar "${rotuloTipoNotificacao(modelo.tipoEvento)}"`}
        subtitulo={ROTULO_CANAL[modelo.canal]}
        aoFechar={fechar}
        erro={erro}
        rodape={
          <RodapeAcoes
            aoCancelar={fechar}
            acao={{
              rotulo: 'Salvar',
              rotuloOcupado: 'Salvando...',
              ocupado: enviando,
              desabilitado: !sujo || vazio,
              aoClicar: () => void aoSalvar(),
            }}
          />
        }
      >
        <SecaoFicha titulo="Dados">
          <CampoSomenteLeitura rotulo="Código" valor={modelo.tipoEvento} />
          <CampoSomenteLeitura rotulo="Canal" valor={ROTULO_CANAL[modelo.canal]} />
        </SecaoFicha>

        <SecaoFicha titulo="Editar">
          <Campo rotulo={modelo.canal === 'email' ? 'Assunto' : 'Título'} className="sm:col-span-2">
            {({ atributos, classeErro }) => (
              <>
                <input
                  {...atributos}
                  type="text"
                  value={titulo}
                  onChange={(evento) => setTitulo(evento.target.value)}
                  className={'input-padrao' + classeErro}
                />
                <ContadorCaracteres texto={titulo} limite={LIMITE_TITULO} />
              </>
            )}
          </Campo>

          {/* Sem o <Campo>: o botão "Guia de formatação" fica na linha do rótulo, logo depois de "Texto", com a letra dele
            (.btn-pilula-rotulo, como o "Tela cheia" do Termo de Uso). Fora do <label>: o nome da caixa continua só
            "Texto". */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-3 mb-2">
              <label htmlFor={idTexto} className="rotulo-campo mb-0">
                Texto
              </label>
              <button type="button" onClick={() => setAjudaAberta(true)} className="btn-pilula btn-pilula-rotulo">
                <i className="fa-solid fa-circle-info" aria-hidden="true"></i> Guia de formatação
              </button>
            </div>
            <textarea
              id={idTexto}
              aria-describedby={idCampos}
              rows={8}
              value={corpo}
              onChange={(evento) => setCorpo(evento.target.value)}
              className="input-padrao"
            />
            <ContadorCaracteres texto={corpo} limite={LIMITE_CORPO} />
            <p id={idCampos} className="legenda texto-fraco mt-1">
              Campos disponíveis: {camposDisponiveis(modelo)}
            </p>
          </div>

          <div className="sm:col-span-2">
            <CaixaMarcacao rotulo="Ligado" marcado={ativo} aoMudar={setAtivo} />
            {/* O admin pode desligar tudo; num aviso de que um fluxo depende, a tela diz em vermelho o que para de
                funcionar, sempre visível (não só depois de desmarcar). */}
            {modelo.obrigatoria && (
              <div className="mt-3">
                <CaixaAviso titulo="Atenção!!" tom="erro" icone="fa-triangle-exclamation" tituloEmDestaque>
                  <p>
                    {modelo.tipoEvento === 'verificacao_email'
                      ? 'Se desativado, quem cria conta não recebe o link para confirmar o e-mail. A conta é criada, mas o e-mail fica sem confirmação.'
                      : 'Se desativado, ninguém consegue criar uma nova senha pelo "Esqueci minha senha": o link não chega.'}
                  </p>
                </CaixaAviso>
              </div>
            )}
          </div>
        </SecaoFicha>
      </ModalFicha>

      {ajudaAberta && <ModalComoEscrever modelo={modelo} aoFechar={() => setAjudaAberta(false)} />}
    </>
  );
}
