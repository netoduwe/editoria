import sys
from PIL import Image, ImageDraw
ts=sys.argv[2].split(','); out=sys.argv[1]; w=int(sys.argv[3]) if len(sys.argv)>3 else 270
h=int(w*1920/1080); ims=[]
for t in ts:
    im=Image.open(f'still_{float(t):g}.jpg').convert('RGB'); d=ImageDraw.Draw(im)
    for y in (470,1430): d.line([(0,y),(1080,y)],fill=(255,60,60),width=3)
    for x in (110,930): d.line([(x,0),(x,1920)],fill=(255,60,60),width=3)
    d.text((20,20),t,fill=(255,255,0))
    ims.append(im.resize((w,h)))
cols=min(len(ims),8); rows=(len(ims)+cols-1)//cols
o=Image.new('RGB',(cols*w,rows*h))
for i,im in enumerate(ims): o.paste(im,((i%cols)*w,(i//cols)*h))
o.save(out,quality=85)
