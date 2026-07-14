export function initMemoria(app) {
  const { dados, dom } = app;

  const secaoVida = dom.eggVida;
  const linhasVida = secaoVida
    ? Array.from(secaoVida.parentElement.querySelectorAll("p.vida-linha"))
    : [];

  const historiasVida = dados.memoria ?? {};

  function escolherAleatorio(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
  }

  function gerarMemoria() {
    if (!linhasVida || linhasVida.length < 4) return;

    if (
      !historiasVida.linha1?.length ||
      !historiasVida.linha2?.length ||
      !historiasVida.linha3?.length ||
      !historiasVida.linha4?.length
    ) {
      return;
    }

    const indiceSincronizado = Math.floor(
      Math.random() * historiasVida.linha1.length
    );

    linhasVida[0].textContent = historiasVida.linha1[indiceSincronizado];
    linhasVida[1].textContent = escolherAleatorio(historiasVida.linha2);
    linhasVida[2].textContent = historiasVida.linha3[indiceSincronizado];
    linhasVida[3].textContent = escolherAleatorio(historiasVida.linha4);

    if (linhasVida[4]) {
      const rolagem = Math.floor(Math.random() * 20);

      if (rolagem === 0) {
        linhasVida[4].textContent =
          "- Eu lembro de me sentir feliz que eu ia adormecer.";
        linhasVida[4].style.display = "block";
      } else {
        linhasVida[4].textContent = "";
        linhasVida[4].style.display = "none";
      }
    }
  }

  gerarMemoria();

  app.memoria = {
    escolherAleatorio,
    gerarMemoria,
  };
  return app.memoria;
}
