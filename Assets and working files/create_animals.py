import bpy, math
from pathlib import Path
from mathutils import Vector

root=Path(r'C:/Users/Shyam/Documents/Codex/2026-10-01/so-x20')
out=root/'work/manga-site/public/scene'
source=root/'outputs/scene-models'
source.mkdir(exist_ok=True)

def reset():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):bpy.data.actions.remove(action)
    bpy.context.scene.render.fps=60;bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=121

def material(name,color,rough=.8):
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*color,1);mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(*color,1);bsdf.inputs['Roughness'].default_value=rough
    return mat

def empty(name,loc=(0,0,0),parent=None):
    obj=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(obj);obj.location=loc;obj.parent=parent;return obj

def ellipsoid(name,loc,scale,mat,parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,location=loc)
    obj=bpy.context.object;obj.name=name;obj.scale=scale;obj.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for polygon in obj.data.polygons:polygon.use_smooth=True
    obj.parent=parent;return obj

def rod(name,a,b,radius,mat,parent=None):
    a,b=Vector(a),Vector(b);middle=(a+b)/2
    bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=radius,depth=(b-a).length,location=middle)
    obj=bpy.context.object;obj.name=name;obj.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();obj.data.materials.append(mat);obj.parent=parent
    for face in obj.data.polygons:face.use_smooth=True
    return obj

def finish(name):
    scene=bpy.context.scene;scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(source/(name+'.blend')))
    bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),export_format='GLB',export_animations=True,export_frame_range=True,export_force_sampling=True,export_optimize_animation_size=True)
    scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True
    scene.render.resolution_x=900;scene.render.resolution_y=700;scene.render.resolution_percentage=100;scene.render.film_transparent=True
    bpy.ops.object.camera_add(location=(3.5,4.5,2.7));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,.5))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=3.0;scene.camera=camera
    for pos,energy,size in [((-2,3,5),500,4),((3,0,3),230,3)]:
        bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=energy;light.data.size=size;light.rotation_euler=(Vector((0,0,.4))-light.location).to_track_quat('-Z','Y').to_euler()
    scene.world.color=(.25,.3,.28);scene.render.filepath=str(source/(name+'.png'));bpy.ops.render.render(write_still=True)
    print('ANIMAL_ASSET_READY',name,(out/(name+'.glb')).stat().st_size)

reset()
cream=material('Warm ivory feathers',(.89,.86,.76),.86);dark=material('Charcoal flight feathers',(.08,.095,.095),.8);eye=material('Glossy ink eyes',(.014,.018,.017),.15);red=material('Crane crown vermilion',(.47,.09,.065),.8)
bird=empty('CraneRoot')
ellipsoid('CraneBody',(0,-.1,.45),(.23,.48,.21),cream,bird)
ellipsoid('CraneShoulders',(0,.18,.49),(.18,.23,.18),cream,bird)
rod('LongNeck',(0,.31,.5),(0,.82,.66),.062,cream,bird)
ellipsoid('CraneHead',(0,.87,.68),(.12,.16,.11),cream,bird)
ellipsoid('RedCrown',(0,.86,.765),(.08,.09,.018),red,bird)
ellipsoid('DarkCheekLeft',(.098,.85,.666),(.018,.12,.055),dark,bird);ellipsoid('DarkCheekRight',(-.098,.85,.666),(.018,.12,.055),dark,bird)
for sign in [-1,1]:ellipsoid('CraneEye',(.112*sign,.914,.706),(.017,.026,.021),eye,bird)
bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=.04,radius2=.003,depth=.36,location=(0,1.15,.69));beak=bpy.context.object;beak.name='CraneBeak';beak.rotation_euler=(Vector((0,1,0))).to_track_quat('Z','Y').to_euler();beak.data.materials.append(dark);beak.parent=bird
for sign in [-1,1]:
    wing=empty('WingLeft' if sign<0 else 'WingRight',(.17*sign,.04,.49),bird)
    ellipsoid('WingShoulder',(.32*sign,-.09,0),(.4,.23,.06),cream,wing)
    for i in range(11):
        feather=ellipsoid('PrimaryFeather',((.54+i*.036)*sign,-.15-i*.038,-.015),(.055,.36-.008*i,.024),dark if i>6 else cream,wing);feather.rotation_euler.z=sign*(.26+i*.055)
    for frame in range(1,122):
        wing.rotation_euler.y=sign*(math.sin((frame-1)/60*2*math.pi)*.72-.13)
        wing.keyframe_insert(data_path='rotation_euler',frame=frame)
    for i in range(3):
        tail=ellipsoid('CraneTail',((i-1)*.065,-.64,.42),(.055,.21,.028),dark if i==1 else cream,bird);tail.rotation_euler.z=(i-1)*.15
    rod('CraneLeg',(.06*sign,-.35,.32),(.07*sign,-1.12,.2),.016,dark,bird)
    for i in range(2):rod('CraneToe',(.07*sign,-1.1,.2),(.07*sign+(i-.5)*.025,-1.25,.18),.009,dark,bird)
finish('crane-flight-v5')

reset()
fur=material('Ivory rabbit fur',(.79,.77,.65),.95);belly=material('Soft cream belly',(.88,.85,.76),.95);pink=material('Blush inner ears',(.58,.37,.33),.9);eye=material('Deep brown eyes',(.025,.017,.015),.17)
rabbit=empty('RabbitRoot')
body=empty('RabbitBody',(0,0,.35),rabbit)
ellipsoid('RabbitTorso',(0,-.03,0),(.3,.47,.29),fur,body);ellipsoid('RabbitChest',(0,.22,.12),(.25,.29,.28),belly,body)
ellipsoid('RoundTail',(0,-.48,.08),(.12,.12,.12),belly,body)
head=empty('RabbitHead',(0,.39,.39),body)
ellipsoid('RabbitSkull',(0,0,0),(.22,.235,.225),fur,head)
for sign in [-1,1]:
    ellipsoid('RabbitEye',(.178*sign,.13,.053),(.035,.037,.041),eye,head)
    ellipsoid('EyeGlint',(.189*sign,.15,.07),(.008,.007,.009),belly,head)
    ellipsoid('RabbitCheek',(.066*sign,.214,-.073),(.087,.065,.068),belly,head)
    ear=empty('EarLeft' if sign<0 else 'EarRight',(.10*sign,-.055,.155),head)
    ellipsoid('RabbitEar',(0,0,.205),(.068,.044,.235),fur,ear)
    ellipsoid('InnerEar',(0,.039,.209),(.040,.012,.176),pink,ear)
    for frame in range(1,122):
        t=(frame-1)/120;ear.rotation_euler.x=.12+math.sin(t*6*math.pi)*.15;ear.rotation_euler.y=sign*(.15+math.sin(t*4*math.pi)*.065);ear.keyframe_insert(data_path='rotation_euler',frame=frame)
    for front in [True,False]:
        leg=empty('FrontLeg' if front else 'HindLeg',(.18*sign,.22 if front else -.3,.10),rabbit)
        ellipsoid('RabbitFoot',(0,.07,0),(.095,.17,.07),belly,leg)
        if not front:ellipsoid('RabbitHaunch',(0,-.015,.135),(.15,.21,.18),fur,leg)
        for frame in range(1,122):
            t=(frame-1)/120;leg.rotation_euler.x=math.sin(t*6*math.pi)*(.38 if front else -.28);leg.keyframe_insert(data_path='rotation_euler',frame=frame)
ellipsoid('RabbitNose',(0,.246,-.04),(.027,.024,.021),pink,head)
for frame in range(1,122):
    t=(frame-1)/120;rabbit.location.z=max(0,math.sin(t*6*math.pi))*.21;rabbit.keyframe_insert(data_path='location',frame=frame)
    body.rotation_euler.x=math.sin(t*6*math.pi)*.12;body.keyframe_insert(data_path='rotation_euler',frame=frame)
    head.rotation_euler.x=-math.sin(t*6*math.pi)*.08;head.keyframe_insert(data_path='rotation_euler',frame=frame)
finish('rabbit-hop-v5')
