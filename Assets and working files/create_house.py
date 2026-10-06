import bpy, math, random
from pathlib import Path
from mathutils import Vector
root=Path(r'C:/Users/Shyam/Documents/Codex/2026-10-01/so-x20')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
random.seed(19)

def mat(name,color,texture=None,rough=.85):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
    if texture and texture.exists():
        t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(texture));m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
    return m
wood=mat('Weathered cedar',(.075,.042,.022),root/'work/generated-art/house-materials/dark-weathered-japanese-cedar.png')
roofmat=mat('Aged jade clay tiles',(.105,.14,.135),root/'work/generated-art/house-materials/charcoal-jade-japanese-roof-clay.png',.93)
stone=mat('Weathered foundation stone',(.19,.20,.16),rough=.99)
moss=mat('Deep moss',(.052,.083,.032),rough=1)
fern=mat('Fern foliage',(.07,.135,.039),rough=.95)
shoji=mat('Shoji paper',(.68,.62,.49),root/'work/generated-art/book-materials/warm-ivory-book-paper.png',.99)
metal=mat('Lantern ribs',(.045,.033,.017),rough=.8)
paper=mat('Lantern warm paper',(.72,.48,.21),root/'work/generated-art/book-materials/warm-ivory-book-paper.png',.9)
p=paper.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(1,.48,.16,1);p.inputs['Emission Strength'].default_value=.72

def box(name,loc,scale,material,bevel=.018):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
    if bevel:
        mod=o.modifiers.new('Soft weathered edges','BEVEL');mod.width=bevel;mod.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def rod(name,a,b,r,material):
    a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=(b-a).length,location=(a+b)/2);o=bpy.context.object;o.name=name;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();o.data.materials.append(material);return o

def roof_z(y,x=0):
    u=abs(y)/2.9
    return 4.18-1.7*u + .30*u**5 + .15*(abs(x)/3.6)**4*u**2

# True overlapping curved tiles, combined into one mesh.
verts=[];faces=[]
for row in range(23):
    y=-2.9+row*.255
    for col in range(30):
        x=-3.6+col*.24
        start=len(verts)
        for v in range(3):
            py=y+v*.147
            for u in range(7):
                px=x+u*.04;z=roof_z(py,px)+.040*math.sin(u/6*math.pi)+.009*(2-v)
                verts.append((px,py,z))
        for v in range(2):
            for u in range(6):
                a=start+v*7+u;faces.append((a,a+1,a+8,a+7))
mesh=bpy.data.meshes.new('Curved tile mesh');mesh.from_pydata(verts,[],faces);mesh.update();roof=bpy.data.objects.new('Overlapping ceramic roof tiles',mesh);bpy.context.collection.objects.link(roof);roof.data.materials.append(roofmat)
uv=mesh.uv_layers.new(name='UVMap')
for f in mesh.polygons:
    f.use_smooth=True
    for index in f.loop_indices:
        v=mesh.vertices[mesh.loops[index].vertex_index].co;uv.data[index].uv=(v.x/1.6,v.y/1.6)
for x in [-3.48,3.48]:
    for y in [-2.65,-2.0,-1.3,-.6,0,.6,1.3,2.,2.65]:
        yn=min(y+.7,2.85);rod('Roof fascia',(x,y,roof_z(y,x)-.06),(x,yn,roof_z(yn,x)-.06),.065,wood)
for y in [-2.75,2.75]:rod('Wide eave beam',(-3.55,y,roof_z(y,-3.55)-.10),(3.55,y,roof_z(y,3.55)-.10),.07,wood)
for x in [-3.55+i*.26 for i in range(28)]:rod('Ridge cap',(x,0,4.18),(x+.26,0,4.18),.105,roofmat)
# Structural timber, open veranda and shoji panels.
box('Rear cedar wall',(0,1.5,1.6),(5.6,.18,2.35),wood)
box('Left cedar wall',(-2.8,.05,1.6),(.16,2.9,2.35),wood)
box('Veranda boards',(0,-.45,.40),(6.0,4.0,.19),wood)
for x in [-2.7,-1.35,0,1.35,2.7]:
    box('Cedar columns',(x,-1.7,1.58),(.13,.18,2.4),wood)
    box('Rear column',(x,1.4,1.58),(.14,.14,2.4),wood)
for z in [.49,.82,2.46,2.70]:box('Horizontal timber frame',(0,-1.72,z),(5.55,.16,.12),wood)
for bay in range(4):
    x=-2.025+1.35*bay;box('Shoji translucent panel',(x,-1.68,1.61),(1.17,.045,1.56),shoji,.004)
    for dx in [-.39,0,.39]:box('Shoji vertical lattice',(x+dx,-1.735,1.61),(.018,.025,1.58),wood,.002)
    for z in [1.0,1.28,1.56,1.84,2.12,2.37]:box('Shoji horizontal lattice',(x,-1.744,z),(1.18,.027,.018),wood,.002)
# Steps and irregular ground stones make the base continuous with the landscape.
for i in range(3):box('Aged stone step',(-1.65,-2.40-i*.23,.32-i*.105),(1.65,.52,.16),stone,.042)
for x in [-2.7,2.7]:
    box('Porch support',(x,-2.25,.81),(.09,.09,.80),wood)
    box('Porch rail',(x,-1.85,1.02),(.08,.88,.075),wood)
    for y in [-2.24,-1.48]:box('Rail joint',(x,y,.84),(.07,.07,.39),wood)
for i in range(26):
    x=random.uniform(-3.30,3.3);y=random.choice([random.uniform(-3.05,-2.45),random.uniform(-1.7,1.6)])
    if abs(x)<2.7 and y> -2.45:continue
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=random.uniform(.16,.39),location=(x,y,.10));o=bpy.context.object;o.name='Organic foundation boulder';o.scale=(1.3,1,.5)
    for v in o.data.vertices:v.co*=random.uniform(.88,1.12)
    o.data.materials.append(stone)
    for f in o.data.polygons:f.use_smooth=True
for i in range(40):
    x=random.uniform(-3.4,3.5);y=random.uniform(-3.,1.4)
    if -2.65<x<2.65 and y>-2.55:continue
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=random.uniform(.08,.19),location=(x,y,.048));o=bpy.context.object;o.name='Irregular moss clump';o.scale=(1.5,1.1,.20);o.data.materials.append(moss)
    for f in o.data.polygons:f.use_smooth=True
for x,y in [(-3.05,-2.8),(-3.4,-1.2),(2.8,-2.65)]:
    for sprig in range(8):
        a=sprig/8*math.tau;end=(x+math.cos(a)*.31,y+math.sin(a)*.31,.18+random.random()*.24);rod('Fern stalk',(x,y,.03),end,.005,fern)
        for j in range(2,7):
            t=j/7;cx=x+(end[0]-x)*t;cy=y+(end[1]-y)*t;cz=.03+(end[2]-.03)*t
            for sign in [-1,1]:
                length=.10*(1-t)+.018;dx=math.cos(a+sign*1.2)*length;dy=math.sin(a+sign*1.2)*length
                m=bpy.data.meshes.new('Fern leaflet');m.from_pydata([(cx,cy,cz),(cx+dx*.5-.014,cy+dy*.5,cz+.013),(cx+dx,cy+dy,cz+.021),(cx+dx*.5+.014,cy+dy*.5,cz-.005)],[],[(0,1,2,3)]);m.update();o=bpy.data.objects.new('Fern leaf',m);bpy.context.collection.objects.link(o);o.data.materials.append(fern)
# A dimensional paper lantern with actual ribbing and a warm interior.
center=(-2.0,-1.97,2.00)
bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,location=center);lantern=bpy.context.object;lantern.name='LanternPaper';lantern.scale=(.23,.23,.43);lantern.data.materials.append(paper);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
for f in lantern.data.polygons:f.use_smooth=True
for i in range(13):
    z=-.39+i*.065;r=.23*math.sqrt(max(.03,1-(z/.43)**2));bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=.0035,major_segments=32,minor_segments=6,location=(center[0],center[1],center[2]+z));o=bpy.context.object;o.name='LanternRib';o.data.materials.append(metal)
rod('Lantern hanger',(center[0],center[1],2.44),(center[0],center[1],2.72),.009,metal)
box('Lantern bottom cap',(center[0],center[1],1.57),(.12,.12,.026),metal,.008)
# Join static geometry by material to keep the runtime draw-call count small.
for material in [wood,roofmat,stone,moss,fern,shoji,metal]:
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==material]
    if not objects:continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=material.name.replace(' ','')
# Save the reusable geometry and export the actual 3D asset.
bpy.ops.file.pack_all();folder=root/'outputs/scene-models';folder.mkdir(exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(folder/'japanese-lantern-house-v5.blend'))
bpy.ops.export_scene.gltf(filepath=str(root/'work/manga-site/public/scene/japanese-lantern-house-v5.glb'),export_format='GLB',export_apply=True)
print('HOUSE_MODEL_READY')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1000;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.film_transparent=True
bpy.ops.object.camera_add(location=(-8,-10,6.2));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1.7))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=10;scene.camera=camera
for pos,energy,size in [((-4,-5,10),900,6),((4,1,5),400,5)]:
    bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=energy;light.data.size=size;light.rotation_euler=(Vector((0,0,1.5))-light.location).to_track_quat('-Z','Y').to_euler()
scene.world.color=(.3,.34,.3);scene.render.filepath=str(folder/'japanese-lantern-house-v5.png');bpy.ops.render.render(write_still=True)

