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


def material(name, rgba, metallic=0.0, roughness=0.84):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = rgba
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
    return mat


def apply_material(obj, mat):
    if not hasattr(obj.data, "materials"):
        return
    if len(obj.data.materials):
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def smooth_mesh(obj):
    if getattr(obj, "type", None) != "MESH":
        return obj
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def bevel(obj, width=0.05, segments=3):
    mod = obj.modifiers.new("storybook_soft_edges", "BEVEL")
    mod.width = width
    mod.segments = segments
    return obj


def add_box(name, loc, dims, mat, bevel_width=0.06, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, mat)
    if bevel_width:
        bevel(obj, bevel_width, 3)
    return obj


def add_cylinder(name, loc, radius, depth, mat, vertices=24, rotation=(0, 0, 0), soft=True):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rotation
    )
    obj = bpy.context.object
    obj.name = name
    apply_material(obj, mat)
    if soft:
        smooth_mesh(obj)
        bevel(obj, min(radius * 0.12, 0.06), 3)
    return obj


def add_uv_blob(name, loc, scale, mat, rotation=(0, 0, 0), segments=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        radius=1.0,
        location=loc,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, mat)
    smooth_mesh(obj)
    return obj


def add_irregular_rock(name, loc, scale, mat, seed=0, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=2,
        radius=1.0,
        location=loc,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for vertex in obj.data.vertices:
        co = vertex.co
        wave = (
            math.sin(co.x * 3.7 + seed * 0.71)
            + math.sin(co.y * 4.3 + seed * 1.11)
            + math.sin(co.z * 5.1 + seed * 0.43)
        ) / 3.0
        co *= 1.0 + 0.075 * wave
    apply_material(obj, mat)
    smooth_mesh(obj)
    bevel(obj, 0.025, 2)
    return obj


def add_tube(name, points, radius, mat, resolution=2):
    curve = bpy.data.curves.new(name + "_curve", type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = resolution
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coords in zip(spline.bezier_points, points):
        point.co = coords
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    apply_material(obj, mat)
    return obj


def add_roof(offset=(0, 0, 0)):
    ox, oy, oz = offset
    roof = material("roof_clay", (0.46, 0.16, 0.095, 1.0), roughness=0.91)
    roof_dark = material("roof_edge", (0.22, 0.10, 0.055, 1.0), roughness=0.92)
    verts = [
        (-2.55 + ox, -1.78 + oy, 2.28 + oz),
        (2.55 + ox, -1.78 + oy, 2.28 + oz),
        (-2.55 + ox, 1.78 + oy, 2.28 + oz),
        (2.55 + ox, 1.78 + oy, 2.28 + oz),
        (0.0 + ox, -1.78 + oy, 3.62 + oz),
        (0.0 + ox, 1.78 + oy, 3.62 + oz),
    ]
    faces = [(0, 2, 5, 4), (1, 4, 5, 3), (0, 4, 1), (2, 3, 5)]
    mesh = bpy.data.meshes.new("cottage_roof_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("cottage_roof", mesh)
    bpy.context.collection.objects.link(obj)
    apply_material(obj, roof)
    bevel(obj, 0.08, 3)

    add_box("roof_ridge", (ox, oy, 3.62 + oz), (0.16, 3.66, 0.14), roof_dark, 0.035)
    add_box("front_eave", (ox, oy - 1.81, 2.25 + oz), (5.16, 0.13, 0.16), roof_dark, 0.035)
    add_box("rear_eave", (ox, oy + 1.81, 2.25 + oz), (5.16, 0.13, 0.16), roof_dark, 0.035)

    slope = math.atan2(1.34, 2.55)
    for i, x in enumerate((0.48, 0.98, 1.48, 1.98, 2.42)):
        z = 3.62 - (x / 2.55) * 1.34 + 0.018
        add_box(
            f"roof_shingle_band_{i}",
            (ox + x, oy - 0.02, z + oz),
            (0.045, 3.48, 0.055),
            roof_dark,
            0.012,
            rotation=(0, slope, 0),
        )
    return obj


def build_cottage(offset=(0, 0, 0)):
    ox, oy, oz = offset
    plaster = material("warm_plaster", (0.82, 0.69, 0.49, 1.0), roughness=0.94)
    plaster_shadow = material("warm_plaster_shadow", (0.70, 0.56, 0.38, 1.0), roughness=0.95)
    timber = material("dark_timber", (0.20, 0.095, 0.040, 1.0), roughness=0.91)
    oak = material("oak", (0.39, 0.20, 0.070, 1.0), roughness=0.88)
    oak_light = material("oak_light", (0.52, 0.31, 0.12, 1.0), roughness=0.87)
    glass = material("warm_window", (0.92, 0.57, 0.18, 1.0), roughness=0.42)
    stone = material("warm_stone", (0.47, 0.43, 0.36, 1.0), roughness=0.97)
    stone_dark = material("warm_stone_dark", (0.34, 0.33, 0.29, 1.0), roughness=0.98)
    flower_red = material("flower_red", (0.72, 0.22, 0.18, 1.0), roughness=0.86)
    flower_gold = material("flower_gold", (0.90, 0.60, 0.17, 1.0), roughness=0.86)
    leaf = material("flower_leaf", (0.25, 0.44, 0.18, 1.0), roughness=0.91)

    add_box("stone_foundation", (ox, oy, 0.24 + oz), (4.48, 3.18, 0.48), stone_dark, 0.11)
    add_box("cottage_body", (ox, oy, 1.28 + oz), (4.22, 2.94, 1.98), plaster, 0.14)
    add_box("side_plaster_panel", (ox + 2.14, oy + 0.30, 1.24 + oz), (0.06, 2.25, 1.48), plaster_shadow, 0.025)
    add_roof(offset)

    for x in (-1.78, 0.0, 1.78):
        add_box("front_post", (ox + x, oy - 1.51, 1.30 + oz), (0.16, 0.14, 2.02), timber, 0.035)
    add_box("front_beam", (ox, oy - 1.52, 2.06 + oz), (4.08, 0.15, 0.17), timber, 0.035)
    add_box("front_sill", (ox, oy - 1.52, 0.48 + oz), (4.08, 0.15, 0.15), timber, 0.030)
    add_box("brace_left", (ox - 1.17, oy - 1.57, 1.24 + oz), (0.13, 0.11, 1.28), timber, 0.025, rotation=(0, math.radians(31), 0))
    add_box("brace_right", (ox + 1.17, oy - 1.57, 1.24 + oz), (0.13, 0.11, 1.28), timber, 0.025, rotation=(0, math.radians(-29), 0))

    add_box("door", (ox, oy - 1.61, 1.00 + oz), (0.92, 0.13, 1.62), oak, 0.075)
    add_box("door_lintel", (ox, oy - 1.64, 1.88 + oz), (1.08, 0.16, 0.16), oak_light, 0.035)
    add_box("door_step", (ox, oy - 1.84, 0.22 + oz), (1.25, 0.62, 0.18), stone, 0.06)
    add_cylinder("door_handle", (ox + 0.29, oy - 1.70, 1.03 + oz), 0.055, 0.075, stone_dark, vertices=16, rotation=(math.radians(90), 0, 0), soft=True)

    for wx in (-1.24, 1.24):
        add_box("window_glow", (ox + wx, oy - 1.60, 1.38 + oz), (0.78, 0.09, 0.72), glass, 0.05)
        add_box("window_frame_v", (ox + wx, oy - 1.66, 1.38 + oz), (0.07, 0.06, 0.79), timber, 0.014)
        add_box("window_frame_h", (ox + wx, oy - 1.66, 1.38 + oz), (0.85, 0.06, 0.07), timber, 0.014)
        add_box("window_top", (ox + wx, oy - 1.65, 1.79 + oz), (0.90, 0.07, 0.09), oak_light, 0.02)

    add_box("chimney_core", (ox + 1.39, oy + 0.48, 3.16 + oz), (0.52, 0.52, 1.40), stone_dark, 0.07)
    for i, (dx, dy, z) in enumerate(((0.00, 0.00, 2.72), (0.03, -0.02, 3.06), (-0.02, 0.03, 3.40), (0.02, 0.00, 3.72))):
        add_box(f"chimney_stone_{i}", (ox + 1.39 + dx, oy + 0.48 + dy, oz + z), (0.57, 0.57, 0.31), stone, 0.055)
    add_box("chimney_cap", (ox + 1.39, oy + 0.48, 3.96 + oz), (0.72, 0.72, 0.18), stone_dark, 0.055)

    add_box("flower_box", (ox - 1.24, oy - 1.74, 0.92 + oz), (1.08, 0.26, 0.22), oak, 0.035)
    for i, x in enumerate((-1.57, -1.36, -1.13, -0.92)):
        add_uv_blob(f"flower_leaf_{i}", (ox + x, oy - 1.80, 1.10 + oz), (0.13, 0.08, 0.14), leaf, segments=16, rings=8)
        add_uv_blob(f"flower_{i}", (ox + x, oy - 1.82, 1.23 + oz), (0.07, 0.07, 0.07), flower_red if i % 2 == 0 else flower_gold, segments=16, rings=8)

    add_box("sign_bracket", (ox + 1.89, oy - 1.69, 1.95 + oz), (0.66, 0.10, 0.10), timber, 0.025)
    add_box("hanging_sign", (ox + 2.12, oy - 1.70, 1.63 + oz), (0.58, 0.09, 0.42), oak_light, 0.055, rotation=(0, 0, math.radians(-3)))


def build_tall_tree(offset=(0, 0, 0)):
    ox, oy, oz = offset
    bark = material("tree_bark", (0.22, 0.125, 0.058, 1.0), roughness=0.95)
    bark_light = material("tree_bark_light", (0.31, 0.18, 0.08, 1.0), roughness=0.94)
    leaf_deep = material("leaf_deep", (0.15, 0.34, 0.16, 1.0), roughness=0.94)
    leaf_mid = material("leaf_mid", (0.30, 0.50, 0.24, 1.0), roughness=0.94)
    leaf_light = material("leaf_light", (0.48, 0.64, 0.31, 1.0), roughness=0.94)
    leaf_warm = material("leaf_warm", (0.38, 0.55, 0.22, 1.0), roughness=0.94)

    add_tube("tree_trunk", [
        (ox, oy, oz + 0.02),
        (ox - 0.05, oy + 0.02, oz + 1.25),
        (ox + 0.08, oy - 0.02, oz + 2.55),
        (ox - 0.05, oy + 0.06, oz + 3.58),
    ], 0.29, bark, resolution=3)
    add_tube("tree_highlight", [
        (ox - 0.12, oy - 0.19, oz + 0.18),
        (ox - 0.10, oy - 0.18, oz + 1.55),
        (ox - 0.04, oy - 0.16, oz + 2.55),
    ], 0.055, bark_light, resolution=2)

    branches = [
        ((-0.02, 0.02, 2.25), (-0.82, -0.02, 3.38), (-1.38, -0.06, 3.68)),
        ((0.05, 0.02, 2.55), (0.74, 0.08, 3.45), (1.35, 0.08, 3.72)),
        ((0.00, 0.05, 2.95), (-0.28, 0.22, 4.02), (-0.52, 0.25, 4.52)),
        ((0.04, 0.00, 3.18), (0.55, -0.10, 4.12), (0.83, -0.14, 4.46)),
    ]
    for i, branch in enumerate(branches):
        pts = [(ox + x, oy + y, oz + z) for x, y, z in branch]
        add_tube(f"branch_{i}", pts, 0.12 if i < 2 else 0.10, bark, resolution=2)

    blobs = [
        (-1.18, -0.12, 3.82, (0.82, 0.70, 0.76), leaf_mid, -9),
        (-0.52, -0.02, 4.24, (1.08, 0.91, 0.88), leaf_deep, 7),
        (0.40, 0.05, 4.36, (1.15, 0.96, 0.92), leaf_mid, -6),
        (1.18, 0.10, 3.94, (0.80, 0.70, 0.70), leaf_warm, 8),
        (-0.83, 0.19, 4.82, (0.80, 0.72, 0.72), leaf_light, -11),
        (0.02, -0.02, 5.02, (1.02, 0.86, 0.80), leaf_mid, 5),
        (0.78, -0.10, 4.84, (0.76, 0.68, 0.70), leaf_light, -5),
        (-0.15, 0.14, 5.54, (0.72, 0.64, 0.66), leaf_warm, 10),
        (-1.28, 0.12, 4.42, (0.58, 0.52, 0.52), leaf_deep, 0),
        (1.30, -0.04, 4.48, (0.56, 0.50, 0.50), leaf_mid, 0),
    ]
    for i, (x, y, z, scale, mat, angle) in enumerate(blobs):
        add_uv_blob(
            f"canopy_{i}",
            (ox + x, oy + y, oz + z),
            scale,
            mat,
            rotation=(math.radians(5), math.radians(angle), math.radians(angle * 0.6)),
            segments=28,
            rings=14,
        )


def add_pine_skirt(name, loc, radius, height, mat, phase=0.0, rotation_z=0.0):
    segments = 24
    verts = [(0.0, 0.0, height * 0.56)]
    for i in range(segments):
        a = 2.0 * math.pi * i / segments + rotation_z
        r = radius * (0.62 + 0.04 * math.sin(i * 2.0 + phase))
        verts.append((r * math.cos(a), r * math.sin(a), height * 0.05 + 0.08 * math.sin(i * 1.7 + phase)))
    for i in range(segments):
        a = 2.0 * math.pi * i / segments + rotation_z
        scallop = 0.90 + 0.10 * math.sin(i * 2.5 + phase) + 0.04 * math.sin(i * 5.0 + phase)
        r = radius * scallop
        verts.append((r * math.cos(a), r * math.sin(a), -height * 0.46 + 0.10 * math.sin(i * 2.2 + phase)))

    faces = []
    for i in range(segments):
        ni = (i + 1) % segments
        faces.append((0, 1 + i, 1 + ni))
        faces.append((1 + i, 1 + segments + i, 1 + segments + ni, 1 + ni))
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    apply_material(obj, mat)
    smooth_mesh(obj)
    bevel(obj, 0.025, 2)
    return obj


def build_pine_tree(offset=(0, 0, 0)):
    ox, oy, oz = offset
    bark = material("pine_bark", (0.20, 0.115, 0.055, 1.0), roughness=0.96)
    needle_deep = material("pine_deep", (0.10, 0.30, 0.20, 1.0), roughness=0.96)
    needle_mid = material("pine_mid", (0.17, 0.40, 0.27, 1.0), roughness=0.96)
    needle_light = material("pine_light", (0.28, 0.49, 0.31, 1.0), roughness=0.96)

    add_tube("pine_trunk", [
        (ox, oy, oz),
        (ox + 0.03, oy, oz + 1.5),
        (ox - 0.04, oy + 0.02, oz + 3.2),
        (ox + 0.02, oy, oz + 5.15),
    ], 0.23, bark, resolution=2)

    for i, z in enumerate((1.75, 2.45, 3.12, 3.75)):
        for j, angle in enumerate((0.15, 2.25, 4.35)):
            reach = 1.18 - i * 0.13
            start = (ox, oy, oz + z)
            end = (ox + math.cos(angle) * reach, oy + math.sin(angle) * reach, oz + z - 0.18)
            add_tube(f"pine_branch_{i}_{j}", [start, end], 0.055, bark, resolution=1)

    layers = [
        (2.02, 1.55, 1.15, needle_deep, 0.4, 0.04),
        (2.75, 1.45, 1.10, needle_mid, 1.2, 0.18),
        (3.46, 1.24, 1.04, needle_deep, 2.1, 0.08),
        (4.10, 1.04, 0.96, needle_mid, 2.9, 0.22),
        (4.68, 0.78, 0.84, needle_light, 3.7, 0.11),
        (5.14, 0.48, 0.72, needle_light, 4.4, 0.00),
    ]
    for i, (z, radius, height, mat, phase, rot) in enumerate(layers):
        add_pine_skirt(f"pine_foliage_{i}", (ox, oy, oz + z), radius, height, mat, phase=phase, rotation_z=rot)


def build_rock_cluster(offset=(0, 0, 0)):
    ox, oy, oz = offset
    stone_a = material("rock_warm", (0.45, 0.43, 0.37, 1.0), roughness=0.98)
    stone_b = material("rock_cool", (0.35, 0.38, 0.36, 1.0), roughness=0.98)
    stone_c = material("rock_light", (0.56, 0.52, 0.43, 1.0), roughness=0.98)
    moss = material("rock_moss", (0.31, 0.45, 0.20, 1.0), roughness=0.97)
    specs = [
        (-0.48, 0.03, 0.45, (0.72, 0.58, 0.52), stone_a, 3),
        (0.34, -0.04, 0.57, (0.86, 0.64, 0.68), stone_b, 7),
        (0.91, 0.14, 0.32, (0.50, 0.44, 0.35), stone_c, 12),
        (-0.98, 0.17, 0.29, (0.44, 0.40, 0.31), stone_b, 17),
    ]
    for i, (x, y, z, scale, mat, seed) in enumerate(specs):
        add_irregular_rock(
            f"rock_{i}",
            (ox + x, oy + y, oz + z),
            scale,
            mat,
            seed=seed,
            rotation=(math.radians(6 + i * 3), math.radians(-12 + i * 9), math.radians(i * 13)),
        )
    add_uv_blob("moss_patch", (ox - 0.22, oy - 0.48, oz + 0.70), (0.42, 0.20, 0.08), moss, segments=20, rings=10)
    add_uv_blob("moss_patch_small", (ox + 0.47, oy - 0.46, oz + 0.82), (0.22, 0.12, 0.05), moss, segments=16, rings=8)


def build_crate_barrel_set(offset=(0, 0, 0)):
    ox, oy, oz = offset
    wood = material("prop_wood", (0.50, 0.29, 0.105, 1.0), roughness=0.90)
    wood_light = material("prop_wood_light", (0.62, 0.39, 0.16, 1.0), roughness=0.89)
    wood_dark = material("prop_wood_dark", (0.25, 0.125, 0.042, 1.0), roughness=0.93)
    iron = material("barrel_iron", (0.24, 0.25, 0.23, 1.0), metallic=0.16, roughness=0.74)

    add_box("crate_core", (ox - 0.62, oy + 0.04, 0.55 + oz), (1.08, 1.02, 1.06), wood_dark, 0.045)
    for i, x in enumerate((-0.98, -0.73, -0.48, -0.23)):
        add_box(f"crate_front_plank_{i}", (ox + x, oy - 0.51, 0.56 + oz), (0.205, 0.08, 0.98), wood_light if i % 2 else wood, 0.024)
    for z in (0.14, 0.98):
        add_box("crate_band", (ox - 0.61, oy - 0.57, z + oz), (1.18, 0.10, 0.11), wood_dark, 0.024)
    add_box("crate_diag", (ox - 0.61, oy - 0.59, 0.56 + oz), (0.10, 0.08, 1.16), wood_dark, 0.018, rotation=(0, math.radians(39), 0))

    add_cylinder("barrel_body", (ox + 0.72, oy + 0.02, 0.68 + oz), 0.55, 1.34, wood, vertices=32, soft=True)
    add_cylinder("barrel_belly", (ox + 0.72, oy + 0.02, 0.68 + oz), 0.585, 0.70, wood_light, vertices=32, soft=True)
    for z in (0.15, 0.48, 0.88, 1.20):
        add_cylinder("barrel_ring", (ox + 0.72, oy + 0.02, z + oz), 0.59, 0.065, iron, vertices=32, soft=True)
    add_cylinder("barrel_top", (ox + 0.72, oy + 0.02, 1.36 + oz), 0.50, 0.06, wood_dark, vertices=32, soft=True)


def build_ore(offset=(0, 0, 0)):
    ox, oy, oz = offset
    rock = material("ore_rock", (0.34, 0.37, 0.36, 1.0), roughness=0.98)
    rock_dark = material("ore_shadow", (0.25, 0.28, 0.28, 1.0), roughness=0.99)
    copper = material("copper", (0.75, 0.34, 0.10, 1.0), metallic=0.16, roughness=0.54)
    copper_light = material("copper_light", (0.88, 0.48, 0.15, 1.0), metallic=0.14, roughness=0.50)
    patina = material("copper_patina", (0.19, 0.47, 0.39, 1.0), metallic=0.06, roughness=0.70)

    add_irregular_rock("ore_base", (ox, oy, 0.54 + oz), (1.16, 0.90, 0.62), rock, seed=23, rotation=(math.radians(5), math.radians(-12), math.radians(8)))
    add_irregular_rock("ore_side", (ox - 0.62, oy + 0.08, 0.40 + oz), (0.62, 0.54, 0.44), rock_dark, seed=31, rotation=(0, math.radians(18), math.radians(-14)))
    add_irregular_rock("ore_back", (ox + 0.55, oy + 0.18, 0.36 + oz), (0.50, 0.44, 0.38), rock, seed=37, rotation=(0, math.radians(-8), math.radians(20)))

    veins = [
        (-0.47, -0.35, 0.92, (0.34, 0.20, 0.11), copper_light, 0),
        (-0.05, -0.43, 0.79, (0.28, 0.17, 0.10), copper, 1),
        (0.38, -0.28, 0.72, (0.24, 0.15, 0.09), copper_light, 2),
        (0.29, -0.11, 1.01, (0.19, 0.13, 0.08), patina, 3),
    ]
    for x, y, z, scale, mat, seed in veins:
        add_irregular_rock(f"ore_vein_{seed}", (ox + x, oy + y, oz + z), scale, mat, seed=50 + seed, rotation=(math.radians(8), math.radians(seed * 17), math.radians(-12 + seed * 11)))


def add_sign_board(name, loc, mat):
    verts = [
        (-0.64, -0.07, -0.22),
        (0.48, -0.07, -0.22),
        (0.72, -0.07, 0.00),
        (0.48, -0.07, 0.22),
        (-0.64, -0.07, 0.22),
        (-0.64, 0.07, -0.22),
        (0.48, 0.07, -0.22),
        (0.72, 0.07, 0.00),
        (0.48, 0.07, 0.22),
        (-0.64, 0.07, 0.22),
    ]
    faces = [
        (0, 1, 2, 3, 4),
        (5, 9, 8, 7, 6),
        (0, 5, 6, 1),
        (1, 6, 7, 2),
        (2, 7, 8, 3),
        (3, 8, 9, 4),
        (4, 9, 5, 0),
    ]
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    apply_material(obj, mat)
    bevel(obj, 0.045, 3)
    return obj


def build_fence_signpost(offset=(0, 0, 0)):
    ox, oy, oz = offset
    wood = material("fence_wood", (0.40, 0.22, 0.075, 1.0), roughness=0.94)
    wood_light = material("fence_light", (0.53, 0.32, 0.13, 1.0), roughness=0.93)
    trim = material("fence_dark", (0.23, 0.115, 0.040, 1.0), roughness=0.95)

    posts = [(-1.18, -2.0), (0.06, 1.5), (1.22, -1.0)]
    for i, (x, angle) in enumerate(posts):
        add_box(f"fence_post_{i}", (ox + x, oy, 0.73 + oz), (0.19, 0.21, 1.46), trim, 0.045, rotation=(0, 0, math.radians(angle)))
        add_box(f"fence_cap_{i}", (ox + x, oy, 1.49 + oz), (0.27, 0.28, 0.16), wood_light, 0.05)
    add_box("fence_rail_low", (ox, oy - 0.015, 0.57 + oz), (2.56, 0.17, 0.17), wood, 0.045, rotation=(0, math.radians(-2), math.radians(0.8)))
    add_box("fence_rail_high", (ox, oy + 0.015, 1.04 + oz), (2.56, 0.17, 0.17), wood_light, 0.045, rotation=(0, math.radians(2.5), math.radians(-0.7)))

    add_box("sign_post", (ox + 1.82, oy + 0.04, 1.13 + oz), (0.21, 0.23, 2.26), trim, 0.05, rotation=(0, 0, math.radians(-1.5)))
    add_box("sign_cap", (ox + 1.82, oy + 0.04, 2.31 + oz), (0.34, 0.34, 0.20), wood_light, 0.055)
    board = add_sign_board("direction_sign", (ox + 1.28, oy - 0.03, 1.76 + oz), wood_light)
    board.rotation_euler[2] = math.radians(2.0)


def add_scene_grass_clump(x, y, z, green, seed=0):
    for i in range(4):
        angle = -0.28 + i * 0.18 + seed * 0.03
        add_box(
            f"grass_{seed}_{i}",
            (x + (i - 1.5) * 0.045, y, z + 0.16),
            (0.035, 0.05, 0.34 + 0.04 * (i % 2)),
            green,
            0.012,
            rotation=(0, angle, 0),
        )


def build_village_scene():
    grass = material("scene_grass", (0.36, 0.54, 0.27, 1.0), roughness=0.98)
    grass_edge = material("scene_edge", (0.25, 0.37, 0.18, 1.0), roughness=0.99)
    path = material("scene_path", (0.66, 0.53, 0.34, 1.0), roughness=0.98)
    path_dark = material("scene_path_dark", (0.53, 0.41, 0.26, 1.0), roughness=0.99)
    wild_green = material("scene_wild_green", (0.28, 0.46, 0.19, 1.0), roughness=0.98)
    flower = material("scene_flower", (0.88, 0.63, 0.23, 1.0), roughness=0.95)

    add_box("island_edge", (0, 0, -0.20), (13.4, 9.0, 0.52), grass_edge, 0.24)
    add_box("island_top", (0, 0, 0.07), (13.0, 8.6, 0.25), grass, 0.22)
    add_box("path_worn", (0.10, -1.52, 0.22), (10.9, 1.34, 0.10), path_dark, 0.18, rotation=(0, 0, math.radians(-6)))
    add_box("path_center", (0.10, -1.50, 0.29), (10.2, 0.92, 0.06), path, 0.15, rotation=(0, 0, math.radians(-6)))
    add_box("path_to_house", (-0.85, -0.05, 0.24), (1.10, 3.10, 0.07), path, 0.15, rotation=(0, 0, math.radians(8)))

    build_cottage((-1.10, 0.88, 0.22))
    build_tall_tree((4.15, 1.72, 0.20))
    build_pine_tree((-4.95, 2.10, 0.20))
    build_crate_barrel_set((2.30, -1.82, 0.22))
    build_rock_cluster((-4.45, -1.58, 0.22))
    build_ore((-3.15, -2.25, 0.22))
    build_fence_signpost((3.50, 0.02, 0.22))

    for seed, (x, y) in enumerate(((-5.1, 0.4), (-3.7, 1.0), (1.3, 2.7), (4.9, -0.6), (0.5, -3.0), (3.5, 2.9))):
        add_scene_grass_clump(x, y, 0.28, wild_green, seed)
    for i, (x, y) in enumerate(((-4.0, 0.75), (1.6, 2.9), (4.6, -0.8), (0.2, -3.1))):
        add_uv_blob(f"wildflower_{i}", (x, y, 0.54), (0.07, 0.07, 0.07), flower, segments=12, rings=6)


def build_asset_sheet():
    ground = material("sheet_ground", (0.38, 0.53, 0.30, 1.0), roughness=0.99)
    soil = material("sheet_soil", (0.58, 0.47, 0.30, 1.0), roughness=0.99)
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

    bpy.ops.object.camera_add(location=(9.15, -9.15, 8.15))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = ortho_scale
    point_camera(camera, target)
    scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=(-4.6, -5.9, 9.5))
    key = bpy.context.object
    key.data.energy = 900
    key.data.shape = "DISK"
    key.data.size = 6.4
    key.data.color = (1.0, 0.78, 0.58)
    point_camera(key, target)

    bpy.ops.object.light_add(type="AREA", location=(6.1, 1.6, 6.0))
    fill = bpy.context.object
    fill.data.energy = 360
    fill.data.size = 7.0
    fill.data.color = (0.72, 0.82, 0.88)
    point_camera(fill, target)

    bpy.ops.object.light_add(type="SUN", location=(0, 0, 7))
    sun = bpy.context.object
    sun.rotation_euler = (math.radians(31), math.radians(-17), math.radians(-34))
    sun.data.energy = 1.20
    sun.data.angle = math.radians(24)
    sun.data.color = (1.0, 0.86, 0.70)

    scene.world.color = (0.085, 0.095, 0.075)

    try:
        scene.eevee.use_gtao = True
        scene.eevee.gtao_distance = 3.0
        scene.eevee.gtao_factor = 1.15
        scene.eevee.use_soft_shadows = True
    except Exception:
        pass
    try:
        scene.view_settings.view_transform = "Standard"
        scene.view_settings.look = "Medium High Contrast"
        scene.view_settings.exposure = 0.15
        scene.view_settings.gamma = 1.0
    except Exception:
        pass
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
    ("cottage", build_cottage, 7.05, (0, 0, 1.82), 512, 512),
    ("tall_tree", build_tall_tree, 7.05, (0, 0, 2.90), 512, 512),
    ("pine_tree", build_pine_tree, 7.05, (0, 0, 2.72), 512, 512),
    ("rock_cluster", build_rock_cluster, 3.85, (0, 0, 0.64), 384, 384),
    ("crate_barrel_set", build_crate_barrel_set, 3.95, (0, 0, 0.74), 384, 384),
    ("copper_ore", build_ore, 3.70, (0, 0, 0.72), 384, 384),
    ("fence_signpost", build_fence_signpost, 4.85, (0.28, 0, 1.12), 384, 384),
]

COMPOSITES = [
    ("asset_sheet", build_asset_sheet, 20.0, (0, 0, 1.35), 1280, 720),
    ("village_scene", build_village_scene, 16.0, (0, 0, 1.45), 1280, 720),
]

for spec in TARGETS + COMPOSITES:
    render_asset(*spec)

manifest = {
    "proof": "Briar Glen Build 24 isolated art pipeline — authored storybook pass 2",
    "source": "original procedural Blender geometry; no third-party production assets",
    "blender_version": bpy.app.version_string,
    "camera": {
        "type": "orthographic",
        "position": [9.15, -9.15, 8.15],
        "intent": "fixed 3/4 isometric-style presentation, slightly tighter/top-down for gameplay readability",
    },
    "render_style": {
        "lighting": "warm storybook key with soft cool fill",
        "materials": "grounded high-roughness medieval materials with restrained metallic accents",
        "background": "transparent RGBA PNG",
        "silhouette": "rounded handcrafted masses; avoid generic faceted low-poly read",
    },
    "target_assets": [spec[0] + ".png" for spec in TARGETS],
    "comparison_outputs": [spec[0] + ".png" for spec in COMPOSITES],
    "production_game_modified": False,
    "visual_approval": "pending user review",
}
with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as handle:
    json.dump(manifest, handle, indent=2)

print(json.dumps(manifest, indent=2))
