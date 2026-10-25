import { Fragment, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { FichaLadoALado, SecaoFicha } from '../../components/crud/ficha-consulta';
import { FiltroPartes } from '../../components/crud/filtro-partes';
import type { ParteTela } from '../../components/crud/filtro-partes';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import type { EstadoSuspensao } from '../../components/crud/secao-suspensao';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { ResumoAlteracoes } from '../../components/crud/resumo-alteracoes';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useFecharComAviso } from '../../components/crud/use-alteracao-nao-salva';
import { Campo } from '../../components/input/campo';
import { CaixaSomenteLeitura } from '../../components/input/caixa-somente-leitura';
import { MedidorSenha } from '../../components/input/medidor-senha';
import { SeletorFotoPerfil } from '../../components/input/seletor-foto-perfil';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';
import { Carregando } from '../../components/layout/carregando';
import { Dica } from '../../components/layout/tooltip';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { useDadosUsuario } from '../../services/1-usuario/hook/use-dados-usuario';
import { papelApi, usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { useAvisoScore } from '../../services/6-perfil-pesquisador/hook/use-aviso-score';
import { ROTULO_STATUS_PESQUISADOR } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { SENHA_DEV } from '../../services/constant/constants/senha-dev.constants';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { SecaoAceitesTermo } from './secao-aceites-termo';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { useOpcoesDiasSuspensao } from '../../services/constant/hook/use-opcoes-dias-suspensao';
import { formatarCpf, formatarCpfOuMotivoOculto, formatarData, instanteDaquiADias } from '../../services/constant/util/formatacao.util';
import { CamposVinculoPerfil } from '../6-perfil-pesquisador/campos-vinculo-perfil';
import { LinksAcademicosDoUsuario } from '../7-link-academico/links-academicos-do-usuario';
import { SecaoModeracaoPesquisador } from '../6-perfil-pesquisador/secao-moderacao-pesquisador';
import { SecaoModeracao } from './secao-moderacao';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { UsuarioPapelResponse } from '../../services/2-papel-permissao/type/papel-permissao.type';
import type { TipoVinculo, TituloAcademico } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { EstadoVazio } from '../../components/crud/estado-vazio';
import { SENHA_MINIMO_CARACTERES } from '../../services/3-auth/constants/senha.constants';

interface ModalAlterarUsuarioProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
  aoFechar: () => void;
  aoAtualizado: () => void;
}

interface FormPerfil {
  tipoVinculo: TipoVinculo;
  vinculoInstitucional: string;
  tituloAcademico: TituloAcademico;
}

// Foto escolhida e ainda não salva: `undefined` = nenhuma escolha nova; `id: null` = "Remover foto".
type FotoNova = { id: number | null; url: string | null } | undefined;

// Alterar Usuário: uma tela só, que rola. O filtro fixo no topo mostra tudo ("Geral", o padrão) ou só uma parte
// (Conta, Papéis, Pesquisador, Moderação): as outras ficam escondidas, não desmontadas, então nada do que está sendo
// editado se perde. Em cima, o que espera o Salvar do rodapé (foto, nome, senha e, de quem é pesquisador, o perfil,
// que também traz o CPF com o Salvar próprio da correção); o rodapé diz o que mudou, inclusive numa parte escondida.
// Embaixo, o que grava na hora do clique (papéis, links, desbloquear login) e, por último, as suspensões. O cabeçalho mostra a situação da conta (e-mail, suspensões, papéis).
// Campos raros (trocar senha, corrigir CPF) só abrem quando alguém clica. O Salvar não fecha o modal. Criar perfil
// para quem ainda não é pesquisador fica no upgrade (modal-upgrade-pesquisador.tsx), que passa pelo Termo.
export function ModalAlterarUsuario({ auth, idUsuario, aoFechar, aoAtualizado }: ModalAlterarUsuarioProps) {
  const { mostrar } = useToast();
  const errosDaTela = useErroToast({ mostraTexto: true });
  const { erro, reportarErro, limparErro } = errosDaTela;
  // Aceites do Termo (último de cada tipo, na coluna da direita). Leitura auxiliar: falha aqui não trava o modal.
  const { dado: termosAceitos } = useBuscar(
    () => usuarioApi.listarTermosAceitos(auth.authFetch, idUsuario).catch(() => []),
    [idUsuario],
  );
  const { ocupado: salvando, executar: executarSalvando } = useEnvio(reportarErro, limparErro);
  // A nota mostrada vem da busca de quando o modal abriu; depois de salvar vínculo/título ou mexer num link, o banco
  // a recalcula e esta é a nova.
  const [scoreNovo, setScoreNovo] = useState<number | null>(null);
  const { ocupado: desbloqueando, executar: executarDesbloqueando } = useEnvio(reportarErro, limparErro);
  const { ocupado: reenviandoVerificacao, executar: executarReenviandoVerificacao } = useEnvio(reportarErro, limparErro);
  const { ocupado: redefinindoSenhaDev, executar: executarRedefinindoSenhaDev } = useEnvio(reportarErro, limparErro);
  const [parte, setParte] = useState<Parte>('geral');
  const ve = (alvo: Parte) => (parte === 'geral' || parte === alvo ? '' : 'hidden');

  // Conta: o que está gravado (`base`) e o que está sendo editado.
  const [base, setBase] = useState({ nome: '', avatarUrl: null as string | null });
  const { lerScore, avisarScore } = useAvisoScore(auth.authFetch, idUsuario, base.nome);
  const [nome, setNome] = useState('');
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  // A caixa "Nova senha" já existe (invisível) antes de abrir: o foco vai para ela ao abrir, não ao montar.
  const campoNovaSenha = useRef<HTMLInputElement>(null);
  // Cópia invisível de "Trocar senha" e "Cancelar", uma em cima da outra (.camadas): tem a largura do maior dos dois,
  // sem número escrito. A barra de força termina antes dela (onde a caixa termina) e o Atribuir fica da largura dela.
  const larguraBotoesSenha = (
    <span className="camadas shrink-0 invisible" aria-hidden="true" inert>
      <span className="btn btn-secondary altura-de-campo whitespace-nowrap">
        <i className="fa-solid fa-key" aria-hidden="true"></i> Trocar senha
      </span>
      <span className="btn btn-secondary altura-de-campo whitespace-nowrap">Cancelar</span>
    </span>
  );
  useEffect(() => {
    if (trocandoSenha) campoNovaSenha.current?.focus();
  }, [trocandoSenha]);
  const [novaSenha, setNovaSenha] = useState('');
  const [fotoNova, setFotoNova] = useState<FotoNova>(undefined);
  // Pesquisador: idem.
  const [basePerfil, setBasePerfil] = useState<FormPerfil | null>(null);
  const [formPerfil, setFormPerfil] = useState<FormPerfil | null>(null);
  const [corrigindoCpf, setCorrigindoCpf] = useState(false);
  const [cpfCorrecao, setCpfCorrecao] = useState('');
  const idCpfCorreto = useId();
  // Suspensões, lidas pelas seções de moderação: aparecem também no cabeçalho.
  const [suspensaoConta, setSuspensaoConta] = useState<EstadoSuspensao | null>(null);
  const [suspensaoPesquisador, setSuspensaoPesquisador] = useState<EstadoSuspensao | null>(null);

  const { usuario, perfilPesquisador, papeis, setPapeis, carregando } = useDadosUsuario(idUsuario, auth, errosDaTela, (dados) => {
    setBase({ nome: dados.usuario.nome, avatarUrl: dados.avatarUrl });
    setNome(dados.usuario.nome);
    setNovaSenha('');
    setTrocandoSenha(false);
    setFotoNova(undefined);
    const perfil = dados.perfilPesquisador
      ? {
          tipoVinculo: dados.perfilPesquisador.tipoVinculo,
          vinculoInstitucional: dados.perfilPesquisador.vinculoInstitucional ?? '',
          tituloAcademico: dados.perfilPesquisador.tituloAcademico,
        }
      : null;
    setBasePerfil(perfil);
    setFormPerfil(perfil);
    setCpfCorrecao('');
    setCorrigindoCpf(false);
  });

  // O que mudou e ainda não foi salvo, pelo nome que a pessoa vê (o rodapé lista).
  const mudancasConta = [
    fotoNova !== undefined && 'foto',
    nome !== base.nome && 'nome',
    novaSenha !== '' && 'senha',
  ].filter((item): item is string => Boolean(item));
  const mudancasPerfil =
    formPerfil && basePerfil
      ? [
          (formPerfil.tipoVinculo !== basePerfil.tipoVinculo || formPerfil.vinculoInstitucional !== basePerfil.vinculoInstitucional) &&
            'vínculo',
          formPerfil.tituloAcademico !== basePerfil.tituloAcademico && 'título acadêmico',
        ].filter((item): item is string => Boolean(item))
      : [];
  const sujoConta = mudancasConta.length > 0;
  const sujoPerfil = mudancasPerfil.length > 0;
  const mudancas = [...mudancasConta, ...mudancasPerfil];
  const fechar = useFecharComAviso(sujoConta || sujoPerfil, () => {
    aoAtualizado();
    aoFechar();
  });

  // Salvar e as ações ficam sempre clicáveis: faltando algo, o erro aparece embaixo do campo.
  const conta = useErrosFormulario(() => ({
    nome: nome.trim().length < 2 && 'Nome precisa ter pelo menos 2 caracteres.',
    senha: novaSenha !== '' && novaSenha.length < SENHA_MINIMO_CARACTERES && `A nova senha precisa ter pelo menos ${SENHA_MINIMO_CARACTERES} caracteres.`,
  }));
  const perfil = useErrosFormulario(() => ({
    vinculoInstitucional:
      formPerfil?.tipoVinculo === 'institucional' && formPerfil.vinculoInstitucional.trim() === '' && 'Informe a instituição.',
  }));
  const cpf = useErrosFormulario(() => ({ cpf: cpfCorrecao.length !== 11 && 'Digite os 11 números do CPF.' }));

  // Um Salvar para a conta e o perfil: confere os dois antes de gravar qualquer um, e grava só o que mudou.
  const salvar = async () => {
    const contaOk = !sujoConta || conta.tentarEnviar();
    const perfilOk = !sujoPerfil || perfil.tentarEnviar();
    if (!contaOk || !perfilOk) return;
    await executarSalvando(async () => {
      if (sujoConta) {
        await usuarioApi.atualizar(auth.authFetch, idUsuario, {
          nome,
          ...(novaSenha ? { novaSenha } : {}),
          ...(fotoNova !== undefined ? { idImagemPerfil: fotoNova.id } : {}),
        });
        setBase({ nome, avatarUrl: fotoNova !== undefined ? fotoNova.url : base.avatarUrl });
        setNovaSenha('');
        setTrocandoSenha(false);
        setFotoNova(undefined);
        conta.limpar();
      }
      // Vínculo e título contam na pontuação: lida antes e depois, para o aviso dizer quanto mudou.
      const scoreAntes = sujoPerfil && formPerfil ? await lerScore() : null;
      if (sujoPerfil && formPerfil) {
        await perfilPesquisadorApi.atualizar(auth.authFetch, idUsuario, {
          tipoVinculo: formPerfil.tipoVinculo,
          ...(formPerfil.tipoVinculo === 'institucional' ? { vinculoInstitucional: formPerfil.vinculoInstitucional } : {}),
          tituloAcademico: formPerfil.tituloAcademico,
        });
        setBasePerfil(formPerfil);
        perfil.limpar();
      }
      mostrar('Usuário alterado com sucesso.', `ID: ${idUsuario} foi alterado`);
      if (scoreAntes !== null) {
        const scoreDepois = await lerScore();
        avisarScore(scoreAntes, scoreDepois);
        if (scoreDepois !== null) setScoreNovo(scoreDepois);
      }
      aoAtualizado();
    });
  };

  const cancelarTrocaSenha = () => {
    setTrocandoSenha(false);
    setNovaSenha('');
    conta.limpar();
  };

  const cancelarCorrecaoCpf = () => {
    setCorrigindoCpf(false);
    setCpfCorrecao('');
    cpf.limpar();
  };

  const salvarCorrecaoCpf = async () => {
    if (!cpf.tentarEnviar()) return;
    await executarSalvando(async () => {
      await perfilPesquisadorApi.corrigirCpf(auth.authFetch, idUsuario, { cpf: cpfCorrecao });
      setCpfCorrecao('');
      setCorrigindoCpf(false);
      cpf.limpar();
      mostrar('CPF corrigido com sucesso.');
      aoAtualizado();
    });
  };

  const aoDesbloquear = () =>
    void executarDesbloqueando(async () => {
      await usuarioApi.desbloquear(auth.authFetch, idUsuario);
      mostrar('Login desbloqueado com sucesso.', `ID: ${idUsuario} pode tentar logar novamente`);
    });

  const aoReenviarVerificacao = () =>
    void executarReenviandoVerificacao(async () => {
      await usuarioApi.reenviarVerificacao(auth.authFetch, idUsuario);
      mostrar('E-mail de verificação reenviado.', 'O link anterior deixou de valer.');
    });

  const aoRedefinirSenhaDev = () =>
    void executarRedefinindoSenhaDev(async () => {
      await usuarioApi.atualizar(auth.authFetch, idUsuario, { novaSenha: SENHA_DEV });
      mostrar('Senha redefinida com sucesso.', `ID: ${idUsuario} teve a senha redefinida para "${SENHA_DEV}"`);
    });

  const partes: ParteTela<Parte>[] = [
    { chave: 'geral', rotulo: 'Geral' },
    { chave: 'conta', rotulo: 'Conta' },
    ...(perfilPesquisador ? [{ chave: 'pesquisador' as const, rotulo: 'Pesquisador' }] : []),
    { chave: 'moderacao', rotulo: 'Moderação' },
  ];

  const contaSuspensaAte = vigente(suspensaoConta);
  const pesquisadorSuspensoAte = vigente(suspensaoPesquisador);
  const etiquetas = usuario
    ? [
        contaSuspensaAte && (
          <span key="conta" className="badge badge-erro">
            <i className="fa-solid fa-lock mr-1" aria-hidden="true"></i> Conta suspensa até {formatarData(contaSuspensaAte)}
          </span>
        ),
        <span key="email" className={'badge ' + (usuario.emailVerificado ? 'badge-sucesso' : 'badge-aviso')}>
          {usuario.emailVerificado ? 'E-mail verificado' : 'E-mail não verificado'}
        </span>,
        perfilPesquisador &&
          (pesquisadorSuspensoAte ? (
            <span key="pesquisador" className="badge badge-aviso">
              Pesquisador suspenso até {formatarData(pesquisadorSuspensoAte)}
            </span>
          ) : (
            <span key="pesquisador" className="badge badge-sucesso">
              Pesquisador {ROTULO_STATUS_PESQUISADOR[perfilPesquisador.statusPesquisador].toLowerCase()}
            </span>
          )),
        ...(papeis ?? []).map((papel) => (
          <span key={`papel-${papel.idPapel}`} className={'badge ' + (vigente(papel) ? 'badge-aviso' : 'badge-neutro')}>
            {papel.nomePapel}
            {vigente(papel) && <i className="fa-solid fa-clock ml-1 icone-pequeno" aria-hidden="true"></i>}
          </span>
        )),
      ].filter(Boolean)
    : undefined;

  return (
    <ModalFicha
      // `carregando`: mesmo mecanismo de ModalConsultarUsuario.
      carregando={!usuario || termosAceitos === null}
      titulo={base.nome}
      subtitulo={usuario?.email}
      avatar={usuario && <AvatarUsuario nome={base.nome} foto={fotoNova !== undefined ? fotoNova.url : base.avatarUrl} tamanho="lg" />}
      badges={etiquetas}
      aoFechar={fechar}
      rodape={
        usuario && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ResumoAlteracoes mudancas={mudancas} />
            <div className="flex-1">
              <RodapeAcoes
                aoCancelar={fechar}
                rotuloCancelar="Fechar"
                acao={{
                  rotulo: 'Salvar',
                  rotuloOcupado: 'Salvando...',
                  ocupado: salvando,
                  desabilitado: !sujoConta && !sujoPerfil,
                  aoClicar: () => void salvar(),
                }}
              />
            </div>
          </div>
        )
      }
    >
      {carregando ? (
        <Carregando className="p-6 text-center" />
      ) : !usuario ? (
        <MensagemErro texto={erro} className="paragrafo-destaque p-6 text-center texto-erro" />
      ) : (
        <>
          <FiltroPartes partes={partes} atual={parte} aoEscolher={setParte} />
          <MensagemErro texto={erro} />

          {/* Duas grades de linhas alinhadas (FichaLadoALado, DS-115): "Dados da conta" ao lado de Papéis e, embaixo,
              Metadados ao lado dos Aceites do Termo. Cada linha tem as partes dos dois lados (a foto e as pílulas dos
              papéis; o Nome e a lista de papel; o resto e o botão Atribuir), então o Nome e a lista ficam na mesma
              altura, e Metadados e Aceites também. "Perfil de Pesquisador" vem depois, na largura de Dados. Os papéis
              fazem parte de "Conta" no filtro. */}
          <div className={ve('conta') + ' grade-ficha gap-x-8 gap-y-10'}>
            <div className="lg:col-span-3 space-y-6">
              <PapeisDoUsuario
                auth={auth}
                idUsuario={idUsuario}
                papeis={papeis ?? []}
                aoMudarPapeis={setPapeis}
                aoAtualizado={aoAtualizado}
                larguraDoBotao={larguraBotoesSenha}
              >
                {({ lista, escolha, acao }) => {
                  // Os campos ao lado da foto, um por linha: cada um fica na linha da parte vizinha de Papéis.
                  const campos = [
                    <Fragment key="nome">
                      <Campo rotulo="Nome" erro={conta.erroDe('nome')}>
                        {({ atributos, classeErro }) => (
                          <input
                            {...atributos}
                            type="text"
                            value={nome}
                            onChange={(evento) => setNome(evento.target.value)}
                            className={'input-padrao' + classeErro}
                          />
                        )}
                      </Campo>
                    </Fragment>,
                    // O e-mail não se troca pela interface (RF-008): só leitura, na mesma caixa dos campos ao lado.
                    <CaixaSomenteLeitura key="email" rotulo="E-mail" valor={usuario.email} />,
                    // Duas camadas (.camadas), cada uma com a altura da maior versão: abrir e fechar não empurram Metadados e
                    // Aceites. À direita, "Trocar senha" e "Cancelar" no mesmo lugar e com a mesma altura da caixa
                    // (.altura-de-campo): um vira o outro sem pular. À esquerda, a caixa "Nova senha" no lugar do
                    // "Redefinir senha dev". Embaixo, o medidor de força numa linha, com o lugar sempre reservado (invisível
                    // enquanto não há senha): começar a digitar também não empurra nada.
                    <div key="senha">
                      <div className="flex items-end gap-2">
                        <div className="camadas flex-1 min-w-0">
                          <div className={trocandoSenha ? undefined : 'invisible'} inert={!trocandoSenha}>
                            <Campo rotulo="Nova senha" erro={conta.erroDe('senha')}>
                              {({ atributos, classeErro }) => (
                                <input
                                  {...atributos}
                                  type="password"
                                  value={novaSenha}
                                  onChange={(evento) => setNovaSenha(evento.target.value)}
                                  className={'input-padrao' + classeErro}
                                  autoComplete="new-password"
                                  ref={campoNovaSenha}
                                />
                              )}
                            </Campo>
                          </div>
                          {/* Só em desenvolvimento: põe a senha da pessoa em SENHA_DEV na hora, para testar login. Fica aqui
                              (e não na Minha Conta) porque trocar a senha de OUTRA pessoa não pede a senha atual. */}
                          <div className={'self-end' + (trocandoSenha ? ' invisible' : '')} inert={trocandoSenha}>
                            {import.meta.env.DEV && (
                              <button
                                type="button"
                                onClick={aoRedefinirSenhaDev}
                                disabled={redefinindoSenhaDev}
                                className="btn btn-dev-acao altura-de-campo w-full whitespace-nowrap"
                                title={`Redefine a senha para "${SENHA_DEV}", sem digitar nada.`}
                              >
                                <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>{' '}
                                {redefinindoSenhaDev ? 'Redefinindo...' : 'Redefinir senha dev'}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="camadas shrink-0">
                          <button
                            type="button"
                            onClick={() => setTrocandoSenha(true)}
                            className={'btn btn-secondary altura-de-campo whitespace-nowrap' + (trocandoSenha ? ' invisible' : '')}
                            inert={trocandoSenha}
                          >
                            <i className="fa-solid fa-key" aria-hidden="true"></i> Trocar senha
                          </button>
                          <button
                            type="button"
                            onClick={cancelarTrocaSenha}
                            className={'btn btn-secondary altura-de-campo whitespace-nowrap' + (trocandoSenha ? '' : ' invisible')}
                            inert={!trocandoSenha}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>,
                  ];
                  // Embaixo da foto e dos campos, na largura toda do bloco: o medidor de força numa linha só, com o lugar
                  // sempre reservado (invisível enquanto não há senha), para começar a digitar não empurrar nada.
                  const medidor = (
                    <div className={'contents' + (trocandoSenha ? '' : ' invisible')} inert={!trocandoSenha}>
                      <MedidorSenha
                        senha={novaSenha}
                        emLinha
                        reservarEspaco
                        classeBarra="ficha-bloco-com-foto__campo"
                        classeLista="ficha-bloco-com-foto__inteiro"
                        aoLadoDaBarra={larguraBotoesSenha}
                      />
                    </div>
                  );
                  // O botão Atribuir encosta embaixo (self-end): fica na linha da caixa "Nova senha" e do Cancelar.
                  const partesPapeis = [
                    { parte: lista, classe: '' },
                    { parte: escolha, classe: '' },
                    { parte: acao, classe: ' self-end' },
                  ];
                  return (
                    // A mesma grade da FichaLadoALado (DS-115), com um bloco à esquerda que tem a foto numa coluna
                    // própria, atravessando as linhas dos campos (.ficha-bloco-com-foto, DS-119).
                    <div className="ficha-lado-a-lado grid gap-x-6 gap-y-4">
                      <h3 className="titulo-bloco titulo-bloco--linha mb-0 sm:col-span-2 ficha-lado-a-lado__esquerda">Dados da conta</h3>
                      <h3 className="titulo-bloco titulo-bloco--linha mb-0 sm:col-span-2 ficha-lado-a-lado__direita max-lg:mt-2">Papéis</h3>
                      <div
                        className="ficha-bloco-com-foto sm:col-span-2 ficha-lado-a-lado__esquerda"
                        style={{ '--linhas-bloco': campos.length + 1, '--linhas-foto': campos.length } as CSSProperties}
                      >
                        <div className="ficha-bloco-com-foto__foto flex flex-col items-start gap-3">
                          <span className="rotulo-campo">Foto do perfil</span>
                          <SeletorFotoPerfil
                            authFetch={auth.authFetch}
                            nome={nome || base.nome}
                            url={fotoNova !== undefined ? fotoNova.url : base.avatarUrl}
                            tamanho="xxl"
                            aoAlterar={(id, url) => setFotoNova({ id, url })}
                          />
                        </div>
                        {campos.map((campo) => (
                          <div key={campo.key} className="ficha-bloco-com-foto__campo">
                            {campo}
                          </div>
                        ))}
                        {/* Sobe metade do vão da grade (-mt-2): o medidor fica a 8 px da caixa, como no Cadastro e na Minha Conta. */}
                        <div className="ficha-bloco-com-foto__largo -mt-2">{medidor}</div>
                      </div>
                      {partesPapeis.map(({ parte, classe }, indice) => (
                        <div key={indice} className={'sm:col-span-2 ficha-lado-a-lado__direita' + classe}>
                          {parte}
                        </div>
                      ))}
                    </div>
                  );
                }}
              </PapeisDoUsuario>

              <FichaLadoALado
                tituloEsquerda="Metadados"
                tituloDireita="Aceites do Termo de Uso"
                linhas={[
                  {
                    esquerda: [
                      // "Metadados", não "Auditoria": tem o id, que não é registro de quando algo aconteceu. Os três
                      // numa linha.
                      <div key="metadados" className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
                        <CampoSomenteLeitura rotulo="id" valor={idUsuario} />
                        <CampoSomenteLeitura rotulo="Criado em" valor={usuario.criadoEm && formatarData(usuario.criadoEm)} />
                        <CampoSomenteLeitura rotulo="Último login" valor={usuario.ultimoLoginEm ? formatarData(usuario.ultimoLoginEm) : 'Nunca'} />
                      </div>,
                    ],
                    direita: [
                      <SecaoAceitesTermo key="aceites" auth={auth} termosAceitos={termosAceitos} aoErro={reportarErro} comTitulo={false} />,
                    ],
                  },
                ]}
              />
            </div>

            {formPerfil && perfilPesquisador && (
              <div className="lg:col-span-2">
                <SecaoFicha titulo="Perfil de Pesquisador">
                  <CaixaSomenteLeitura rotulo="CPF atual" valor={formatarCpfOuMotivoOculto(perfilPesquisador.cpf)} />
                  {corrigindoCpf ? (
                    // Mesma grade de 2 colunas da seção: o campo com a largura dos outros, e os botões na 2ª coluna,
                    // centralizados na altura do campo (linha 2 da grade).
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 items-center rounded-lg border borda-forte p-3">
                      <label htmlFor={idCpfCorreto} className="legenda texto-herdado">
                        CPF correto (suporte/admin)
                      </label>
                      <input
                        id={idCpfCorreto}
                        type="text"
                        value={formatarCpf(cpfCorrecao)}
                        onChange={(evento) => setCpfCorrecao(evento.target.value.replace(/\D/g, '').slice(0, 11))}
                        aria-invalid={Boolean(cpf.erroDe('cpf'))}
                        className={'input-padrao sm:col-start-1' + (cpf.erroDe('cpf') ? ' borda-erro' : '')}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 sm:col-start-2 sm:row-start-2">
                        <button type="button" className="btn btn-secondary" onClick={cancelarCorrecaoCpf}>
                          Cancelar
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => void salvarCorrecaoCpf()}>
                          Salvar CPF
                        </button>
                      </div>
                      {cpf.erroDe('cpf') && <span className="texto-erro enfase sm:col-span-2">{cpf.erroDe('cpf')}</span>}
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <button type="button" className="btn btn-secondary" onClick={() => setCorrigindoCpf(true)}>
                        <i className="fa-solid fa-pen" aria-hidden="true"></i> Corrigir CPF
                      </button>
                    </div>
                  )}
                  <CamposVinculoPerfil
                    tipoVinculo={formPerfil.tipoVinculo}
                    vinculoInstitucional={formPerfil.vinculoInstitucional}
                    tituloAcademico={formPerfil.tituloAcademico}
                    rotuloVinculoInstitucional="Vínculo institucional"
                    aoAlterarTipoVinculo={(tipo) => setFormPerfil({ ...formPerfil, tipoVinculo: tipo })}
                    aoAlterarVinculoInstitucional={(valor) => setFormPerfil({ ...formPerfil, vinculoInstitucional: valor })}
                    aoAlterarTituloAcademico={(titulo) => setFormPerfil({ ...formPerfil, tituloAcademico: titulo })}
                    erroVinculoInstitucional={perfil.erroDe('vinculoInstitucional')}
                  />
                  <CaixaSomenteLeitura rotulo="Score atual" valor={scoreNovo ?? perfilPesquisador.scoreAtual} />
                </SecaoFicha>
              </div>
            )}
          </div>

          {parte === 'geral' && <div className="border-t borda-padrao"></div>}

          {perfilPesquisador && (
            <div className={ve('pesquisador') + ' space-y-6'}>
              <LinksAcademicosDoUsuario auth={auth} idUsuario={idUsuario} nomeUsuario={base.nome} aoMudarScore={setScoreNovo} />
            </div>
          )}

          <div className={ve('moderacao') + ' space-y-6'}>
            {/* Moderação: o título do grupo; dentro, o acesso (desbloquear login) e as duas suspensões. */}
            <h3 className="subtitulo">Moderação</h3>
            <SecaoFicha titulo="Acesso" colunas={1}>
              <div className="flex flex-col items-start gap-3 rounded-lg border borda-forte p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="legenda texto-fraco">
                  Zera o contador de tentativas de login falhas e libera a conta, caso esteja bloqueada temporariamente.
                </p>
                <button type="button" onClick={aoDesbloquear} disabled={desbloqueando} className="btn btn-secondary shrink-0">
                  {desbloqueando ? 'Desbloqueando...' : 'Desbloquear login'}
                </button>
              </div>
              {!usuario.emailVerificado && (
                <div className="flex flex-col items-start gap-3 rounded-lg border borda-forte p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="legenda texto-fraco">Manda um link novo para confirmar o e-mail. O link anterior deixa de valer.</p>
                  <button type="button" onClick={aoReenviarVerificacao} disabled={reenviandoVerificacao} className="btn btn-secondary shrink-0">
                    {reenviandoVerificacao ? 'Reenviando...' : 'Reenviar verificação'}
                  </button>
                </div>
              )}
            </SecaoFicha>

            <SecaoModeracao auth={auth} idUsuario={idUsuario} aoMudar={setSuspensaoConta} />
            {perfilPesquisador && (
              <SecaoModeracaoPesquisador auth={auth} idUsuario={idUsuario} aoMudar={setSuspensaoPesquisador} />
            )}
          </div>
        </>
      )}
    </ModalFicha>
  );
}

// Data até quando a suspensão vale, ou null se não há suspensão em vigor.
function vigente(suspensao: { suspensoAte: string | null } | null): string | null {
  return suspensao?.suspensoAte && new Date(suspensao.suspensoAte) > new Date() ? suspensao.suspensoAte : null;
}

type Parte = 'geral' | 'conta' | 'pesquisador' | 'moderacao';


interface PapeisDoUsuarioProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
  papeis: UsuarioPapelResponse[];
  aoMudarPapeis: (papeis: UsuarioPapelResponse[]) => void;
  aoAtualizado: () => void;
  // As três partes vão para linhas diferentes da grade (FichaLadoALado), cada uma ao lado da parte de "Dados da conta"
  // que tem a mesma altura: as pílulas ao lado da foto, a escolha ao lado do Nome, o botão ao lado do resto.
  children: (partes: { lista: ReactNode; escolha: ReactNode; acao: ReactNode }) => ReactNode;
  // Cópia invisível dos botões de senha (Trocar senha e Cancelar): o Atribuir fica com a largura deles.
  larguraDoBotao: ReactNode;
}

// Papéis da conta: atribuir, suspender por um prazo com motivo, reativar e revogar. Tudo grava na hora. Uma ação por
// vez (`ocupado` guarda qual), e depois de cada uma a lista é buscada de novo.
function PapeisDoUsuario({ auth, idUsuario, papeis, aoMudarPapeis, aoAtualizado, children, larguraDoBotao }: PapeisDoUsuarioProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const opcoesDiasSuspensao = useOpcoesDiasSuspensao();
  const { dado: catalogo } = useBuscar(() => papelApi.listar(auth.authFetch), []);
  const [ocupado, setOcupado] = useState<number | 'atribuir' | null>(null);
  const [idPapelParaAtribuir, setIdPapelParaAtribuir] = useState('');
  const [papelSuspendendoId, setPapelSuspendendoId] = useState<number | null>(null);
  const [motivoSuspensao, setMotivoSuspensao] = useState('');

  const papeisDisponiveis = (catalogo ?? []).filter((papel) => !papeis.some((atual) => atual.idPapel === papel.idPapel));
  const papelEscolhido = (catalogo ?? []).find((papel) => papel.idPapel === Number(idPapelParaAtribuir));
  const descricaoEscolhido = papelEscolhido?.descricao;

  // "Atribuir" fica sempre clicável: sem papel escolhido, o erro aparece embaixo do campo. O motivo da suspensão
  // idem (pelo menos 3 caracteres).
  const atribuicao = useErrosFormulario(() => ({
    papel: idPapelParaAtribuir === '' && 'Escolha um papel para atribuir.',
  }));
  const suspensao = useErrosFormulario(() => ({
    motivo: motivoSuspensao.trim().length < 3 && 'Informe o motivo (pelo menos 3 caracteres).',
  }));

  // Executa a ação, busca a lista nova de papéis e mostra o aviso de sucesso.
  const executar = async (qual: number | 'atribuir', acao: () => Promise<unknown>, titulo: string, descricao: string) => {
    limparErro();
    setOcupado(qual);
    try {
      await acao();
      aoMudarPapeis(await usuarioPapelApi.listarPorUsuario(auth.authFetch, idUsuario));
      mostrar(titulo, descricao);
      aoAtualizado();
      return true;
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
      return false;
    } finally {
      setOcupado(null);
    }
  };

  const aoAtribuir = async () => {
    if (!atribuicao.tentarEnviar() || !papelEscolhido) return;
    const ok = await executar(
      'atribuir',
      () => usuarioPapelApi.atribuir(auth.authFetch, idUsuario, papelEscolhido.idPapel),
      'Papel atribuído com sucesso.',
      `ID: ${idUsuario} agora tem o papel "${papelEscolhido.nome}"`,
    );
    if (ok) {
      setIdPapelParaAtribuir('');
      atribuicao.limpar();
    }
  };

  const aoSuspender = async (papel: UsuarioPapelResponse, dias: number) => {
    if (!suspensao.tentarEnviar()) return;
    const motivo = motivoSuspensao.trim();
    const ate = instanteDaquiADias(dias);
    const ok = await executar(
      papel.idPapel,
      () => usuarioPapelApi.suspender(auth.authFetch, idUsuario, papel.idPapel, ate, motivo),
      'Papel suspenso com sucesso.',
      `"${papel.nomePapel}" suspenso até ${formatarData(ate)}`,
    );
    if (ok) {
      setPapelSuspendendoId(null);
      setMotivoSuspensao('');
      suspensao.limpar();
    }
  };

  const aoReativar = (papel: UsuarioPapelResponse) =>
    void executar(
      papel.idPapel,
      () => usuarioPapelApi.revogarSuspensao(auth.authFetch, idUsuario, papel.idPapel),
      'Papel reativado com sucesso.',
      `"${papel.nomePapel}" voltou a valer normalmente`,
    );

  const aoRevogar = (papel: UsuarioPapelResponse) => {
    // O "×" é pequeno e fica colado no nome do papel: um clique sem querer tirava o papel na hora.
    if (!window.confirm(`Revogar o papel "${papel.nomePapel}"? A conta perde na hora o que este papel permite.`)) {
      return;
    }
    void executar(
      papel.idPapel,
      () => usuarioPapelApi.remover(auth.authFetch, idUsuario, papel.idPapel),
      'Papel revogado com sucesso.',
      `ID: ${idUsuario} perdeu o papel "${papel.nomePapel}"`,
    );
  };

  const lista = (
    <div className="space-y-4">
      <MensagemErro texto={erro} />

        <div className="flex flex-wrap gap-2">
          {papeis.length === 0 && <EstadoVazio compacto icone="fa-user-tag" titulo="Nenhum papel atribuído ainda." texto="Escolha um papel no campo abaixo para atribuir." />}
          {papeis.map((papel) => {
            const suspenso = papel.suspensoAte && new Date(papel.suspensoAte) > new Date();
            return (
              <span key={papel.idPapel} className="inline-flex flex-col items-start gap-1">
                <span className={'badge flex items-center gap-2 ' + (suspenso ? 'fundo-aviso texto-aviso' : 'badge-neutro')}>
                  {papel.nomePapel}
                  {suspenso && <i className="fa-solid fa-clock icone-pequeno" aria-hidden="true"></i>}
                  {suspenso ? (
                    <button
                      type="button"
                      onClick={() => aoReativar(papel)}
                      disabled={ocupado === papel.idPapel}
                      className="dica enfase hover:underline disabled:opacity-60"
                    >
                      {ocupado === papel.idPapel ? '…' : 'reativar'}
                      <Dica texto="Reativar agora" curta />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setPapelSuspendendoId((atual) => (atual === papel.idPapel ? null : papel.idPapel))}
                        className="dica texto-fraco hover-texto-forte"
                        aria-label={`Suspender "${papel.nomePapel}" por um tempo`}
                      >
                        <i className="fa-solid fa-clock icone-pequeno" aria-hidden="true"></i>
                        <Dica texto={`Suspender "${papel.nomePapel}" por um tempo`} curta />
                      </button>
                      <button
                        type="button"
                        onClick={() => aoRevogar(papel)}
                        disabled={ocupado === papel.idPapel}
                        className="dica texto-erro enfase hover-texto-erro disabled:opacity-60"
                        aria-label={`Revogar "${papel.nomePapel}"`}
                      >
                        ×
                        <Dica texto={`Revogar "${papel.nomePapel}"`} curta />
                      </button>
                    </>
                  )}
                </span>
                {papelSuspendendoId === papel.idPapel && (
                  <span className="flex flex-col gap-1 fundo-cartao border borda-forte rounded-lg p-1.5">
                    <input
                      value={motivoSuspensao}
                      onChange={(evento) => setMotivoSuspensao(evento.target.value)}
                      placeholder="Motivo (obrigatório)"
                      aria-label={`Motivo da suspensão de "${papel.nomePapel}"`}
                      aria-invalid={Boolean(suspensao.erroDe('motivo'))}
                      className={'input-padrao input-padrao--pequeno py-1' + (suspensao.erroDe('motivo') ? ' borda-erro' : '')}
                    />
                    {suspensao.erroDe('motivo') && (
                      <span className="legenda-destaque texto-erro">{suspensao.erroDe('motivo')}</span>
                    )}
                    <span className="flex gap-1">
                      {opcoesDiasSuspensao.map((dias) => (
                        <button
                          key={dias}
                          type="button"
                          onClick={() => void aoSuspender(papel, dias)}
                          disabled={ocupado === papel.idPapel}
                          className="legenda-destaque texto-padrao hover-fundo-sutil px-1.5 py-0.5 rounded"
                        >
                          {dias}d
                        </button>
                      ))}
                    </span>
                  </span>
                )}
              </span>
            );
          })}
        </div>
    </div>
  );

  const todosAtribuidos = catalogo !== null && papeisDisponiveis.length === 0;
  // Com rótulo visível, como o Nome: a caixa da lista começa na mesma altura da caixa do Nome, na linha ao lado.
  const escolha = todosAtribuidos ? (
    <p className="legenda texto-fraco">Esta conta já tem todos os papéis que existem.</p>
  ) : (
    <Campo rotulo="Atribuir papel" erro={atribuicao.erroDe('papel')}>
      {({ atributos, classeErro }) => (
        <select
          {...atributos}
          value={idPapelParaAtribuir}
          onChange={(evento) => setIdPapelParaAtribuir(evento.target.value)}
          className={'input-padrao' + classeErro}
        >
          <option value="">Selecione um papel...</option>
          {papeisDisponiveis.map((papel) => (
            <option key={papel.idPapel} value={papel.idPapel}>
              {papel.nome}
            </option>
          ))}
        </select>
      )}
    </Campo>
  );

  // O botão à direita, com a largura dos botões de senha ao lado (a cópia invisível deles na mesma camada).
  const acao = todosAtribuidos ? null : (
    <div className="flex flex-col items-end gap-2">
      {/* O que o papel escolhido libera, antes de atribuir. */}
      {descricaoEscolhido && <p className="legenda texto-fraco text-right">{descricaoEscolhido}</p>}
      <div className="camadas">
        <button type="button" onClick={() => void aoAtribuir()} disabled={ocupado === 'atribuir'} className="btn btn-primary altura-de-campo">
          {ocupado === 'atribuir' ? 'Atribuindo...' : 'Atribuir'}
        </button>
        {larguraDoBotao}
      </div>
    </div>
  );

  return <>{children({ lista, escolha, acao })}</>;
}
