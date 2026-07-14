export function initClicks(app) {
  const { dados, dom } = app;
  const dialogo = app.dialogo ?? {};
  const foto = dom.retrato;
  const frasesClick = dados.clicks ?? [];

  let contadorCliques = 0;
  let cutsceneCliques = false;
  let exilarAosCookies = false;

  function sequenciaCliques() {
    cutsceneCliques = true;

    dialogo.bloquearFala?.();
    dialogo.cancelarTimers?.();
    dialogo.cancelarAnimacaoTexto?.();
    dialogo.limparFala?.();

    const falasCutsceneClique = [
      {
        texto: "Haha, acho que você quer exercitar um pouco seus dedos, não é?",
        expressao: "comum",
      },
      {
        texto: "Eu conheço um local perfeito para você.",
        expressao: "comum",
      },
      {
        texto: "Toque em mim mais uma vez, não precisa ter medo.",
        expressao: "comum",
      },
    ];

    let indiceCutscene = 0;

    function avancarCutsceneCliques() {
      if (indiceCutscene < falasCutsceneClique.length) {
        const falaAtual = falasCutsceneClique[indiceCutscene];
        indiceCutscene++;

        dialogo.escrever?.(
          falaAtual.texto,
          () => {
            if (indiceCutscene < falasCutsceneClique.length) {
              setTimeout(avancarCutsceneCliques, 1800);
            } else {
              exilarAosCookies = true;
            }
          },
          falaAtual.expressao
        );
      }
    }

    avancarCutsceneCliques();
  }

  if (foto) {
    foto.addEventListener("dblclick", () => {
      if (dialogo.falaBloqueada) return;

      if (exilarAosCookies) {
        localStorage.setItem("ultimo_estado", "cookie");
        window.location.href = "https://orteil.dashnet.org/cookieclicker/";
        return;
      }

      if (cutsceneCliques) return;

      contadorCliques++;

      if (contadorCliques >= 15) {
        sequenciaCliques();
      } else {
        dialogo.cancelarTimers?.();
        dialogo.cancelarAnimacaoTexto?.();
        dialogo.limparFala?.();

        const fraseAleatoria =
          frasesClick[Math.floor(Math.random() * frasesClick.length)];

        dialogo.escrever?.(
          fraseAleatoria,
          () => {
            dialogo.resetTexto?.(fraseAleatoria);
          },
          "comum"
        );
      }
    });

    foto.addEventListener("click", () => {
      if (dialogo.falaBloqueada) return;
      if (exilarAosCookies) {
        localStorage.setItem("ultimo_estado", "cookie");
        window.location.href = "https://orteil.dashnet.org/cookieclicker/";
      }
    });
  }

  app.clicks = {
    contadorCliques,
    cutsceneCliques,
    exilarAosCookies,
    sequenciaCliques,
  };

  return app.clicks;
}
