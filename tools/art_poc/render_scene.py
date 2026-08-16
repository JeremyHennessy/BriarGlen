import bpy
import json
import math
import os
import sys
from mathutils import Vector


def output_dir():
    args = sys.argv
    if "--" in args:
        extra = args[args.index("--") + 1:]
        if "--output" in extra:
            return os.path.abspath(extra[extra.index("--output") + 1])
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "generated"))


OUT = output_dir()
os.makedirs(OUT, exist_ok=True)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def material(name, rgba, metallic=0.0, roughness=0.72):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
    return mat


def apply_material(obj, mat):
    if len(obj.data.materials):
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def add_box(name, loc, dims, mat, bevel=0.08, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, mat)
    if bevel:
        mod = obj.modifiers.new("soft_edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
    return obj


def add_ico(name, loc, scale, mat, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, mat)
    bevel = obj.modifiers.new("soft_edges", "BEVEL")
    bevel.width = 0.035
    bevel.segments = 2
    return obj


def add_cylinder(name, loc, radius, depth, mat, vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    obj = bpy.context.object
    obj.name = name
    apply_material(obj, mat)
    bevel = obj.modifiers.new("soft_edges", "BEVEL")
    bevel.width = min(radius * 0.18, 0.08)
    bevel.segments = 2
    return obj


def add_roof(offset=(0, 0, 0)):
    ox, oy, oz = offset
    verts = [
        (-2.35 + ox, -1.72 + oy, 2.15 + oz),
        (2.35 + ox, -1.72 + oy, 2.15 + oz),
        (-2.35 + ox, 1.72 + oy, 2.15 + oz),
        (2.35 + ox, 1.72 + oy, 2.15 + oz),
        (0.0 + ox, -1.72 + oy, 3.38 + oz),
        (0.0 + ox, 1.72 + oy, 3.38 + oz),
    ]
    faces = [
        (0, 2, 5, 4),
        (1, 4, 5, 3),
        (0, 4, 1),
        (2, 3, 5),
    ]
    mesh = bpy.data.meshes.new("cottage_roof_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("cottage_roof", mesh)
    bpy.context.collection.objects.link(obj)
    apply_material(obj, material("roof_clay", (0.28, 0.095, 0.065, 1.0), roughness=0.84))
    bevel = obj.modifiers.new("soft_edges", "BEVEL")
    bevel.width = 0.09
    bevel.segments = 2
    return obj


def build_cottage(offset=(0, 0, 0)):
    ox, oy, oz = offset
    plaster = material("warm_plaster", (0.72, 0.58, 0.38, 1.0))
    timber = material("dark_timber", (0.19, 0.105, 0.055, 1.0))
    door_mat = material("oak_door", (0.30, 0.16, 0.07, 1.0))
    glass = material("window_blue", (0.19, 0.43, 0.48, 1.0), roughness=0.35)
    stone = material("chimney_stone", (0.34, 0.32, 0.28, 1.0))

    add_box("cottage_body", (ox, oy, 1.05 + oz), (4.2, 3.0, 2.1), plaster, 0.12)
    add_roof(offset)

    # Timber frame on the front-facing wall.
    for x in (-1.72, 0.0, 1.72):
        add_box("front_post", (ox + x, oy - 1.535, 1.12 + oz), (0.14, 0.12, 2.12), timber, 0.035)
    add_box("front_beam", (ox, oy - 1.54, 1.92 + oz), (4.08, 0.13, 0.14), timber, 0.035)
    add_box("front_sill", (ox, oy - 1.54, 0.18 + oz), (4.08, 0.13, 0.13), timber, 0.03)

    # Door and windows.
    add_box("door", (ox, oy - 1.61, 0.83 + oz), (0.88, 0.11, 1.56), door_mat, 0.055)
    add_box("window_left", (ox - 1.18, oy - 1.61, 1.16 + oz), (0.72, 0.08, 0.72), glass, 0.045)
    add_box("window_right", (ox + 1.20, oy - 1.61, 1.16 + oz), (0.72, 0.08, 0.72), glass, 0.045)
    for wx in (-1.18, 1.20):
        add_box("window_cross_v", (ox + wx, oy - 1.66, 1.16 + oz), (0.055, 0.055, 0.74), timber, 0.015)
        add_box("window_cross_h", (ox + wx, oy - 1.66, 1.16 + oz), (0.74, 0.055, 0.055), timber, 0.015)

    # Small stone chimney gives the silhouette more character.
    add_box("chimney", (ox + 1.24, oy + 0.48, 3.05 + oz), (0.48, 0.48, 1.45), stone, 0.08)
    add_box("chimney_cap", (ox + 1.24, oy + 0.48, 3.80 + oz), (0.62, 0.62, 0.18), stone, 0.06)



def build_tree(offset=(0, 0, 0)):
    ox, oy, oz = offset
    trunk = material("tree_bark", (0.20, 0.115, 0.055, 1.0))
    leaf_a = material("leaf_moss", (0.19, 0.37, 0.16, 1.0))
    leaf_b = material("leaf_sage", (0.29, 0.49, 0.22, 1.0))
    leaf_c = material("leaf_light", (0.40, 0.57, 0.25, 1.0))
    add_cylinder("trunk", (ox, oy, 1.35 + oz), 0.34, 2.7, trunk, vertices=10)
    add_ico("canopy_center", (ox, oy, 3.08 + oz), (1.32, 1.12, 1.18), leaf_a)
    add_ico("canopy_left", (ox - 0.78, oy - 0.12, 2.85 + oz), (0.87, 0.78, 0.83), leaf_b)
    add_ico("canopy_right", (ox + 0.78, oy + 0.05, 2.92 + oz), (0.90, 0.82, 0.90), leaf_b)
    add_ico("canopy_top", (ox + 0.10, oy + 0.04, 3.92 + oz), (0.88, 0.78, 0.82), leaf_c)



def build_crate(offset=(0, 0, 0)):
    ox, oy, oz = offset
    wood = material("crate_wood", (0.45, 0.25, 0.09, 1.0))
    dark = material("crate_trim", (0.23, 0.12, 0.045, 1.0))
    add_box("crate_body", (ox, oy, 0.55 + oz), (1.20, 1.20, 1.10), wood, 0.07)
    for z in (0.13, 0.98):
        add_box("crate_band", (ox, oy - 0.625, z + oz), (1.28, 0.09, 0.12), dark, 0.025)
    for x in (-0.48, 0.48):
        add_box("crate_post", (ox + x, oy - 0.63, 0.55 + oz), (0.11, 0.09, 1.10), dark, 0.025)



def build_ore(offset=(0, 0, 0)):
    ox, oy, oz = offset
    rock = material("ore_rock", (0.27, 0.30, 0.31, 1.0))
    copper = material("copper", (0.62, 0.27, 0.095, 1.0), metallic=0.22, roughness=0.48)
    add_ico("ore_base", (ox, oy, 0.62 + oz), (1.14, 0.90, 0.65), rock, subdivisions=1)
    for x, y, z, s in [(-0.45, -0.20, 0.92, 0.30), (0.10, -0.42, 0.76, 0.24), (0.48, -0.08, 0.72, 0.20)]:
        add_ico("copper_chunk", (ox + x, oy + y, oz + z), (s, s * 0.75, s * 0.90), copper, subdivisions=1)



def build_island_scene():
    grass = material("grass", (0.25, 0.43, 0.18, 1.0))
    grass_edge = material("grass_edge", (0.17, 0.27, 0.12, 1.0))
    path = material("path", (0.57, 0.44, 0.26, 1.0))
    add_box("island_edge", (0, 0, -0.18), (10.8, 8.3, 0.50), grass_edge, 0.22, rotation=(0, 0, math.radians(2)))
    add_box("island_top", (0, 0, 0.06), (10.5, 8.0, 0.24), grass, 0.20, rotation=(0, 0, math.radians(2)))
    add_box("path", (0.1, -1.35, 0.20), (8.7, 1.18, 0.10), path, 0.17, rotation=(0, 0, math.radians(-7)))
    build_cottage((-1.0, 0.75, 0.20))
    build_tree((3.15, 1.45, 0.18))
    build_tree((-3.85, 2.25, 0.18))
    build_crate((1.95, -1.65, 0.20))
    build_crate((2.85, -1.35, 0.20))
    build_ore((-3.45, -1.95, 0.18))



def point_camera(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()



def setup_render(ortho_scale, target=(0, 0, 1.6), width=512, height=512):
    scene = bpy.context.scene
    if bpy.app.version >= (4, 2, 0):
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    else:
        scene.render.engine = "BLENDER_EEVEE"

    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.image_settings.color_depth = "8"

    bpy.ops.object.camera_add(location=(7.7, -7.7, 6.6))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = ortho_scale
    point_camera(camera, target)
    scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=(-3.5, -4.5, 8.5))
    key = bpy.context.object
    key.data.energy = 850
    key.data.shape = "DISK"
    key.data.size = 5.0
    point_camera(key, target)

    bpy.ops.object.light_add(type="AREA", location=(5.0, 2.0, 5.0))
    fill = bpy.context.object
    fill.data.energy = 420
    fill.data.size = 6.0
    point_camera(fill, target)

    bpy.ops.object.light_add(type="SUN", location=(0, 0, 6))
    sun = bpy.context.object
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-32))
    sun.data.energy = 1.45
    sun.data.angle = math.radians(18)

    scene.world.color = (0.055, 0.065, 0.070)
    return scene


def render_asset(name, builder, ortho_scale, target=(0, 0, 1.6), width=512, height=512):
    clear_scene()
    builder()
    scene = setup_render(ortho_scale, target=target, width=width, height=height)
    path = os.path.join(OUT, name + ".png")
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


renders = [
    ("cottage", build_cottage, 6.6, (0, 0, 1.65), 512, 512),
    ("tree", build_tree, 5.6, (0, 0, 2.1), 512, 512),
    ("crate", build_crate, 2.8, (0, 0, 0.60), 384, 384),
    ("copper_ore", build_ore, 3.0, (0, 0, 0.65), 384, 384),
    ("scene", build_island_scene, 13.0, (0, 0, 1.15), 960, 640),
]

for spec in renders:
    render_asset(*spec)

manifest = {
    "proof": "Briar Glen Option B 3D-to-2D sprite pipeline",
    "blender_version": bpy.app.version_string,
    "camera": "orthographic 3/4 isometric-style fixed camera",
    "background": "transparent RGBA PNG",
    "assets": [spec[0] + ".png" for spec in renders],
    "production_game_modified": False,
}
with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as handle:
    json.dump(manifest, handle, indent=2)

print(json.dumps(manifest, indent=2))
