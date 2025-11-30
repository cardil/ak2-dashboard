#!/bin/sh
# Simulates bed mesh leveling by generating mesh points in printer.cfg
# This mimics what the vendor app does when running bed leveling

CONFIG_FILE="/user/printer.cfg"

# Realistic 5x5 base mesh data (typical bed with slight warping pattern)
# Values show a common "bowl" shape with center slightly lower
BASE_POINTS="+0.085 +0.042 +0.015 +0.038 +0.075 \
+0.048 +0.018 -0.008 +0.012 +0.042 \
+0.022 -0.012 -0.035 -0.018 +0.015 \
+0.045 +0.008 -0.015 +0.005 +0.038 \
+0.078 +0.035 +0.008 +0.032 +0.068"

# Add random variation of +/- 0.02mm to a value
add_variation() {
    base=$1
    # Get random number 0-40000 and shift to -20000 to +20000 (microns for +/- 0.02mm)
    if [ -r /dev/urandom ]; then
        rand=$(od -An -tu2 -N2 /dev/urandom | tr -d ' ')
    else
        rand=$((RANDOM % 40000))
    fi
    # Scale to -20 to +20 (in units of 0.001mm)
    variation=$(( (rand % 40) - 20 ))
    
    # Parse base value (handle sign)
    sign="+"
    case $base in
        -*) sign="-"; base="${base#-}" ;;
        +*) sign="+"; base="${base#+}" ;;
    esac
    
    # Convert to integer (in units of 0.001mm = microns/1000)
    int_val=$(echo "$base" | awk '{printf "%d", $1 * 1000}')
    
    # Apply sign
    if [ "$sign" = "-" ]; then
        int_val=$(( -int_val ))
    fi
    
    # Add variation
    new_val=$(( int_val + variation ))
    
    # Format back to +/- 0.XXXXXX
    if [ $new_val -ge 0 ]; then
        printf "+0.%06d" $((new_val * 1000))
    else
        printf "-0.%06d" $(( -new_val * 1000))
    fi
}

# Generate mesh points with small random variations
generate_mesh_points() {
    result=""
    count=0
    for point in $BASE_POINTS; do
        count=$((count + 1))
        varied=$(add_variation "$point")
        if [ $count -eq 25 ]; then
            result="$result $varied"
        else
            result="$result$varied, "
        fi
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