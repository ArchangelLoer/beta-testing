export function initInventario(app) {
  if (app.sprites && app.sprites.carregarSprite) {
    const imagensInventario = [
      "arquivos/ItemBandagens.png",
      "arquivos/ItemCarteira.png",
      "arquivos/ItemRelogio.png",
      "arquivos/ItemCelular.png",
      "arquivos/ItemEgg.gif",
    ];
    imagensInventario.forEach((src) => app.sprites.carregarSprite(src));
  }

  const grid = document.getElementById("inventario-grid");
  if (!grid) return;

  const itensFixos = [
    {
      nome: "Bandagens & Alicate",
      imagem: "arquivos/ItemBandagens.png",
      fixo: true,
    },
    { nome: "Celular", imagem: "arquivos/ItemCelular.png", fixo: true },
    { nome: "Relógio", imagem: "arquivos/ItemRelogio.png", fixo: true },
    { nome: "Carteira", imagem: "arquivos/ItemCarteira.png", fixo: true },
  ];
  let inventarioAtual = [...itensFixos];

  const MIN_SLOTS = 9;
  const SLOTS_POR_COLUNA = 3;
  let totalSlots = MIN_SLOTS;

  function ajustarCapacidade() {
    let ultimoIndexOcupado = -1;
    for (let i = 0; i < inventarioAtual.length; i++) {
      if (inventarioAtual[i] !== undefined && inventarioAtual[i] !== null) {
        ultimoIndexOcupado = i;
      }
    }

    while (ultimoIndexOcupado >= totalSlots - SLOTS_POR_COLUNA) {
      totalSlots += SLOTS_POR_COLUNA;
    }

    while (
      totalSlots > MIN_SLOTS &&
      ultimoIndexOcupado < totalSlots - SLOTS_POR_COLUNA * 2
    ) {
      totalSlots -= SLOTS_POR_COLUNA;
      inventarioAtual.length = totalSlots;
    }
  }

  function renderizarInventario() {
    ajustarCapacidade();

    grid.style.gridTemplateColumns = `repeat(${SLOTS_POR_COLUNA}, 1fr)`;

    grid.innerHTML = "";

    for (let i = 0; i < totalSlots; i++) {
      const slot = document.createElement("div");
      slot.dataset.index = i;

      const item = inventarioAtual[i];

      if (item) {
        slot.className = "item-slot";

        const img = document.createElement("img");
        img.src = item.imagem;
        img.alt = item.nome;

        img.onerror = function () {
          this.onerror = null;
          this.src = "arquivos/teste.png";
        };

        const nomeDiv = document.createElement("div");
        nomeDiv.className = "nome-item";

        if (app.destacarTexto) {
          nomeDiv.innerHTML = app.destacarTexto(item.nome);
        } else {
          nomeDiv.textContent = item.nome;
        }

        slot.appendChild(img);
        slot.appendChild(nomeDiv);
      } else {
        slot.className = "item-slot vazio";
        slot.textContent = "[vazio]";
      }

      grid.appendChild(slot);
    }
  }

  renderizarInventario();

  app.inventario = {
    obterItens: () => inventarioAtual,
    adicionarItemNoIndex: (index, item) => {
      inventarioAtual[index] = item;
      renderizarInventario();
    },
    removerItemNoIndex: (index) => {
      inventarioAtual[index] = null;
      renderizarInventario();
    },
    reRenderizar: renderizarInventario,

    sincronizar: (listaItensJogo) => {
      const itensDoJogoFormatados = listaItensJogo.map((item) => ({
        nome: item.nome,
        imagem: `arquivos/${item.id}.png`,
      }));

      inventarioAtual = [...itensFixos, ...itensDoJogoFormatados];
      renderizarInventario();
    },
  };
}
