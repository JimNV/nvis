#version 300 es
/*
 * SPDX-FileCopyrightText: Copyright (c) 2021 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

precision highp float;

//  common uniforms
//uniform vec2 uDimensions;
uniform vec2 uMouse;
uniform float uTime;
uniform float uFrame;

//  shader-specific uniforms
uniform int uColorMode;
uniform int uShowColorMap;

uniform bool uFixedPPD;
uniform float uPPD;
uniform float uMonitorDistance;
uniform float uMonitorWidth;
uniform float uMonitorResolutionX;

// Texture uniforms
uniform sampler2D uTexture0;  //  spatial stream 0
uniform sampler2D uTexture1;  //  spatial stream 1
uniform sampler2D uTexture2;  //  feature stream 0
uniform sampler2D uTexture3;  //  feature stream 1

// Texture
in vec2 vTextureCoord;

out vec4 outColor;

const float M_PI = 3.1415926535897932384626433832795;
const float M_PI_2 = M_PI * M_PI;

const vec3 DEFAULT_ILLUMINANT = vec3(0.950428545377181, 1.0, 1.088900370798128);

float RGBtoLuma(vec3 color)
{
    const float RED_COEFFICIENT = 0.212655;
    const float GREEN_COEFFICIENT = 0.715158;
    const float BLUE_COEFFICIENT = 0.072187;

    return color.r * RED_COEFFICIENT + color.g * GREEN_COEFFICIENT + color.b * BLUE_COEFFICIENT;
}

float sRGB2LinearRGB(float sC)
{
    if (sC <= 0.04045)
    {
        return sC / 12.92;
    }
    return pow((sC + 0.055) / 1.055, 2.4);
}

vec3 sRGB2LinearRGB(vec3 sRGB)
{
    float R = sRGB2LinearRGB(sRGB.x);
    float G = sRGB2LinearRGB(sRGB.y);
    float B = sRGB2LinearRGB(sRGB.z);

    return vec3(R, G, B);
}

vec3 LinearRGB2XYZ(vec3 RGB)
{
    // Source: https://www.image-engineering.de/library/technotes/958-how-to-convert-between-srgb-and-ciexyz
    // Assumes D65 standard illuminant.
    const float a11 = 10135552.0 / 24577794.0;
    const float a12 = 8788810.0 / 24577794.0;
    const float a13 = 4435075.0 / 24577794.0;
    const float a21 = 2613072.0 / 12288897.0;
    const float a22 = 8788810.0 / 12288897.0;
    const float a23 = 887015.0 / 12288897.0;
    const float a31 = 1425312.0 / 73733382.0;
    const float a32 = 8788810.0 / 73733382.0;
    const float a33 = 70074185.0 / 73733382.0;

    vec3 XYZ;
    XYZ.x = a11 * RGB.x + a12 * RGB.y + a13 * RGB.z;
    XYZ.y = a21 * RGB.x + a22 * RGB.y + a23 * RGB.z;
    XYZ.z = a31 * RGB.x + a32 * RGB.y + a33 * RGB.z;

    return XYZ;
}

// vec3 XYZ2YCxCz(vec3 XYZ, const vec3 invReferenceIlluminant)
// {
//     // The default illuminant is D65.
//     XYZ = XYZ * invReferenceIlluminant;
//     float Y = 116.0f * XYZ.y - 16.0f;
//     float Cx = 500.0f * (XYZ.x - XYZ.y);
//     float Cz = 200.0f * (XYZ.y - XYZ.z);

//     return color3(Y, Cx, Cz);
// }

vec3 XYZtoLAB(vec3 c)
{
    vec3 n = abs(c) / vec3(95.047, 100, 108.883);
    vec3 v;
    v.x = (n.x > 0.008856) ? pow(n.x, 1.0 / 3.0) : (7.787 * n.x) + (16.0 / 116.0);
    v.y = (n.y > 0.008856) ? pow(n.y, 1.0 / 3.0) : (7.787 * n.y) + (16.0 / 116.0);
    v.z = (n.z > 0.008856) ? pow(n.z, 1.0 / 3.0) : (7.787 * n.z) + (16.0 / 116.0);
    return vec3((116.0 * v.y) - 16.0, 500.0 * (v.x - v.y), 200.0 * (v.y - v.z));
}

vec3 RGBtoXYZ(vec3 c)
{
    vec3 tmp;
    c = abs(c);
    tmp.x = (c.r > 0.04045) ? pow((c.r + 0.055) / 1.055, 2.4) : c.r / 12.92;
    tmp.y = (c.g > 0.04045) ? pow((c.g + 0.055) / 1.055, 2.4) : c.g / 12.92,
    tmp.z = (c.b > 0.04045) ? pow((c.b + 0.055) / 1.055, 2.4) : c.b / 12.92;
    const mat3 mat = mat3(
		0.4124, 0.3576, 0.1805,
        0.2126, 0.7152, 0.0722,
        0.0193, 0.1192, 0.9505
	);

    return 100.0 * (tmp * transpose(mat));
}

vec3 XYZ2CIELab(vec3 XYZ)
{
    // the default illuminant is D65
    XYZ = abs(XYZ);
    XYZ.x = XYZ.x / DEFAULT_ILLUMINANT.x;
    XYZ.y = XYZ.y / DEFAULT_ILLUMINANT.y;
    XYZ.z = XYZ.z / DEFAULT_ILLUMINANT.z;
    XYZ.x = (XYZ.x > 0.008856 ? pow(XYZ.x, 1.0 / 3.0) : 7.787 * XYZ.x + 16.0 / 116.0);
    XYZ.y = (XYZ.y > 0.008856 ? pow(XYZ.y, 1.0 / 3.0) : 7.787 * XYZ.y + 16.0 / 116.0);
    XYZ.z = (XYZ.z > 0.008856 ? pow(XYZ.z, 1.0 / 3.0) : 7.787 * XYZ.z + 16.0 / 116.0);
    float L = 116.0 * XYZ.y - 16.0;
    float a = 500.0 * (XYZ.x - XYZ.y);
    float b = 200.0 * (XYZ.y - XYZ.z);

    return vec3(L, a, b);
}

vec3 RGBtoLAB(vec3 c)
{
    vec3 lab = XYZtoLAB(RGBtoXYZ(c));
    return vec3(lab.x / 100.0, 0.5 + 0.5 * (lab.y / 127.0), 0.5 + 0.5 * (lab.z / 127.0));
}

vec3 HSVtoRGB(vec3 hsv)
{
    float h = hsv.x;
    float s = hsv.y;
    float v = hsv.z;

    vec3 rgb = vec3(v, v, v);

    if (s > 0.0)
    {
	    h = mod(h + 2.0 * M_PI, 2.0 * M_PI);
	    h /= (M_PI / 3.0);
	    int i = int(floor(h));
	    float f = h - float(i);
	    float p = v * (1.0 - s);
	    float q = v * (1.0 - (s*f));
	    float t = v * (1.0 - (s*(1.0-f)));

        if (i == 0)
            rgb = vec3(v,t,p);
        else if (i == 1)
            rgb = vec3(q,v,p);
        else if (i == 2)
            rgb = vec3(p,v,t);
        else if (i == 3)
            rgb = vec3(p,q,v);
        else if (i == 4)
            rgb = vec3(t,p,v);
        else
            rgb = vec3(v,p,q);
    }

    return rgb;
}

vec3 MapMagma[256] = vec3[256](
    vec3(0.001462, 0.000466, 0.013866), vec3(0.002258, 0.001295, 0.018331), vec3(0.003279, 0.002305, 0.023708), vec3(0.004512, 0.003490, 0.029965),
    vec3(0.005950, 0.004843, 0.037130), vec3(0.007588, 0.006356, 0.044973), vec3(0.009426, 0.008022, 0.052844), vec3(0.011465, 0.009828, 0.060750),
    vec3(0.013708, 0.011771, 0.068667), vec3(0.016156, 0.013840, 0.076603), vec3(0.018815, 0.016026, 0.084584), vec3(0.021692, 0.018320, 0.092610),
    vec3(0.024792, 0.020715, 0.100676), vec3(0.028123, 0.023201, 0.108787), vec3(0.031696, 0.025765, 0.116965), vec3(0.035520, 0.028397, 0.125209),
    vec3(0.039608, 0.031090, 0.133515), vec3(0.043830, 0.033830, 0.141886), vec3(0.048062, 0.036607, 0.150327), vec3(0.052320, 0.039407, 0.158841),
    vec3(0.056615, 0.042160, 0.167446), vec3(0.060949, 0.044794, 0.176129), vec3(0.065330, 0.047318, 0.184892), vec3(0.069764, 0.049726, 0.193735),
    vec3(0.074257, 0.052017, 0.202660), vec3(0.078815, 0.054184, 0.211667), vec3(0.083446, 0.056225, 0.220755), vec3(0.088155, 0.058133, 0.229922),
    vec3(0.092949, 0.059904, 0.239164), vec3(0.097833, 0.061531, 0.248477), vec3(0.102815, 0.063010, 0.257854), vec3(0.107899, 0.064335, 0.267289),
    vec3(0.113094, 0.065492, 0.276784), vec3(0.118405, 0.066479, 0.286321), vec3(0.123833, 0.067295, 0.295879), vec3(0.129380, 0.067935, 0.305443),
    vec3(0.135053, 0.068391, 0.315000), vec3(0.140858, 0.068654, 0.324538), vec3(0.146785, 0.068738, 0.334011), vec3(0.152839, 0.068637, 0.343404),
    vec3(0.159018, 0.068354, 0.352688), vec3(0.165308, 0.067911, 0.361816), vec3(0.171713, 0.067305, 0.370771), vec3(0.178212, 0.066576, 0.379497),
    vec3(0.184801, 0.065732, 0.387973), vec3(0.191460, 0.064818, 0.396152), vec3(0.198177, 0.063862, 0.404009), vec3(0.204935, 0.062907, 0.411514),
    vec3(0.211718, 0.061992, 0.418647), vec3(0.218512, 0.061158, 0.425392), vec3(0.225302, 0.060445, 0.431742), vec3(0.232077, 0.059889, 0.437695),
    vec3(0.238826, 0.059517, 0.443256), vec3(0.245543, 0.059352, 0.448436), vec3(0.252220, 0.059415, 0.453248), vec3(0.258857, 0.059706, 0.457710),
    vec3(0.265447, 0.060237, 0.461840), vec3(0.271994, 0.060994, 0.465660), vec3(0.278493, 0.061978, 0.469190), vec3(0.284951, 0.063168, 0.472451),
    vec3(0.291366, 0.064553, 0.475462), vec3(0.297740, 0.066117, 0.478243), vec3(0.304081, 0.067835, 0.480812), vec3(0.310382, 0.069702, 0.483186),
    vec3(0.316654, 0.071690, 0.485380), vec3(0.322899, 0.073782, 0.487408), vec3(0.329114, 0.075972, 0.489287), vec3(0.335308, 0.078236, 0.491024),
    vec3(0.341482, 0.080564, 0.492631), vec3(0.347636, 0.082946, 0.494121), vec3(0.353773, 0.085373, 0.495501), vec3(0.359898, 0.087831, 0.496778),
    vec3(0.366012, 0.090314, 0.497960), vec3(0.372116, 0.092816, 0.499053), vec3(0.378211, 0.095332, 0.500067), vec3(0.384299, 0.097855, 0.501002),
    vec3(0.390384, 0.100379, 0.501864), vec3(0.396467, 0.102902, 0.502658), vec3(0.402548, 0.105420, 0.503386), vec3(0.408629, 0.107930, 0.504052),
    vec3(0.414709, 0.110431, 0.504662), vec3(0.420791, 0.112920, 0.505215), vec3(0.426877, 0.115395, 0.505714), vec3(0.432967, 0.117855, 0.506160),
    vec3(0.439062, 0.120298, 0.506555), vec3(0.445163, 0.122724, 0.506901), vec3(0.451271, 0.125132, 0.507198), vec3(0.457386, 0.127522, 0.507448),
    vec3(0.463508, 0.129893, 0.507652), vec3(0.469640, 0.132245, 0.507809), vec3(0.475780, 0.134577, 0.507921), vec3(0.481929, 0.136891, 0.507989),
    vec3(0.488088, 0.139186, 0.508011), vec3(0.494258, 0.141462, 0.507988), vec3(0.500438, 0.143719, 0.507920), vec3(0.506629, 0.145958, 0.507806),
    vec3(0.512831, 0.148179, 0.507648), vec3(0.519045, 0.150383, 0.507443), vec3(0.525270, 0.152569, 0.507192), vec3(0.531507, 0.154739, 0.506895),
    vec3(0.537755, 0.156894, 0.506551), vec3(0.544015, 0.159033, 0.506159), vec3(0.550287, 0.161158, 0.505719), vec3(0.556571, 0.163269, 0.505230),
    vec3(0.562866, 0.165368, 0.504692), vec3(0.569172, 0.167454, 0.504105), vec3(0.575490, 0.169530, 0.503466), vec3(0.581819, 0.171596, 0.502777),
    vec3(0.588158, 0.173652, 0.502035), vec3(0.594508, 0.175701, 0.501241), vec3(0.600868, 0.177743, 0.500394), vec3(0.607238, 0.179779, 0.499492),
    vec3(0.613617, 0.181811, 0.498536), vec3(0.620005, 0.183840, 0.497524), vec3(0.626401, 0.185867, 0.496456), vec3(0.632805, 0.187893, 0.495332),
    vec3(0.639216, 0.189921, 0.494150), vec3(0.645633, 0.191952, 0.492910), vec3(0.652056, 0.193986, 0.491611), vec3(0.658483, 0.196027, 0.490253),
    vec3(0.664915, 0.198075, 0.488836), vec3(0.671349, 0.200133, 0.487358), vec3(0.677786, 0.202203, 0.485819), vec3(0.684224, 0.204286, 0.484219),
    vec3(0.690661, 0.206384, 0.482558), vec3(0.697098, 0.208501, 0.480835), vec3(0.703532, 0.210638, 0.479049), vec3(0.709962, 0.212797, 0.477201),
    vec3(0.716387, 0.214982, 0.475290), vec3(0.722805, 0.217194, 0.473316), vec3(0.729216, 0.219437, 0.471279), vec3(0.735616, 0.221713, 0.469180),
    vec3(0.742004, 0.224025, 0.467018), vec3(0.748378, 0.226377, 0.464794), vec3(0.754737, 0.228772, 0.462509), vec3(0.761077, 0.231214, 0.460162),
    vec3(0.767398, 0.233705, 0.457755), vec3(0.773695, 0.236249, 0.455289), vec3(0.779968, 0.238851, 0.452765), vec3(0.786212, 0.241514, 0.450184),
    vec3(0.792427, 0.244242, 0.447543), vec3(0.798608, 0.247040, 0.444848), vec3(0.804752, 0.249911, 0.442102), vec3(0.810855, 0.252861, 0.439305),
    vec3(0.816914, 0.255895, 0.436461), vec3(0.822926, 0.259016, 0.433573), vec3(0.828886, 0.262229, 0.430644), vec3(0.834791, 0.265540, 0.427671),
    vec3(0.840636, 0.268953, 0.424666), vec3(0.846416, 0.272473, 0.421631), vec3(0.852126, 0.276106, 0.418573), vec3(0.857763, 0.279857, 0.415496),
    vec3(0.863320, 0.283729, 0.412403), vec3(0.868793, 0.287728, 0.409303), vec3(0.874176, 0.291859, 0.406205), vec3(0.879464, 0.296125, 0.403118),
    vec3(0.884651, 0.300530, 0.400047), vec3(0.889731, 0.305079, 0.397002), vec3(0.894700, 0.309773, 0.393995), vec3(0.899552, 0.314616, 0.391037),
    vec3(0.904281, 0.319610, 0.388137), vec3(0.908884, 0.324755, 0.385308), vec3(0.913354, 0.330052, 0.382563), vec3(0.917689, 0.335500, 0.379915),
    vec3(0.921884, 0.341098, 0.377376), vec3(0.925937, 0.346844, 0.374959), vec3(0.929845, 0.352734, 0.372677), vec3(0.933606, 0.358764, 0.370541),
    vec3(0.937221, 0.364929, 0.368567), vec3(0.940687, 0.371224, 0.366762), vec3(0.944006, 0.377643, 0.365136), vec3(0.947180, 0.384178, 0.363701),
    vec3(0.950210, 0.390820, 0.362468), vec3(0.953099, 0.397563, 0.361438), vec3(0.955849, 0.404400, 0.360619), vec3(0.958464, 0.411324, 0.360014),
    vec3(0.960949, 0.418323, 0.359630), vec3(0.963310, 0.425390, 0.359469), vec3(0.965549, 0.432519, 0.359529), vec3(0.967671, 0.439703, 0.359810),
    vec3(0.969680, 0.446936, 0.360311), vec3(0.971582, 0.454210, 0.361030), vec3(0.973381, 0.461520, 0.361965), vec3(0.975082, 0.468861, 0.363111),
    vec3(0.976690, 0.476226, 0.364466), vec3(0.978210, 0.483612, 0.366025), vec3(0.979645, 0.491014, 0.367783), vec3(0.981000, 0.498428, 0.369734),
    vec3(0.982279, 0.505851, 0.371874), vec3(0.983485, 0.513280, 0.374198), vec3(0.984622, 0.520713, 0.376698), vec3(0.985693, 0.528148, 0.379371),
    vec3(0.986700, 0.535582, 0.382210), vec3(0.987646, 0.543015, 0.385210), vec3(0.988533, 0.550446, 0.388365), vec3(0.989363, 0.557873, 0.391671),
    vec3(0.990138, 0.565296, 0.395122), vec3(0.990871, 0.572706, 0.398714), vec3(0.991558, 0.580107, 0.402441), vec3(0.992196, 0.587502, 0.406299),
    vec3(0.992785, 0.594891, 0.410283), vec3(0.993326, 0.602275, 0.414390), vec3(0.993834, 0.609644, 0.418613), vec3(0.994309, 0.616999, 0.422950),
    vec3(0.994738, 0.624350, 0.427397), vec3(0.995122, 0.631696, 0.431951), vec3(0.995480, 0.639027, 0.436607), vec3(0.995810, 0.646344, 0.441361),
    vec3(0.996096, 0.653659, 0.446213), vec3(0.996341, 0.660969, 0.451160), vec3(0.996580, 0.668256, 0.456192), vec3(0.996775, 0.675541, 0.461314),
    vec3(0.996925, 0.682828, 0.466526), vec3(0.997077, 0.690088, 0.471811), vec3(0.997186, 0.697349, 0.477182), vec3(0.997254, 0.704611, 0.482635),
    vec3(0.997325, 0.711848, 0.488154), vec3(0.997351, 0.719089, 0.493755), vec3(0.997351, 0.726324, 0.499428), vec3(0.997341, 0.733545, 0.505167),
    vec3(0.997285, 0.740772, 0.510983), vec3(0.997228, 0.747981, 0.516859), vec3(0.997138, 0.755190, 0.522806), vec3(0.997019, 0.762398, 0.528821),
    vec3(0.996898, 0.769591, 0.534892), vec3(0.996727, 0.776795, 0.541039), vec3(0.996571, 0.783977, 0.547233), vec3(0.996369, 0.791167, 0.553499),
    vec3(0.996162, 0.798348, 0.559820), vec3(0.995932, 0.805527, 0.566202), vec3(0.995680, 0.812706, 0.572645), vec3(0.995424, 0.819875, 0.579140),
    vec3(0.995131, 0.827052, 0.585701), vec3(0.994851, 0.834213, 0.592307), vec3(0.994524, 0.841387, 0.598983), vec3(0.994222, 0.848540, 0.605696),
    vec3(0.993866, 0.855711, 0.612482), vec3(0.993545, 0.862859, 0.619299), vec3(0.993170, 0.870024, 0.626189), vec3(0.992831, 0.877168, 0.633109),
    vec3(0.992440, 0.884330, 0.640099), vec3(0.992089, 0.891470, 0.647116), vec3(0.991688, 0.898627, 0.654202), vec3(0.991332, 0.905763, 0.661309),
    vec3(0.990930, 0.912915, 0.668481), vec3(0.990570, 0.920049, 0.675675), vec3(0.990175, 0.927196, 0.682926), vec3(0.989815, 0.934329, 0.690198),
    vec3(0.989434, 0.941470, 0.697519), vec3(0.989077, 0.948604, 0.704863), vec3(0.988717, 0.955742, 0.712242), vec3(0.988367, 0.962878, 0.719649),
    vec3(0.988033, 0.970012, 0.727077), vec3(0.987691, 0.977154, 0.734536), vec3(0.987387, 0.984288, 0.742002), vec3(0.987053, 0.991438, 0.749504)
);

vec3 MapViridis[256] = vec3[256](
    vec3(0.267004, 0.004874, 0.329415), vec3(0.268510, 0.009605, 0.335427), vec3(0.269944, 0.014625, 0.341379), vec3(0.271305, 0.019942, 0.347269),
    vec3(0.272594, 0.025563, 0.353093), vec3(0.273809, 0.031497, 0.358853), vec3(0.274952, 0.037752, 0.364543), vec3(0.276022, 0.044167, 0.370164),
    vec3(0.277018, 0.050344, 0.375715), vec3(0.277941, 0.056324, 0.381191), vec3(0.278791, 0.062145, 0.386592), vec3(0.279566, 0.067836, 0.391917),
    vec3(0.280267, 0.073417, 0.397163), vec3(0.280894, 0.078907, 0.402329), vec3(0.281446, 0.084320, 0.407414), vec3(0.281924, 0.089666, 0.412415),
    vec3(0.282327, 0.094955, 0.417331), vec3(0.282656, 0.100196, 0.422160), vec3(0.282910, 0.105393, 0.426902), vec3(0.283091, 0.110553, 0.431554),
    vec3(0.283197, 0.115680, 0.436115), vec3(0.283229, 0.120777, 0.440584), vec3(0.283187, 0.125848, 0.444960), vec3(0.283072, 0.130895, 0.449241),
    vec3(0.282884, 0.135920, 0.453427), vec3(0.282623, 0.140926, 0.457517), vec3(0.282290, 0.145912, 0.461510), vec3(0.281887, 0.150881, 0.465405),
    vec3(0.281412, 0.155834, 0.469201), vec3(0.280868, 0.160771, 0.472899), vec3(0.280255, 0.165693, 0.476498), vec3(0.279574, 0.170599, 0.479997),
    vec3(0.278826, 0.175490, 0.483397), vec3(0.278012, 0.180367, 0.486697), vec3(0.277134, 0.185228, 0.489898), vec3(0.276194, 0.190074, 0.493001),
    vec3(0.275191, 0.194905, 0.496005), vec3(0.274128, 0.199721, 0.498911), vec3(0.273006, 0.204520, 0.501721), vec3(0.271828, 0.209303, 0.504434),
    vec3(0.270595, 0.214069, 0.507052), vec3(0.269308, 0.218818, 0.509577), vec3(0.267968, 0.223549, 0.512008), vec3(0.266580, 0.228262, 0.514349),
    vec3(0.265145, 0.232956, 0.516599), vec3(0.263663, 0.237631, 0.518762), vec3(0.262138, 0.242286, 0.520837), vec3(0.260571, 0.246922, 0.522828),
    vec3(0.258965, 0.251537, 0.524736), vec3(0.257322, 0.256130, 0.526563), vec3(0.255645, 0.260703, 0.528312), vec3(0.253935, 0.265254, 0.529983),
    vec3(0.252194, 0.269783, 0.531579), vec3(0.250425, 0.274290, 0.533103), vec3(0.248629, 0.278775, 0.534556), vec3(0.246811, 0.283237, 0.535941),
    vec3(0.244972, 0.287675, 0.537260), vec3(0.243113, 0.292092, 0.538516), vec3(0.241237, 0.296485, 0.539709), vec3(0.239346, 0.300855, 0.540844),
    vec3(0.237441, 0.305202, 0.541921), vec3(0.235526, 0.309527, 0.542944), vec3(0.233603, 0.313828, 0.543914), vec3(0.231674, 0.318106, 0.544834),
    vec3(0.229739, 0.322361, 0.545706), vec3(0.227802, 0.326594, 0.546532), vec3(0.225863, 0.330805, 0.547314), vec3(0.223925, 0.334994, 0.548053),
    vec3(0.221989, 0.339161, 0.548752), vec3(0.220057, 0.343307, 0.549413), vec3(0.218130, 0.347432, 0.550038), vec3(0.216210, 0.351535, 0.550627),
    vec3(0.214298, 0.355619, 0.551184), vec3(0.212395, 0.359683, 0.551710), vec3(0.210503, 0.363727, 0.552206), vec3(0.208623, 0.367752, 0.552675),
    vec3(0.206756, 0.371758, 0.553117), vec3(0.204903, 0.375746, 0.553533), vec3(0.203063, 0.379716, 0.553925), vec3(0.201239, 0.383670, 0.554294),
    vec3(0.199430, 0.387607, 0.554642), vec3(0.197636, 0.391528, 0.554969), vec3(0.195860, 0.395433, 0.555276), vec3(0.194100, 0.399323, 0.555565),
    vec3(0.192357, 0.403199, 0.555836), vec3(0.190631, 0.407061, 0.556089), vec3(0.188923, 0.410910, 0.556326), vec3(0.187231, 0.414746, 0.556547),
    vec3(0.185556, 0.418570, 0.556753), vec3(0.183898, 0.422383, 0.556944), vec3(0.182256, 0.426184, 0.557120), vec3(0.180629, 0.429975, 0.557282),
    vec3(0.179019, 0.433756, 0.557430), vec3(0.177423, 0.437527, 0.557565), vec3(0.175841, 0.441290, 0.557685), vec3(0.174274, 0.445044, 0.557792),
    vec3(0.172719, 0.448791, 0.557885), vec3(0.171176, 0.452530, 0.557965), vec3(0.169646, 0.456262, 0.558030), vec3(0.168126, 0.459988, 0.558082),
    vec3(0.166617, 0.463708, 0.558119), vec3(0.165117, 0.467423, 0.558141), vec3(0.163625, 0.471133, 0.558148), vec3(0.162142, 0.474838, 0.558140),
    vec3(0.160665, 0.478540, 0.558115), vec3(0.159194, 0.482237, 0.558073), vec3(0.157729, 0.485932, 0.558013), vec3(0.156270, 0.489624, 0.557936),
    vec3(0.154815, 0.493313, 0.557840), vec3(0.153364, 0.497000, 0.557724), vec3(0.151918, 0.500685, 0.557587), vec3(0.150476, 0.504369, 0.557430),
    vec3(0.149039, 0.508051, 0.557250), vec3(0.147607, 0.511733, 0.557049), vec3(0.146180, 0.515413, 0.556823), vec3(0.144759, 0.519093, 0.556572),
    vec3(0.143343, 0.522773, 0.556295), vec3(0.141935, 0.526453, 0.555991), vec3(0.140536, 0.530132, 0.555659), vec3(0.139147, 0.533812, 0.555298),
    vec3(0.137770, 0.537492, 0.554906), vec3(0.136408, 0.541173, 0.554483), vec3(0.135066, 0.544853, 0.554029), vec3(0.133743, 0.548535, 0.553541),
    vec3(0.132444, 0.552216, 0.553018), vec3(0.131172, 0.555899, 0.552459), vec3(0.129933, 0.559582, 0.551864), vec3(0.128729, 0.563265, 0.551229),
    vec3(0.127568, 0.566949, 0.550556), vec3(0.126453, 0.570633, 0.549841), vec3(0.125394, 0.574318, 0.549086), vec3(0.124395, 0.578002, 0.548287),
    vec3(0.123463, 0.581687, 0.547445), vec3(0.122606, 0.585371, 0.546557), vec3(0.121831, 0.589055, 0.545623), vec3(0.121148, 0.592739, 0.544641),
    vec3(0.120565, 0.596422, 0.543611), vec3(0.120092, 0.600104, 0.542530), vec3(0.119738, 0.603785, 0.541400), vec3(0.119512, 0.607464, 0.540218),
    vec3(0.119423, 0.611141, 0.538982), vec3(0.119483, 0.614817, 0.537692), vec3(0.119699, 0.618490, 0.536347), vec3(0.120081, 0.622161, 0.534946),
    vec3(0.120638, 0.625828, 0.533488), vec3(0.121380, 0.629492, 0.531973), vec3(0.122312, 0.633153, 0.530398), vec3(0.123444, 0.636809, 0.528763),
    vec3(0.124780, 0.640461, 0.527068), vec3(0.126326, 0.644107, 0.525311), vec3(0.128087, 0.647749, 0.523491), vec3(0.130067, 0.651384, 0.521608),
    vec3(0.132268, 0.655014, 0.519661), vec3(0.134692, 0.658636, 0.517649), vec3(0.137339, 0.662252, 0.515571), vec3(0.140210, 0.665859, 0.513427),
    vec3(0.143303, 0.669459, 0.511215), vec3(0.146616, 0.673050, 0.508936), vec3(0.150148, 0.676631, 0.506589), vec3(0.153894, 0.680203, 0.504172),
    vec3(0.157851, 0.683765, 0.501686), vec3(0.162016, 0.687316, 0.499129), vec3(0.166383, 0.690856, 0.496502), vec3(0.170948, 0.694384, 0.493803),
    vec3(0.175707, 0.697900, 0.491033), vec3(0.180653, 0.701402, 0.488189), vec3(0.185783, 0.704891, 0.485273), vec3(0.191090, 0.708366, 0.482284),
    vec3(0.196571, 0.711827, 0.479221), vec3(0.202219, 0.715272, 0.476084), vec3(0.208030, 0.718701, 0.472873), vec3(0.214000, 0.722114, 0.469588),
    vec3(0.220124, 0.725509, 0.466226), vec3(0.226397, 0.728888, 0.462789), vec3(0.232815, 0.732247, 0.459277), vec3(0.239374, 0.735588, 0.455688),
    vec3(0.246070, 0.738910, 0.452024), vec3(0.252899, 0.742211, 0.448284), vec3(0.259857, 0.745492, 0.444467), vec3(0.266941, 0.748751, 0.440573),
    vec3(0.274149, 0.751988, 0.436601), vec3(0.281477, 0.755203, 0.432552), vec3(0.288921, 0.758394, 0.428426), vec3(0.296479, 0.761561, 0.424223),
    vec3(0.304148, 0.764704, 0.419943), vec3(0.311925, 0.767822, 0.415586), vec3(0.319809, 0.770914, 0.411152), vec3(0.327796, 0.773980, 0.406640),
    vec3(0.335885, 0.777018, 0.402049), vec3(0.344074, 0.780029, 0.397381), vec3(0.352360, 0.783011, 0.392636), vec3(0.360741, 0.785964, 0.387814),
    vec3(0.369214, 0.788888, 0.382914), vec3(0.377779, 0.791781, 0.377939), vec3(0.386433, 0.794644, 0.372886), vec3(0.395174, 0.797475, 0.367757),
    vec3(0.404001, 0.800275, 0.362552), vec3(0.412913, 0.803041, 0.357269), vec3(0.421908, 0.805774, 0.351910), vec3(0.430983, 0.808473, 0.346476),
    vec3(0.440137, 0.811138, 0.340967), vec3(0.449368, 0.813768, 0.335384), vec3(0.458674, 0.816363, 0.329727), vec3(0.468053, 0.818921, 0.323998),
    vec3(0.477504, 0.821444, 0.318195), vec3(0.487026, 0.823929, 0.312321), vec3(0.496615, 0.826376, 0.306377), vec3(0.506271, 0.828786, 0.300362),
    vec3(0.515992, 0.831158, 0.294279), vec3(0.525776, 0.833491, 0.288127), vec3(0.535621, 0.835785, 0.281908), vec3(0.545524, 0.838039, 0.275626),
    vec3(0.555484, 0.840254, 0.269281), vec3(0.565498, 0.842430, 0.262877), vec3(0.575563, 0.844566, 0.256415), vec3(0.585678, 0.846661, 0.249897),
    vec3(0.595839, 0.848717, 0.243329), vec3(0.606045, 0.850733, 0.236712), vec3(0.616293, 0.852709, 0.230052), vec3(0.626579, 0.854645, 0.223353),
    vec3(0.636902, 0.856542, 0.216620), vec3(0.647257, 0.858400, 0.209861), vec3(0.657642, 0.860219, 0.203082), vec3(0.668054, 0.861999, 0.196293),
    vec3(0.678489, 0.863742, 0.189503), vec3(0.688944, 0.865448, 0.182725), vec3(0.699415, 0.867117, 0.175971), vec3(0.709898, 0.868751, 0.169257),
    vec3(0.720391, 0.870350, 0.162603), vec3(0.730889, 0.871916, 0.156029), vec3(0.741388, 0.873449, 0.149561), vec3(0.751884, 0.874951, 0.143228),
    vec3(0.762373, 0.876424, 0.137064), vec3(0.772852, 0.877868, 0.131109), vec3(0.783315, 0.879285, 0.125405), vec3(0.793760, 0.880678, 0.120005),
    vec3(0.804182, 0.882046, 0.114965), vec3(0.814576, 0.883393, 0.110347), vec3(0.824940, 0.884720, 0.106217), vec3(0.835270, 0.886029, 0.102646),
    vec3(0.845561, 0.887322, 0.099702), vec3(0.855810, 0.888601, 0.097452), vec3(0.866013, 0.889868, 0.095953), vec3(0.876168, 0.891125, 0.095250),
    vec3(0.886271, 0.892374, 0.095374), vec3(0.896320, 0.893616, 0.096335), vec3(0.906311, 0.894855, 0.098125), vec3(0.916242, 0.896091, 0.100717),
    vec3(0.926106, 0.897330, 0.104071), vec3(0.935904, 0.898570, 0.108131), vec3(0.945636, 0.899815, 0.112838), vec3(0.955300, 0.901065, 0.118128),
    vec3(0.964894, 0.902323, 0.123941), vec3(0.974417, 0.903590, 0.130215), vec3(0.983868, 0.904867, 0.136897), vec3(0.993248, 0.906157, 0.143936)
);

vec3 heatMap(float value, float lb, float ub)
{
    float p = clamp((value - lb) / (ub - lb), 0.0, 1.0);

    float r, g, b;
    float h = 3.7 * (1.0 - p); // 3.7 is blue
    float s = sqrt(p);
    float v = sqrt(p);
    return HSVtoRGB(vec3(h, s, v));
}

vec3 colorRamp(float value)
{
    vec3 color;

    if (value < 0.25)
        color.r = 0.0;
    else if (value >= 0.57)
        color.r = 1.0;
    else
       color.r = value * 3.215 - 0.78125;

    if (value < 0.42)
        color.g = 0.0;
    else if (value >= 0.92)
        color.g = 1.0;
    else
        color.g = 2.0 * value - 0.84;

    if (value < 0.0)
        color.b = 0.0;
    else if (value > 1.0)
        color.b = 1.0;
    else if (value < 0.25)
        color.b = 4.0 * value;
    else if (value < 0.42)
        color.b = 1.0;
    else if (value < 0.92)
        color.b = -2.0 * value + 1.84;
    else
        color.b = value * 12.5 - 11.5;

    return color;
}

vec3 colorMap(float value, int mode)
{
    vec3 color;

    if (mode == 0)
    {
        //  per-pixel difference (no action)
    }
    else if (mode == 1)
    {
        //  Magma
        color = MapMagma[int(value * 256.0)];
    }
    else if (mode == 2)
    {
        //  Magma
        color = MapViridis[int(value * 256.0)];
    }
    else if (mode == 3)
    {
        //  Jet
        color = clamp(1.5 - abs(4.0 * clamp(value, 0.0, 1.0) - vec3(3.0, 2.0, 1.0)), 0.0, 1.0);
    }
    else if (mode == 4)
    {
        //  Heat map
        color = heatMap(value, 0.0, 1.0);
    }
    else if (mode == 5)
    {
        //  grayscale
        color = vec3(value, value, value);
    }
    else if (mode == 6)
    {
        //  black-blue-violet-yellow-white
        color = colorRamp(value);
    }
    else
    {
        // binary
        color = (value > 0.0 ? vec3(1.0, 1.0, 1.0) : vec3(0.0, 0.0, 0.0));
    }

    return color;
}

bool isNaN(float val)
{
  return !(val < 0.0 || 0.0 < val || val == 0.0);
}

bool isInf(float val)
{
  return (val != 0.0 && val * 2.0 == val);
}

float lerp(float a, float b, float v)
{
    v = clamp(v, 0.0, 1.0);
    return a * (1.0 - v) + b * v;
}

vec3 lerp(vec3 a, vec3 b, float v)
{
    v = clamp(v, 0.0, 1.0);
    return a * (1.0 - v) + b * v;
}


const struct tFLIPConstants
{
    float gqc;
    float gpc;
    float gpt;
    float gw;
    float gqf;
};
tFLIPConstants FLIPConstants = tFLIPConstants(0.7, 0.4, 0.95, 0.082, 0.5);

const struct tGaussianConstants
{
    vec3 a1;
    vec3 b1;
    vec3 a2;
    vec3 b2;
};
tGaussianConstants GaussianConstants = tGaussianConstants(vec3(1.0, 1.0, 34.1),vec3(0.0047, 0.0053, 0.04), vec3(0.0, 0.0, 13.5), vec3(1.0e-5, 1.0e-5, 0.025));

float Gaussian(float x, float sigma) // 1D Gaussian (without normalization factor).
{
    return exp(-(x * x) / (2.0f * sigma * sigma));
}

float Gaussian(float x2, float a, float b) // 1D Gaussian in alternative form (see FLIP paper).
{
    return a * sqrt(M_PI / b) * exp(-M_PI_2 * x2 / b);
}

 // Needed to separate sum of Gaussians filters (see separatedConvolutions.pdf in the FLIP repository).
float GaussianSqrt(float x2, float a, float b)
{
    return sqrt(a * sqrt(M_PI / b)) * exp(-M_PI_2 * x2 / b);
}

vec2 solveSecondDegree(float a, float b, float c)
{
    //  a * x^2 + b * x + c = 0
    if (a == 0.0)
    {
        return vec2(-c / b, -c / b);
    }

    float d1 = -0.5f * (b / a);
    float d2 = sqrt((d1 * d1) - (c / a));
    
    return vec2(d1 - d2, d1 + d2);
}

int calculateSpatialFilterRadius(float ppd)
{
    float deltaX = 1.0 / ppd;

    float maxScaleParameter = max(max(max(GaussianConstants.b1.x, GaussianConstants.b1.y), max(GaussianConstants.b1.z, GaussianConstants.b2.x)), max(GaussianConstants.b2.y, GaussianConstants.b2.z));
    int radius = int(ceil(3.0 * sqrt(maxScaleParameter / (2.0 * M_PI_2)) * ppd)); // Set radius based on largest scale parameter.

    return radius;
}

float Hunt(float luminance, float chrominance)
{
    return 0.01 * luminance * chrominance;
}

float HyAB(vec3 refPixel, vec3 testPixel)
{
    float cityBlockDistanceL = abs(refPixel.x - testPixel.x);
    float euclideanDistanceAB = sqrt((refPixel.y - testPixel.y) * (refPixel.y - testPixel.y) + (refPixel.z - testPixel.z) * (refPixel.z - testPixel.z));
    return cityBlockDistanceL + euclideanDistanceAB;
}

float computeMaxDistance(float gqc)
{
    vec3 greenLab = XYZ2CIELab(LinearRGB2XYZ(vec3(0.0, 1.0, 0.0)));
    vec3 blueLab = XYZ2CIELab(LinearRGB2XYZ(vec3(0.0, 0.0, 1.0)));
    vec3 greenLabHunt = vec3(greenLab.x, Hunt(greenLab.x, greenLab.y), Hunt(greenLab.x, greenLab.z));
    vec3 blueLabHunt = vec3(blueLab.x, Hunt(blueLab.x, blueLab.y), Hunt(blueLab.x, blueLab.z));

    return pow(HyAB(greenLabHunt, blueLabHunt), gqc);
}

float computeColorDifference(vec3 reference, vec3 test)
{
    float cmax = computeMaxDistance(FLIPConstants.gqc);
    float pccmax = FLIPConstants.gpc * cmax;

    float colorDifference = HyAB(reference, test);

    colorDifference = pow(colorDifference, FLIPConstants.gqc);

    //  Re-map error to the [0, 1] range.
    //  Values between 0 and pccmax are mapped to the range [0, gpt],
    //  while the rest are mapped to the range (gpt, 1]
    if (colorDifference < pccmax)
    {
        colorDifference *= FLIPConstants.gpt / pccmax;
    }
    else
    {
        colorDifference = FLIPConstants.gpt + ((colorDifference - pccmax) / (cmax - pccmax)) * (1.0 - FLIPConstants.gpt);
    }

    return colorDifference;
}

float computeFeatureDifference(vec4 reference, vec4 test)
{
    const float normalizationFactor = 1.0 / sqrt(2.0);

    // color3 er = edgeReference.get(x, y);
    // color3 et = edgeTest.get(x, y);
    // color3 pr = pointReference.get(x, y);
    // color3 pt = pointTest.get(x, y);

    // float edgeValueRef = sqrt(er.x * er.x + er.y * er.y);
    // float edgeValueTest = sqrt(et.x * et.x + et.y * et.y);
    // float pointValueRef = sqrt(pr.x * pr.x + pr.y * pr.y);
    // float pointValueTest = sqrt(pt.x * pt.x + pt.y * pt.y);
    float pointValueRef = length(reference.xy);
    float pointValueTest = length(test.xy);
    float edgeValueRef = length(reference.zw);
    float edgeValueTest = length(test.zw);

    float edgeDifference = abs(edgeValueRef - edgeValueTest);
    float pointDifference = abs(pointValueRef - pointValueTest);

    float featureDifference = pow(normalizationFactor * max(edgeDifference, pointDifference), FLIPConstants.gqf);

    // this->set(x, y, color3(featureDifference, 0.0, 0.0));
    return featureDifference;
}

vec3 huntAdjustment(vec3 CIELab)
{
    return vec3(CIELab.x, Hunt(CIELab.x, CIELab.y), Hunt(CIELab.x, CIELab.z));
}


float flip(vec3 color0, vec3 color1, vec4 feature0, vec4 feature1)
{
    float colorValue = computeColorDifference(huntAdjustment(color0), huntAdjustment(color1));
    float featureValue = computeFeatureDifference(feature0, feature1);

    float flipValue = pow(colorValue, 1.0 - featureValue);

    return flipValue;
}


void main()
{
    ivec2 dimensions = textureSize(uTexture0, 0);
    ivec2 loc2d = ivec2(vTextureCoord * vec2(dimensions));

    float PPD = (uFixedPPD ? uPPD : uMonitorDistance * (uMonitorResolutionX / uMonitorWidth) * (M_PI / 180.0));

    vec3 spatial0 = texelFetch(uTexture0, loc2d, 0).xyz;
    vec3 spatial1 = texelFetch(uTexture1, loc2d, 0).xyz;
    vec4 feature0 = texelFetch(uTexture2, loc2d, 0);
    vec4 feature1 = texelFetch(uTexture3, loc2d, 0);

    float flipValue = flip(spatial0, spatial1, feature0, feature1);

    vec3 value = vec3(flipValue, flipValue, flipValue);
    
    float fade = 0.0;
    if (uColorMode != 0 && uShowColorMap != 0)
    {
        vec2 paletteCorner = vec2((uShowColorMap == 1 || uShowColorMap == 3) ? 0.0 : 1.0, (uShowColorMap == 1 || uShowColorMap == 2) ? 0.0 : 1.0);

        float kPaletteEdgeWidth = 2.0;
        float kPaletteLength = float(min(dimensions.x, dimensions.y)) * 0.1;
        float kPaletteWidth = kPaletteLength / 5.0;
        vec2 kPaletteCenter = abs(vec2(float(dimensions.x), float(dimensions.y)) * paletteCorner - vec2(kPaletteWidth * 5.0, kPaletteLength * 2.0));

        vec2 paletteVec = vec2(loc2d) - vec2(float(kPaletteCenter.x), float(kPaletteCenter.y));
        vec2 paletteDim = vec2(kPaletteWidth, kPaletteLength);
        bool bInside = abs(paletteVec.x) < kPaletteWidth && abs(paletteVec.y) < kPaletteLength;
        if (bInside)
        {
            value = vec3((1.0 - paletteVec.y) / kPaletteLength * 0.5 + 0.5);

            if (uColorMode == 0)
            {
                if (paletteVec.x < -0.33 * kPaletteWidth)
                    value.g = value.b = 0.0;
                else if (paletteVec.x < 0.33 * kPaletteWidth)
                    value.r = value.b = 0.0;
                else
                    value.r = value.g = 0.0;
            }
        }

        vec2 distToEdge = clamp(1.0 - abs(vec2(kPaletteWidth, kPaletteLength) - abs(paletteVec)) / kPaletteEdgeWidth, 0.0, 1.0);
        bool bInsideEdge = abs(paletteVec.x) < kPaletteWidth + kPaletteEdgeWidth && abs(paletteVec.y) < kPaletteLength + kPaletteEdgeWidth;
        fade = max(distToEdge.x, distToEdge.y) * (bInsideEdge ? 1.0 : 0.0);
    }

    vec3 color;
    if (uColorMode != 0) {
        color = colorMap(RGBtoLuma(value.rgb), uColorMode);
        color = lerp(color, vec3(0.5, 0.5, 0.5), fade);
    } else {
        color = value;
    }

    outColor = vec4(color, 1.0);
}
