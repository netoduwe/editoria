# Armadilhas conhecidas (e como corrigir)

Bugs reais de animação em HTML/GSAP que aparecem em motion. Confira aqui antes de depurar.

| Sintoma | Causa | Correção |
|---|---|---|
| Objeto deslocado ou cortado na lateral | centralizou duas vezes (`left: 50%` + `xPercent: -50` **e** margem negativa) | use só um dos dois |
| Palavra "saiu" mas ficou parada na borda | a saída terminou dentro do quadro | termine fora da tela **e** com `opacity: 0` |
| Pedaço do objeto aparece antes da entrada | começa fora da tela, mas a perspectiva 3D invade a borda | deixe `opacity: 0` até o instante da entrada |
| Layout pula ou texto medido errado | mediu antes de a fonte carregar | espere as fontes (`document.fonts`) antes de medir e montar |
| Texto parece fora do centro | centralizou pela caixa da linha, que inclui ascendentes | meça a tinta (`measureText`, `actualBoundingBox*`) |
| 3D achatado | `filter` ou `opacity < 1` num pai com filhos 3D | aplique filtro/opacidade em elementos sem filhos 3D |
| Faixa escura cortando uma placa 3D | planos 3D se cruzando na mesma cena `preserve-3d` | cena `flat` com `perspective` própria; 3D só dentro do objeto |
| Odômetro mostra dígitos fora | animou a janela que recorta | janela fixa; anime a coluna de dígitos |
| Itálico cortado na máscara | a máscara usa a caixa do elemento | `padding: .1em .18em .24em` no elemento |
| Bolinha parada antes de um traço SVG ser desenhado | `stroke-linecap: round` com traço de tamanho zero | `opacity: 0` até começar a desenhar |
| Peça de SVG voa ao girar | `transformOrigin` em px num elemento SVG | `svgOrigin` em coordenadas do `viewBox` |
| Bloco anterior aparece na borda depois de mover a câmera | o container subiu, mas o bloco continuou visível | some o bloco (`opacity: 0`) junto com o movimento |
| Tela vazia logo depois da transição | a cena seguinte começa depois do corte | comece a entrada 0,05–0,1 s antes do corte |
| Espaçamento de letras enorme no fim | `letterSpacing` animado em `em` | anime em px |
| Cor ou estado travado depois da cena | a propriedade só é aplicada quando a cena está visível | deixe a lógica global na timeline, fora da condição da cena |
| Efeitos sonoros altos na versão sem música | normalizou só os efeitos | use o mesmo ganho da mixagem com música |
| Render lento | muitos `blur`/filtros grandes | blur só em elementos pequenos |
