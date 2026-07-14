export function initSprites(app) {
  const { dados, dom } = app;
  const foto = dom.retrato;
  const container = dom.fotoContainer;
  const [spriteBase, spriteBaseEgg, spriteBaseIrritado] = dados.sprites.base;
  const spriteSetsFala = dados.sprites.fala ?? {};
  const todosSprites = [
    spriteBase,
    spriteBaseEgg,
    spriteBaseIrritado,
    ...Object.values(spriteSetsFala).flat(),
  ].filter(Boolean);
  const cacheSprites = new Map();

  let tokenTrocaSprite = 0;
  let spriteBaseAtual = spriteBase;
  let spriteFalaAtual = spriteSetsFala.comum ?? [];
  let indiceSpriteFala = 0;

  function carregarSprite(src) {
    if (cacheSprites.has(src)) {
      return cacheSprites.get(src);
    }

    const img = new Image();

    const promise = new Promise((resolve) => {
      img.onload = () => resolve(src);
      img.onerror = () => resolve(src);
    }).then(() => src);

    img.src = src;

    const entrada = { img, promise };
    cacheSprites.set(src, entrada);

    return entrada;
  }

  function preCarregarSprites() {
    todosSprites.forEach((src) => carregarSprite(src));
  }

  function aplicarSprite(src, ativarBorda = false) {
    if (!foto) return;

    foto.src = src;

    if (container) {
      container.classList.toggle("ativo", ativarBorda);
    }
  }

  function trocarSprite(src, ativarBorda = false) {
    if (!foto || !src) return;

    const tokenAtual = ++tokenTrocaSprite;
    const entrada = carregarSprite(src);

    entrada.promise.then(() => {
      if (tokenAtual !== tokenTrocaSprite) return;
      aplicarSprite(src, ativarBorda);
    });
  }

  function atualizarFoto(src, ativarBorda = false) {
    trocarSprite(src, ativarBorda);
  }

  function definirSpriteBase(src = spriteBase, ativarBorda = false) {
    spriteBaseAtual = src;
    atualizarFoto(src, ativarBorda);
  }

  function retornarExpressao() {
    spriteFalaAtual = spriteSetsFala.comum ?? [];
    indiceSpriteFala = 0;
    atualizarFoto(spriteBaseAtual, false);
  }

  function iniciarModoFala(expressao = "comum") {
    spriteFalaAtual = spriteSetsFala[expressao] ?? spriteSetsFala.comum ?? [];
    indiceSpriteFala = 0;

    if (spriteFalaAtual.length) {
      atualizarFoto(spriteFalaAtual[0], true);
    }
  }

  function alternarModoFala() {
    if (!foto || !spriteFalaAtual.length) return;

    indiceSpriteFala = (indiceSpriteFala + 1) % spriteFalaAtual.length;
    atualizarFoto(spriteFalaAtual[indiceSpriteFala], true);
  }

  function finalizarModoFala() {
    indiceSpriteFala = 0;

    if (spriteFalaAtual.length) {
      atualizarFoto(spriteFalaAtual[0], false);
    }
  }

  preCarregarSprites();

  app.sprites = {
    spriteBase,
    spriteBaseEgg,
    spriteBaseIrritado,
    spriteSetsFala,
    carregarSprite,
    preCarregarSprites,
    aplicarSprite,
    trocarSprite,
    atualizarFoto,
    definirSpriteBase,
    retornarExpressao,
    iniciarModoFala,
    alternarModoFala,
    finalizarModoFala,
  };

  return app.sprites;
}
