import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useToast } from '../../components/layout/toast/use-toast';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import { seguirCampanhaApi } from '../../services/16-seguir/api/seguir-campanha.api';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';

export function useSeguirCampanhas(auth: UseAuthReturn) {
  const navegar = useNavigate();
  const { mostrar } = useToast();
  const mostrarRef = useRef(mostrar);
  const [resultadoSeguidas, setResultadoSeguidas] = useState<{
    idUsuario: number;
    ids: ReadonlySet<number>;
  } | null>(null);
  const [emAtualizacao, setEmAtualizacao] = useState<ReadonlySet<number>>(new Set());

  useEffect(() => {
    mostrarRef.current = mostrar;
  }, [mostrar]);

  useEffect(() => {
    let ativo = true;
    const idUsuario = auth.usuario?.idUsuario;
    if (auth.carregando || !auth.autenticado || idUsuario === undefined) {
      return () => { ativo = false; };
    }

    void seguirCampanhaApi.listarMinhas(auth.authFetch).then(
      (lista) => {
        if (ativo) setResultadoSeguidas({ idUsuario, ids: new Set(lista.map((item) => item.idCampanha)) });
      },
      (erro: unknown) => {
        if (ativo) {
          mostrarRef.current(traduzirErro(erro), undefined, 'erro');
          setResultadoSeguidas({ idUsuario, ids: new Set() });
        }
      },
    );

    return () => { ativo = false; };
  }, [auth.authFetch, auth.autenticado, auth.carregando, auth.usuario?.idUsuario]);

  const idUsuario = auth.usuario?.idUsuario;
  const seguidas =
    auth.autenticado && idUsuario !== undefined && resultadoSeguidas?.idUsuario === idUsuario
      ? resultadoSeguidas.ids
      : new Set<number>();
  const carregando =
    auth.carregando ||
    (auth.autenticado && idUsuario !== undefined && resultadoSeguidas?.idUsuario !== idUsuario);

  async function alternarSeguir(idCampanha: number, titulo: string) {
    if (!auth.autenticado) {
      void navegar('/login');
      return;
    }
    if (carregando || emAtualizacao.has(idCampanha)) return;

    const segue = seguidas.has(idCampanha);
    setEmAtualizacao((atuais) => new Set(atuais).add(idCampanha));
    try {
      if (segue) {
        await seguirCampanhaApi.deixarDeSeguir(auth.authFetch, idCampanha);
      } else {
        await seguirCampanhaApi.seguir(auth.authFetch, idCampanha);
      }
      setResultadoSeguidas((resultado) => {
        const atuais =
          resultado?.idUsuario === idUsuario ? resultado.ids : new Set<number>();
        const novas = new Set(atuais);
        if (segue) novas.delete(idCampanha);
        else novas.add(idCampanha);
        return idUsuario === undefined ? resultado : { idUsuario, ids: novas };
      });
      mostrar(segue ? 'Deixou de seguir.' : 'Seguindo a campanha.', titulo);
    } catch (erro: unknown) {
      mostrar(traduzirErro(erro), undefined, 'erro');
    } finally {
      setEmAtualizacao((atuais) => {
        const novas = new Set(atuais);
        novas.delete(idCampanha);
        return novas;
      });
    }
  }

  return { seguidas, carregando, emAtualizacao, alternarSeguir };
}
