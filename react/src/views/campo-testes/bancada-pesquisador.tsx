// Campo de Testes é parte permanente do painel administrativo (não uma ferramenta de teste descartável), com o
// mesmo padrão de dados/comportamento do resto do sistema (nunca uma versão simplificada à parte).

import { useCallback, useEffect, useState } from 'react';
import { TabelaBancadaPesquisador } from '../../components/crud/tabelas/8-tabela-bancada-pesquisador';
import type { PesquisadorLinha } from '../../components/crud/tabelas/8-tabela-bancada-pesquisador';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { PAPEL_SEM_EXTRA } from '../../services/2-papel-permissao/constants/papel-ordem-poder.constants';
import { gerarCpfValido } from '../../services/campo-testes/util/gerar-cpf-valido.util';
import { useCampoTestes } from '../../services/campo-testes/hook/use-campo-testes';
import { ModalAlterarUsuario, ModalConsultarUsuario, ModalExcluirUsuario } from '../1-usuario/modal-usuario';
import { ModalUpgradePesquisador } from '../6-perfil-pesquisador/modal-upgrade-pesquisador';
import { RegistroChamadas } from './registro-chamadas';
import type { PropsPagina } from '../../services/router/pagina.type';

// T1, Bancada do Pesquisador. Trabalha em cima de REGISTROS REAIS: a lista abaixo vem de GET
// /perfil-pesquisador de verdade (mesma API da tela admin "Pesquisadores"). Os 11 pesquisadores 12-22 (a "demo"
// do próprio 07_seed_dados.sql, que já têm campanha, score e links pré-montados) ficam BLOQUEADOS aqui:
// aparecem na lista, mas riscados, com cadeado, sem botão de usar. Servem para explorar o produto, não para
// virar cobaia de teste.
//
// Toda escrita usa a sessão REAL do painel (`auth`).
//
// Esta tela não tem modal próprio: abre os componentes compartilhados de `views/1-usuario/modal-usuario.tsx`
// (Alterar/Consultar/Excluir, unificando conta + Perfil de Pesquisador), que também são o CRUD real de Usuário
// (`listar-usuarios.tsx`); não duplica nome/senha/foto/papéis/moderação/CPF/score/links acadêmicos aqui dentro.
// A tabela (linha riscada/cadeado, filtro, faceta e paginação) mora em
// components/crud/tabelas/8-tabela-bancada-pesquisador.tsx; aqui fica buscar os dados e abrir os modais.
export function BancadaPesquisador({ auth }: PropsPagina) {
  // O modal compartilhado (`modal-usuario.tsx`) não pode usar `chamarERegistrar`/`useCampoTestes()`
  // internamente (quebraria a página real em produção, ver comentário no topo daquele arquivo). Para T1
  // continuar aparecendo no T4 (Registro de Chamadas), que é a ferramenta que ajuda a ver de perto o que
  // "testar upgrade de perfil, scores, etc." dispara de verdade, `registrarChamada` (só existe aqui, dentro do
  // Provider) é passado como prop para o modal; a página real nunca recebe essa prop, continua sem nenhuma
  // dependência do Provider.
  const { registrarChamada } = useCampoTestes();
  const [pesquisadores, setPesquisadores] = useState<PesquisadorLinha[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroListagem, setErroListagem] = useState<string | null>(null);
  // Qual modal está aberto - o conteúdo de cada um vive em modal-usuario.tsx
  // (compartilhado com o CRUD real de Usuário), aqui só se guarda QUEM.
  const [idUsuarioConsultando, setIdUsuarioConsultando] = useState<number | null>(null);
  const [idUsuarioAlterando, setIdUsuarioAlterando] = useState<number | null>(null);
  const [usuarioExcluindo, setUsuarioExcluindo] = useState<PesquisadorLinha | null>(null);
  // Coluna "upgrade": o cadeado abre o MESMO Modal de upgrade de perfil que qualquer conta usaria
  // (ModalUpgradePesquisador, em 6-perfil-pesquisador/, não é exclusivo do Campo de Testes) para QUALQUER linha
  // sem perfil, própria ou de outra pessoa (o Termo de Uso aparece sempre, mesmo para outra conta): o Modal
  // decide sozinho, por baixo, se usa o endpoint self-service ou "para outro" comparando `idUsuarioAlvo` com a
  // conta logada.
  const [idUsuarioUpgrade, setIdUsuarioUpgrade] = useState<number | null>(null);

  // Lista TODOS os usuários, não só quem já tem perfil_pesquisador: qualquer conta real dá para abrir.
  // Coluna/facet "papel" (mesma lógica de listar-usuarios.tsx): junta usuario_papel de todo mundo de uma vez (1
  // requisição, não 1 por linha), papel padrão 'usuario' não conta como "extra".
  // `.catch()` no fim (`no-floating-promises`): se `usuarioApi.listar` falhasse, o `.finally()` ainda zeraria o
  // spinner, mas nenhum erro apareceria: a tela ficaria vazia/desatualizada em silêncio, sem explicar por quê.
  const carregarPesquisadores = useCallback(() => {
    setCarregandoLista(true);
    setErroListagem(null);
    Promise.all([
      usuarioApi.listar(auth.authFetch),
      perfilPesquisadorApi.listar(auth.authFetch).catch(() => []),
      usuarioPapelApi.listarTudo(auth.authFetch).catch(() => []),
    ])
      .then(([usuarios, perfis, vinculos]) => {
        const perfilPorId = new Map(perfis.map((perfil) => [perfil.idUsuario, perfil]));
        const papeisPorUsuario = new Map<number, string[]>();
        for (const vinculo of vinculos) {
          if (vinculo.nomePapel === 'usuario') continue;
          const atuais = papeisPorUsuario.get(vinculo.idUsuario) ?? [];
          atuais.push(vinculo.nomePapel);
          papeisPorUsuario.set(vinculo.idUsuario, atuais);
        }
        setPesquisadores(
          usuarios.map((usuario) => ({
            ...perfilPorId.get(usuario.idUsuario),
            idUsuario: usuario.idUsuario,
            usuario,
            papel: papeisPorUsuario.get(usuario.idUsuario)?.join(', ') || PAPEL_SEM_EXTRA,
          })),
        );
      })
      .catch((erro: unknown) => {
        setErroListagem(erro instanceof Error ? erro.message : 'Falha ao carregar a lista de pesquisadores.');
      })
      .finally(() => setCarregandoLista(false));
  }, [auth.authFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarPesquisadores();
  }, [carregarPesquisadores]);

  return (
    <div className="admin-content-painel">
      <section className="crud-secao">
      <div className="crud-secao__cabecalho">
        <h1 className="titulo-secao">Campo de Testes - Bancada do Pesquisador</h1>
      </div>

      <TabelaBancadaPesquisador
        linhas={pesquisadores}
        carregando={carregandoLista}
        erro={erroListagem}
        aoAlterar={(linha) => setIdUsuarioAlterando(linha.idUsuario)}
        aoConsultar={(linha) => setIdUsuarioConsultando(linha.idUsuario)}
        aoExcluir={setUsuarioExcluindo}
        aoUpgrade={(linha) => setIdUsuarioUpgrade(linha.idUsuario)}
      />

      {idUsuarioConsultando !== null && (
        <ModalConsultarUsuario
          auth={auth}
          idUsuario={idUsuarioConsultando}
          aoFechar={() => setIdUsuarioConsultando(null)}
          aoRegistrarChamada={registrarChamada}
        />
      )}

      {idUsuarioAlterando !== null && (
        <ModalAlterarUsuario
          auth={auth}
          idUsuario={idUsuarioAlterando}
          aoFechar={() => setIdUsuarioAlterando(null)}
          aoAtualizado={carregarPesquisadores}
          aoRegistrarChamada={registrarChamada}
        />
      )}

      {idUsuarioUpgrade !== null && (
        <ModalUpgradePesquisador
          auth={auth}
          idUsuarioAlvo={idUsuarioUpgrade}
          gerarCpfDeTeste={gerarCpfValido}
          aoFechar={() => setIdUsuarioUpgrade(null)}
          aoConcluido={carregarPesquisadores}
        />
      )}

      {usuarioExcluindo && (
        <ModalExcluirUsuario
          auth={auth}
          idUsuario={usuarioExcluindo.idUsuario}
          nome={usuarioExcluindo.usuario.nome}
          email={usuarioExcluindo.usuario.email}
          emailVerificado={usuarioExcluindo.usuario.emailVerificado}
          aoFechar={() => setUsuarioExcluindo(null)}
          aoExcluido={carregarPesquisadores}
          aoRegistrarChamada={registrarChamada}
        />
      )}

      <div className="border-t borda-padrao my-8"></div>

      <RegistroChamadas />
      </section>
    </div>
  );
}
