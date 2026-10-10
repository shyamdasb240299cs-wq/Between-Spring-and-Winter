import bpy, math, json
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'Assets and working files/void-polish/candidates'
OUT=ROOT/'Website/public/void/models/jagobo'
OUT.mkdir(parents=True,exist_ok=True)

def clear():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

clear();bpy.ops.import_scene.gltf(filepath=str(SRC/'jagobo-cherry-blossom-trees.glb'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in meshes:
    print('MESH',o.name,'PARENT',o.parent.name if o.parent else None,'MATERIALS',[m.name for m in o.data.materials],'BOUNDS',[(o.matrix_world@Vector(c))[:] for c in o.bound_box][0:2],flush=True)

# The three source structure/foliage pairs retain Jagobo's authored UVs and textures.
variants=[]
for suffix in ['', '.001', '.002']:
    pair=[o for o in meshes if o.parent and (o.parent.name.startswith('structure'+suffix+'_') or o.parent.name.startswith('foliage'+suffix+'_'))]
    if pair:variants.append(pair)
assert len(variants)==3, 'Expected three authored trees'
for variant,pair in enumerate(variants):
    corners=[o.matrix_world@Vector(c) for o in pair for c in o.bound_box]
    lo=Vector(tuple(min(p[i] for p in corners) for i in range(3)));hi=Vector(tuple(max(p[i] for p in corners) for i in range(3)))
    # Blender is Z-up; ground and horizontal centring are baked into mesh vertices.
    base=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
    factor=8.5/(hi.z-lo.z)
    for level,ratio in [('near',1),('mid',.28),('far',.07)]:
        copies=[]
        for orig in pair:
            obj=orig.copy();obj.data=orig.data.copy();obj.parent=None;bpy.context.collection.objects.link(obj)
            obj.matrix_world=orig.matrix_world.copy();bpy.context.view_layer.objects.active=obj;obj.select_set(True)
            bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);obj.select_set(False)
            for v in obj.data.vertices:v.co=(v.co-base)*factor
            if ratio<1:
                d=obj.modifiers.new('Distance LOD','DECIMATE');d.ratio=ratio;bpy.ops.object.modifier_apply(modifier=d.name)
            # Clip original foliage alpha instead of costly sorted transparent cards.
            for mat in obj.data.materials:
                if 'foliage' in mat.name:
                    mat.surface_render_method='DITHERED'
            copies.append(obj)
        bpy.ops.object.select_all(action='DESELECT')
        for o in copies:o.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(OUT/f'tree-{variant}-{level}.glb'),export_format='GLB',use_selection=True,export_animations=False)
        for o in copies:bpy.data.objects.remove(o,do_unlink=True)

clear();bpy.ops.import_scene.gltf(filepath=str(SRC/'khronos-lantern.glb'))
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and 'LanternPole_Lantern' in o.name)
world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
lo=Vector(tuple(min(v.co[i] for v in o.data.vertices) for i in range(3)));hi=Vector(tuple(max(v.co[i] for v in o.data.vertices) for i in range(3)))
base=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z));scale=1.1/(hi.z-lo.z)
for v in o.data.vertices:v.co=(v.co-base)*scale
d=o.modifiers.new('Web budget','DECIMATE');d.ratio=.6;bpy.ops.object.modifier_apply(modifier=d.name)
bpy.ops.export_scene.gltf(filepath=str(OUT/'lantern.glb'),export_format='GLB',use_selection=True,export_animations=False)
