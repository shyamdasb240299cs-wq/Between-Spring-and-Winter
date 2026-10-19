"""Read-only Blender source audit. Run with --disable-autoexec in background."""
import bpy, json, sys
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parents[2] / 'Assets and working files/seasons'
source = root / 'sources' / Path(sys.argv[sys.argv.index('--') + 1]).name if '--' in sys.argv else Path(bpy.data.filepath)
season = source.stem.split('.')[0]
if '--' in sys.argv:
    with bpy.data.libraries.load(str(source), link=False) as (available, selected):
        selected.scenes = [available.scenes[0]]
    scene = selected.scenes[0]
else:
    scene = bpy.context.scene
objects = []
for obj in scene.objects:
    bounds = [obj.matrix_world @ Vector(c) for c in obj.bound_box] if obj.type == 'MESH' else []
    objects.append({
        'name': obj.name, 'type': obj.type,
        'vertices': len(obj.data.vertices) if obj.type == 'MESH' else 0,
        'polygons': len(obj.data.polygons) if obj.type == 'MESH' else 0,
        'bounds': [[min(v[i] for v in bounds) for i in range(3)], [max(v[i] for v in bounds) for i in range(3)]] if bounds else None,
        'location': list(obj.location), 'rotation': list(obj.rotation_euler),
        'modifiers': [{'name': m.name, 'type': m.type} for m in obj.modifiers],
        'materials': [m.name for m in obj.data.materials if m] if obj.type == 'MESH' else [],
        'hidden': obj.hide_render,
        'instances': obj.instance_type,
        'instance_collection': obj.instance_collection.name if obj.instance_collection else None,
    })
report = {
    'season': season, 'blender': bpy.app.version_string,
    'camera': scene.camera.name if scene.camera else None,
    'objects': objects,
    'collections': [{'name': c.name, 'objects': len(c.objects)} for c in bpy.data.collections],
    'materials': [{'name': m.name, 'nodes': [n.bl_idname for n in m.node_tree.nodes] if m.use_nodes else []} for m in bpy.data.materials],
    'images': [{'name': i.name, 'packed': bool(i.packed_file), 'path': i.filepath} for i in bpy.data.images],
    'camera_pose': {'position': list(scene.camera.location), 'rotation': list(scene.camera.rotation_euler)} if scene.camera else None,
    'node_groups': [{'name': g.name, 'nodes': [{'name': n.name, 'type': n.bl_idname, 'inputs': {s.name: str(s.default_value) for s in n.inputs if hasattr(s, 'default_value') and not s.is_linked}} for n in g.nodes]} for g in bpy.data.node_groups if g.bl_idname == 'GeometryNodeTree'],
}
(root / (season + '-audit.json')).write_text(json.dumps(report, indent=2))
print('SEASON_AUDIT', season, 'objects', len(objects), 'polygons', sum(o['polygons'] for o in objects), 'images', len(report['images']), flush=True)
