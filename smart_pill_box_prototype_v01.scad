// Smart Pill Box Prototype v0.2
// OpenSCAD units: mm
//
// Layer concept:
//   pills
//   sensor exposure holes
//   VL53L1X boards
//   mux / wiring layer
//   ESP32 main-board layer
//
// Print selector:
//   "assembly"      preview with ghosted electronics
//   "assembly_open" wall-less layout preview for checking internals
//   "base"          lower electronics body
//   "pill_tray"     removable pill tray + sensor deck
//   "pill_tray_cutaway" sliced tray view for checking the funnel angle
//   "lid"           four independent flip lids
//   "ui_cover"      plug-style cover for the OLED/button service opening
//   "back_panel"    removable long-side panel for final assembly
//   "sensor_test"   one-cell sensor aperture test coupon

part = "assembly";

$fn = 48;

// ------------------------------------------------------------
// Main dimensions
// ------------------------------------------------------------
cell_count = 4;

case_w = 168;
case_d = 60;

wall = 2.6;
floor_th = 2.2;
corner_r = 4;
clearance = 0.45;

// Vertical stack.
esp_layer_h = 10;       // bottom: main board + distributor shared layer
mux_layer_h = 0;        // collapsed into the same bottom layer for this prototype
sensor_layer_h = 6;     // middle gap: sensors to pill tray = 6 mm
tray_floor_th = 1.2;    // floor separating pills from sensors
pill_h = 30;            // pill storage depth
lid_h = 7;

electronics_h = esp_layer_h + mux_layer_h + sensor_layer_h;
tray_h = tray_floor_th + pill_h;

// Pill cells.
tray_outer_w = case_w - 2 * wall - 2 * clearance;
tray_outer_d = case_d - 2 * wall - 2 * clearance;
cell_wall = 2.2;
cell_inner_w = (tray_outer_w - 2 * wall - (cell_count - 1) * cell_wall) / cell_count;
cell_inner_d = tray_outer_d - 2 * wall;
well_top_w = 30;            // 30 x 30 mm opening around each 26 mm sensor footprint
well_top_d = 30;
well_bottom_d = 18;         // round collection area near sensor window
well_bottom_h = 2.2;        // short cylindrical landing zone before the sensor lip
well_center_y_offset = -7;  // shift the pill openings toward the left/front side
lid_split_gap = 1.2;
lid_panel_th = 2.2;
lid_skirt_h = 4.0;
lid_overhang = 3.0;
lid_pull_tab_w = 10;
lid_pull_tab_d = 4;
lid_pull_tab_h = 2.5;
hinge_outer_d = 4.2;
hinge_pin_d = 2.2;
hinge_leaf_w = 8.5;
hinge_mount_y = 1.6;

// Electronics footprints based on current rough measurements.
esp32_w = 60;   // main board: 6.0 x 2.5 cm
esp32_d = 25;
esp32_h = 8;

mux_w = 55;     // distributor board: 5.5 x 3.5 cm
mux_d = 35;
mux_h = 8;

vl53_board_w = 26; // one sensor board: 2.6 x 2.6 cm
vl53_board_d = 26;
vl53_board_h = 5;
sensor_window = 9;

oled_w = 20;
oled_hole_h = 20;
button_hole_d = 10;
button_bezel_d = 14;
usb_w = 16;
usb_h = 9;
tray_oled_x = 14;
tray_oled_z = 7;
tray_button_x = 42;
tray_button_z = 17;
ui_gap = 8;
ui_on_far_face = true; // true: opposite long face, false: visible/front long face
ui_internal_clearance = 15; // keep 15 mm clear behind OLED/button face
ui_service_margin = 2.0;
back_panel_on_far_face = !ui_on_far_face;
button_x_offset = 10;
button_z_offset = 5;
debug_button_cube = true;
panel_edge_margin = 7;
panel_top_margin = 5;
panel_bottom_margin = 4;
back_panel_bottom_gap = 12;
panel_lip_depth = 3.0;
panel_lip_clearance = 0.35;
side_open_margin_y = 8;
side_open_margin_z = 5;
tray_side_window_d = 15.0;
tray_side_window_far_margin = 1.0;
tray_side_window_z_margin = 4.0;
tray_back_window_x_margin = 8.0;
tray_back_window_z = 3.0;
tray_back_window_h = 9.0;
open_preview_cut_d = 18.0;
pill_under_slot_x_margin = 10.0;
pill_under_slot_z = 2.0;
pill_under_slot_h = 11.0;

post_d = 7;
screw_d = 2.6;

// ------------------------------------------------------------
// Small helpers
// ------------------------------------------------------------
module rounded_rect_2d(w, d, r) {
    offset(r = r)
        square([w - 2 * r, d - 2 * r], center = true);
}

module rounded_box(size, r = 3) {
    linear_extrude(height = size[2])
        translate([size[0] / 2, size[1] / 2])
            rounded_rect_2d(size[0], size[1], r);
}

module shell_box(size, wall_th, floor, r = 3) {
    difference() {
        rounded_box(size, r);
        translate([wall_th, wall_th, floor])
            rounded_box(
                [size[0] - 2 * wall_th, size[1] - 2 * wall_th, size[2] - floor + 0.2],
                max(0.1, r - wall_th)
            );
    }
}

function clamp(v, lo, hi) = min(hi, max(lo, v));

module pill_well_cutout() {
    top_w = min(well_top_w, cell_inner_w - 4);
    top_d = min(well_top_d, cell_inner_d - 4);
    top_x = (cell_inner_w - top_w) / 2;
    top_y = clamp(
        (cell_inner_d - top_d) / 2 + well_center_y_offset,
        ui_on_far_face ? 2 : ui_internal_clearance,
        ui_on_far_face ? cell_inner_d - top_d - ui_internal_clearance : cell_inner_d - top_d - 2
    );
    top_z = tray_h - 0.1;
    bottom_center_y = clamp(
        cell_inner_d / 2 + well_center_y_offset,
        ui_on_far_face ? well_bottom_d / 2 + 2 : ui_internal_clearance + well_bottom_d / 2,
        ui_on_far_face ? cell_inner_d - ui_internal_clearance - well_bottom_d / 2 : cell_inner_d - well_bottom_d / 2 - 2
    );

    hull() {
        translate([
            top_x,
            top_y,
            top_z
        ])
            rounded_box([top_w, top_d, 0.2], min(3, min(top_w, top_d) / 6));

        translate([
            cell_inner_w / 2,
            bottom_center_y,
            tray_floor_th
        ])
            cylinder(d = well_bottom_d, h = well_bottom_h);
    }
}

module pill_tray_cutaway() {
    difference() {
        pill_tray();

        // Remove the front half and one side so the funnel is visible at a glance.
        translate([-1, -1, -1])
            cube([tray_outer_w * 0.55, tray_outer_d * 0.52, tray_h + 2]);
    }
}

module screw_post(x, y, h, outer_d = post_d, hole_d = screw_d) {
    translate([x, y, 0])
        difference() {
            cylinder(d = outer_d, h = h);
            translate([0, 0, -0.1])
                cylinder(d = hole_d, h = h + 0.2);
        }
}

module board_marker(size, label_text = "") {
    color("#2a9d55")
        cube(size);
    if (label_text != "") {
        color("white")
            translate([2, size[1] / 2, size[2] + 0.15])
                linear_extrude(height = 0.35)
                    text(label_text, size = 4, valign = "center");
    }
}

module footprint_marker(size, label_text = "") {
    color([1, 0, 0, 0.45])
        cube(size);
    if (label_text != "") {
        color([0.75, 0, 0, 1])
            translate([1.5, size[1] / 2, size[2] + 0.15])
                linear_extrude(height = 0.35)
                    text(label_text, size = 3.2, valign = "center");
    }
}

function cell_center_x(i) =
    wall + clearance + wall + cell_inner_w / 2 + i * (cell_inner_w + cell_wall);

function local_well_center_y() = tray_outer_d / 2 + well_center_y_offset;
function ui_cluster_w() = oled_w + ui_gap + button_hole_d + button_x_offset;
function ui_button_x() = (tray_outer_w - ui_cluster_w()) / 2;
function ui_oled_x() = ui_button_x() + button_hole_d + ui_gap + button_x_offset;
function ui_button_cx() = ui_button_x() + button_hole_d / 2;
function ui_face_y() = ui_on_far_face ? tray_outer_d - wall - 0.3 : -0.1;
function ui_button_hole_y() = ui_on_far_face ? tray_outer_d - wall + 0.15 : -0.2;
function ui_button_bezel_y() = ui_on_far_face ? tray_outer_d - 1.0 : 1.0;
function ui_marker_y() = ui_on_far_face ? tray_outer_d - 3.2 : 1.2;
function ui_button_marker_y() = ui_on_far_face ? tray_outer_d - 1.5 : 1.5;
function ui_button_rot() = ui_on_far_face ? 90 : -90;
function ui_shell_oled_x() = wall + clearance + ui_oled_x();
function ui_shell_button_cx() = wall + clearance + ui_button_cx();
function ui_shell_face_y() = ui_on_far_face ? case_d - wall - 0.3 : -0.1;
function ui_shell_button_hole_y() = ui_on_far_face ? case_d - wall + 0.15 : -0.2;
function ui_shell_button_bezel_y() = ui_on_far_face ? case_d - 1.0 : 1.0;
function ui_shell_marker_y() = ui_on_far_face ? case_d - 3.2 : 1.2;
function ui_shell_button_marker_y() = ui_on_far_face ? case_d - 1.5 : 1.5;
function tray_z() = electronics_h;
function ui_service_h() = min(tray_h - 2.0, max(tray_oled_z + oled_hole_h, tray_button_z - button_z_offset + button_bezel_d) + 1.0);
function ui_service_x_local() =
    max(2, min(tray_outer_w - oled_w - 2, ui_oled_x()));
function ui_service_w() = oled_w;
function ui_service_depth() = tray_outer_d + 0.4;
function ui_service_y_local() = -0.2;
function ui_service_x_case() = wall + clearance + ui_service_x_local();
function ui_service_y_case() = -0.2;
function ui_service_depth_case() = case_d + 0.4;
function body_total_h() = electronics_h + tray_h;
function panel_open_x() = panel_edge_margin;
function panel_open_z() = panel_bottom_margin;
function panel_open_w() = case_w - 2 * panel_edge_margin;
function panel_open_h() = body_total_h() - panel_top_margin - panel_bottom_margin;
function panel_face_y() = back_panel_on_far_face ? case_d - wall - 0.1 : -0.1;
function panel_cut_y() = back_panel_on_far_face ? case_d - wall - 0.2 : -0.2;
function panel_lip_y() = back_panel_on_far_face ? case_d - wall - panel_lip_depth : wall;
function side_open_y() = case_d - wall - tray_side_window_far_margin - tray_side_window_d;
function side_open_z() = side_open_margin_z;
function side_open_d() = tray_side_window_d;
function side_open_h() = body_total_h() - 2 * side_open_margin_z;
function tray_side_open_y() = tray_outer_d - tray_side_window_d - wall - 0.6;
function tray_side_open_z() = -0.1;
function tray_side_open_d() = tray_side_window_d + wall + 1.2;
function tray_side_open_h() = tray_h - 4.0;
function tray_back_open_x() = wall + tray_back_window_x_margin;
function tray_back_open_z() = tray_back_window_z;
function tray_back_open_w() = tray_outer_w - 2 * wall - 2 * tray_back_window_x_margin;
function tray_back_open_h() = tray_back_window_h;
function tray_back_face_y() = back_panel_on_far_face ? tray_outer_d - wall - 0.2 : -0.2;
function pill_under_slot_x() = pill_under_slot_x_margin;
function pill_under_slot_w() = case_w - 2 * pill_under_slot_x_margin;

module side_panel_cutout() {
    translate([panel_open_x(), panel_cut_y(), panel_open_z()])
        cube([panel_open_w(), wall + 0.5, panel_open_h()]);
}

module side_panel_lip() {
    difference() {
        translate([panel_open_x(), panel_lip_y(), panel_open_z()])
            cube([panel_open_w(), panel_lip_depth, panel_open_h()]);
        translate([
            panel_open_x() + wall,
            back_panel_on_far_face ? case_d - wall - panel_lip_depth - 0.1 : wall + 0.1,
            panel_open_z() + wall
        ])
            cube([panel_open_w() - 2 * wall, panel_lip_depth + 0.2, panel_open_h() - 2 * wall]);
    }
}

module end_service_openings() {
    translate([-0.2, side_open_y(), side_open_z()])
        cube([wall + 0.5, side_open_d(), side_open_h()]);
    translate([case_w - wall - 0.2, side_open_y(), side_open_z()])
        cube([wall + 0.5, side_open_d(), side_open_h()]);
}

// ------------------------------------------------------------
// Base: lower electronics body
// ------------------------------------------------------------
module base_body() {
    difference() {
        union() {
            shell_box([case_w, case_d, electronics_h], wall, floor_th, corner_r);
            // Outer wall extension around the tray so the shell reads as one piece.
            translate([0, 0, electronics_h])
                difference() {
                    rounded_box([case_w, case_d, tray_h], corner_r);
                    translate([wall, wall, -0.1])
                        rounded_box(
                            [case_w - 2 * wall, case_d - 2 * wall, tray_h + 0.2],
                            max(0.1, corner_r - wall)
                        );
                }
        }

        // USB-C opening near the ESP32 board.
        translate([case_w / 2 - usb_w / 2, -0.2, 7])
            cube([usb_w, wall + 0.5, usb_h]);

        // Large side service openings on both short faces.
        end_service_openings();

        // Removable long-side back panel opening.
        side_panel_cutout();

        // OLED window on the UI face.
        translate([ui_shell_oled_x(), ui_shell_face_y(), electronics_h + tray_oled_z])
            cube([oled_w, wall + 0.4, oled_hole_h]);

        // Long front-side opening under the pill section.
        translate([pill_under_slot_x(), -0.2, electronics_h + pill_under_slot_z])
            cube([pill_under_slot_w(), wall + 0.5, pill_under_slot_h]);

        // Matching slot on the removable back-panel side of the tray wall.
        translate([ui_service_x_case(), panel_face_y(), electronics_h])
            cube([ui_service_w(), wall + 0.4, tray_h]);

        // Open only the long upper wall under the pill section, leaving the rest of the body intact.
        translate([wall + 8, -0.2, electronics_h + 4])
            cube([case_w - 2 * wall - 16, wall + 0.5, tray_h - 8]);

        if (debug_button_cube) {
            translate([
                ui_shell_button_cx() - 5,
                ui_on_far_face ? case_d - wall - 0.8 : -0.2,
                electronics_h + tray_button_z - button_z_offset - 5
            ])
                cube([10, wall + 1.2, 10]);
        } else {
            translate([ui_shell_button_cx(), ui_shell_button_hole_y(), electronics_h + tray_button_z - button_z_offset])
                rotate([ui_button_rot(), 0, 0])
                    cylinder(d = button_hole_d, h = wall + 0.7);

            translate([ui_shell_button_cx(), ui_shell_button_bezel_y(), electronics_h + tray_button_z - button_z_offset])
                rotate([ui_button_rot(), 0, 0])
                    cylinder(d = button_bezel_d, h = 1.2);
        }
    }

    side_panel_lip();

    // Prototype mode: keep only the exterior shell without internal layer floors.

    // Mounting posts for bottom board layer.
    post_h = esp_layer_h - 2;
    screw_post(22, 22, post_h);
    screw_post(case_w - 22, 22, post_h);
    screw_post(22, case_d - 22, post_h);
    screw_post(case_w - 22, case_d - 22, post_h);

    // Small standoffs under mux area only when it uses its own layer.
    if (mux_layer_h > 0) {
        mux_z = esp_layer_h + 1.6;
        translate([case_w / 2 - 28, case_d / 2 - 22, mux_z])
            screw_post(0, 0, 8, 6, 2.4);
        translate([case_w / 2 + 28, case_d / 2 - 22, mux_z])
            screw_post(0, 0, 8, 6, 2.4);
        translate([case_w / 2 - 28, case_d / 2 + 22, mux_z])
            screw_post(0, 0, 8, 6, 2.4);
        translate([case_w / 2 + 28, case_d / 2 + 22, mux_z])
            screw_post(0, 0, 8, 6, 2.4);
    }
}

// ------------------------------------------------------------
// Pill tray: pill bins on top, sensor windows in the floor
// ------------------------------------------------------------
module pill_tray() {
    difference() {
        rounded_box([tray_outer_w, tray_outer_d, tray_h], 3);

        // Four pill wells with a narrower opening and rounded funnel floor.
        for (i = [0:cell_count - 1]) {
            x = wall + i * (cell_inner_w + cell_wall);
            translate([x, wall, 0])
                pill_well_cutout();
        }

        // Sensor exposure windows through tray floor.
        for (i = [0:cell_count - 1]) {
            cx = wall + cell_inner_w / 2 + i * (cell_inner_w + cell_wall);
            cy = local_well_center_y();
            translate([cx - sensor_window / 2, cy - sensor_window / 2, -0.1])
                cube([sensor_window, sensor_window, tray_floor_th + 0.3]);
        }

        // OLED window on the selected pill tray long side face.
        translate([ui_oled_x(), ui_face_y(), tray_oled_z])
            cube([oled_w, wall + 0.4, oled_hole_h]);

        // Open both short tray walls so the side access cutouts are not blocked.
        translate([-0.2, tray_side_open_y(), tray_side_open_z()])
            cube([wall + 0.4, tray_side_open_d(), tray_side_open_h()]);
        translate([tray_outer_w - wall - 3.0, tray_side_open_y(), tray_side_open_z()])
            cube([wall + 4.0, tray_side_open_d(), tray_side_open_h()]);

        // Connect the two short-side windows with a full-width internal tunnel.
        translate([-0.2, tray_side_open_y(), tray_side_open_z()])
            cube([tray_outer_w + 3.2, tray_side_open_d(), tray_side_open_h()]);

        // Button opening test: use a simple cube first so the position is obvious.
        if (debug_button_cube) {
            translate([ui_button_cx() - 5, ui_on_far_face ? tray_outer_d - wall - 0.8 : -0.2, tray_button_z - button_z_offset - 5])
                cube([10, wall + 1.2, 10]);
        } else {
            // Button opening next to the OLED on the same selected face.
            translate([ui_button_cx(), ui_button_hole_y(), tray_button_z - button_z_offset])
                rotate([ui_button_rot(), 0, 0])
                    cylinder(d = button_hole_d, h = wall + 0.7);

            // Shallow outer bezel so the button location reads clearly in preview.
            translate([ui_button_cx(), ui_button_bezel_y(), tray_button_z - button_z_offset])
                rotate([ui_button_rot(), 0, 0])
                    cylinder(d = button_bezel_d, h = 1.2);
        }

    }

    // Raised lips around sensor holes so pills do not sit directly on the sensor window.
    for (i = [0:cell_count - 1]) {
        cx = wall + cell_inner_w / 2 + i * (cell_inner_w + cell_wall);
        cy = local_well_center_y();
        translate([cx, cy, tray_floor_th])
            difference() {
                cylinder(d = sensor_window + 8, h = 1.6);
                translate([0, 0, -0.1])
                    cylinder(d = sensor_window + 1, h = 1.9);
            }
    }

    // Cell number embossing.
    for (i = [0:cell_count - 1]) {
        cx = wall + cell_inner_w / 2 + i * (cell_inner_w + cell_wall);
        translate([cx - 3, tray_outer_d - wall - 8, tray_h - 0.8])
            linear_extrude(height = 0.8)
                text(str(i + 1), size = 7, halign = "center", valign = "center");
    }
}

// ------------------------------------------------------------
// Lid: flat hinged lids without a front tab/groove
// ------------------------------------------------------------
module single_hinged_lid(panel_w, panel_d, angle = 0) {
    rotate([angle, 0, 0]) {
        translate([-panel_w / 2, 0, -lid_panel_th])
            difference() {
                union() {
                    rounded_box([panel_w, panel_d, lid_panel_th], 2.4);

                    // Rear hinge barrel centered on the lid.
                    translate([panel_w / 2, 0, -lid_panel_th / 2])
                        rotate([0, 90, 0])
                            cylinder(d = hinge_outer_d, h = hinge_leaf_w, center = true);
                }

                // Underside skirt for loose alignment only.
                translate([1.4, 1.4, -lid_skirt_h - 0.1])
                    rounded_box([panel_w - 2.8, panel_d - 2.8, lid_skirt_h + 0.2], 1.6);

                // Hinge pin clearance.
                translate([panel_w / 2, 0, -lid_panel_th / 2])
                    rotate([0, 90, 0])
                        cylinder(d = hinge_pin_d, h = hinge_leaf_w + 0.8, center = true);
            }
    }
}

function lid_demo_angle(i) = i == 0 ? 70 : 0;

module lid_body(show_demo_open = false) {
    top_w = min(well_top_w, cell_inner_w - 4);
    top_d = min(well_top_d, cell_inner_d - 4);
    panel_w = min(top_w + 2 * lid_overhang, cell_inner_w - lid_split_gap);
    panel_d = min(top_d + 2 * lid_overhang, cell_inner_d - 1.6);

    for (i = [0:cell_count - 1]) {
        cell_x = wall + i * (cell_inner_w + cell_wall);
        panel_x = cell_x + cell_inner_w / 2;
        panel_y = wall + max(2, min(cell_inner_d - top_d - 2, (cell_inner_d - top_d) / 2 + well_center_y_offset)) - lid_overhang;
        angle = show_demo_open ? lid_demo_angle(i) : 0;

        // Simple hinge support under each lid.
        translate([panel_x - hinge_leaf_w / 2, panel_y - hinge_mount_y, lid_h - lid_panel_th - hinge_outer_d / 2 + 0.2])
            cube([hinge_leaf_w, hinge_mount_y, hinge_outer_d / 2 + 0.6]);

        translate([panel_x, panel_y, lid_h - lid_panel_th / 2 - hinge_outer_d / 2])
            rotate([0, 90, 0])
                cylinder(d = hinge_pin_d, h = hinge_leaf_w, center = true);

        translate([panel_x, panel_y, lid_h])
            single_hinged_lid(panel_w, panel_d, angle);
    }
}

// ------------------------------------------------------------
// Visual electronics placeholders for assembly preview
// ------------------------------------------------------------
module electronics_preview() {
    marker_th = 1.2;
    sensor_deck_th = 2.2;
    board_layer_z = floor_th + 1;
    sensor_board_z = esp_layer_h + sensor_deck_th;
    board_y = case_d / 2 - esp32_d / 2;
    dist_y = case_d / 2 - mux_d / 2;
    main_x = 12;
    dist_x = case_w - mux_w - 12;

    // Main board footprint.
    translate([main_x, board_y, board_layer_z])
        footprint_marker([esp32_w, esp32_d, marker_th], "MAIN");

    // Distributor board footprint on the same layer, beside the main board.
    translate([dist_x, dist_y, board_layer_z])
        footprint_marker([mux_w, mux_d, marker_th], "DIST");

    // Sensor footprints directly below tray windows.
    for (i = [0:cell_count - 1]) {
        cx = cell_center_x(i);
        translate([cx - vl53_board_w / 2, case_d / 2 + well_center_y_offset - vl53_board_d / 2, sensor_board_z])
            footprint_marker([vl53_board_w, vl53_board_d, marker_th], str("S", i + 1));
    }

    // OLED and button markers on the outer wall extension.
    color("#111111")
        translate([ui_shell_oled_x(), ui_shell_marker_y(), electronics_h + tray_oled_z])
            cube([oled_w, 2, oled_hole_h]);

    color("#47c266")
        translate([ui_shell_button_cx(), ui_shell_button_marker_y(), electronics_h + tray_button_z - button_z_offset])
            rotate([ui_button_rot(), 0, 0])
                cylinder(d = button_hole_d, h = 3);
}

module assembly() {
    color("#d9d9d9") base_body();

    translate([wall + clearance, wall + clearance, tray_z()])
        color("#f2f2f2") pill_tray();

    translate([wall + clearance, wall + clearance, tray_z() + tray_h])
        color("#eeeeee") lid_body(true);

    // Layer labels in the preview.
    color("#333333")
        translate([case_w + 8, 8, 4])
            rotate([90, 0, 90])
                linear_extrude(height = 0.6)
                    text("ESP32 layer", size = 4);
    color("#333333")
        translate([case_w + 8, 8, esp_layer_h + 4])
            rotate([90, 0, 90])
                linear_extrude(height = 0.6)
                    text("Mux / wiring", size = 4);
    color("#333333")
        translate([case_w + 8, 8, esp_layer_h + mux_layer_h + 3])
            rotate([90, 0, 90])
                linear_extrude(height = 0.6)
                    text("VL53L1X", size = 4);
    color("#333333")
        translate([case_w + 8, 8, tray_z() + 10])
            rotate([90, 0, 90])
                linear_extrude(height = 0.6)
                    text("Pills", size = 4);
}

module assembly_open() {
    // Open exploded view: no exterior walls, only per-layer floor/deck plates.
    color([0.78, 0.78, 0.78, 0.45])
        translate([wall, wall, 0])
            cube([case_w - 2 * wall, case_d - 2 * wall, floor_th]);

    // Sensor layer deck above the board layer.
    color([0.72, 0.72, 0.72, 0.45])
        translate([wall, wall, esp_layer_h])
            difference() {
                cube([case_w - 2 * wall, case_d - 2 * wall, 2.2]);
                translate([-0.1, case_d - 2 * wall - open_preview_cut_d - 0.1, -0.1])
                    cube([case_w - 2 * wall + 0.2, open_preview_cut_d + 0.2, 2.4]);
            }

    color([0.90, 0.90, 0.90, 0.55])
        translate([wall + clearance, wall + clearance, tray_z()])
            difference() {
                rounded_box([tray_outer_w, tray_outer_d, tray_floor_th], 3);

                translate([-0.1, tray_outer_d - open_preview_cut_d - 0.1, -0.1])
                    cube([tray_outer_w + 0.2, open_preview_cut_d + 0.2, tray_floor_th + 0.3]);

                for (i = [0:cell_count - 1]) {
                    cx = wall + cell_inner_w / 2 + i * (cell_inner_w + cell_wall);
                    cy = local_well_center_y();
                    translate([cx - sensor_window / 2, cy - sensor_window / 2, -0.1])
                        cube([sensor_window, sensor_window, tray_floor_th + 0.3]);
                }

            }

    translate([wall + clearance, wall + clearance, tray_z() + tray_h])
        color("#eeeeee") lid_body(true);
}

// ------------------------------------------------------------
// Quick print coupon for checking one sensor hole and pill clearance
// ------------------------------------------------------------
module sensor_test() {
    test_w = 44;
    test_d = 52;
    test_h = 20;

    difference() {
        rounded_box([test_w, test_d, test_h], 3);
        translate([wall, wall, tray_floor_th])
            cube([test_w - 2 * wall, test_d - 2 * wall, test_h]);
        translate([test_w / 2 - sensor_window / 2, test_d / 2 - sensor_window / 2, -0.1])
            cube([sensor_window, sensor_window, tray_floor_th + 0.3]);
    }

    color("#2a9d55")
        translate([test_w / 2 - vl53_board_w / 2, test_d / 2 - vl53_board_d / 2, -vl53_board_h - 1])
            cube([vl53_board_w, vl53_board_d, vl53_board_h]);
}

module ui_cover() {
    cover_clearance = 0.35;
    plug_h = 4.6; // fills tray floor + ledge opening area with a little overlap
    flange_w = ui_service_w() + 4;
    flange_d = ui_service_depth() + 4;
    plug_w = max(4, ui_service_w() - 2 * cover_clearance);
    plug_d = max(4, ui_service_depth() - 2 * cover_clearance);

    difference() {
        union() {
            rounded_box([flange_w, flange_d, 1.6], 1.2);
            translate([(flange_w - plug_w) / 2, (flange_d - plug_d) / 2, -plug_h])
                rounded_box([plug_w, plug_d, plug_h], 1.0);
        }

        // Small finger notch so the cover can be removed during prototyping.
        translate([flange_w / 2 - 6, -0.1, -0.1])
            cube([12, 3.2, 2.2]);
    }
}

module back_panel() {
    panel_th = wall;
    lip_w = max(6, panel_open_w() - 2 * wall - 2 * panel_lip_clearance);
    panel_h = max(6, panel_open_h() - back_panel_bottom_gap);
    lip_h = max(6, panel_h - 2 * wall - 2 * panel_lip_clearance);

    union() {
        translate([0, 0, back_panel_bottom_gap])
            rounded_box([panel_open_w(), panel_th, panel_h], 2.2);
        translate([
            (panel_open_w() - lip_w) / 2,
            back_panel_on_far_face ? -panel_lip_depth : panel_th,
            back_panel_bottom_gap + (panel_h - lip_h) / 2
        ])
            cube([lip_w, panel_lip_depth - panel_lip_clearance, lip_h]);
    }
}

// ------------------------------------------------------------
// Output switch
// ------------------------------------------------------------
if (part == "assembly") {
    assembly();
} else if (part == "assembly_open") {
    assembly_open();
} else if (part == "base") {
    base_body();
} else if (part == "pill_tray") {
    pill_tray();
} else if (part == "pill_tray_cutaway") {
    pill_tray_cutaway();
} else if (part == "lid") {
    lid_body();
} else if (part == "ui_cover") {
    ui_cover();
} else if (part == "back_panel") {
    back_panel();
} else if (part == "sensor_test") {
    sensor_test();
} else {
    assembly();
}
