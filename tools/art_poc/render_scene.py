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


def material(name, rgba, metallic=0.0, roughness=0.78):
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
    if not hasattr(obj.data, "materials"):
        return
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


def add_ico(name, loc, scale, mat, subdivisions=2, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions, radius=1.0, location=loc, rotation=rotation
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, mat)
    bevel = obj.modifiers.new("soft_edges", "BEVEL")
    bevel.width = 0.035
    bevel.segments = 2
    return obj


def add_cylinder(name, loc, radius, depth, mat, vertices=12, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rotation
    )
    obj = bpy.context.object
    obj.name = name
    apply_material(obj, mat)
    bevel = obj.modifiers.new("soft_edges", "BEVEL")
    bevel.width = min(radius * 0.16, 0.08)
    bevel.segments = 2
    return obj


def add_cone(name, loc, radius1, radius2, depth, mat, vertices=16):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=loc,
    )
    obj = bpy.context.object
    obj.name = name
    apply_material(obj, mat)
    bevel = obj.modifiers.new("soft_edges", "BEVEL")
    bevel.width = 0.045
    bevel.segments = 2
    return obj


def add_roof(offset=(0, 0, 0)):
    ox, oy, oz = offset
    verts = [
        (-2.45 + ox, -1.76 + oy, 2.18 + oz),
        (2.45 + ox, -1.76 + oy, 2.18 + oz),
        (-2.45 + ox, 1.76 + oy, 2.18 + oz),
        (2.45 + ox, 1.76 + oy, 2.18 + oz),
        (0.0 + ox, -1.76 + oy, 3.48 + oz),
        (0.0 + ox, 1.76 + oy, 3.48 + oz),
    ]
    faces = [(0, 2, 5, 4), (1, 4, 5, 3), (0, 4, 1), (2, 3, 5)]
    mesh = bpy.data.meshes.new("cottage_roof_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("cottage_roof", mesh)
    bpy.context.collection.objects.link(obj)
    apply_material(
        obj,
        material("roof_clay", (0.34, 0.105, 0.068, 1.0), roughness=0.88),
    )
    bevel = obj.modifiers.new("soft_edges", "BEVEL")
    bevel.width = 0.10
    bevel.segments = 2
    return obj


def build_cottage(offset=(0, 0, 0)):
    ox, oy, oz = offset
    plaster = material("warm_plaster", (0.78, 0.64, 0.44, 1.0), roughness=0.90)
    timber = material("dark_timber", (0.20, 0.105, 0.05, 1.0), roughness=0.86)
    oak = material("oak", (0.36, 0.19, 0.075, 1.0), roughness=0.84)
    glass = material("window_glass", (0.28, 0.49, 0.49, 1.0), roughness=0.32)
    stone = material("warm_stone", (0.39, 0.36, 0.31, 1.0), roughness=0.95)
    flower = material("flower_red", (0.62, 0.18, 0.16, 1.0), roughness=0.82)
    leaf = material("flower_leaf", (0.24, 0.40, 0.16, 1.0), roughness=0.88)

    add_box("cottage_body", (ox, oy, 1.08 + oz), (4.30, 3.05, 2.16), plaster, 0.13)
    add_roof(offset)

    for x in (-1.78, 0.0, 1.78):
        add_box("front_post", (ox + x, oy - 1.56, 1.15 + oz), (0.15, 0.12, 2.14), timber, 0.035)
    add_box("front_beam", (ox, oy - 1.565, 1.96 + oz), (4.16, 0.13, 0.15), timber, 0.035)
    add_box("front_sill", (ox, oy - 1.565, 0.18 + oz), (4.16, 0.13, 0.14), timber, 0.03)

    add_box(
        "brace_left",
        (ox - 1.08, oy - 1.62, 1.02 + oz),
        (0.12, 0.10, 1.35),
        timber,
        0.025,
        rotation=(0, math.radians(28), 0),
    )
    add_box(
        "brace_right",
        (ox + 1.08, oy - 1.62, 1.02 + oz),
        (0.12, 0.10, 1.35),
        timber,
        0.025,
        rotation=(0, math.radians(-28), 0),
    )

    add_box("door", (ox, oy - 1.64, 0.84 + oz), (0.90, 0.12, 1.58), oak, 0.06)
    for wx in (-1.22, 1.22):
        add_box("window", (ox + wx, oy - 1.64, 1.18 + oz), (0.74, 0.08, 0.74), glass, 0.045)
        add_box("window_v", (ox + wx, oy - 1.69, 1.18 + oz), (0.055, 0.055, 0.76), timber, 0.012)
        add_box("window_h", (ox + wx, oy - 1.69, 1.18 + oz), (0.76, 0.055, 0.055), timber, 0.012)

    add_box("chimney", (ox + 1.34, oy + 0.48, 3.12 + oz), (0.50, 0.50, 1.50), stone, 0.08)
    add_box("chimney_cap", (ox + 1.34, oy + 0.48, 3.88 + oz), (0.66, 0.66, 0.18), stone, 0.055)

    add_box("flower_box", (ox - 1.20, oy - 1.72, 0.63 + oz), (1.02, 0.24, 0.22), oak, 0.035)
    for x in (-1.50, -1.18, -0.88):
        add_ico("flower_leaf", (ox + x, oy - 1.78, 0.84 + oz), (0.15, 0.10, 0.15), leaf, subdivisions=1)
        add_ico("flower", (ox + x, oy - 1.80, 0.98 + oz), (0.08, 0.08, 0.08), flower, subdivisions=1)


def build_tall_tree(offset=(0, 0, 0)):
    ox, oy, oz = offset
    bark = material("tree_bark", (0.205, 0.118, 0.058, 1.0), roughness=0.93)
    leaf_a = material("leaf_deep", (0.18, 0.34, 0.15, 1.0), roughness=0.92)
    leaf_b = material("leaf_mid", (0.29, 0.47, 0.21, 1.0), roughness=0.92)
    leaf_c = material("leaf_light", (0.42, 0.57, 0.27, 1.0), roughness=0.92)

    add_cylinder("trunk", (ox, oy, 1.72 + oz), 0.31, 3.44, bark, vertices=12)
    for x, y, z, rz in [
        (-0.42, 0.00, 2.55, -24),
        (0.43, 0.04, 2.78, 26),
        (-0.16, 0.18, 3.05, -11),
    ]:
        add_cylinder(
            "branch",
            (ox + x, oy + y, oz + z),
            0.12,
            1.25,
            bark,
            vertices=10,
            rotation=(0, math.radians(rz), 0),
        )

    clusters = [
        (-0.92, -0.12, 3.42, (0.90, 0.78, 0.82), leaf_b),
        (0.86, 0.05, 3.48, (0.94, 0.82, 0.88), leaf_b),
        (-0.18, 0.08, 4.18, (1.18, 1.00, 0.94), leaf_a),
        (0.18, -0.08, 4.95, (0.92, 0.80, 0.80), leaf_c),
        (-0.76, 0.10, 4.35, (0.78, 0.70, 0.72), leaf_a),
        (0.76, 0.10, 4.28, (0.76, 0.69, 0.70), leaf_c),
    ]
    for i, (x, y, z, scale, mat) in enumerate(clusters):
        add_ico(f"canopy_{i}", (ox + x, oy + y, oz + z), scale, mat, subdivisions=2)


def build_pine_tree(offset=(0, 0, 0)):
    ox, oy, oz = offset
    bark = material("pine_bark", (0.18, 0.105, 0.052, 1.0), roughness=0.94)
    needle_a = material("pine_deep", (0.105, 0.275, 0.19, 1.0), roughness=0.94)
    needle_b = material("pine_mid", (0.16, 0.37, 0.25, 1.0), roughness=0.94)
    needle_c = material("pine_tip", (0.25, 0.46, 0.29, 1.0), roughness=0.94)

    add_cylinder("pine_trunk", (ox, oy, 2.15 + oz), 0.25, 4.3, bark, vertices=12)
    add_cone("pine_low", (ox, oy, 2.55 + oz), 1.46, 0.18, 2.25, needle_a, vertices=18)
    add_cone("pine_mid", (ox, oy, 3.72 + oz), 1.17, 0.16, 2.10, needle_b, vertices=18)
    add_cone("pine_high", (ox, oy, 4.78 + oz), 0.82, 0.10, 1.74, needle_c, vertices=18)


def build_rock_cluster(offset=(0, 0, 0)):
    ox, oy, oz = offset
    stone_a = material("rock_warm", (0.38, 0.37, 0.34, 1.0), roughness=0.97)
    stone_b = material("rock_cool", (0.31, 0.34, 0.34, 1.0), roughness=0.97)
    moss = material("rock_moss", (0.28, 0.39, 0.18, 1.0), roughness=0.96)
    specs = [
        (-0.48, 0.03, 0.46, (0.72, 0.58, 0.52), stone_a, 18),
        (0.36, -0.04, 0.56, (0.82, 0.62, 0.66), stone_b, -12),
        (0.88, 0.14, 0.31, (0.48, 0.42, 0.34), stone_a, 25),
        (-0.96, 0.16, 0.28, (0.42, 0.38, 0.30), stone_b, -22),
    ]
    for i, (x, y, z, scale, mat, angle) in enumerate(specs):
        add_ico(
            f"rock_{i}",
            (ox + x, oy + y, oz + z),
            scale,
            mat,
            subdivisions=1,
            rotation=(math.radians(7), math.radians(angle), math.radians(angle * 0.4)),
        )
    add_ico("moss_patch", (ox - 0.28, oy - 0.46, oz + 0.72), (0.36, 0.18, 0.08), moss, subdivisions=1)


def build_crate_barrel_set(offset=(0, 0, 0)):
    ox, oy, oz = offset
    wood = material("prop_wood", (0.46, 0.255, 0.095, 1.0), roughness=0.86)
    wood_dark = material("prop_wood_dark", (0.24, 0.125, 0.045, 1.0), roughness=0.89)
    iron = material("barrel_iron", (0.23, 0.24, 0.22, 1.0), metallic=0.18, roughness=0.68)

    add_box("crate_body", (ox - 0.58, oy, 0.55 + oz), (1.12, 1.12, 1.08), wood, 0.07)
    for z in (0.14, 0.96):
        add_box("crate_band", (ox - 0.58, oy - 0.59, z + oz), (1.18, 0.09, 0.11), wood_dark, 0.024)
    for x in (-0.98, -0.18):
        add_box("crate_post", (ox + x, oy - 0.60, 0.55 + oz), (0.10, 0.09, 1.06), wood_dark, 0.024)

    add_cylinder("barrel", (ox + 0.68, oy + 0.02, 0.66 + oz), 0.53, 1.30, wood, vertices=16)
    for z in (0.14, 0.65, 1.16):
        add_cylinder("barrel_ring", (ox + 0.68, oy + 0.02, z + oz), 0.555, 0.075, iron, vertices=16)


def build_ore(offset=(0, 0, 0)):
    ox, oy, oz = offset
    rock = material("ore_rock", (0.28, 0.31, 0.31, 1.0), roughness=0.95)
    rock_dark = material("ore_shadow", (0.20, 0.23, 0.24, 1.0), roughness=0.96)
    copper = material("copper", (0.67, 0.30, 0.11, 1.0), metallic=0.20, roughness=0.48)
    green = material("copper_patina", (0.18, 0.42, 0.34, 1.0), metallic=0.08, roughness=0.64)

    add_ico("ore_base", (ox, oy, 0.56 + oz), (1.18, 0.92, 0.62), rock, subdivisions=1)
    add_ico("ore_side", (ox - 0.62, oy + 0.08, 0.42 + oz), (0.58, 0.52, 0.44), rock_dark, subdivisions=1)
    chunks = [
        (-0.48, -0.28, 0.92, 0.30, copper),
        (0.02, -0.44, 0.78, 0.26, copper),
        (0.48, -0.14, 0.72, 0.22, copper),
        (0.25, 0.10, 1.00, 0.18, green),
    ]
    for x, y, z, s, mat in chunks:
        add_ico("ore_chunk", (ox + x, oy + y, oz + z), (s, s * 0.72, s * 0.90), mat, subdivisions=1)


def build_fence_signpost(offset=(0, 0, 0)):
    ox, oy, oz = offset
    wood = material("fence_wood", (0.35, 0.19, 0.075, 1.0), roughness=0.91)
    trim = material("fence_dark", (0.21, 0.11, 0.045, 1.0), roughness=0.93)

    for x in (-1.18, 0.10, 1.18):
        add_box("fence_post", (ox + x, oy, 0.72 + oz), (0.18, 0.20, 1.44), trim, 0.035)
    add_box("fence_rail_low", (ox, oy, 0.55 + oz), (2.52, 0.16, 0.16), wood, 0.035, rotation=(0, math.radians(-3), 0))
    add_box("fence_rail_high", (ox, oy, 1.02 + oz), (2.52, 0.16, 0.16), wood, 0.035, rotation=(0, math.radians(2), 0))

    add_box("sign_post", (ox + 1.75, oy + 0.04, 1.12 + oz), (0.20, 0.22, 2.24), trim, 0.04)
    add_box("sign_arm", (ox + 1.30, oy - 0.03, 1.72 + oz), (1.14, 0.15, 0.42), wood, 0.05)
    add_box("sign_cap", (ox + 1.75, oy + 0.04, 2.30 + oz), (0.30, 0.30, 0.20), trim, 0.05)


def build_village_scene():
    grass = material("scene_grass", (0.31, 0.49, 0.23, 1.0), roughness=0.96)
    grass_edge = material("scene_edge", (0.21, 0.32, 0.15, 1.0), roughness=0.97)
    path = material("scene_path", (0.62, 0.49, 0.30, 1.0), roughness=0.95)
    add_box("island_edge", (0, 0, -0.20), (13.4, 9.0, 0.52), grass_edge, 0.24)
    add_box("island_top", (0, 0, 0.07), (13.0, 8.6, 0.25), grass, 0.22)
    add_box("path", (0.15, -1.54, 0.22), (10.7, 1.28, 0.10), path, 0.18, rotation=(0, 0, math.radians(-6)))

    build_cottage((-1.15, 0.88, 0.22))
    build_tall_tree((4.00, 1.70, 0.20))
    build_pine_tree((-4.95, 2.12, 0.20))
    build_crate_barrel_set((2.28, -1.78, 0.22))
    build_rock_cluster((-4.45, -1.55, 0.22))
    build_ore((-3.15, -2.25, 0.22))
    build_fence_signpost((3.55, 0.02, 0.22))


def build_asset_sheet():
    ground = material("sheet_ground", (0.34, 0.49, 0.27, 1.0), roughness=0.97)
    soil = material("sheet_soil", (0.53, 0.43, 0.27, 1.0), roughness=0.97)
    add_box("sheet_ground", (0, 0, -0.16), (17.8, 11.4, 0.30), ground, 0.18)
    for x, y in [(-5.4, 2.55), (0, 2.55), (5.3, 2.55), (-5.3, -2.7), (0, -2.7), (5.2, -2.7)]:
        add_box("asset_pad", (x, y, 0.03), (4.25, 3.85, 0.08), soil, 0.13)
    build_cottage((-5.4, 2.55, 0.12))
    build_tall_tree((0.0, 2.55, 0.10))
    build_pine_tree((5.25, 2.55, 0.10))
    build_rock_cluster((-5.25, -2.70, 0.10))
    build_crate_barrel_set((0.0, -2.70, 0.10))
    build_ore((5.25, -2.70, 0.10))
    build_fence_signpost((0.0, -0.20, 0.10))


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
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = True

    bpy.ops.object.camera_add(location=(8.7, -8.7, 7.35))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = ortho_scale
    point_camera(camera, target)
    scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=(-4.2, -5.6, 9.2))
    key = bpy.context.object
    key.data.energy = 760
    key.data.shape = "DISK"
    key.data.size = 5.8
    point_camera(key, target)

    bpy.ops.object.light_add(type="AREA", location=(5.8, 1.4, 5.8))
    fill = bpy.context.object
    fill.data.energy = 300
    fill.data.size = 6.5
    point_camera(fill, target)

    bpy.ops.object.light_add(type="SUN", location=(0, 0, 7))
    sun = bpy.context.object
    sun.rotation_euler = (math.radians(31), math.radians(-17), math.radians(-34))
    sun.data.energy = 1.05
    sun.data.angle = math.radians(20)

    scene.world.color = (0.055, 0.060, 0.052)
    return scene


def render_asset(name, builder, ortho_scale, target=(0, 0, 1.6), width=512, height=512):
    clear_scene()
    builder()
    scene = setup_render(ortho_scale, target=target, width=width, height=height)
    path = os.path.join(OUT, name + ".png")
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


TARGETS = [
    ("cottage", build_cottage, 6.8, (0, 0, 1.70), 512, 512),
    ("tall_tree", build_tall_tree, 6.5, (0, 0, 2.65), 512, 512),
    ("pine_tree", build_pine_tree, 6.5, (0, 0, 2.65), 512, 512),
    ("rock_cluster", build_rock_cluster, 3.7, (0, 0, 0.62), 384, 384),
    ("crate_barrel_set", build_crate_barrel_set, 3.8, (0, 0, 0.72), 384, 384),
    ("copper_ore", build_ore, 3.5, (0, 0, 0.70), 384, 384),
    ("fence_signpost", build_fence_signpost, 4.6, (0.25, 0, 1.10), 384, 384),
]

COMPOSITES = [
    ("asset_sheet", build_asset_sheet, 19.5, (0, 0, 1.20), 1280, 720),
    ("village_scene", build_village_scene, 15.6, (0, 0, 1.35), 1280, 720),
]

for spec in TARGETS + COMPOSITES:
    render_asset(*spec)

manifest = {
    "proof": "Briar Glen Build 24 isolated art pipeline",
    "source": "original procedural Blender geometry; no third-party production assets",
    "blender_version": bpy.app.version_string,
    "camera": {
        "type": "orthographic",
        "position": [8.7, -8.7, 7.35],
        "intent": "fixed 3/4 isometric-style presentation",
    },
    "render_style": {
        "lighting": "warm storybook",
        "materials": "soft high-roughness with restrained metallic accents",
        "background": "transparent RGBA PNG",
        "silhouette_priority": True,
    },
    "target_assets": [spec[0] + ".png" for spec in TARGETS],
    "comparison_outputs": [spec[0] + ".png" for spec in COMPOSITES],
    "browser_outputs": [
        "browser-proof.png",
        "gameplay-scale-proof.png",
        "comparison-proof.png",
    ],
    "production_game_modified": False,
}
with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as handle:
    json.dump(manifest, handle, indent=2)

print(json.dumps(manifest, indent=2))
