export function initBoasVindas(app) {
  const { dados, dialogo } = app;
  const escrever = dialogo?.escrever;
  const resetTexto = dialogo?.resetTexto;

  function boasVindas() {
    const jaVisitou = localStorage.getItem("ja_visitou");
    const ultimoEstado = localStorage.getItem("ultimo_estado");
    const dadosBoasVindas = dados.boasVindas;

    if (!escrever || !resetTexto || !dadosBoasVindas) return;

    if (!jaVisitou) {
      localStorage.setItem("ja_visitou", "true");

      const falasIntro = dadosBoasVindas.intro;

      let indiceIntro = 0;

      function executarSequenciaIntro() {
        if (indiceIntro < falasIntro.length) {
          const falaAtual = falasIntro[indiceIntro];
          indiceIntro++;

          escrever(
            falaAtual.texto,
            () => {
              if (indiceIntro < falasIntro.length) {
                setTimeout(executarSequenciaIntro, 1500);
              } else {
                resetTexto(falaAtual.texto);
              }
            },
            falaAtual.expressao
          );
        }
      }

      setTimeout(executarSequenciaIntro, 1200);
      return;
    }

    if (ultimoEstado && dadosBoasVindas.retornoEstado[ultimoEstado]) {
      localStorage.removeItem("ultimo_estado");
      setTimeout(() => {
        escrever(
          dadosBoasVindas.retornoEstado[ultimoEstado],
          () => {
            resetTexto(dadosBoasVindas.retornoEstado[ultimoEstado]);
          },
          "comum"
        );
      }, 800);
      return;
    }

    const hora = new Date().getHours();
    let fraseEscolhida = "";
    let expressaoEscolhida = "comum";

    if (hora >= 23 || hora < 5) {
      const frasesNoite = dadosBoasVindas.noite;
      fraseEscolhida =
        frasesNoite[Math.floor(Math.random() * frasesNoite.length)];
      expressaoEscolhida = "comum";
    } else if (hora >= 11 && hora < 13) {
      const frasesSol = dadosBoasVindas.sol;
      fraseEscolhida = frasesSol[Math.floor(Math.random() * frasesSol.length)];
      expressaoEscolhida = "triste";
    } else if (hora >= 5 && hora < 8) {
      const frasesManha = dadosBoasVindas.manha;
      fraseEscolhida =
        frasesManha[Math.floor(Math.random() * frasesManha.length)];
      expressaoEscolhida = "comum";
    } else {
      const frasesGenericas = dadosBoasVindas.genericas;
      fraseEscolhida =
        frasesGenericas[Math.floor(Math.random() * frasesGenericas.length)];
      expressaoEscolhida = "comum";
    }

    setTimeout(() => {
      escrever(
        fraseEscolhida,
        () => {
          resetTexto(fraseEscolhida);
        },
        expressaoEscolhida
      );
    }, 800);
  }

  app.boasVindas = boasVindas;
  return app.boasVindas;
}
