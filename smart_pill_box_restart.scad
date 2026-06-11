// Smart Pill Box Restart
// Clean rebuild starting from pill_tray only
// OpenSCAD units: mm

part = "pill_tray";

$fn = 48;

// ------------------------------------------------------------
// Main dimensions
// ------------------------------------------------------------
case_w = 120;
case_d = 60;

wall = 2;

upper_inset = 15;
upper_len = 45;
tray_h = 17;

pill_open = 26;
pill_bottom_open = 10;
pill_gap = 2;

top_hole = 15;
top_hole_y = upper_inset + (upper_len - top_hole) / 2;
pill_center_y = top_hole_y + top_hole / 2;

pill_group_w = pill_open * 4 + pill_gap * 3;
pill_start_x = (case_w - pill_group_w) / 2;
pill_centers_x = [
    for (i = [0:3])
        pill_start_x + pill_open / 2 + i * (pill_open + pill_gap)
];

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
module box(size) {
    cube(size);
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

// ------------------------------------------------------------
// Pill tray
// ------------------------------------------------------------
module pill_tray() {
    difference() {
        translate([0, upper_inset, 0])
            box([case_w, upper_len, tray_h]);

        for (cx = pill_centers_x)
            funnel_hole(cx, pill_center_y, pill_open, pill_bottom_open);
    }
}

// ------------------------------------------------------------
// Output
// ------------------------------------------------------------
if (part == "pill_tray") {
    color("#d9d9d9") pill_tray();
} else {
    color("#d9d9d9") pill_tray();
}
