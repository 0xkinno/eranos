from PIL import Image
names=["circle","memory","proof","memory-switch"]
ims=[Image.open(f"docs/images/{n}.png").convert("RGB") for n in names]
w,h=900,560
ims=[i.resize((w,int(i.size[1]*w/i.size[0]))).crop((0,0,w,h)) for i in ims]
g=Image.new("RGB",(w*2+30,h*2+30),(228,241,255))
for k,i in enumerate(ims): g.paste(i,(10+(k%2)*(w+10),10+(k//2)*(h+10)))
g.save("docs/images/grid.png",optimize=True)
print(g.size)
