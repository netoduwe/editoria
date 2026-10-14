# Modelo de receita de estilo

Copie para `estilos/<nome>.md` e substitua tudo entre `<…>`. Marque a fonte de cada número no comentário: `# medido`, `# observado`, `# estimado` ou `# proposto`. Exemplo preenchido: `estilos/editorial-tech.md`.

O bloco YAML é a especificação que a skill `editar-video` executa. O texto abaixo dele explica **quando** usar cada coisa: é o que transforma números em decisões de edição.

````markdown
---
nome: <slug>
descricao: <para que tipo de vídeo serve, em uma linha>
referencias:
  - { link: <url>, autor: <@>, analisado_em: <AAAA-MM-DD> }
formato: { largura: 1080, altura: 1920, fps: 30 }
dna: # os 3–5 traços que definem o estilo (o resto é detalhe)
  - <traço 1>
ritmo:
  plano_medio_s: <n>            # medido
  plano_faixa_s: [<min>, <max>] # medido (p25–p75)
  cortes_por_minuto: <n>        # medido
  cortes_nos_3s_iniciais: <n>   # medido
  animacoes_por_minuto: <n>     # medido (picos fora dos cortes)
  pausa_maxima_mantida_s: <n>   # medido (pausas p90)
  max_planos_sem_pessoa: <n>    # observado
layouts: # % do tempo somado na tabela de planos
  - { nome: <rosto>, pct: <n>, funcao: <ênfase, conclusão>, geometria: <…> }
legenda:
  fonte: { familia: <Inter>, peso: <800>, arquivo: <fontes/inter-800.woff2>, original_parecida_com: <…> }
  tamanho_px: <n>               # estimado: altura das maiúsculas ÷ 0,72
  caixa: <normal|alta>
  espacamento_em: <-0.03>
  palavras_por_vez: <"1-2">
  troca: <substitui|acumula>
  sincronia: <"no início da palavra">
  cor: { fundo_escuro: <#FFF>, fundo_claro: <#111> }
  contorno: <nenhum|2px #000>
  sombra: <nenhuma|"0 4px 14px rgba(0,0,0,.5)">
  fundo: <nenhum|pílula #hex>
  posicao_y: { rosto: <n>, split: <n>, grafico: <n> }
  entrada: <"sobe 14 px + opacidade, 0,12 s">
  destaque: { metodo: <cor|serifa|brilho>, cor: <papel>, frequencia: <…> }
titulos: { fonte: <…>, tamanho_px: [<min>, <max>], caixa: <alta>, uso: <ordinais, ênfases, fala em cenas gráficas> }
cores: # papel → hex medido na referência → papel da marca do aluno que substitui
  fundo_claro:  { referencia: <#hex>, usar: marca.fundo_claro }
  fundo_escuro: { referencia: <#hex>, usar: marca.fundo_escuro }
  destaque_1:   { referencia: <#hex>, usar: marca.destaque }
  destaque_2:   { referencia: <#hex>, usar: marca.destaque_2 }
  imagem: <claro/escuro, contraste, saturação, temperatura> # medido
movimento:
  entrada_padrao: { duracao_s: <0.2>, ease: <power3.out>, deslocamento_px: <24> }
  cascata_s: <0.1>
  camera: <push lento 1.10→1.15 no rosto>
  punch_in: { escala: <1.15>, quando: <ênfase> }
  transicoes: { corte_seco_pct: <n>, outras: [<fade 0,3 s em cards>] }
audio:
  loudness_lufs: <-14>
  trilha: { usar: <sim|não|?>, abaixo_da_voz_db: <n>, clima: <…> }
  sfx: { nos_cortes_pct: <n>, tipos: [<pop leve em cards>] }
gancho: <o que acontece nos 3 s: quadro 0, primeiro texto, revelações>
final: <como termina: CTA, card, loop>
---

# Estilo <nome>

## DNA
<3–5 frases: o que faz esse estilo ser reconhecível.>

## Gramática (como decidir)
<Regras de escolha de layout pela função da frase; padrão de alternância; o que entra em cada palavra-chave.>

## Layouts
<Um bloco por layout: quando, geometria em px, fundo, onde fica a legenda, o que anima. Inclua CSS testado quando houver.>

## Legenda e tipografia
<Anatomia completa + exceções (ex.: em cena gráfica a fala vira título serifado).>

## Movimento
<Entradas típicas com tempos; o que acumula; transições.>

## Áudio
<Trilha, SFX, tratamento de voz.>

## Gancho e final
<Fórmula do gancho (estrutura, não a frase) e do encerramento.>

## Nunca
<O que quebraria o estilo.>

## Adaptações para a marca do aluno
<O que muda por causa da marca/material e por quê.>

## Validação
<Data, vídeo de teste, tabela do comparar-analises, rodadas e diferenças restantes — ou "não validada".>
````
