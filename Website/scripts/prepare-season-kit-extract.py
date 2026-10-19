"""Extract compact source-authored fir LODs and one coastal boulder with Blender."""
import bpy,bmesh,math,random,json,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];WORK=ROOT/'Assets and working files/seasons/kit';TEMP=WORK/'prepared';TEMP.mkdir(exist_ok=True)
mode=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'fir'
def reset():
 for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
def components(mesh,material_filter=None):
 """Connected surface components, measured without expensive evaluated geometry."""
 bm=bmesh.new();bm.from_mesh(mesh);bm.verts.ensure_lookup_table();seen=set();result=[]
 for v in bm.verts:
  if v.index in seen:continue
  stack=[v];seen.add(v.index);verts=[];faces=set()
  while stack:
   cur=stack.pop();verts.append(cur.index);faces.update(f.index for f in cur.link_faces)
   for e in cur.link_edges:
    nxt=e.other_vert(cur)
    if nxt.index not in seen:seen.add(nxt.index);stack.append(nxt)
  if not faces:continue
  if material_filter is not None and not any(mesh.polygons[f].material_index in material_filter for f in faces):continue
  result.append((verts,faces))
 bm.free();return result
def simple_material(name,color,normal=None,alpha=False):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Roughness'].default_value=.9
 t=n.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(color),check_existing=True);l.new(t.outputs['Color'],bs.inputs['Base Color'])
 if alpha:l.new(t.outputs['Alpha'],bs.inputs['Alpha']);m.surface_render_method='DITHERED';m.use_transparency_overlap=False
 if normal:
  t=n.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(normal),check_existing=True);t.image.colorspace_settings.name='Non-Color';nm=n.new('ShaderNodeNormalMap');l.new(t.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],bs.inputs['Normal'])
 return m
def export(obj,name):
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 bpy.ops.export_scene.gltf(filepath=str(TEMP/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_yup=True)
def prepare_fir():
 reset();src=WORK/'fir_tree_01/source.blend'
 with bpy.data.libraries.load(str(src),link=False)as(a,b):b.objects=[f'fir_tree_01_{x}_LOD2' for x in 'abc']
 for vi,orig in enumerate(b.objects):
  source=orig.data.copy();matrix=orig.matrix_world.copy()
  # Geometry Nodes stores UVs as a corner vector attribute; glTF needs a real UV layer.
  uv_attribute=source.attributes.get('UVMap')
  if uv_attribute and not source.uv_layers:
   coords=[tuple(d.vector)[:2]for d in uv_attribute.data];source.attributes.remove(uv_attribute);layer=source.uv_layers.new(name='UVMap')
   for d,uv in zip(layer.data,coords):d.uv=uv
  for v in source.vertices:v.co=matrix@v.co
  lo=Vector(tuple(min(v.co[i]for v in source.vertices)for i in range(3)));hi=Vector(tuple(max(v.co[i]for v in source.vertices)for i in range(3)));base=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z));s=(14+vi)/(hi.z-lo.z)
  for v in source.vertices:v.co=(v.co-base)*s
  twig_slots={i for i,m in enumerate(source.materials)if 'twig' in m.name}
  parts=components(source,twig_slots)
  # Twig cards stay intact; sample whole authored twigs rather than collapsing alpha-card silhouettes.
  parts.sort(key=lambda x:((x[0][0]*2654435761)%4294967296))
  for level,limit,budget in [('near',2400,10000),('mid',700,2500),('far',180,600)]:
   mesh=source.copy();obj=bpy.data.objects.new(f'fir_{vi}_{level}',mesh);bpy.context.scene.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj
   keep=parts[:limit];all_twig={v for verts,_ in parts for v in verts};keep_twig={v for verts,_ in keep for v in verts}
   bm=bmesh.new();bm.from_mesh(mesh);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[bm.verts[i]for i in all_twig-keep_twig],context='VERTS');bm.to_mesh(mesh);bm.free()
   # Mild enlargement fills the gaps introduced by the distance sample.
   if len(parts)>len(keep):
    factor=min(1.8,math.sqrt(len(parts)/max(1,len(keep))))
    twig_comps=components(mesh,twig_slots)
    for verts,_ in twig_comps:
     center=sum((mesh.vertices[i].co for i in verts),Vector())/len(verts)
     for i in verts:mesh.vertices[i].co=center+(mesh.vertices[i].co-center)*factor
   # Separately reduce only bark/dead-branch faces.
   bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
   vg=obj.vertex_groups.new(name='bark');twig_vertices={i for verts,_ in components(mesh,twig_slots)for i in verts};bark_indices=[v.index for v in mesh.vertices if v.index not in twig_vertices]
   if bark_indices:vg.add(bark_indices,1,'REPLACE')
   bark_faces=sum(1 for p in mesh.polygons if p.material_index not in twig_slots)
   if bark_faces>budget:
    mod=obj.modifiers.new('Bark budget','DECIMATE');mod.ratio=budget/bark_faces;mod.vertex_group=vg.name;mod.vertex_group_factor=1;mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name)
   for i,old in enumerate(list(mesh.materials)):
    is_twig='twig' in old.name;key='twig'if is_twig else next((x for x in ['trunk_a','trunk_b','trunk_c']if x in old.name),'bark')
    mesh.materials[i]=simple_material(('fir_needles_twig'if is_twig else 'fir_'+key),WORK/'fir_tree_01'/('twig-rgba.png'if is_twig else key+'_diff.png'),WORK/'fir_tree_01'/(key+'_nor_gl.png'),is_twig)
   obj.data.validate();export(obj,f'fir-source-{vi}-{level}');print('PREPARED_FIR',vi,level,len(obj.data.polygons),flush=True);bpy.data.objects.remove(obj,do_unlink=True)
def prepare_rock():
 reset();bpy.ops.import_scene.gltf(filepath=str(WORK/'coast_rocks_03/coast_rocks_03.gltf'))
 obj=next(o for o in bpy.context.scene.objects if o.type=='MESH');mesh=obj.data
 comps=components(mesh);rank=[]
 for verts,faces in comps:
  lo=Vector(tuple(min(mesh.vertices[i].co[k]for i in verts)for k in range(3)));hi=Vector(tuple(max(mesh.vertices[i].co[k]for i in verts)for k in range(3)));d=hi-lo
  rank.append((d.z/max(d.x,d.y,.01) if d.z>.25 and len(faces)>50 else 0,verts,faces,lo,hi))
 rank.sort(key=lambda x:x[0],reverse=True)
 print('ROCK_COMPONENTS',len(rank),[(len(x[1]),list(x[3]),list(x[4]))for x in rank[:8]],flush=True)
 if len(rank)>1:
  keep=set(rank[0][1]);bm=bmesh.new();bm.from_mesh(mesh);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index not in keep],context='VERTS');bm.to_mesh(mesh);bm.free()
 else:
  # This scan is a connected coast patch. Crop a compact high rock region about its highest point.
  peak=max(mesh.vertices,key=lambda v:v.co.z).co.copy();bm=bmesh.new();bm.from_mesh(mesh)
  bmesh.ops.delete(bm,geom=[v for v in bm.verts if (v.co.x-peak.x)**2+(v.co.y-peak.y)**2>2.3**2 or v.co.z<peak.z-2],context='VERTS');bm.to_mesh(mesh);bm.free()
 export(obj,'rock-source')
if mode=='fir':prepare_fir()
elif mode=='rock':prepare_rock()
