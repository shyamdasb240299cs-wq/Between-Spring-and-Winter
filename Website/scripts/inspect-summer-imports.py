"""Inspect secured third-party summer meshes without executing embedded scripts."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'Assets and working files/seasons/summer-imported'
OUT=ROOT/'tmp'
for key,file in [('suit','cesium-man-source.glb'),('gear','steren-scuba-equipment-source.glb'),('runtime-rack','summer-runtime-rack-preview.glb')]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(WORK/file))
    info=[]
    for o in bpy.context.scene.objects:
        entry={'name':o.name,'type':o.type,'location':list(o.location),'dimensions':list(o.dimensions)}
        if o.type=='ARMATURE':entry['bones']=[{'name':b.name,'head':list(b.head_local),'tail':list(b.tail_local)} for b in o.data.bones]
        if o.type=='MESH':entry.update(vertices=len(o.data.vertices),polygons=len(o.data.polygons),materials=[m.name for m in o.data.materials])
        info.append(entry)
    (OUT/f'summer-{key}-source-inspection.json').write_text(json.dumps(info,indent=2))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
    lo=Vector([min(p[i] for p in points) for i in range(3)])
    hi=Vector([max(p[i] for p in points) for i in range(3)])
    center=(lo+hi)*.5; size=max(hi-lo)
    bpy.ops.object.camera_add(location=center+Vector((size*1.3,-size*2,size*.75)))
    camera=bpy.context.object
    camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=size*1.3
    bpy.context.scene.camera=camera
    for location,power in [((3,-4,5),1200),((-3,-2,3),800),((1,3,5),1400)]:
        bpy.ops.object.light_add(type='AREA', location=center+Vector(location)*size/2)
        lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size*2
        lamp.rotation_euler=(center-lamp.location).to_track_quat('-Z','Y').to_euler()
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.world=bpy.data.worlds.new('Preview world');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.27,.29,1)
    scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    scene.render.filepath=str(OUT/f'summer-{key}-source-preview.png')
    bpy.ops.render.render(write_still=True)
