"""Adapt licensed source meshes. Run with Blender --background --python this_file.

CesiumMan (Cesium, CC BY 4.0) is a skinned source body, not a scuba source.
We remove its logo-bearing texture and oversized head and adapt its body into
a smooth neoprene wetsuit. Steren Giannini's Scuba equipment (CC BY 3.0)
supplies the actual imported cylinder, BCD, regulator and hoses.
"""
import bpy, bmesh, json, math
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'Assets and working files/seasons/summer-imported'
OUT=ROOT/'Website/public/seasons/kit/summer/imported'
OUT.mkdir(parents=True,exist_ok=True)

def material(name,color,roughness=.8,metallic=0):
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*color,1);mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*color,1)
    bsdf.inputs['Roughness'].default_value=roughness
    bsdf.inputs['Metallic'].default_value=metallic
    return mat

def preview(name):
    points=[o.matrix_world@Vector(v) for o in bpy.context.scene.objects if o.type=='MESH' for v in o.bound_box]
    lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)])
    center=(lo+hi)*.5;size=max(hi-lo)
    bpy.ops.object.camera_add(location=center+Vector((size*.9,-size*1.8,size*.50)))
    cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO';cam.data.ortho_scale=size*1.25;bpy.context.scene.camera=cam
    for xyz,power in [((3,-4,5),800),((-3,-2,3),600),((1,3,5),1100)]:
        bpy.ops.object.light_add(type='AREA',location=center+Vector(xyz)*size*.5)
        lamp=bpy.context.object;lamp.data.energy=power;lamp.data.size=size*2
        lamp.rotation_euler=(center-lamp.location).to_track_quat('-Z','Y').to_euler()
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.world=bpy.data.worlds.new('Preview');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.23,.25,1)
    scene.render.resolution_x=800;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.filepath=str(WORK/(name+'-preview.png'));bpy.ops.render.render(write_still=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(WORK/'cesium-man-source.glb'))
for obj in bpy.context.scene.objects:
    obj.animation_data_clear()
    if obj.type=='ARMATURE':
        for bone in obj.pose.bones:bone.matrix_basis=Matrix.Identity(4)
bpy.context.view_layer.update()
arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
body=next(o for o in bpy.context.scene.objects if o.type=='MESH')
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH' and obj!=body:bpy.data.objects.remove(obj,do_unlink=True)
body.name='Imported Cesium body adapted as headless neoprene wetsuit'
points=[body.matrix_world@v.co for v in body.data.vertices]
lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)])
neck=arm.matrix_world@arm.data.bones['Skeleton_neck_joint_1'].head_local
# In Blender +Z is vertical; trim above the collar, not along source-local axes.
bm=bmesh.new();bm.from_mesh(body.data)
bmesh.ops.delete(bm,geom=[v for v in bm.verts if (body.matrix_world@v.co).z>neck.z+.015],context='VERTS')
bm.to_mesh(body.data);bm.free();body.data.update()
neoprene=material('Summer neoprene / graphite',(0.018,.037,.049),.87)
panel=material('Summer neoprene / muted blue side panels',(.052,.13,.17),.86)
seam=material('Summer neoprene / rubber boot and glove',(.010,.019,.022),.76)
body.data.materials.clear()
for mat in [neoprene,panel,seam]:body.data.materials.append(mat)
# Material panels follow the source's anatomical mesh, avoiding any primitive body.
colors=body.data.color_attributes.new(name='Neoprene panels',type='FLOAT_COLOR',domain='POINT')
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
for vertex in body.data.vertices:
    c=body.matrix_world@vertex.co;relative=(c.z-lo.z)/max(.001,neck.z-lo.z)
    panel_mix=smooth(.10,.17,abs(c.x))*(1-smooth(.82,.96,relative))*smooth(.12,.20,relative)
    base=(.018,.037,.049);blue=(.037,.095,.13)
    colors.data[vertex.index].color=(*[base[i]*(1-panel_mix)+blue[i]*panel_mix for i in range(3)],1)
vcolor=neoprene.node_tree.nodes.new('ShaderNodeVertexColor');vcolor.layer_name=colors.name
neoprene.node_tree.links.new(vcolor.outputs['Color'],neoprene.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
for p in body.data.polygons:p.material_index=0;p.use_smooth=True
# One consistent parent transforms mesh + skeleton together; skin weights survive.
root=bpy.data.objects.new('Summer licensed imported wetsuit',None);bpy.context.collection.objects.link(root)
top=[o for o in bpy.context.scene.objects if o.parent is None and o!=root]
for obj in top:obj.parent=root
points=[body.matrix_world@v.co for v in body.data.vertices]
low=min(v.z for v in points);height=max(v.z for v in points)-low
scale=1.48/height;root.scale=(scale,scale,scale);root.location.z=-low*scale
root['source']='CesiumMan, Cesium (2017), CC BY 4.0; body adapted, original logo texture removed'
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'summer-wetsuit.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'summer-wetsuit.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False)
preview('summer-wetsuit')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(WORK/'steren-scuba-equipment-source.glb'))
gear=next(o for o in bpy.context.scene.objects if o.type=='MESH')
gear.name='Steren Giannini / imported BCD cylinder and regulators'
# Preserve original geometry and material boundaries, add smoother lighting only.
for poly in gear.data.polygons:poly.use_smooth=True
for mat in gear.data.materials:
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        color=bsdf.inputs['Base Color'].default_value
        if color[0]>.5 and color[1]>.5 and color[2]<.4:
            bsdf.inputs['Base Color'].default_value=(.50,.59,.60,1)
            bsdf.inputs['Metallic'].default_value=.55
        elif color[2]>.4 and color[2]>color[0]*1.2:
            bsdf.inputs['Base Color'].default_value=(.035,.085,.11,1)
        bsdf.inputs['Roughness'].default_value=.67
gear['source']='Scuba equipment by Steren Giannini, CC BY 3.0; palette adapted and smooth normals'
bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'summer-scuba-equipment.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'summer-scuba-equipment.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False)
preview('summer-scuba-equipment')
