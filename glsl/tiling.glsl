#version 300 es

precision highp float;

//  common uniforms
uniform vec2 uDimensions;
uniform vec4 uMouse;
uniform float uTime;

//  shader-specific uniforms

// Texture
in vec2 vTextureCoord;

out vec4 outColor;

//////////////////////////////////////////////////////////////////////
//
// "pentagonal tiling variations" by mattz
// License https://creativecommons.org/licenses/by/4.0/
//
// Click and drag to set vertex position.
//
// Renders "type 4" Cairo pentagonal tilings. See
// https://en.wikipedia.org/wiki/Cairo_pentagonal_tiling
// for details.
//
// Inspired by https://twitter.com/cs_kaplan
//
// Related shaders:
//
//   - "Cairo tiling" by nimitz
//      https://www.shadertoy.com/view/4ssSWf
//
//   - "More Cairo Tiles" by mla
//      https://www.shadertoy.com/view/MlSfRd
//
//   - "Extruded Pentagon Tiling" by Shane
//      https://www.shadertoy.com/view/3t2cDK
//
//   - "15th Pentagonal tiling" by tomkh
//      https://www.shadertoy.com/view/4lBXRV
//
//   - "pentagonal tiling" by FabriceNeyret2
//      https://www.shadertoy.com/view/ltBBzK
//      (golfed at https://www.shadertoy.com/view/XljfRV)
//
// Noise function from iq's "Noise - gradient - 2D"
// https://www.shadertoy.com/view/XdXGW8
//
//////////////////////////////////////////////////////////////////////

// vector rotated by 90 degrees CCW
vec2 perp(vec2 u) {
    return vec2(-u.y, u.x);
}

// rotate vector by rotation vector (cos(t), sin(t))
vec2 rotate(vec2 rvec, vec2 p) {
    return p.x * rvec + p.y * vec2(-rvec.y, rvec.x);
}

// rotate vector by rotation vector (cos(t), sin(t))
vec2 unrotate(vec2 rvec, vec2 p) {
    return p.x * vec2(rvec.x, -rvec.y) + p.y * rvec.yx;
}

// distance from point to line segment
float dseg(vec2 p, vec2 a, vec2 b) {

    vec2 pa = p - a;
    vec2 ba = b - a;
    
    float u = dot(pa, ba) / dot(ba, ba);
    
    u = clamp(u, 0.0, 1.0);
    
    return length(pa - u * ba);
    
}

// half-plane test
bool in_half_plane(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    return dot(pa, perp(ba)) > 0.0;
}

// point in triangle
bool in_triangle(vec2 p, vec2 a, vec2 b, vec2 c) {
    return in_half_plane(p, a, b) && in_half_plane(p, b, c) && in_half_plane(p, c, a);
}

// from https://www.shadertoy.com/view/XdXGW8 - used for noise below
vec2 grad( ivec2 z ) {

    // 2D to 1D  (feel free to replace by some other)
    int n = z.x+z.y*11111;

    // Hugo Elias hash (feel free to replace by another one)
    n = (n<<13)^n;
    n = (n*(n*n*15731+789221)+1376312589)>>16;

    // Perlin style vectors
    n &= 7;
    
    vec2 gr = vec2(n&1,n>>1)*2.0-1.0;
    
    return ( n>=6 ) ? vec2(0.0,gr.x) : 
           ( n>=4 ) ? vec2(gr.x,0.0) :
           gr;
           
}

// from https://www.shadertoy.com/view/XdXGW8
float noise( in vec2 p ) {

    ivec2 i = ivec2(floor( p ));
    vec2 f = fract( p );
	
    vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);

    return mix( mix( dot( grad( i+ivec2(0,0) ), f-vec2(0.0,0.0) ), 
                     dot( grad( i+ivec2(1,0) ), f-vec2(1.0,0.0) ), u.x),
                mix( dot( grad( i+ivec2(0,1) ), f-vec2(0.0,1.0) ), 
                     dot( grad( i+ivec2(1,1) ), f-vec2(1.0,1.0) ), u.x), u.y);

}


// colors for each cell
const vec3 CELL_COLORS[4] = vec3[4](
    vec3(0.9, 0.0, 0.05),
    vec3(0.95, 0.85, 0.0),
    vec3(0.1, 0.8, 0.05),
    vec3(0.1, 0.5, 0.8)
);

// rotation vectors for theta = 0, pi/2, pi, 3*pi/2
const vec2 ROT_VECTORS[4] = vec2[4](
    vec2(1, 0),
    vec2(0, 1),
    vec2(-1, 0),
    vec2(0, -1)
);

// un-rotated cell geometry 
// 
//
//           C
//         _*_____
//       _-       -----____
//  D  _*------------------* B ---
//   _- |                 ||
//  *   |                 ||
//  |   |                | |    
//  |   |                | |    t
//   |  |               |  |   
//   |  |            A  |  |
//    | |            __*   |   ---
//    | |        __--   \  |    
//     ||    __--        \ |    y
//     ||__--             \|    
//    O *------------------* X ---
//
//      |       x      | s |
// 
// notes:
//
//   square is 0.5 x 0.5
//
//   A = O + (x, y)
//   B = O + (0.5, 0.5)
//   C = B + (-t, s) = B + (y - 0.5, 0.5 - x)
//   D = O + (-y, x)
//   X = O + (0.5, 0)
//
//   segments OD and OA are congruent and perpendicular
//   segments AB and BC are congruent and perpendicular
//  
//   there are four rotated copies of polygon OABCD around point O 

// polygon points
vec2 O, A, B, C, D;

// for bump-mapped shading
vec2 heightmap(vec2 p) {

    // get polygon distance
    float dpoly = dseg(p, O, A);
    dpoly = min(dpoly, dseg(p, A, B));
    dpoly = min(dpoly, dseg(p, B, C));
    dpoly = min(dpoly, dseg(p, C, D));
    dpoly = min(dpoly, dseg(p, D, O));
    
    // offset from edge
    float k = 0.08;
    
    // base height
    float z = k + 0.01 * noise(5.*p);
    
    if (dpoly < k) {
        // semicircular shoulder
        float w = (dpoly/k - 1.0);
        z *= sqrt(1.0 - w*w);
    } else {
        // depression inwards from edge
        z *= (1.0 - 0.03*smoothstep(k, 2.0*k, dpoly));
    }
    
    // return height and polygon distance
    return vec2(z, dpoly);
    
}

// do the things!
//void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
void main() {

    vec2 iResolution = uDimensions;
    vec2 fragCoord = vTextureCoord * uDimensions;

    // global rotation by 45 degrees
    vec2 global_rot = vec2(0.5*sqrt(2.0));
    
    // image should be six blocks high
    float scl = 6.0 * global_rot.x / iResolution.y;
    
    // uv in [0,1] x [0, 1] holds vertex position
    vec2 uv = vec2(0.7886751345948132, 0.21132486540518713);
    
    // light coords relative to center
    vec2 lcoord = vec2(0);

    if (uMouse.z > 0.) {
    
        // set vertex coords by dragging - light is fixed
        
        uv = clamp(uMouse.xy / iResolution.xy, 0.0, 1.0);
        lcoord = vec2(-0.0, 0.5);
        
    } else {
    
        // set vertex coords varying over screen
        // and move light
        uv = (fragCoord.xy - 0.5 * iResolution.xy) / (max(iResolution.x, iResolution.y));
        
        const float repeat = 30.0; // seconds
        const float wraps_per_repeat = 5.0;
        
        const float x_lobes = 3.0;
        const float y_lobes = 2.0;
        
        const float two_pi = 6.283185307179586;
        
        float t = uTime * two_pi / repeat;
        
        float t_wrap = t * wraps_per_repeat;
       
        float c = cos(t_wrap);
        float s = sin(t_wrap);
        
        uv = rotate(vec2(s, -c), uv);
        
        uv = clamp(uv + 0.5, 0.0, 1.0);
        
        lcoord = vec2(-sin(t * x_lobes), cos(t * y_lobes));
 
    }
    
    // z coordinate of camera and light (tiles live at z=0)
    const float cz = 3.5;
    
    // set light pos in 3D
    vec3 lpos = vec3(lcoord * 0.5 * iResolution.xy * scl, cz);
    
    // camera pos in 3D
    const vec3 cpos = vec3(0, 0, cz);

    // map frag cords to scene coords (before global rotation)
    vec2 porig = (fragCoord + vec2(0.13, 0.17) - 0.5*iResolution.xy) * scl;
    
    // apply global rotation
    vec2 p = rotate(porig, global_rot);

    // find starting origin of tile cluster -- note this could change below
    O = floor(p + 0.5);
            
    // figure out which quadrant we are in relative to the origin
    ivec2 qstep = ivec2(step(p, O));
    int quadrant = (qstep.x ^ qstep.y) + 2*qstep.y;
    
    // each quadrant rotates by 90 degrees
    vec2 rvec = ROT_VECTORS[quadrant];
    
    // form some critical points of the polygon in this cell
    vec2 xy = 0.5*uv;
    vec2 st = 0.5 - xy;
    
    A = O + rotate(rvec, xy);
    B = O + rotate(rvec, vec2(0.5));
    vec2 X = O + rotate(rvec, vec2(0.5, 0));

    // get distance from point to semgent AX
    float dline = dseg(p, A, X);

    // figure out whether we are in the main upper-left part of the
    // cell or one of the two triangles
    int cell = quadrant;
    
    if (in_triangle(p, X, B, A)) {
        // in triangle XBA -- rotate polygon CCW by 90 degrees and translate it over by 1 cell
        cell = (quadrant + 1) & 3;
        O += rvec;
        rvec = perp(rvec);
    } else if (in_triangle(p, O, X, A)) {
        // in trangle OXA -- rotate polygon CW by 90 degrees
        cell = (quadrant + 3) & 3;
        rvec = -perp(rvec);
    } 

    // now we know which polygonal tile p is in, so get the distance to the
    // polygon
    
    A = O + rotate(rvec, xy);
    B = O + rotate(rvec, vec2(0.5));

    C = B + rotate(rvec, perp(st));
    D = O + rotate(rvec, perp(xy));
    
    vec2 hm = heightmap(p);
    
    const float h = 1e-3;
    const vec2 eps = vec2(h, 0);
    
    vec2 hgrad = (0.5 / h) * vec2(
        heightmap(p + eps.xy).x - heightmap(p - eps.xy).x,
        heightmap(p + eps.yx).x - heightmap(p - eps.yx).x
    );  
    
    hgrad = unrotate(global_rot, hgrad);
    
    float z = hm.x;
        
    dline = min(dline, hm.y);
    
    // bump-mapped surface normal
    vec3 N = normalize(cross(vec3(1, 0, hgrad.x), vec3(0, 1, hgrad.y)));

    // get color of this cell
    vec3 color = CELL_COLORS[cell];
    color *= color; // gamma un-correct
    
    // desaturate a bit
    color = mix(color, vec3(0.5), 0.08);
    
    // get 3D point position
    vec3 pos = vec3(porig, z);

    // fake phong lighting
    vec3 L = normalize(lpos - pos);
    vec3 V = -normalize(cpos - pos);

    vec3 R = reflect(L, N);
    
    color *= 0.1 + 0.9 * clamp(dot(N, L), 0.0, 1.0);
    color += 0.3*pow(clamp(dot(V, R), 0.0, 1.0), 10.0)*vec3(1);

    // darken by lines
    color *= smoothstep(0.0, 0.0125, dline);
    
    // gamma "correct"
    color = sqrt(color);

    // done!
    outColor = vec4(color, 1);

}
