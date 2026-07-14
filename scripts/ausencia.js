export function initAusencia(app) {
  let tituloAlterado = false;

  const TITLE_SEQUENCES = {
    principal: {
      normal: "Acordado.",
      retorno: "Ah, você voltou.",
      etapas: [
        { tempo: 300_000, titulo: "Descansando." },
        { tempo: 420_000, titulo: "Você ainda está aí?" },
        { tempo: 600_000, titulo: "Você tá esperando algum segredo extra?" }, 
        { tempo: 900_000, titulo: "BU! Isso chama sua atenção?" },
        { tempo: 1800_000, titulo: "Eu vou estar aqui até sua volta." },
        { tempo: 3600_000, titulo: "Z z z." },
      ],
    },
  };
  const configTitulo = TITLE_SEQUENCES.principal;

  let tituloTimeouts = [];
  let tituloOriginal = configTitulo.normal;
  let estaOculto = false;
  let restaurando = false;

  function limparTimeouts() {
    tituloTimeouts.forEach(clearTimeout);
    tituloTimeouts = [];
  }

  function aplicarTitulo(titulo) {
    document.title = titulo;
  }

  function mudarTitulo() {
    if (estaOculto) return;

    estaOculto = true;
    restaurando = false;
    tituloAlterado = false;

    limparTimeouts();

    configTitulo.etapas.forEach((etapa) => {
      const id = setTimeout(() => {
        if (estaOculto) {
          aplicarTitulo(etapa.titulo);
          tituloAlterado = true;
        }
      }, etapa.tempo);

      tituloTimeouts.push(id);
    });
  }

  function restaurarTitulo() {
    if (!estaOculto) return;

    estaOculto = false;

    limparTimeouts();

    if (!tituloAlterado) {
      aplicarTitulo(tituloOriginal);
      return;
    }

    restaurando = true;
    aplicarTitulo(configTitulo.retorno);

    setTimeout(() => {
      aplicarTitulo(tituloOriginal);
      restaurando = false;
    }, 1000);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      mudarTitulo();
    } else {
      restaurarTitulo();
    }
  });

  window.addEventListener("blur", () => {
    if (document.hidden) return;
    mudarTitulo();
  });

  window.addEventListener("focus", () => {
    restaurarTitulo();
  });

  app.ausencia = {
    TITLE_SEQUENCES,
    limparTimeouts,
    aplicarTitulo,
    mudarTitulo,
    restaurarTitulo,
  };

  return app.ausencia;
}
