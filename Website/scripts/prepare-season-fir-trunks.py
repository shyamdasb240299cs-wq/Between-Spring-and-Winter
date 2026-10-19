"""Restore scanned stems separately from the heavily sampled fir boughs."""
import bpy,bmesh
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'Assets and working files/seasons/kit'
OUT=WORK/'prepared';OUT.mkdir(exist_ok=True)
with bpy.data.libraries.load(str(WORK/'fir_tree_01/source.blend'),link=False)as(a,b):
 b.objects=[f'fir_tree_01_{v}_LOD2'for v in 'abc']
for vi,original in enumerate(b.objects):
 source=original.data.copy()
 uv=source.attributes.get('UVMap')
 if uv and not source.uv_layers:
  coords=[tuple(d.vector)[:2]for d in uv.data];source.attributes.remove(uv);layer=source.uv_layers.new(name='UVMap')
  for d,coord in zip(layer.data,coords):d.uv=coord
 for v in source.vertices:v.co=original.matrix_world@v.co
 lo=Vector(tuple(min(v.co[i]for v in source.vertices)for i in range(3)))
 hi=Vector(tuple(max(v.co[i]for v in source.vertices)for i in range(3)))
 base=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z));scale=(14+vi)/(hi.z-lo.z)
 for v in source.vertices:v.co=(v.co-base)*scale
 stem_slots={i for i,m in enumerate(source.materials)if 'trunk_'in m.name}
 bm=bmesh.new();bm.from_mesh(source)
 bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.material_index not in stem_slots],context='FACES')
 bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
 bm.to_mesh(source);bm.free()
 key='trunk_'+'abc'[vi]
 material=bpy.data.materials.new('fir_'+key);material.use_nodes=True
 nodes=material.node_tree.nodes;links=material.node_tree.links;bs=nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.92
 for suffix,socket in [('diff','Base Color'),('nor_gl','Normal')]:
  tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(WORK/'fir_tree_01'/f'{key}_{suffix}.png'),check_existing=True)
  if socket=='Normal':
   tex.image.colorspace_settings.name='Non-Color';normal=nodes.new('ShaderNodeNormalMap');links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs[socket])
  else:links.new(tex.outputs['Color'],bs.inputs[socket])
 for level,budget in [('near',3200),('mid',1400),('far',480)]:
  mesh=source.copy();mesh.materials.clear();mesh.materials.append(material)
  for p in mesh.polygons:p.material_index=0;p.use_smooth=True
  obj=bpy.data.objects.new(f'fir-stem-{vi}-{level}',mesh);bpy.context.scene.collection.objects.link(obj)
  bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
  triangles=sum(p.loop_total-2 for p in mesh.polygons)
  if triangles>budget:
   dec=obj.modifiers.new('Preserve stem silhouette','DECIMATE');dec.ratio=budget/triangles;dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
  bpy.ops.export_scene.gltf(filepath=str(OUT/f'fir-stem-{vi}-{level}.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True)
  print('RESTORED_STEM',vi,level,len(obj.data.polygons),flush=True);bpy.data.objects.remove(obj,do_unlink=True)
