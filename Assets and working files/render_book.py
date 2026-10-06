import bpy,math
from pathlib import Path
from mathutils import Vector
root=Path(r'C:/Users/Shyam/Documents/Codex/2026-10-01/so-x20')
bpy.ops.wm.open_mainfile(filepath=str(root/'outputs/between-seasons.blend'))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.world.color=(.25,.25,.25)
bpy.ops.object.camera_add(location=(4.5,1,11));camera=bpy.context.object;camera.rotation_euler=(-.08,math.atan(4.5/11),.025);camera.data.type='ORTHO';camera.data.ortho_scale=6.3;scene.camera=camera
for name,loc,power,size in [('Key',(-3,5,7),650,5),('Fill',(4,-2,5),350,4),('Rim',(-2,3,-3),600,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);lamp=bpy.context.object;lamp.name=name;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size;lamp.rotation_euler=(Vector((0,0,0))-lamp.location).to_track_quat('-Z','Y').to_euler()
(root/'outputs').mkdir(exist_ok=True)
scene.render.filepath=str(root/'outputs/book-studio.png');bpy.ops.render.render(write_still=True)
mat=bpy.data.materials.new('Part One print');mat.use_nodes=True;nodes=mat.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(root/'work/part-one-render.png'));mat.node_tree.links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color']);nodes.get('Principled BSDF').inputs['Roughness'].default_value=.9
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,0,.0295));page=bpy.context.object;page.scale=(1.42,2.17,1);page.data.materials.append(mat)
scene.render.filepath=str(root/'outputs/book-open-studio.png');bpy.data.objects['CoverHinge'].rotation_euler.y=-math.pi;camera.location=(-1.42,0,11);camera.rotation_euler=(0,0,0);camera.data.ortho_scale=7.3;bpy.ops.render.render(write_still=True)
print('STUDIO_RENDERS_READY')
