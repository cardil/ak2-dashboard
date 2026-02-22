#!/bin/sh
# Simulates bed mesh leveling by generating mesh points in printer.cfg
# This mimics what the vendor app does when running bed leveling

CONFIG_FILE="/user/printer.cfg"

# Get grid size from probe_count in config (e.g., "5,5" -> 5)
get_grid_size() {
    probe_count=$(grep "^probe_count : " "$CONFIG_FILE" | sed 's/probe_count : //' | cut -d',' -f1)
    if [ -z "$probe_count" ]; then
        echo "5"  # Default to 5x5 if not found
    else
        echo "$probe_count"
    fi
}

# Generate mesh points dynamically based on grid size
# Uses pure shell integer math for speed (no awk/bc in loop)
generate_mesh_points() {
    grid_size=$(get_grid_size)
    total_points=$((grid_size * grid_size))
    center_x2=$((grid_size - 1))  # center * 2 to avoid floats

    # Get all random bytes at once (2 bytes per point for variation)
    # Use hexdump instead of od (od is not available in BusyBox)
    if [ -r /dev/urandom ]; then
        rand_hex=$(hexdump -v -e '1/1 "%02x"' -n $((total_points * 2)) /dev/urandom 2>/dev/null)
    else
        rand_hex=""
    fi

    result=""
    count=0
    rand_idx=0
    row=0

    while [ $row -lt $grid_size ]; do
        col=0
        while [ $col -lt $grid_size ]; do
            count=$((count + 1))

            # Distance from center using integer math (scaled by 2 to match center_x2)
            row_x2=$((row * 2))
            col_x2=$((col * 2))
            dr=$((row_x2 - center_x2))
            dc=$((col_x2 - center_x2))
            if [ $dr -lt 0 ]; then dr=$((-dr)); fi
            if [ $dc -lt 0 ]; then dc=$((-dc)); fi

            # Normalized distance: 0 at center, ~2000 at corners (scaled by 1000)
            # max distance is center_x2 * 2 (diagonal)
            if [ $center_x2 -gt 0 ]; then
                dist=$((((dr + dc) * 1000) / (center_x2 * 2)))
            else
                dist=0
            fi

            # Bowl shape: edges +80, center -35 (in units of 0.001mm = microns)
            # base = -35 + dist * 115 / 1000
            base=$(( -35 + (dist * 115) / 1000 ))

            # Get random variation +/- 20 from pre-fetched bytes
            if [ -n "$rand_hex" ]; then
                # Extract 2 hex chars (1 byte = 0-255)
                hex_byte=$(echo "$rand_hex" | cut -c$((rand_idx + 1))-$((rand_idx + 2)))
                rand_idx=$((rand_idx + 2))
                if [ -n "$hex_byte" ]; then
                    byte_val=$((0x$hex_byte))
                    variation=$(( (byte_val % 41) - 20 ))
                else
                    variation=$(( ((row * 7 + col * 13) % 41) - 20 ))
                fi
            else
                variation=$(( ((row * 7 + col * 13) % 41) - 20 ))
            fi

            new_val=$((base + variation))

            # Format as +/- 0.XXXXXX
            if [ $new_val -ge 0 ]; then
                printf_val=$(printf "%06d" $((new_val * 1000)))
                point="+0.$printf_val"
            else
                printf_val=$(printf "%06d" $(( -new_val * 1000)))
                point="-0.$printf_val"
            fi

            if [ $count -eq $total_points ]; then
                result="$result $point"
            else
                result="$result$point, "
            fi
            col=$((col + 1))
        done
        row=$((row + 1))
    done
    echo "$result"
}

# Check if printer.cfg exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: $CONFIG_FILE not found"
    exit 1
fi

MESH_POINTS=$(generate_mesh_points)

# Check if points line already exists
if grep -q "^points : " "$CONFIG_FILE"; then
    echo "Updating existing mesh points..."
    sed -i "s/^points : .*/points : $MESH_POINTS/" "$CONFIG_FILE"
else
    echo "Adding mesh points after [bed_mesh] section..."
    sed -i "/^algorithm : /a points : $MESH_POINTS" "$CONFIG_FILE"
fi

# Verify the change
if grep -q "^points : " "$CONFIG_FILE"; then
    echo "SUCCESS: Mesh points generated!"
    grep "^points : " "$CONFIG_FILE"
else
    echo "ERROR: Failed to add mesh points"
    exit 1
fi
