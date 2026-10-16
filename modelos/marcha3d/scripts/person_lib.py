
import bpy, bmesh, numpy as np
from bl_ext.user_default.mpfb.services import HumanService
def make_person(height=0.4, age=0.82, weight=0.58):
    for n in [o.name for o in bpy.data.objects if o.name.startswith('Human')]:
        bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)
    info=HumanService._create_default_human_info_dict()
    info['phenotype'].update(gender=1.0, age=age, muscle=0.5, weight=weight, proportions=0.6, height=height)
    info['phenotype']['race']={'asian':0.45,'caucasian':0.45,'african':0.10}
    f=lambda n:f'{n}/{n}.mhclo'
    info.update(rig='game_engine', eyes=f('high-poly'), eyebrows=f('eyebrow001'), eyelashes=f('eyelashes01'), teeth=f('teeth_base'), tongue=f('tongue01'), hair=f('short02'),
        skin_mhmat='middleage_caucasian_male/middleage_caucasian_male.mhmat', skin_material_type='MAKESKIN', eyes_material_type='MAKESKIN',
        clothes=[f('male_casualsuit06'),f('shoes06')])
    s=HumanService.get_default_deserialization_settings(); s['subdiv_levels']=0
    body=HumanService.deserialize_from_dict(info, s)
    rig=bpy.data.objects['Human.rig']
    knee=(rig.matrix_world@rig.data.bones['calf_l'].head_local).z
    cut=knee+0.035
    vg=body.vertex_groups['Delete.male_casualsuit06']
    vg.remove([v.index for v in body.data.vertices if v.co.z<cut+0.025 and any(g.group==vg.index for g in v.groups)])
    cl=bpy.data.objects['Human.male_casualsuit06']
    b=bmesh.new(); b.from_mesh(cl.data); bmesh.ops.delete(b, geom=[v for v in b.verts if v.co.z<cut], context='VERTS'); b.to_mesh(cl.data); b.free()
    # texturas limpias (camiseta sin logo, pelo canoso)
    T=r"G:\CLAUDE CODE\medicina\semiologia\modelos\marcha3d\textures"
    for o,old,new in (('Human.male_casualsuit06','male_casualsuit06_diffuse','camiseta_jean_diffuse.png'),('Human.short02','short02_diffuse','pelo_canoso.png')):
        m=bpy.data.objects[o].active_material
        for n in m.node_tree.nodes:
            if n.type=='TEX_IMAGE' and n.image and n.image.name.startswith(old):
                n.image=bpy.data.images.load(T+'\\'+new, check_existing=True)
    dg=bpy.context.evaluated_depsgraph_get()
    zs=[v.co.z for v in body.evaluated_get(dg).data.vertices]
    return max(zs)
