"""Offline secondary-object LODs; keep original close-up models and all PBR maps."""
import bpy
from pathlib import Path

root=Path(__file__).resolve().parents[1]
for source,target,ratio in [('polished/moss-rocks.glb','polished/moss-rocks-far.glb',.12),('jagobo/lantern.glb','jagobo/lantern-far.glb',.32)]:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(root/'public/void/models'/source))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for obj in meshes:
        bpy.context.view_layer.objects.active=obj
        modifier=obj.modifiers.new('Distant silhouette','DECIMATE')
        modifier.ratio=ratio
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(root/'public/void/models'/target),export_format='GLB',use_selection=True,export_animations=False)
