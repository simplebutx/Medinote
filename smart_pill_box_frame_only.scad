// Simple pill box parts viewer
// Change `part` to one of:
// "frame"     -> frame only
// "pill_tray" -> pill tray only
// "lid_set"   -> four separate hinged lids
// "assembly"  -> combined view
// OpenSCAD units: mm

part = "frame";

$fn = 48;

// ------------------------------------------------------------
// Main dimensions
// ------------------------------------------------------------
case_w = 120;
case_d = 60;

wall = 2;
plate_th = 2;
gap_12 = 10;
channel_roof_th = 2;
tray_clearance = 12;

outer_r = 0;
tray_r = 0;
lid_r = 2;
tab_r = 1.2;

usb_cutout_w = 10;
usb_cutout_h = 5;
usb_cutout_bottom_z = 4;

upper_inset = 15;
upper_len = 45;

ui_square = 20;
ui_button_d = 10;
ui_gap = 10;

top_hole = 15;
top_hole_y = upper_inset + (upper_len - top_hole) / 2;
tray_h = 17;

pill_open = 26;
pill_bottom_open = 10;
pill_center_y = top_hole_y + top_hole / 2;
pill_gap = 2;
pill_group_w = pill_open * 4 + pill_gap * 3;
pill_start_x = (case_w - pill_group_w) / 2;
pill_centers_x = [
    for (i = [0:3])
        pill_start_x + pill_open / 2 + i * (pill_open + pill_gap)
];

// Hinges use a 1.75 mm filament offcut as the pin.
hinge_pin_hole_d = 2.15;
hinge_outer_d = 5.2;
hinge_base_clearance = 0.6;
hinge_support_len = 4.2;
hinge_end_margin = 0.4;
hinge_y = case_d - hinge_outer_d / 2 - 0.8;
hinge_lid_barrel_len = 20;
lid_w = pill_open + 0.2;
lid_d = pill_open + 3;
lid_th = 2;
lid_z_gap = 0.35;
lid_pull_tab_w = 9;
lid_pull_tab_d = 4;

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
module rounded_rect_2d(w, d, r) {
    rr = min(r, min(w, d) / 2 - 0.01);

    if (rr <= 0) {
        square([w, d], center = true);
    } else {
        hull() {
            for (x = [-w / 2 + rr, w / 2 - rr])
                for (y = [-d / 2 + rr, d / 2 - rr])
                    translate([x, y])
                        circle(r = rr);
        }
    }
}

module rounded_box(size, r = 0) {
    if (r <= 0) {
        cube(size);
    } else {
        linear_extrude(height = size[2])
            translate([size[0] / 2, size[1] / 2])
                rounded_rect_2d(size[0], size[1], r);
    }
}

module rounded_y_box(size, r = 0) {
    if (r <= 0) {
        cube(size);
    } else {
        // Extrude along Y so the visible X-Z face gets rounded corners.
        multmatrix([
            [1, 0, 0, 0],
            [0, 0, 1, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 1]
        ])
            linear_extrude(height = size[1])
                translate([size[0] / 2, size[2] / 2])
                    rounded_rect_2d(size[0], size[2], r);
    }
}

module rounded_square_2d(size, r) {
    rounded_rect_2d(size, size, r);
}

module tray_body_box(size, r = 0) {
    w = size[0];
    d = size[1];
    h = size[2];
    rr = min(r, min(w, d) / 2 - 0.01);

    if (rr <= 0) {
        cube(size);
    } else {
        // Keep the front edge flat so it mates cleanly with the front face.
        linear_extrude(height = h)
            polygon(points = [
                [0, 0],
                [w, 0],
                [w, d - rr],
                for (a = [0:8]) [
                    w - rr + rr * cos(a * 90 / 8),
                    d - rr + rr * sin(a * 90 / 8)
                ],
                [rr, d],
                for (a = [0:8]) [
                    rr + rr * cos(90 + a * 90 / 8),
                    d - rr + rr * sin(90 + a * 90 / 8)
                ],
                [0, 0]
            ]);
    }
}

module funnel_hole(cx, cy, top_size, bottom_size) {
    translate([cx, cy, 0])
        hull() {
            translate([0, 0, tray_h - 0.1])
                linear_extrude(height = 0.2)
                    rounded_square_2d(top_size, 3);

            translate([0, 0, -0.1])
                linear_extrude(height = 0.2)
                    rounded_square_2d(bottom_size, 1.5);
        }
}

function shelf2_z() = plate_th + gap_12;
function tray_mount_z() = shelf2_z() + plate_th + tray_clearance;
function tray_full_h() = tray_mount_z() + tray_h;
function ui_group_w() = ui_square + ui_gap + ui_button_d;
function ui_square_x() = (case_w - ui_group_w()) / 2;
function ui_square_z() = (tray_full_h() - ui_square) / 2;
function ui_button_x() = ui_square_x() + ui_square + ui_gap + ui_button_d / 2;
function ui_button_z() = tray_full_h() / 2;

module usb_c_side_cutouts() {
    cutout_y = case_d / 2 - usb_cutout_w / 2;

    // Left side USB-C cable clearance.
    translate([-0.1, cutout_y, usb_cutout_bottom_z])
        cube([wall + 0.2, usb_cutout_w, usb_cutout_h]);

    // Right side USB-C cable clearance.
    translate([case_w - wall - 0.1, cutout_y, usb_cutout_bottom_z])
        cube([wall + 0.2, usb_cutout_w, usb_cutout_h]);
}

module hinge_barrel_x(x, y, z, len) {
    translate([x, y, z])
        rotate([0, 90, 0])
            difference() {
                cylinder(h = len, d = hinge_outer_d);

                translate([0, 0, -0.1])
                    cylinder(h = len + 0.2, d = hinge_pin_hole_d);
            }
}

module tray_hinge_end_supports() {
    axis_z = tray_h + hinge_base_clearance + hinge_outer_d / 2;
    base_h = 1.4;
    base_y = hinge_y - hinge_outer_d / 2;

    union() {
        // End barrels hold one long filament pin for all four lids.
        hinge_barrel_x(hinge_end_margin, hinge_y, axis_z, hinge_support_len);

        translate([case_w - hinge_end_margin - hinge_support_len, 0, 0])
            hinge_barrel_x(0, hinge_y, axis_z, hinge_support_len);

        // Small feet give the printed hinge barrels real contact area.
        translate([hinge_end_margin, base_y, tray_h - 0.1])
            cube([hinge_support_len, hinge_outer_d, base_h]);

        translate([case_w - hinge_end_margin - hinge_support_len, base_y, tray_h - 0.1])
            cube([hinge_support_len, hinge_outer_d, base_h]);
    }
}

module lid_piece(cx) {
    axis_z = tray_h + hinge_base_clearance + hinge_outer_d / 2;
    lid_x = cx - lid_w / 2;
    lid_y = pill_center_y - lid_d / 2;
    lid_z = tray_h + lid_z_gap;
    barrel_x = cx - hinge_lid_barrel_len / 2;
    tab_x = cx - lid_pull_tab_w / 2;
    leaf_y = lid_y + lid_d - 0.8;
    leaf_len = hinge_y - hinge_outer_d / 2 - leaf_y + 1.2;

    union() {
        // Main lid plate. It sits slightly above the tray top to avoid scraping.
        translate([lid_x, lid_y, lid_z])
            rounded_box([lid_w, lid_d, lid_th], lid_r);

        // Finger pull on the side opposite the hinge.
        translate([tab_x, lid_y - lid_pull_tab_d + 0.2, lid_z])
            rounded_box([lid_pull_tab_w, lid_pull_tab_d, lid_th], tab_r);

        // Lid barrel rotates around the filament pin.
        hinge_barrel_x(barrel_x, hinge_y, axis_z, hinge_lid_barrel_len);

        // Leaf ties into the back of the barrel without blocking the pin hole.
        translate([lid_x, leaf_y, lid_z])
            cube([lid_w, leaf_len, lid_th]);
    }
}

module lid_set_local() {
    for (cx = pill_centers_x)
        lid_piece(cx);
}

module lid_set() {
    color("#eeeeee")
        translate([0, 0, -tray_h])
            lid_set_local();
}

// ------------------------------------------------------------
// Parts
// ------------------------------------------------------------
module frame() {
    frame_wall_h = tray_mount_z();
    full_h = tray_full_h();

    difference() {
        union() {
            // 1st floor plate
            rounded_box([case_w, case_d, plate_th], outer_r);

            // 2nd floor plate
            translate([0, upper_inset, shelf2_z()])
                rounded_box([case_w, upper_len, plate_th], outer_r);

            // Left outer wall
            tray_body_box([wall, case_d, frame_wall_h], outer_r);

            // Close the side of the front service channel without rounding the mating edge.
            translate([0, 0, frame_wall_h])
                cube([wall, upper_inset, full_h - frame_wall_h]);

            // Right outer wall
            translate([case_w - wall, 0, 0])
                tray_body_box([wall, case_d, frame_wall_h], outer_r);

            // Close the side of the front service channel without rounding the mating edge.
            translate([case_w - wall, 0, frame_wall_h])
                cube([wall, upper_inset, full_h - frame_wall_h]);

            // Rear outer wall
            translate([0, case_d - wall, 0])
                rounded_box([case_w, wall, frame_wall_h], outer_r);
        }

        usb_c_side_cutouts();
    }
}

module pill_tray_core() {
    union() {
        difference() {
            translate([0, upper_inset, 0])
                tray_body_box([case_w, upper_len, tray_h], tray_r);

            for (cx = pill_centers_x)
                funnel_hole(cx, pill_center_y, pill_open, pill_bottom_open);

        }

        tray_hinge_end_supports();
    }
}

module pill_tray_cap() {
    full_h = tray_full_h();

    union() {
        difference() {
            // Front vertical face
            translate([wall, 0, 0])
                cube([case_w - 2 * wall, wall, full_h]);

            // Centered square opening
            translate([ui_square_x(), -0.1, ui_square_z()])
                cube([ui_square, wall + 0.2, ui_square]);

            // Centered round opening
            translate([ui_button_x(), wall / 2, ui_button_z()])
                rotate([90, 0, 0])
                    cylinder(h = wall + 0.2, d = ui_button_d, center = true);
        }

        // Thin roof over the front service channel
        translate([wall, 0, full_h - channel_roof_th])
            cube([case_w - 2 * wall, upper_inset, channel_roof_th]);
    }
}

module pill_tray() {
    union() {
        color("#cfcfcf")
            pill_tray_cap();

        color("#cfcfcf")
            translate([0, 0, tray_mount_z()])
                pill_tray_core();
    }
}

module assembly() {
    color("#d9d9d9")
        frame();

    pill_tray();

    color("#eeeeee")
        translate([0, 0, tray_mount_z()])
            lid_set_local();
}

// ------------------------------------------------------------
// Output
// ------------------------------------------------------------
if (part == "frame") {
    color("#d9d9d9") frame();
} else if (part == "pill_tray") {
    pill_tray();
} else if (part == "lid_set") {
    lid_set();
} else if (part == "assembly") {
    assembly();
} else {
    assembly();
}
