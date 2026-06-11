// Smart Pill Box Prototype v2
// Clean restart: rack_frame first
// OpenSCAD units: mm

part = "tray_shell";

$fn = 48;

// ------------------------------------------------------------
// Main dimensions
// ------------------------------------------------------------
case_w = 120;
case_d = 60;

wall = 2;

plate_th = 2;
gap_12 = 10;
gap_23 = 6;

upper_inset = 15;
upper_len = 45;
front_slot_w = 18;
front_slot_margin = 8;
top_hole = 15;
top_hole_y = upper_inset + (upper_len - top_hole) / 2;
tray_h = 17;
channel_roof_th = 2;
pill_open = 26;
pill_bottom_open = 10;
pill_center_y = top_hole_y + top_hole / 2;
pill_gap = 2;
pill_group_w = pill_open * 4 + pill_gap * 3;
pill_start_x = (case_w - pill_group_w) / 2;
pill_centers_x = [for (i = [0:3]) pill_start_x + pill_open / 2 + i * (pill_open + pill_gap)];
top_hole_xs = [for (cx = pill_centers_x) cx - top_hole / 2];
ui_square = 20;
ui_button_d = 10;
ui_gap = 10;
ui_group_w = ui_square + ui_gap + ui_button_d;
ui_square_x = (case_w - ui_group_w) / 2;
ui_square_z = (plate_th + gap_12 + plate_th + gap_23 + plate_th + tray_h - ui_square) / 2;
ui_button_x = ui_square_x + ui_square + ui_gap + ui_button_d / 2;
ui_button_z = ui_square_z + ui_square / 2;
cover_face_th = 1.6;
cover_lip_th = 2;
cover_clearance = 0.3;

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
module rounded_box(size, r = 0) {
    cube(size);
}

module square_pocket(cx, cy, top_size, depth) {
    translate([cx - top_size / 2, cy - top_size / 2, -0.1])
        cube([top_size, top_size, tray_h + 0.2]);
}

module rounded_square_2d(size, r) {
    hull() {
        for (x = [-size / 2 + r, size / 2 - r])
            for (y = [-size / 2 + r, size / 2 - r])
                translate([x, y])
                    circle(r = r);
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

module finish_cover(open_w, open_h, face_margin = 1.5) {
    face_w = open_w + face_margin * 2;
    face_h = open_h + face_margin * 2;
    lip_w = max(0.1, open_w - cover_clearance * 2);
    lip_h = max(0.1, open_h - cover_clearance * 2);

    union() {
        cube([face_w, face_h, cover_face_th]);
        translate([(face_w - lip_w) / 2, (face_h - lip_h) / 2, cover_face_th])
            cube([lip_w, lip_h, cover_lip_th]);
    }
}

function shelf2_z() = plate_th + gap_12;
function rack_h() = shelf2_z() + plate_th;
function assembly_h() = rack_h() + tray_h;

// ------------------------------------------------------------
// Rack frame
// ------------------------------------------------------------
module rack_frame() {
    shelf2 = shelf2_z();
    frame_wall_h = rack_h();

    union() {
        // Bottom plate
        rounded_box([case_w, case_d, plate_th]);

        // Second floor plate
        translate([0, upper_inset, shelf2])
            rounded_box([case_w, upper_len, plate_th]);

        // Left outer wall
        rounded_box([wall, case_d, frame_wall_h]);

        // Right outer wall
        translate([case_w - wall, 0, 0])
            rounded_box([wall, case_d, frame_wall_h]);

        // Rear outer wall
        translate([0, case_d - wall, 0])
            rounded_box([case_w, wall, frame_wall_h]);
    }
}

// ------------------------------------------------------------
// Pill tray
// ------------------------------------------------------------
module pill_tray() {
    difference() {
        translate([0, upper_inset, 0])
            rounded_box([case_w, upper_len, tray_h]);

        for (cx = pill_centers_x)
            funnel_hole(cx, pill_center_y, pill_open, pill_bottom_open);
    }
}

module tray_shell() {
    total_h = rack_h();
    full_h = assembly_h();
    side_open_z0 = shelf2_z() + plate_th + 1;
    side_open_h = max(1, full_h - channel_roof_th - side_open_z0 - 1);

    difference() {
        union() {
            // Pill tray body
            translate([0, 0, total_h])
                pill_tray();

            // Right side outer wall
            translate([case_w - wall, upper_inset, 0])
                rounded_box([wall, case_d - upper_inset, full_h]);

            // Front face with UI openings
            difference() {
                rounded_box([case_w, wall, full_h]);

                translate([ui_square_x, -0.1, ui_square_z])
                    cube([ui_square, wall + 0.2, ui_square]);

                translate([ui_button_x, wall / 2, ui_button_z])
                    rotate([90, 0, 0])
                        cylinder(h = wall + 0.2, d = ui_button_d, center = true);
            }

            // Thin roof over the front service channel
            translate([0, 0, full_h - channel_roof_th])
                rounded_box([case_w, upper_inset, channel_roof_th]);

            // Close the visible right-side upper gap
            translate([case_w - wall, 0, shelf2_z() + plate_th])
                rounded_box([wall, upper_inset, full_h - channel_roof_th - (shelf2_z() + plate_th)]);
        }

        // Left side rectangular opening on tray_shell
        translate([-0.1, -0.1, side_open_z0])
            cube([wall + 0.2, upper_inset + 0.2, side_open_h]);

        // Remove the remaining left-side tray_shell U-frame all the way to the front edge
        translate([-0.1, -0.1, shelf2_z() + plate_th - 0.1])
            cube([wall + 0.2, upper_inset + 0.2, full_h - (shelf2_z() + plate_th) + 0.2]);

    }
}

// ------------------------------------------------------------
// Assembly
// ------------------------------------------------------------
module assembly() {
    color("#d9d9d9") rack_frame();
    color("#cfcfcf") tray_shell();
}

module cover_set() {
    shelf2_z = plate_th + gap_12;
    shelf3_z = plate_th + gap_12 + plate_th + gap_23;
    total_h = shelf3_z + plate_th;
    assembly_h = total_h + tray_h;

    long_open_w = case_w - wall * 2;
    long_open_h = gap_12;
    end_open_w = upper_inset - wall;
    end_open_h = assembly_h - channel_roof_th - plate_th;

    color("#d9d9d9") {
        finish_cover(long_open_w, long_open_h);

        translate([0, 20, 0])
            finish_cover(end_open_w, end_open_h);

        translate([20, 20, 0])
            finish_cover(end_open_w, end_open_h);
    }
}

// ------------------------------------------------------------
// Output
// ------------------------------------------------------------
if (part == "rack_frame") {
    color("#d9d9d9") rack_frame();
} else if (part == "pill_tray") {
    color("#d9d9d9") pill_tray();
} else if (part == "tray_shell") {
    color("#d9d9d9") tray_shell();
} else if (part == "assembly") {
    assembly();
} else if (part == "cover_set") {
    cover_set();
} else {
    color("#d9d9d9") rack_frame();
}
