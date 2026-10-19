"""Offline QA renders for exported kit assets. Not used at runtime."""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'Assets and working files/seasons/kit/previews'
OUT.mkdir(exist_ok=True)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['fir-0-near','basket-0-near','grass-0-near']
for asset in args:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=str(ROOT/'Website/public/seasons/kit/models'/f'{asset}.glb'))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 corners=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
 lo=Vector(tuple(min(p[i] for p in corners) for i in range(3)));hi=Vector(tuple(max(p[i] for p in corners) for i in range(3)))
 center=(hi+lo)/2;radius=max(hi-lo)*.55
 bpy.ops.mesh.primitive_plane_add(size=radius*6,location=(center.x,center.y,lo.z-.01))
 ground=bpy.context.object;mat=bpy.data.materials.new('QA ground');mat.diffuse_color=(.28,.31,.22,1);ground.data.materials.append(mat)
 bpy.ops.object.light_add(type='SUN',location=(0,0,10));sun=bpy.context.object;sun.rotation_euler=(math.radians(30),math.radians(-25),math.radians(-25));sun.data.energy=3;sun.data.angle=.1
 bpy.ops.object.camera_add(location=center+Vector((radius*1.5,-radius*2.3,radius*.45)))
 cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=radius*2.5
 scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
 scene.world.color=(.35,.4,.46);scene.render.resolution_x=600;scene.render.resolution_y=700;scene.render.resolution_percentage=100
 scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/f'{asset}.png')
 bpy.ops.render.render(write_still=True)
