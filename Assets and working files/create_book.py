import bpy, math
from pathlib import Path

out = Path(r'C:/Users/Shyam/Documents/Codex/2026-10-01/so-x20/work/manga-site/public/manga')
texture_source=out.parent.parent.parent/'unused-assets'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, roughness=.5, metal=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=roughness; p.inputs['Metallic'].default_value=metal
    return m

cloth=material('Midnight cloth',(.025,.035,.065),.72)
paper=material('Ivory page edges',(.86,.84,.77),.9)
gold=material('Warm foil',(.58,.39,.18),.35,.7)
lines=material('Fine page lines',(.72,.70,.64),.95)

def cube(name, loc, scale, mat, bevel=0, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    obj=bpy.context.object;obj.name=name;obj.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod=obj.modifiers.new('Soft bound edges','BEVEL');mod.width=bevel;mod.segments=3
        obj.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    if parent: obj.parent=parent
    return obj

cube('PageBlock',(0,0,0),(2.86,4.36,.055),paper,.014)
cube('BackBoard',(0,0,-.049),(3,4.5,.035),cloth,.012)
# Rounded case binding: a semicircular cross section joins the boards.
verts=[]; faces=[]; segments=32
for y in [-2.25,2.25]:
    for j in range(segments+1):
        a=-math.pi/2+j/segments*math.pi
        verts.append((-1.49-.055*math.cos(a),y,.071*math.sin(a)))
for j in range(segments): faces.append((j,j+1,j+1+segments+1,j+segments+1))
faces.extend([tuple(range(segments,-1,-1)),tuple(range(segments+1,2*(segments+1)))])
mesh=bpy.data.meshes.new('Rounded binding mesh');mesh.from_pydata(verts,[],faces);mesh.update()
spine=bpy.data.objects.new('RoundedSpine',mesh);bpy.context.collection.objects.link(spine);spine.data.materials.append(cloth)
for poly in mesh.polygons:poly.use_smooth=True
cube('BindingJoint',(-1.455,0,.052),(.025,4.49,.014),cloth,.009)
thread=material('Burgundy endband',(.18,.055,.08),.85)
for y in [-2.175,2.175]:
    for j in range(12):
        cube('WovenEndband',(-1.39+j*.01,y,0),(.009,.016,.054),thread if j%2 else paper,.003)

for i in range(24):
    z=-.0275+i*.0023
    cube(f'PageEdge_{i}',(1.432,0,z),(.002,4.32,.00035),lines)
    cube(f'TopPageEdge_{i}',(0,2.18,z),(2.85,.002,.00035),lines)

hinge=bpy.data.objects.new('CoverHinge',None);bpy.context.collection.objects.link(hinge);hinge.location=(-1.5,0,.049)
cube('FrontBoard',(1.5,0,0),(3,4.5,.035),cloth,.008,hinge)

def image_plane(name,filename,loc,parent=None,back=False):
    m=material(name+' print',(1,1,1),.64)
    nodes=m.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(texture_source/filename));m.node_tree.links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
    bpy.ops.mesh.primitive_plane_add(size=2,location=loc)
    obj=bpy.context.object;obj.name=name;obj.scale=(1.485,2.235,1)
    if back:obj.rotation_euler[1]=math.pi
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(m)
    if parent:obj.parent=parent
    return obj

image_plane('CoverArt','model-front.jpg',(1.5,0,.019),hinge)
image_plane('BackArt','model-back.jpg',(0,0,-.068),back=True)
cube('InsideCover',(1.5,0,-.019),(2.96,4.46,.002),paper,0,hinge)
for y in [-2.1,2.1]:cube('SpineFoil',(-1.528,y,0),(.003,.018,.105),gold)
root_outputs=out.parent.parent.parent.parent/'outputs'
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(root_outputs/'between-seasons.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'book-v3.glb'),export_format='GLB',export_yup=False,export_apply=True)
print('BOOK_MODEL_READY', (out/'book-v3.glb').stat().st_size)
