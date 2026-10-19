"""Bounded, offline Blendkit-to-glTF conversion. Originals remain untouched.

blender --background --factory-startup --disable-autoexec --python <script> -- winter <image-python>
"""
import bpy, bmesh, json, sys, math, hashlib, subprocess, gc, re
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'Assets and working files/seasons'
args = sys.argv[sys.argv.index('--') + 1:]
season, image_python = args[0], args[1]
compact = '--mobile' in args
OUT = ROOT / 'Website/public/seasons' / season
OUT.mkdir(parents=True, exist_ok=True)
TEMP = WORK / 'sources' / (season + '-textures')
TEMP.mkdir(exist_ok=True)
metadata = json.loads((WORK / (season + '-source.json')).read_text())
source_path = WORK / 'sources' / (season + '.raw.blend')
print('LOAD', season, flush=True)
for obj in list(bpy.context.scene.objects): bpy.data.objects.remove(obj, do_unlink=True)
audit=json.loads((WORK/(season+'-audit.json')).read_text())
included={o['name'] for o in audit['objects'] if not o['name'].lower().startswith('scatter_obj')}
with bpy.data.libraries.load(str(source_path), link=False) as (available, selected):
    selected.objects = [name for name in available.objects if name in included]
    selected.worlds = available.worlds[:]
scene = bpy.context.scene
for obj in selected.objects:
    if obj and obj.name not in scene.objects: scene.collection.objects.link(obj)
if selected.worlds:scene.world=selected.worlds[-1]
camera_source = next((o for o in selected.objects if o and o.name==audit['camera']),None)
spawn_source = Vector(audit['camera_pose']['position']) if audit.get('camera_pose') else Vector((0,0,2))
yaw = audit['camera_pose']['rotation'][2] if audit.get('camera_pose') else 0
all_objects = list(scene.objects)
disabled = []
for obj in all_objects:
    for modifier in obj.modifiers:
        if modifier.type in {'NODES', 'SUBSURF', 'MULTIRES', 'PARTICLE_SYSTEM'}:
            disabled.append((modifier, modifier.show_viewport, modifier.show_render))
            modifier.show_viewport = modifier.show_render = False

# Reduce each shared mesh once, using an isolated temporary object and no scatter evaluation.
mesh_users = {}
for obj in all_objects:
    if obj.type == 'MESH': mesh_users.setdefault(obj.data, []).append(obj)
print('REDUCE', len(mesh_users), 'unique meshes', flush=True)
def trim_components(mesh, budget):
    if len(mesh.polygons)<=budget:return
    bm=bmesh.new();bm.from_mesh(mesh);bm.verts.ensure_lookup_table()
    seen=set();components=[]
    for vertex in bm.verts:
        if vertex in seen:continue
        stack=[vertex];seen.add(vertex);verts=[];faces=set()
        while stack:
            v=stack.pop();verts.append(v);faces.update(v.link_faces)
            for edge in v.link_edges:
                other=edge.other_vert(v)
                if other not in seen:seen.add(other);stack.append(other)
        if faces:
            extent=max((max(v.co[i] for v in verts)-min(v.co[i] for v in verts)) for i in range(3))
            components.append((extent,faces,verts))
    components.sort(key=lambda part:part[0],reverse=True)
    keep=set();cost=0
    for extent,faces,verts in components:
        if cost+len(faces)<=budget or not keep:keep.update(verts);cost+=len(faces)
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v not in keep],context='VERTS')
    bm.to_mesh(mesh);bm.free()
def leaf_cards(mesh):
    """Fit authored textured leaves to cards; keep branch geometry separate.

    Collapsing whole trees removes leaves first and produces torn silhouettes.
    The UV fit retains the author's leaf artwork and placement instead.
    """
    leaf_slots = {i for i, m in enumerate(mesh.materials) if m and (any(t in m.name.lower() for t in ['leaf','leav','flower','foliage','blossom','petal']) or (m.node_tree and any(n.bl_idname == 'ShaderNodeTexImage' and n.image and any(t in n.image.name.lower() for t in ['opacity', 'alpha']) for n in m.node_tree.nodes)))}
    if not leaf_slots or not mesh.uv_layers.active: return None
    leaf_polys = [p for p in mesh.polygons if p.material_index in leaf_slots]
    if len(leaf_polys) < 1000: return None
    parents = list(range(len(mesh.vertices)))
    def find(x):
        while parents[x] != x:
            parents[x] = parents[parents[x]]; x = parents[x]
        return x
    for poly in leaf_polys:
        root = find(poly.vertices[0])
        for v in poly.vertices[1:]: parents[find(v)] = root
    groups = {}
    for poly in leaf_polys: groups.setdefault((find(poly.vertices[0]), poly.material_index), []).append(poly)
    if len(groups) < 8: return None
    cards = []
    ordered = sorted(groups.items(), key=lambda item: ((item[0][0] * 2654435761) % 4294967296))[:1200 if compact else 3200]
    coverage = min(4.5 if compact else 2.8, math.sqrt(len(groups)/len(ordered)))
    uv_data = mesh.uv_layers.active.data
    for (_, material_index), polys in ordered:
        points, uvs = [], []
        for poly in polys:
            for loop in poly.loop_indices:
                points.append(mesh.vertices[mesh.loops[loop].vertex_index].co[:]); uvs.append(uv_data[loop].uv[:])
        p, uv = np.asarray(points), np.asarray(uvs)
        lo, hi = uv.min(axis=0), uv.max(axis=0)
        if min(hi - lo) < .00001: continue
        corners = np.array([[lo[0], lo[1]], [hi[0], lo[1]], [hi[0], hi[1]], [lo[0], hi[1]]])
        fit = np.linalg.lstsq(np.column_stack((uv, np.ones(len(uv)))), p, rcond=None)[0]
        coords = np.column_stack((corners, np.ones(4))) @ fit
        if np.max(np.linalg.norm(coords - p.mean(axis=0), axis=1)) > np.linalg.norm(p.max(axis=0) - p.min(axis=0)) * 2: continue
        # A sampled card represents a small cluster of source leaves. Preserve
        # canopy coverage when reducing tens of thousands of individual leaves.
        center=coords.mean(axis=0);coords=center+(coords-center)*coverage
        cards.append((coords.tolist(), corners.tolist(), material_index))
    if not cards: return None
    bark = mesh.copy(); bm = bmesh.new(); bm.from_mesh(bark)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in leaf_slots], context='FACES')
    bm.to_mesh(bark); bm.free()
    temp = bpy.data.objects.new('Branch detail', bark); bpy.context.scene.collection.objects.link(temp)
    bpy.context.view_layer.objects.active = temp; temp.select_set(True)
    # Thin connected branch tubes tear into fans when collapsed to a few faces.
    # Preserve enough rings to retain their silhouette at walking distance.
    branch_budget=4000 if compact else 16000
    if len(bark.polygons) > branch_budget:
        print('BRANCH_REDUCTION',mesh.name,len(bark.polygons),'to',branch_budget,flush=True)
        modifier = temp.modifiers.new('Branch detail budget', 'DECIMATE'); modifier.ratio = branch_budget / len(bark.polygons); modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    bark = temp.data
    trim_components(bark,branch_budget*2)
    coords = [v.co[:] for v in bark.vertices]; faces = [tuple(p.vertices) for p in bark.polygons]
    material_indices = [p.material_index for p in bark.polygons]
    uvs = [[tuple(bark.uv_layers.active.data[i].uv) for i in p.loop_indices] for p in bark.polygons]
    for card, uv, material_index in cards:
        offset = len(coords); coords.extend(card); faces.append(tuple(range(offset, offset + 4))); uvs.append(uv); material_indices.append(material_index)
    result = bpy.data.meshes.new(mesh.name + ' runtime leaves'); result.from_pydata(coords, [], faces)
    for material in mesh.materials: result.materials.append(material)
    layer = result.uv_layers.new(name='UVMap')
    for poly, material_index, uv in zip(result.polygons, material_indices, uvs):
        poly.material_index = material_index; poly.use_smooth = True
        for loop, point in zip(poly.loop_indices, uv): layer.data[loop].uv = point
    bpy.data.objects.remove(temp, do_unlink=True)
    if bark.users == 0: bpy.data.meshes.remove(bark)
    print('LEAF_CARDS', mesh.name, len(groups), 'to', len(cards), flush=True)
    return result
reduced_meshes={}
for index, (mesh, users) in enumerate(mesh_users.items()):
    names = ' '.join(o.name for o in users).lower()
    count = len(mesh.polygons)
    terrain = any(word in names for word in ['landscape', 'terrain', 'sands', 'sea', 'plane.025'])
    vegetation = any(word in names for word in ['tree', 'leaf', 'leav', 'grass', 'flower', 'bush', 'plant', 'branch']) or (season == 'winter' and count > 10000)
    target = 22000 if terrain else 1800 if vegetation else 1800 if compact else 5000
    if count <= target: continue
    signature=None
    if vegetation or season=='winter':
        digest=hashlib.sha256()
        for collection,attribute,width,dtype in [(mesh.vertices,'co',3,np.float32),(mesh.loops,'vertex_index',1,np.int32),(mesh.polygons,'material_index',1,np.int32)]:
            array=np.empty(len(collection)*width,dtype=dtype);collection.foreach_get(attribute,array);digest.update(array.tobytes())
        if mesh.uv_layers.active:
            array=np.empty(len(mesh.loops)*2,dtype=np.float32);mesh.uv_layers.active.data.foreach_get('uv',array);digest.update(array.tobytes())
        digest.update('|'.join(re.sub(r'\.\d+$','',m.name) if m else '' for m in mesh.materials).encode())
        signature=digest.hexdigest()
        if signature in reduced_meshes:
            replacement=reduced_meshes[signature].copy();replacement.materials.clear()
            for m in mesh.materials:replacement.materials.append(m)
            for user in users:user.data=replacement
            if mesh.users==0:bpy.data.meshes.remove(mesh)
            print('REUSED_TREE_REDUCTION',index,flush=True)
            continue
    replacement = leaf_cards(mesh) if count > 15000 and (vegetation or season == 'winter') else None
    if replacement:
        if signature:reduced_meshes[signature]=replacement
        for user in users: user.data = replacement
        if mesh.users == 0: bpy.data.meshes.remove(mesh)
        continue
    temp = bpy.data.objects.new('Runtime simplification', mesh.copy())
    bpy.context.scene.collection.objects.link(temp)
    bpy.context.view_layer.objects.active = temp
    temp.select_set(True)
    modifier = temp.modifiers.new('Runtime detail budget', 'DECIMATE')
    modifier.ratio = target / count
    modifier.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    replacement = temp.data
    if signature:reduced_meshes[signature]=replacement
    if vegetation:trim_components(replacement,max(2500,target*2))
    for user in users: user.data = replacement
    bpy.data.objects.remove(temp, do_unlink=True)
    if mesh.users == 0: bpy.data.meshes.remove(mesh)
    if index % 12 == 0: print('REDUCED', index, flush=True)
gc.collect()

# Preserve an authored environment panorama when the source supplies one.
background = None
if scene.world and scene.world.node_tree:
    sky_node = next((n for n in scene.world.node_tree.nodes if n.bl_idname == 'ShaderNodeTexEnvironment' and n.image), None)
    if sky_node:
        image = sky_node.image
        w, h = image.size
        if w and h:
            image.scale(min(w, 2048), max(1, round(h * min(1, 2048 / w))))
            previous_format = scene.render.image_settings.file_format
            scene.render.image_settings.file_format = 'JPEG'; scene.render.image_settings.quality = 88
            image.save_render(str(OUT / 'sky.jpg'), scene=scene)
            scene.render.image_settings.file_format = previous_format
            background = f'/seasons/{season}/sky.jpg'
            image.buffers_free()
            print('BACKGROUND', image.name, flush=True)

# Restore embedded, portable scatter graphs with a deliberately bounded density.
for modifier, viewport, render in disabled:
    if modifier.type == 'NODES' and modifier.node_group and season in {'summer', 'winter'}:
        modifier.show_viewport = modifier.show_render = True
for group in bpy.data.node_groups:
    if group.bl_idname != 'GeometryNodeTree': continue
    for node in group.nodes:
        if node.bl_idname == 'GeometryNodeDistributePointsOnFaces':
            for socket in node.inputs:
                if 'density' in socket.name.lower() and not socket.is_linked and hasattr(socket, 'default_value'):
                    socket.default_value = min(float(socket.default_value), .12)

# Reconnect authored albedo/opacity to simple glTF PBR shaders. Cycles-only layers stay offline.
materials = {m for obj in all_objects if obj.type == 'MESH' for m in obj.data.materials if m}
jobs, bindings, extracted = [], {}, {}
def material_nodes(tree, seen=None):
    if not tree:return []
    seen=seen or set()
    if tree in seen:return []
    seen.add(tree);nodes=list(tree.nodes)
    return nodes+[child for node in nodes if node.bl_idname=='ShaderNodeGroup' and node.node_tree for child in material_nodes(node.node_tree,seen)]
def extract(image):
    if not image: return None
    if image.name in extracted: return extracted[image.name]
    extension = Path(image.filepath).suffix.lower() or '.png'
    target = TEMP / (hashlib.sha1(image.name.encode()).hexdigest()[:14] + extension)
    if image.packed_file:
        target.write_bytes(image.packed_file.data)
    else:
        external = Path(bpy.path.abspath(image.filepath))
        if not external.exists(): return None
        target.write_bytes(external.read_bytes())
    extracted[image.name] = str(target)
    return str(target)
def upstream_image(socket, visited=None):
    visited = visited or set()
    for link in socket.links:
        node = link.from_node
        if node in visited: continue
        visited.add(node)
        if node.bl_idname == 'ShaderNodeTexImage' and node.image: return node.image
        for child in node.inputs:
            image = upstream_image(child, visited)
            if image: return image
    return None
for material in materials:
    nodes = material_nodes(material.node_tree)
    material['runtime_invisible'] = any(n.bl_idname=='ShaderNodeBsdfTransparent' for n in nodes) and not any(n.bl_idname in {'ShaderNodeBsdfPrincipled','ShaderNodeBsdfDiffuse','ShaderNodeEmission','ShaderNodeGroup'} for n in nodes)
    material['runtime_volume'] = any(n.bl_idname in {'ShaderNodeVolumePrincipled', 'ShaderNodeVolumeScatter', 'ShaderNodeVolumeAbsorption'} for n in nodes) and not any(n.bl_idname=='ShaderNodeOutputMaterial' and n.inputs['Surface'].is_linked for n in nodes)
    shader = next((n for n in nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled'), None)
    images = [n.image for n in nodes if n.bl_idname == 'ShaderNodeTexImage' and n.image]
    base = upstream_image(shader.inputs['Base Color']) if shader else None
    if not base:
        base = next((i for i in images if any(t in i.name.lower() for t in ['albedo', 'diff', 'basecolor', 'base_color', 'color'])), None)
    if not base:
        base = next((i for i in images if not any(t in i.name.lower() for t in ['normal','height','rough','gloss','opacity','alpha','displace','ambient','_ao'])), None)
    opacity = next((i for i in images if any(t in i.name.lower() for t in ['opacity', 'alpha', 'mask'])), None)
    color = list(shader.inputs['Base Color'].default_value) if shader else list(material.diffuse_color)
    roughness = max(.45, float(shader.inputs['Roughness'].default_value)) if shader else .85
    if not base:
        ramps=[n for n in nodes if n.bl_idname=='ShaderNodeValToRGB']
        if ramps:
            elements=ramps[-1].color_ramp.elements
            color=[sum(e.color[c] for e in elements)/len(elements) for c in range(4)]
    file = extract(base)
    if file:
        tint='autumn' if season=='autumn' and any(t in material.name.lower() for t in ['leaf','leav','foliage']) else 'blossom' if season=='spring' and any(t in material.name.lower() for t in ['flower','blossom','petal']) else None
        target = str(TEMP / (hashlib.sha1((base.name + (opacity.name if opacity else '')+(tint or '')).encode()).hexdigest()[:14] + '-runtime.png'))
        job = {'source': file, 'opacity': extract(opacity), 'target': target, 'tint':tint}
        jobs.append(job); bindings[material.name] = job
    material['runtime_color'] = color
    material['runtime_roughness'] = roughness
job_path = TEMP / 'jobs.json'
job_path.write_text(json.dumps(jobs))
subprocess.run([image_python, str(ROOT / 'Website/scripts/resize-season-textures.py'), str(job_path)], check=True)
results = {j['target']: j for j in json.loads(job_path.read_text())}
for material in materials:
    color = material['runtime_color'][:]
    roughness = material['runtime_roughness']
    material.use_nodes = True
    material.node_tree.nodes.clear()
    tree = material.node_tree
    output = tree.nodes.new('ShaderNodeOutputMaterial')
    shader = tree.nodes.new('ShaderNodeBsdfPrincipled')
    shader.inputs['Base Color'].default_value = color
    shader.inputs['Roughness'].default_value = roughness
    if season=='summer' and material.name=='Material.005':
        shader.inputs['Base Color'].default_value=(.015,.28,.34,1);shader.inputs['Roughness'].default_value=.22
    shader.inputs['Specular IOR Level'].default_value = .25
    tree.links.new(shader.outputs['BSDF'], output.inputs['Surface'])
    binding = bindings.get(material.name)
    if binding and not results[binding['target']].get('error'):
        image = bpy.data.images.load(binding['target'], check_existing=True)
        texture = tree.nodes.new('ShaderNodeTexImage'); texture.image = image
        tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
        if results[binding['target']].get('alpha'):
            cutoff = tree.nodes.new('ShaderNodeMath'); cutoff.operation = 'GREATER_THAN'; cutoff.inputs[1].default_value = .45
            tree.links.new(texture.outputs['Alpha'], cutoff.inputs[0]); tree.links.new(cutoff.outputs[0], shader.inputs['Alpha'])
            material.surface_render_method = 'DITHERED'; material.use_backface_culling = False

# Remove volumetric enclosures, invisible source libraries and the author's camera/lights from export.
for obj in list(scene.objects):
    if obj.name.lower().startswith(('fogg','cloudes')):obj.hide_render=True
    if obj.type == 'MESH' and obj.data.materials and all(m and m.get('runtime_invisible') for m in obj.data.materials): obj.hide_render=True
    if obj.type == 'MESH' and any(m and m.get('runtime_volume') for m in obj.data.materials):
        obj.hide_render = True
bpy.context.window.scene = scene
bpy.context.view_layer.update()
print('SCENE_READY', season, flush=True)
depsgraph=bpy.context.evaluated_depsgraph_get()
instances={}
for instance in depsgraph.object_instances:
    if instance.is_instance: instances[instance.object.original.name]=instances.get(instance.object.original.name,0)+1
print('SCATTER_INSTANCES', json.dumps(instances), flush=True)

# Geometry export is independent of navigation validation. The Node baker reads
# these exact glTF meshes, so a navigation correction never repeats simplification.
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    if obj.type in {'MESH', 'EMPTY'} and not obj.hide_render and obj.visible_get(): obj.select_set(True)
model = OUT / ('world-mobile.glb' if compact else 'world.glb')
print('EXPORT', season, flush=True)
bpy.ops.export_scene.gltf(filepath=str(model), export_format='GLB', use_selection=True, export_animations=False, export_cameras=False, export_lights=False, export_gpu_instances=True, export_gn_mesh=True, export_image_format='AUTO', export_materials='EXPORT', export_meshopt_compression_enable=True, export_meshopt_extension='EXT_meshopt_compression')
print('EXPORTED_GEOMETRY', season, model.stat().st_size, flush=True)
