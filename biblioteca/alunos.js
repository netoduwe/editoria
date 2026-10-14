'use strict';
// Local preferences never change the shared catalog or its files on Drive.
const HIDDEN_KEY=KEY+':ocultos';
let hiddenIds=new Set();
try{hiddenIds=new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY)||'[]').filter(id=>byId.has(id)));}catch(error){}
state.situacao='ativo';
const studentRender=render,studentDetail=fillDetail;
const libraryToolbar=document.createElement('div');libraryToolbar.className='library-status';
libraryToolbar.innerHTML='<select id="library-situation" aria-label="Minha biblioteca"><option value="ativo">Minha biblioteca</option><option value="removidos">Removidos por mim</option></select>';
document.querySelector('.tools').prepend(libraryToolbar);
function externalLink(item){return item.video_url||item.metadados?.url||null;}
function referenceName(item){
 let name=item.nome.replace(/\.(mp4|mov|webm)$/i,'').replace(/\d{3,4}x\d{3,4}/gi,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
 if(name===name.toUpperCase())name=name.toLocaleLowerCase('pt-BR').replace(/\b(img|cta|gpt|sfx)\b/gi,word=>word.toUpperCase());
 return name.charAt(0).toLocaleUpperCase('pt-BR')+name.slice(1);
}
let inlinePlayer=null;
function stopInlinePlayer(){
 if(!inlinePlayer)return;
 const {video,stage,poster}=inlinePlayer;inlinePlayer=null;
 video.pause();video.removeAttribute('src');video.load();
 if(stage.isConnected)stage.replaceWith(poster);
}
function playInline(id){
 const item=byId.get(id);if(!item?.video_player_url){toast('Vídeo ainda não disponível.');return;}
 if(inlinePlayer?.id===id&&!inlinePlayer.video.error){inlinePlayer.video.play().catch(()=>{});return;}
 stopInlinePlayer();
 const poster=document.querySelector('.card[data-id="'+id+'"] .poster');
 if(!poster){toast('Encontre esta referência no feed para assistir.');return;}
 if($('#detail').open)closeDetail();
 const stage=document.createElement('div');stage.className=poster.className+' inline-player';
 const video=document.createElement('video');
 video.controls=true;video.playsInline=true;video.preload='metadata';video.autoplay=true;
 video.setAttribute('aria-label','Reproduzir '+item.nome);
 if(item.poster)video.poster=item.poster;
 const status=document.createElement('div');status.className='inline-video-error';status.hidden=true;
 status.innerHTML='<p role="status">Não foi possível carregar o vídeo.</p><button data-play="'+esc(id)+'">Tentar novamente</button>';
 video.addEventListener('error',()=>{if(video.hasAttribute('src'))status.hidden=false;});
 video.src=item.video_player_url;
 stage.append(video,status);poster.replaceWith(stage);
 inlinePlayer={id,video,stage,poster};
 video.focus({preventScroll:true});
 video.play().catch(()=>{});
}
card=function(raw){
 const item=effective(raw),url=externalLink(item),hidden=hiddenIds.has(item.id),id=esc(item.id),name=esc(item.nome),video=item.tipo==='video';
 const image=item.poster?'<img loading="lazy" decoding="async" src="'+esc(item.poster)+'" alt="'+name+'">':
  '<div class="placeholder"><svg viewBox="0 0 52 52" fill="none" stroke="currentColor" aria-hidden="true">'+(icons[item.tipo]||icons.asset)+'</svg><span>'+esc(labels[item.tipo])+'<br>'+esc(item.origem)+'</span></div>';
 const poster=video&&url?'<button class="poster" data-play="'+id+'" aria-label="Assistir '+name+' na biblioteca">'+image+(duration(item)?'<span class="duration">'+duration(item)+'</span>':'')+'<span class="drive-label"><svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="m3 1 8 5-8 5z"/></svg>Assistir</span></button>':
  '<button class="poster" data-open="'+id+'" aria-label="Ver '+name+'">'+image+'</button>';
 const quality=[['bom','Bom'],['ruim','Ruim'],['a_avaliar','A avaliar']].map(([value,label])=>'<button data-mark="'+id+'" data-key="qualidade" data-value="'+value+'" class="'+(item.qualidade===value?'chosen-'+value:'')+'" aria-pressed="'+(item.qualidade===value)+'">'+label+'</button>').join('');
 const usage=[['usado','Usado'],['nao_usado','Não usado']].map(([value,label])=>'<button data-mark="'+id+'" data-key="uso" data-value="'+value+'" class="'+(item.uso===value?'chosen-'+value:'')+'" aria-pressed="'+(item.uso===value)+'">'+label+'</button>').join('');
 return '<article class="card" data-id="'+id+'" data-kind="'+esc(item.tipo)+'">'+poster+'<div class="card-body"><div class="card-heading"><h2 title="'+name+'">'+esc(referenceName(item))+'</h2><details class="card-menu"><summary aria-label="Mais opções para '+name+'">⋯</summary><div class="card-menu-panel"><button data-open="'+id+'">Ver detalhes ↗</button><span class="menu-label">Avaliação</span><div class="actions" role="group" aria-label="Avaliar '+name+'">'+quality+'</div><span class="menu-label">Uso</span><div class="actions usage" role="group" aria-label="Uso de '+name+'">'+usage+'</div>'+(hidden?'':'<button class="remove-action" data-hide="'+id+'">Remover da minha biblioteca</button>')+'</div></details></div><div class="card-meta"><span>'+esc(labels[item.tipo])+'</span>'+(item.qualidade==='bom'?'<span class="picked">Boa referência ✓</span>':'')+'</div>'+(video&&!url?'<p class="small-muted">Link do vídeo em preparação.</p>':'')+(hidden?'<button class="reference-action" data-restore="'+id+'">Restaurar na minha biblioteca <span aria-hidden="true">↩</span></button>':'<button class="reference-action" data-reference="'+id+'">Usar referência <span aria-hidden="true">↗</span></button>')+'</div></article>';
};
render=function(){
 stopInlinePlayer();
 for(const row of rows)row.situacao=hiddenIds.has(row.id)?'oculto':'ativo';
 studentRender();
 $('#save-state').hidden=storageOK&&!Object.keys(marks).length;
 const visible=rows.filter(i=>!hiddenIds.has(i.id));
 document.querySelectorAll('.tab').forEach(button=>{const count=button.querySelector('small');if(count)count.textContent=(button.dataset.type?visible.filter(i=>i.tipo===button.dataset.type).length:visible.length).toLocaleString('pt-BR');});
};
fillDetail=function(id){
 studentDetail(id);const item=effective(byId.get(id)),url=externalLink(item);
 const panel=document.createElement('div');panel.className='detail-controls';panel.style.marginBottom='18px';
 panel.innerHTML=(url?(item.tipo==='video'?'<button data-play="'+id+'">Assistir no card</button>':'<a class="detail-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir fonte ↗</a>'):'')+'<button data-reference="'+id+'">Usar como referência ↗</button>';
 if(item.poster){const image=document.createElement('img');image.className='preview-media';image.src=item.poster;image.alt=item.nome;$('#detail-body').prepend(image);}
 $('#detail-body').prepend(panel);
};
document.querySelector('#library-situation').onchange=event=>{state.situacao=event.target.value;state.limit=48;render();};
// Native disclosure controls keep every action available on touch and keyboard.
document.addEventListener('click',event=>{
 const current=event.target.closest('details');
 document.querySelectorAll('.library-menu[open],.card-menu[open]').forEach(menu=>{if(menu!==current)menu.open=false;});
 if(current&&event.target.closest('button,a'))current.open=false;
});
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.library-menu[open],.card-menu[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary').focus();});});
document.addEventListener('click',async event=>{
 const play=event.target.closest('[data-play]');if(play){playInline(play.dataset.play);return;}
 const hide=event.target.closest('[data-hide]'),restore=event.target.closest('[data-restore]'),reference=event.target.closest('[data-reference]');
 if(hide||restore){const id=hide?.dataset.hide||restore.dataset.restore;if(hide)hiddenIds.add(id);else hiddenIds.delete(id);try{localStorage.setItem(HIDDEN_KEY,JSON.stringify([...hiddenIds]));}catch(error){toast('O navegador não conseguiu guardar essa alteração.');}render();return;}
 if(!reference)return;
 const item=effective(byId.get(reference.dataset.reference)),url=externalLink(item);
 const request='Use como referência de edição e motion: '+item.nome+'. Catálogo: biblioteca/catalogo.json; ID: '+item.id+'.'+
  (url?' Fonte: '+url+'.':' Link do vídeo ainda não configurado; confira a capa e peça o arquivo de referência se precisar analisar o movimento.')+
  ' Estude o ritmo, tipografia, layouts, transições e áudio. Preserve a minha marca em marca/design.md.'+
  (item.tipo==='video'&&url?' Se precisar analisar quadro a quadro, baixe somente esta referência para referencias/estilos/. Se o Drive pedir acesso, solicite o arquivo ao aluno.':'')+
  ' Use a referência só para estudar o estilo; não reutilize imagem, áudio ou assets dela no meu vídeo.';
 try{await navigator.clipboard.writeText(request);toast('Pedido copiado. Cole no Claude Code ou Codex junto do seu vídeo.');}
 catch(error){toast('Não foi possível copiar. Abra os detalhes e copie o link da referência.');}
});
render();
