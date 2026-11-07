import { useEffect, useState } from 'react';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { ListaAnexos } from '../../components/crud/lista-anexos';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useFecharComAviso } from '../../components/crud/use-alteracao-nao-salva';
import { Campo } from '../../components/input/campo';
import { Tooltip } from '../../components/layout/tooltip';
import { EXEMPLO_LINK_POR_TIPO } from '../../services/7-link-academico/constants/exemplos-link.constants';
import { ContadorCaracteres } from '../../components/input/contador-caracteres';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { atualizacaoCampanhaApi } from '../../services/15-atualizacao-campanha/api/atualizacao-campanha.api';
import {
  ORDEM_FASE_ATUALIZACAO,
  ROTULO_FASE_ATUALIZACAO,
  formatoPelosAnexos,
} from '../../services/15-atualizacao-campanha/constants/atualizacao-campanha.constants';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { enviarAnexo } from '../../services/26-arquivo/util/enviar-arquivo.util';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { erroLimiteCaracteres } from '../../services/constant/util/validacao.util';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { AtualizacaoCampanhaResponse } from '../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';
import type { TipoLinkResponse } from '../../services/9-tipo-link/type/tipo-link.type';
import type { FaseAtualizacao } from '../../services/constant/type/enums-do-banco.gerado';

interface ModalAtualizacaoProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  // Sem ela: publicar uma nova. Com ela: alterar o texto e a fase (os anexos entram só na publicação).
  atualizacao?: AtualizacaoCampanhaResponse;
  aoFechar: () => void;
  aoSalva: () => void;
}

interface LinkNovo {
  idTipoLink: number;
  nomeTipo: string;
  url: string;
}

// Os mesmos tipos que o backend aceita (TIPOS_MIME_PERMITIDOS, nest/src/26-arquivo): só para o seletor do navegador
// mostrar o que serve; quem confere de verdade é o backend.
const ACEITA_ARQUIVO = 'image/jpeg,image/png,image/webp,application/pdf';

// Publicar ou alterar uma atualização de progresso (RF-052, RF-053), num modal por cima do Alterar da campanha. O
// formato (texto, imagem, PDF ou link, RF-053) sai dos anexos, sem perguntar, e não aparece na tela: os ícones dos
// anexos já dizem o mesmo.
export function ModalAtualizacao({ auth, idCampanha, atualizacao, aoFechar, aoSalva }: ModalAtualizacaoProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const limite = useConfiguracoes().obterNumero('limite_caracteres_conteudo_atualizacao', 5000);
  const [titulo, setTitulo] = useState(atualizacao?.titulo ?? '');
  const [conteudo, setConteudo] = useState(atualizacao?.conteudo ?? '');
  const [fase, setFase] = useState<FaseAtualizacao>(atualizacao?.fase ?? ORDEM_FASE_ATUALIZACAO[0]);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [links, setLinks] = useState<LinkNovo[]>([]);
  const [tiposLink, setTiposLink] = useState<TipoLinkResponse[]>([]);
  const [linkTipo, setLinkTipo] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [progresso, setProgresso] = useState<string | null>(null);

  useEffect(() => {
    if (!atualizacao) {
      tipoLinkApi.listar(auth.authFetch, { ativo: true, escopo: 'atualizacao' }).then(setTiposLink).catch(reportarErro);
    }
  }, [auth.authFetch, atualizacao, reportarErro]);

  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({
    titulo: titulo.trim() === '' && 'Informe o título.',
    conteudo: conteudo.trim() === '' ? 'Escreva o conteúdo.' : erroLimiteCaracteres(conteudo, limite, 'O conteúdo'),
  }));

  // O exemplo do tipo escolhido (os mesmos dos links acadêmicos), no ⓘ do endereço.
  const codigoTipo = tiposLink.find((tipo) => String(tipo.idTipolink) === linkTipo)?.codigo;
  const exemploLink = codigoTipo ? EXEMPLO_LINK_POR_TIPO[codigoTipo] : undefined;

  const formato = formatoPelosAnexos(
    arquivos.map((arquivo) => arquivo.type),
    links.length > 0,
  );

  const adicionarLink = () => {
    const tipo = tiposLink.find((t) => String(t.idTipolink) === linkTipo);
    // O botão só fica ativo com o tipo escolhido e o endereço preenchido.
    if (!tipo || linkUrl.trim() === '') return;
    setLinks([...links, { idTipoLink: tipo.idTipolink, nomeTipo: tipo.nome, url: linkUrl.trim() }]);
    setLinkUrl('');
  };

  const salvar = async () => {
    if (!tentarEnviar()) return;
    await executar(async () => {
      if (atualizacao) {
        await atualizacaoCampanhaApi.alterar(auth.authFetch, atualizacao.idAtualizacao, { titulo: titulo.trim(), conteudo, fase });
        mostrar('Atualização alterada.');
      } else {
        const idsArquivos: number[] = [];
        try {
          for (const [indice, arquivo] of arquivos.entries()) {
            const rotulo = `Enviando arquivo ${indice + 1} de ${arquivos.length}`;
            setProgresso(`${rotulo}...`);
            const enviado = await enviarAnexo(auth.authFetch, arquivo, (percentual) => setProgresso(`${rotulo} (${percentual}%)...`));
            idsArquivos.push(enviado.idArquivo);
          }
        } finally {
          setProgresso(null);
        }
        await atualizacaoCampanhaApi.publicar(auth.authFetch, {
          idCampanha,
          titulo: titulo.trim(),
          conteudo,
          fase,
          tipo: formato,
          idsArquivos,
          links: links.map(({ idTipoLink, url }) => ({ idTipoLink, url })),
        });
        mostrar('Atualização publicada.', 'Ela aparece na página da campanha.');
      }
      aoSalva();
      aoFechar();
    });
  };

  const sujo = atualizacao
    ? titulo !== atualizacao.titulo || conteudo !== atualizacao.conteudo || fase !== atualizacao.fase
    : titulo !== '' || conteudo !== '' || arquivos.length > 0 || links.length > 0;
  const fechar = useFecharComAviso(sujo, aoFechar);

  return (
    <ModalFicha
      titulo={atualizacao ? 'Alterar Atualização' : 'Nova Atualização'}
      subtitulo={atualizacao?.titulo}
      aoFechar={fechar}
      erro={erro}
      rodape={
        <RodapeAcoes
          aoCancelar={fechar}
          acao={{
            rotulo: atualizacao ? 'Salvar' : 'Publicar',
            rotuloOcupado: progresso ?? 'Salvando...',
            ocupado,
            aoClicar: () => void salvar(),
          }}
        />
      }
    >
      <SecaoFicha titulo="Atualização">
        <Campo rotulo="Título" erro={erroDe('titulo')} className="sm:col-span-2">
          {({ atributos, classeErro }) => (
            <input
              {...atributos}
              type="text"
              maxLength={150}
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              className={'input-padrao' + classeErro}
            />
          )}
        </Campo>
        <Campo rotulo="Conteúdo" erro={erroDe('conteudo')} className="sm:col-span-2">
          {({ atributos, classeErro }) => (
            <>
              <textarea
                {...atributos}
                rows={5}
                value={conteudo}
                onChange={(evento) => setConteudo(evento.target.value)}
                className={'input-padrao' + classeErro}
              />
              <ContadorCaracteres texto={conteudo} limite={limite} />
            </>
          )}
        </Campo>
        <Campo rotulo="Fase do projeto">
          {({ atributos }) => (
            <select {...atributos} value={fase} onChange={(evento) => setFase(evento.target.value as FaseAtualizacao)} className="input-padrao">
              {ORDEM_FASE_ATUALIZACAO.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {ROTULO_FASE_ATUALIZACAO[opcao]}
                </option>
              ))}
            </select>
          )}
        </Campo>
      </SecaoFicha>

      <SecaoFicha titulo="Anexos" colunas={1}>
        {atualizacao ? (
          <ListaAnexos anexos={atualizacao.anexos} />
        ) : (
          <div className="space-y-3">
            <Campo rotulo="Arquivos (imagem ou PDF, opcional)">
              {({ atributos }) => (
                // O campo de arquivo do navegador fica escondido (o texto dele vem no idioma do navegador); o botão é o rótulo dele.
                <div>
                  <input
                    {...atributos}
                    type="file"
                    multiple
                    accept={ACEITA_ARQUIVO}
                    onChange={(evento) => {
                      setArquivos([...arquivos, ...Array.from(evento.target.files ?? [])]);
                      evento.target.value = '';
                    }}
                    className="sr-only"
                  />
                  <label htmlFor={atributos.id} className="btn btn-secondary cursor-pointer">
                    <i className="fa-solid fa-paperclip" aria-hidden="true"></i> Escolher arquivos
                  </label>
                </div>
              )}
            </Campo>
            {arquivos.length > 0 && (
              <ul className="space-y-1">
                {arquivos.map((arquivo, indice) => (
                  <li key={`${arquivo.name}-${indice}`} className="paragrafo flex flex-wrap items-center gap-2">
                    <i className={`fa-solid ${arquivo.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-image'}`} aria-hidden="true"></i>
                    <span className="break-words">{arquivo.name}</span>
                    <button
                      type="button"
                      className="dica texto-erro"
                      disabled={ocupado}
                      onClick={() => setArquivos(arquivos.filter((_, i) => i !== indice))}
                    >
                      tirar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {tiposLink.length > 0 && (
              <div className="grid sm:grid-cols-3 gap-3 items-end">
                <Campo rotulo="Tipo do link (opcional)">
                  {({ atributos }) => (
                    <select
                      {...atributos}
                      value={linkTipo}
                      onChange={(evento) => {
                        setLinkTipo(evento.target.value);
                        if (evento.target.value === '') setLinkUrl('');
                      }}
                      className="input-padrao"
                    >
                      <option value="">Nenhum</option>
                      {tiposLink.map((tipo) => (
                        <option key={tipo.idTipolink} value={tipo.idTipolink}>
                          {tipo.nome}
                        </option>
                      ))}
                    </select>
                  )}
                </Campo>
                <Campo
                  rotulo={
                    <>
                      Endereço do link {exemploLink && <Tooltip texto={`Exemplo: ${exemploLink}`} />}
                    </>
                  }
                >
                  {({ atributos }) => (
                    <input
                      {...atributos}
                      type="url"
                      maxLength={500}
                      value={linkUrl}
                      disabled={linkTipo === ''}
                      onChange={(evento) => setLinkUrl(evento.target.value)}
                      className="input-padrao"
                    />
                  )}
                </Campo>
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={ocupado || linkTipo === '' || linkUrl.trim() === ''}
                    onClick={adicionarLink}
                  >
                    <i className="fa-solid fa-plus" aria-hidden="true"></i> Adicionar link
                  </button>
                </div>
              </div>
            )}
            {links.length > 0 && (
              <ul className="space-y-1">
                {links.map((link, indice) => (
                  <li key={`${link.url}-${indice}`} className="paragrafo flex flex-wrap items-center gap-2">
                    <i className="fa-solid fa-link" aria-hidden="true"></i>
                    <span className="break-words">
                      {link.nomeTipo}: {link.url}
                    </span>
                    <button type="button" className="dica texto-erro" disabled={ocupado} onClick={() => setLinks(links.filter((_, i) => i !== indice))}>
                      tirar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SecaoFicha>
    </ModalFicha>
  );
}
