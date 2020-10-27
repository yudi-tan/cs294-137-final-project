/*
Shaders that swap the R, G or B channels of 2 images
*/

#include <metal_stdlib>
using namespace metal;

#define YOFFSET (13)
#define XOFFSET (-11)

#define RMULT (1.0)
#define GMULTL (1.8)
#define GMULTR (3.0)
#define BMULT (1.0)

kernel void swapR(texture2d<half, access::read>  source [[texture(0)]],
                  texture2d<half, access::read>  dest [[texture(1)]],
                  texture2d<half, access::write> output [[texture(2)]],
                  uint2 grid_id [[thread_position_in_grid]]) {
    uint2 gid = uint2(grid_id.x + XOFFSET, grid_id.y + YOFFSET);
    if ((gid.x >= source.get_width()) || (gid.y >= source.get_height())) {
        return;
    }
    half4 sourceColor = source.read(gid);
    half4 destColor = dest.read(grid_id);
    half4 outputColor = half4(RMULT * sourceColor.r, GMULTL*destColor.g, destColor.b, 1.0);
    output.write(outputColor, grid_id);
}

kernel void swapG(texture2d<half, access::read>  source [[texture(0)]],
                  texture2d<half, access::read>  dest [[texture(1)]],
                  texture2d<half, access::write> output [[texture(2)]],
                  uint2 gid [[thread_position_in_grid]]) {
    if ((gid.x >= source.get_width()) || (gid.y >= source.get_height())) {
        return;
    }
    half4 sourceColor = source.read(gid);
    half4 destColor = dest.read(gid);
    half4 outputColor = half4(destColor.r, sourceColor.g, destColor.b, 1.0);
    output.write(outputColor, gid);
}

kernel void swapB(texture2d<half, access::read>  source [[texture(0)]],
                  texture2d<half, access::read>  dest [[texture(1)]],
                  texture2d<half, access::write> output [[texture(2)]],
                  uint2 grid_id [[thread_position_in_grid]]) {
    uint2 gid = uint2(grid_id.x - XOFFSET, grid_id.y - YOFFSET);
    if ((gid.x >= source.get_width()) || (gid.y >= source.get_height())) {
        return;
    }
    half4 sourceColor = source.read(gid);
    half4 destColor = dest.read(grid_id);
    half4 outputColor = half4(destColor.r, GMULTR*destColor.g, BMULT*sourceColor.b, 1.0);
    output.write(outputColor, grid_id);
}
