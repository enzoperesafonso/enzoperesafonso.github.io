import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- Configuration & State ---
const state = {
    selectionMode: 'paper',
    customTeff: 5800,
    customLogg: 4.4,
    spectralType: 'M9V',
    waveFreq: 1.0,
    l: 3,
    m: 2,
    amplitude: 0.1,
    speed: 1.0,
    oscillating: true,
    showNodes: false,
    realistic: false,
    flareIntensity: 0.0,
    showDisk: false,
    showExoplanet: false,
    planetGlow: true,
    diskDensity: 1.0,
    diskRadius: 3.0,
    bulge: 0.0,
    normalizeSize: false,
    time: 0,
    rotationSpeed: 0.1,
    rotationAngle: 0.0,
    customColorHot: null,
    customColorCool: null,
    brightness: 1.2,
    sunspotThreshold: 0.38,
    bgStars: true,
    sideBySide: true,
    separationDistance: 2.5,
    planetRadius: 1.0,
    planetDistance: 3.0
};

function floatToHex(r, g, b) {
    const toHex = c => Math.max(0, Math.min(255, Math.round(c * 255))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToFloat(hex) {
    return [
        parseInt(hex.substr(1, 2), 16) / 255,
        parseInt(hex.substr(3, 2), 16) / 255,
        parseInt(hex.substr(5, 2), 16) / 255
    ];
}

function colorTemperatureToRGB(kelvin) {
    let temp = kelvin / 100;
    let red, green, blue;

    if (temp <= 66) {
        red = 255;
        green = temp;
        green = 99.4708025861 * Math.log(green) - 161.1195681661;
        if (temp <= 19) {
            blue = 0;
        } else {
            blue = temp - 10;
            blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
        }
    } else {
        red = temp - 60;
        red = 329.698727446 * Math.pow(red, -0.1332047592);
        green = temp - 60;
        green = 286.2081682405 * Math.pow(green, -0.0755148492);
        blue = 255;
    }

    const clamp = x => Math.max(0, Math.min(255, x));
    return [clamp(red) / 255, clamp(green) / 255, clamp(blue) / 255];
}

// --- Stellar Spectral Types (Heller et al. 2021) ---
const stellarTypes = [
    { id: 'M9V', name: 'M9V (2,400K)', hex: '#ff842d', scale: 0.6, baseFreq: 1.5 },
    { id: 'M6V', name: 'M6V (2,800K)', hex: '#ffa548', scale: 0.7, baseFreq: 1.4 },
    { id: 'M4V', name: 'M4V (3,200K)', hex: '#ffa24c', scale: 0.75, baseFreq: 1.3 },
    { id: 'M2V', name: 'M2V (3,600K)', hex: '#ffa153', scale: 0.8, baseFreq: 1.2 },
    { id: 'M0V', name: 'M0V (3,900K)', hex: '#ffa25a', scale: 0.85, baseFreq: 1.1 },
    { id: 'K8V', name: 'K8V (4,000K)', hex: '#ffa35e', scale: 0.88, baseFreq: 1.1 },
    { id: 'K6V', name: 'K6.5V (4,200K)', hex: '#ffa868', scale: 0.9, baseFreq: 1.05 },
    { id: 'K4V', name: 'K4V (4,600K)', hex: '#ffbc87', scale: 0.92, baseFreq: 1.05 },
    { id: 'K2V', name: 'K2.5V (5,000K)', hex: '#ffd1a7', scale: 0.95, baseFreq: 1.02 },
    { id: 'K0V', name: 'K0V (5,300K)', hex: '#ffdec0', scale: 0.98, baseFreq: 1.01 },
    { id: 'G8V', name: 'G8V (5,500K)', hex: '#ffe5cf', scale: 0.99, baseFreq: 1.0 },
    { id: 'G2V', name: 'G2V (5,800K) - Sun', hex: '#ffede6', scale: 1.0, baseFreq: 1.0 },
    { id: 'F8V', name: 'F8V (6,200K)', hex: '#f3edff', scale: 1.1, baseFreq: 0.9 },
    { id: 'F4V', name: 'F4V (6,600K)', hex: '#d7d9ff', scale: 1.2, baseFreq: 0.8 },
    { id: 'F0V', name: 'F0V (7,200K)', hex: '#b8c5ff', scale: 1.3, baseFreq: 0.7 },
    { id: 'A8V', name: 'A8V (7,600K)', hex: '#abbcff', scale: 1.4, baseFreq: 0.6 },
    { id: 'A4V', name: 'A4V (8,400K)', hex: '#8da6ff', scale: 1.6, baseFreq: 0.5 },
    { id: 'A0V', name: 'A0V (9,600K)', hex: '#7d99ff', scale: 1.8, baseFreq: 0.4 },
    { id: 'B8V', name: 'B8V (12,000K)', hex: '#718fff', scale: 2.0, baseFreq: 0.3 },
    { id: 'B5V', name: 'B5V (16,000K)', hex: '#6988ff', scale: 2.2, baseFreq: 0.2 },
    { id: 'B1V', name: 'B1V (26,000K)', hex: '#5f80ff', scale: 2.5, baseFreq: 0.15 },
    { id: 'O8V', name: 'O8V (35,000K)', hex: '#5b7cff', scale: 2.8, baseFreq: 0.1 },
    { id: 'O5V', name: 'O5V (40,000K)', hex: '#5b7bff', scale: 3.2, baseFreq: 0.08 },
    { id: 'O1V', name: 'O1V (55,000K)', hex: '#5c7cff', scale: 3.8, baseFreq: 0.05 }
];

const modeDescriptions = {
    'p': "p-modes (Pressure) are surface acoustic waves.",
    'g': "g-modes (Gravity) are deep internal waves."
};

const modeInfo = {
    0: { title: "Radial Mode (l=0)", desc: "Radial 'breathing' of the entire stellar volume." },
    1: { title: "Dipole Mode (l=1)", desc: " Hemispheric sloshing back and forth." },
    2: { title: "Quadrupole Mode (l=2)", desc: "Ellipsoidal deformation (squash and stretch)." },
    'default': { title: "Multipole Mode (l={l})", desc: "Complex geometric patterns." }
};

// --- Shared GLSL Functions ---
const commonGLSL = `
    #define PI 3.14159265359

    // 3D Hash for gradient noise
    vec3 hash33(vec3 p) {
        p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
                 dot(p, vec3(269.5, 183.3, 246.1)),
                 dot(p, vec3(113.5, 271.9, 124.6)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    // Organic 3D Gradient Noise
    float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        vec3 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(dot(hash33(i + vec3(0.0, 0.0, 0.0)), f - vec3(0.0, 0.0, 0.0)),
                           dot(hash33(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)), u.x),
                       mix(dot(hash33(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)),
                           dot(hash33(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)), u.x), u.y),
                   mix(mix(dot(hash33(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)),
                           dot(hash33(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)), u.x),
                       mix(dot(hash33(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)),
                           dot(hash33(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)), u.x), u.y), u.z);
    }

    // Multi-octave Fractional Brownian Motion
    float fbm(vec3 p) {
        float f = 0.0;
        float amp = 0.5;
        for(int i = 0; i < 4; i++) {
            f += amp * noise(p);
            p *= 2.0;
            amp *= 0.5;
        }
        return f;
    }

    float factorial(int n) {
        float res = 1.0;
        for (int i = 2; i <= 12; i++) {
            if (i > n) break;
            res *= float(i);
        }
        return res;
    }

    float legendre(int l, int m, float x) {
        int absM = abs(m);
        if (absM > l) return 0.0;
        float pmm = 1.0;
        if (absM > 0) {
            float somx2 = sqrt(max(0.0, 1.0 - x*x));
            float fact = 1.0;
            for (int i = 1; i <= 10; i++) {
                if (i > absM) break;
                pmm *= -fact * somx2;
                fact += 2.0;
            }
        }
        if (l == absM) return pmm;
        float pmmp1 = x * (2.0 * float(absM) + 1.0) * pmm;
        if (l == absM + 1) return pmmp1;
        float pll = 0.0;
        float p_pre = pmm;
        float p_cur = pmmp1;
        for (int ll = 2; ll <= 10; ll++) {
            if (ll > l) break;
            if (ll <= absM + 1) continue;
            pll = (x * (2.0 * float(ll) - 1.0) * p_cur - (float(ll + absM - 1)) * p_pre) / float(ll - absM);
            p_pre = p_cur;
            p_cur = pll;
        }
        return p_cur;
    }

    // Calculates the real part of the spherical harmonic Y_lm(theta, phi)
    float calculateHarmonic(int uL, int uM, vec3 nPos) {
        float x = nPos.y; 
        float phi = atan(nPos.z, nPos.x + 1e-8);
        float p_lm = legendre(uL, uM, x);
        float norm = sqrt(((2.0 * float(uL) + 1.0) * factorial(uL - abs(uM))) / (4.0 * PI * factorial(uL + abs(uM))));
        return norm * p_lm * cos(float(uM) * phi);
    }
`;

// --- Shaders ---
const vertexShader = `
    ${commonGLSL}
    varying vec3 vNormal;
    varying float vDisplacement;
    varying float vHarmonicRaw;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    varying float vFlareHeight;
    
    uniform float uTime;
    uniform int uL;
    uniform int uM;
    uniform float uAmplitude;
    uniform float uFrequencyMult;
    uniform float uFlares;

    void main() {
        vNormal = normal;
        vLocalPosition = position;
        vec3 nPos = normalize(position);
        float harmonic = calculateHarmonic(uL, uM, nPos);
        vHarmonicRaw = harmonic;
        
        vDisplacement = harmonic * sin(uTime * uFrequencyMult);
        
        float flareNoise = 0.0;
        if (uFlares > 0.0) {
            float n1 = fbm(nPos * 5.0 - uTime * 0.03);
            float n2 = fbm(nPos * 10.0 + uTime * 0.05);
            float n = n1 * 0.5 + n2 * 0.5;
            float ridge = abs(n);
            // Make them sparser and less tall
            float mask = smoothstep(0.25, 0.45, ridge);
            flareNoise = mask * 0.15 * uFlares; // Extrude by up to 0.15 * Intensity
        }
        vFlareHeight = flareNoise;
        
        vec3 newPosition = position + normal * (vDisplacement * uAmplitude + flareNoise);
        vec4 worldPosition = modelMatrix * vec4(newPosition, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`;

const fragmentShader = `
    ${commonGLSL}
    varying vec3 vNormal;
    varying float vDisplacement;
    varying float vHarmonicRaw;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    varying float vFlareHeight;
    
    uniform vec3 uColorHot;
    uniform vec3 uColorCool;
    uniform float uShowNodes;
    uniform float uRealistic;
    uniform float uTime;
    uniform float uSunspotThreshold;
    uniform vec3 uNodeColor;
    uniform int uL;
    uniform int uM;
    uniform float uAmplitude;
    uniform float uRotationAngle;
    uniform float uFlares;
    uniform float uBulge;
    
    mat2 rotate2D(float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat2(c, -s, s, c);
    }
    
    void main() {
        // Macroscopic temperature shifts due to displacement (asteroseismology p-modes)
        // If amplitude is 0, tempShift is 0, yielding exactly uColorHot.
        float tempShift = vDisplacement * (uAmplitude * 10.0) * -1.0; 
        vec3 color = mix(uColorCool, uColorHot * 1.5, tempShift * 0.5 + 0.5);
        
        vec3 nPos = normalize(vLocalPosition);
        float exactHarmonic = calculateHarmonic(uL, uM, nPos);
        
        if (uRealistic > 0.5) {
            // 1. ROTATION FIX: 
            // Differential rotation shears 3D noise into "Jupiter bands". 
            // We use solid-body rotation driven by the new rotation uniform.
            float rotAngle = uRotationAngle; 
            vec3 rotatedPos = vLocalPosition;
            rotatedPos.xz = rotate2D(rotAngle) * rotatedPos.xz;

            // 2. GRANULATION:
            // High frequency (80.0). We use abs() to create dark narrow borders 
            // (the zero-crossings) and broad, intensely bright plasma cells.
            float granNoise = fbm(rotatedPos * 80.0 + uTime * 0.1);
            float gran = smoothstep(0.0, 0.4, abs(granNoise)); 
            vec3 surfaceColor = mix(uColorCool * 0.7, uColorHot * 1.5, gran);

// 3. SUNSPOTS (Dialed back for just a few):
            float spotNoise = fbm(rotatedPos * 2.5);
            
            // Raised the thresholds to catch only the top 1-2% of noise peaks
            float penumbra = smoothstep(uSunspotThreshold - 0.08, uSunspotThreshold, spotNoise); 
            float umbra = smoothstep(uSunspotThreshold, uSunspotThreshold + 0.07, spotNoise);    
            
            surfaceColor = mix(surfaceColor, uColorCool * 0.4, penumbra);
            surfaceColor = mix(surfaceColor, vec3(0.02, 0.01, 0.01), umbra);

            // 4. FILAMENTS:
            // Stretched noise to create elongated magnetic tubes.
            vec3 filPos = rotatedPos * vec3(2.0, 6.0, 2.0); 
            float filNoise = fbm(filPos - uTime * 0.03);
            // 1.0 exactly at zero-crossings, fading out -> creates thin lines
            float filShape = 1.0 - smoothstep(0.0, 0.15, abs(filNoise));
            // Mask them so they only appear in distinct patches, not everywhere
            float filMask = smoothstep(0.3, 0.7, fbm(rotatedPos * 1.5 + 10.0)); 
            float filament = filShape * filMask;
            
            // Mix dark strands into the surface
            surfaceColor = mix(surfaceColor, uColorCool * 0.2, filament * 0.8);

            // Gravity Darkening (Von Zeipel Effect)
            // Equator is further from core -> weaker gravity -> cooler -> dimmer and yellower
            float latitude = clamp(abs(vLocalPosition.y) / 1.5, 0.0, 1.0); 
            float darkeningFactor = (1.0 - latitude) * uBulge * 2.0; 
            vec3 coolEquatorColor = mix(uColorHot, vec3(1.0, 0.8, 0.4), 0.8) * 0.6;
            surfaceColor = mix(surfaceColor, coolEquatorColor, darkeningFactor);

            // Apply final surface and re-apply macroscopic asteroseismology lighting
            float mult = max(0.1, 1.0 + tempShift * 0.9);
            vec3 coolTint = normalize(uColorCool + vec3(0.05));
            vec3 tint = mix(vec3(1.0), coolTint, clamp(-tempShift, 0.0, 1.0));
            color = surfaceColor * tint * mult;

            // 5. EDGE FLARES
            vec3 viewDir = normalize(cameraPosition - vWorldPosition);
            float limb = max(0.0, dot(normalize(vNormal), viewDir));
            float edgeMask = 1.0 - smoothstep(0.02, 0.1, limb); 
            float fastEdgeNoise = fbm(rotatedPos * 30.0 + uTime * 2.5); 
            float flarePeaks = smoothstep(0.75, 0.99, fastEdgeNoise); 
            vec3 activeFlareColor = mix(uColorCool * 0.6, uColorHot * 2.0, flarePeaks); 
            vec3 flareContribution = activeFlareColor * flarePeaks * edgeMask * 3.0; 
            
            color += flareContribution;
        }

        if (uShowNodes > 0.5) {
            float dist = abs(exactHarmonic) / (fwidth(exactHarmonic) + 1e-5);
            float edge = 1.0 - smoothstep(0.5, 2.5, dist); 
            color = mix(color, uNodeColor, edge);
        }
        
        // Realistic Limb Darkening
        vec3 viewDirOut = normalize(cameraPosition - vWorldPosition);
        float limbFactor = max(0.0, dot(normalize(vNormal), viewDirOut));
        limbFactor = pow(limbFactor, 0.6) * 0.8 + 0.2; 
        
        if (uFlares > 0.0 && vFlareHeight > 0.0) {
            // scale the intensity visual by the max possible height (0.15)
            float fIntensity = smoothstep(0.0, 0.15 * uFlares + 0.005, vFlareHeight);
            vec3 fColor = mix(uColorHot * 1.5, uColorHot * (4.0 + uFlares), fIntensity);
            color = mix(color, fColor, fIntensity);
            limbFactor = mix(limbFactor, 1.0, fIntensity);
        }
        
        gl_FragColor = vec4(color * limbFactor * 1.2, 1.0); 
    }
`;

// --- Scene Initialization ---
const canvas = document.querySelector('#star-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.autoClear = false;

const scene = new THREE.Scene();
const sceneSide = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(5, 2, 7);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- Post-Processing (Glow/Bloom) ---
const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2,    // Strength
    0.5,    // Radius
    0.1     // RESTORED: Back to 0.1 for the original full-body glow
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);



// --- Star Geometry & Material ---
const defaultType = stellarTypes.find(t => t.id === 'G2V');
const defaultColor = new THREE.Color(defaultType.hex);
const defaultColorCool = defaultColor.clone().multiplyScalar(0.5);

const diskVertexShader = `
    varying vec3 vLocalPosition;
    uniform float uOuterRadius;
    uniform float uSide;
    void main() {
        vLocalPosition = position;
        float r = length(position.xy);
        float normalizedR = clamp((r - 1.45) / (uOuterRadius - 1.45), 0.0, 1.0);
        
        // Wedge profile: thick at inner edge, tapering to 0
        float maxThickness = 0.4;
        float thickness = maxThickness * pow(1.0 - normalizedR, 1.2);
        
        vec3 pos3D = position;
        pos3D.z += thickness * uSide; 
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos3D, 1.0);
    }
`;

const diskFragmentShader = `
    ${commonGLSL}
    uniform float uTime;
    uniform vec3 uColorHot;
    uniform float uDensity;
    uniform float uOuterRadius;
    uniform float uSide;
    varying vec3 vLocalPosition;

    void main() {
        float r = length(vLocalPosition.xy); 
        if (r > uOuterRadius) discard;
        
        float angle = atan(vLocalPosition.y, vLocalPosition.x);
        
        // True Keplerian differential rotation
        float rotationSpeed = 1.0 / pow(r, 1.5);
        angle -= uTime * rotationSpeed * 0.4; 
        
        float normalizedR = (r - 1.45) / (uOuterRadius - 1.45);
        if (normalizedR < 0.0) discard;
        
        // Smooth radial falloff (exponential decay) for realistic vacuum fade
        float edgeMask = exp(-pow(normalizedR * 2.5, 2.0));
        float radialFalloff = 1.0 - pow(normalizedR, 0.6);
        
        // Very subtle broad concentric variations and soft spirals (no harsh turbulence)
        float ringNoise = fbm(vec3(r * 2.5, angle * 1.5, uTime * 0.05));
        float rings = sin(r * 5.0 - uTime * 0.2 + ringNoise) * 0.5 + 0.5;
        float spiral = sin(angle * 2.0 + r * 2.0 - uTime * 0.4) * 0.5 + 0.5;
        
        // Combine into a smooth, flowing structure
        float structure = mix(0.8, 1.0, rings * 0.5 + spiral * 0.5);
        
        // Use the star's hot color, scaled down to reduce bloom
        vec3 diskColor = uColorHot * 0.8;
        
        // The inner region should be an intense version of the star's color, fading to the dimmer disk color
        vec3 innerGlow = uColorHot * 1.5;
        vec3 finalColor = mix(diskColor, innerGlow, pow(radialFalloff, 2.0));
        
        // Smooth, soft opacity, peaking at the inner edge
        float baseOpacity = edgeMask * uDensity * radialFalloff * 0.55;
        float intensity = baseOpacity * structure;
        
        // Ensure there are no fully transparent gaps inside the disk
        intensity = max(intensity, baseOpacity * 0.6);
        
        // Volumetric layer normalization (adjusted for 30 high-density layers to eliminate banding)
        intensity *= 0.04;
        
        gl_FragColor = vec4(finalColor, intensity);
    }
`;;

const uniforms = {
    uTime: { value: 0 },
    uL: { value: state.l },
    uM: { value: state.m },
    uAmplitude: { value: state.oscillating ? state.amplitude : 0.0 },
    uFrequencyMult: { value: 1.0 },
    uShowNodes: { value: 1.0 },
    uRealistic: { value: 0.0 },
    uColorHot: { value: defaultColor },
    uColorCool: { value: defaultColorCool },
    uSunspotThreshold: { value: state.sunspotThreshold },
    uNodeColor: { value: new THREE.Color(0.02, 0.02, 0.05) },
    uRotationAngle: { value: 0.0 },
    uFlares: { value: 0.0 },
    uBulge: { value: 0.0 }
};

const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    extensions: { derivatives: true }
});

const star = new THREE.Mesh(new THREE.SphereGeometry(1.5, 256, 256), material);
scene.add(star);

// Setup Accretion Disk - use more radial segments to allow smooth vertical tapering
const diskGeometry = new THREE.RingGeometry(1.45, 75.0, 256, 64);
const diskUniforms = {
    uTime: { value: 0.0 },
    uColorHot: uniforms.uColorHot,
    uDensity: { value: state.diskDensity },
    uOuterRadius: { value: state.diskRadius * 1.5 },
    uSide: { value: 0.0 }
};
const diskMaterial = new THREE.ShaderMaterial({
    uniforms: diskUniforms,
    vertexShader: diskVertexShader,
    fragmentShader: diskFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
});

const diskMesh = new THREE.Group();
diskMesh.rotation.x = Math.PI / 2; // Lie flat on XZ plane
const diskLayers = 30;
for (let i = 0; i < diskLayers; i++) {
    let side = (i / (diskLayers - 1)) * 2.0 - 1.0;
    let mat = diskMaterial.clone();
    mat.uniforms = {
        uTime: diskUniforms.uTime,
        uColorHot: diskUniforms.uColorHot,
        uDensity: diskUniforms.uDensity,
        uOuterRadius: diskUniforms.uOuterRadius,
        uSide: { value: side }
    };
    let mesh = new THREE.Mesh(diskGeometry, mat);
    diskMesh.add(mesh);
}
scene.add(diskMesh);

// Setup Exoplanet
const planetGeometry = new THREE.SphereGeometry(0.15, 64, 64);
const planetMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
planetMesh.visible = false;
scene.add(planetMesh);

// Setup Disk Particles
const particleVertexShader = `
    uniform float uTime;
    uniform float uOuterRadius;
    attribute float radius;
    attribute float angleOffset;
    attribute float speed;
    attribute float size;
    varying float vAlpha;
    varying float vTwinkle;
    
    float rand(vec2 co){
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {
        float currentAngle = angleOffset + uTime * speed;
        
        // Random vertical scatter scaling with radius (Wedge shape)
        float flareThickness = (radius - 1.45) * 0.15;
        float y = (rand(vec2(angleOffset, radius)) - 0.5) * flareThickness;
        vec3 pos = vec3(cos(currentAngle) * radius, y, sin(currentAngle) * radius);
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (15.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        
        float normalizedR = (radius - 1.45) / (uOuterRadius - 1.45);
        
        // Dynamic plasma instability twinkling
        vTwinkle = sin(uTime * 15.0 + angleOffset * 10.0 + radius * 50.0) * 0.5 + 0.5;
        
        // Fade out smoothly using Gaussian decay to match the gas
        vAlpha = exp(-pow(normalizedR * 2.5, 2.0)) * smoothstep(0.0, 0.05, normalizedR);
        if (radius > uOuterRadius) vAlpha = 0.0;
    }
`;

const particleFragmentShader = `
    uniform vec3 uColorHot;
    uniform float uOuterRadius;
    varying float vAlpha;
    varying float vTwinkle;

    void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;
        
        float alpha = exp(-dist * dist * 15.0) * vAlpha * mix(0.5, 1.0, vTwinkle);
        
        // Soft, bright, star-colored particles that blend smoothly into the continuous disk
        vec3 color = mix(uColorHot, vec3(1.0), 0.7); 
        
        // Substantially lower particle opacity so they don't break the fluid illusion
        gl_FragColor = vec4(color, alpha * 0.25);
    }
`;;

const particleCount = 2000;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(particleCount * 3);
const pRad = new Float32Array(particleCount);
const pAng = new Float32Array(particleCount);
const pSpd = new Float32Array(particleCount);
const pSiz = new Float32Array(particleCount);

for(let i=0; i<particleCount; i++) {
    // Scatter heavily near the star, stretching out to 50x radius (75 units)
    let r = 1.45 + Math.pow(Math.random(), 2.5) * 73.55; 
    let angle = Math.random() * Math.PI * 2;
    let speed = 1.0 / Math.pow(r, 1.5) * 1.5; // Keplerian
    let size = Math.random() * 2.0 + 1.0;
    
    pPos[i*3] = 0; pPos[i*3+1] = 0; pPos[i*3+2] = 0;
    pRad[i] = r; pAng[i] = angle; pSpd[i] = speed; pSiz[i] = size;
}

pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('radius', new THREE.BufferAttribute(pRad, 1));
pGeo.setAttribute('angleOffset', new THREE.BufferAttribute(pAng, 1));
pGeo.setAttribute('speed', new THREE.BufferAttribute(pSpd, 1));
pGeo.setAttribute('size', new THREE.BufferAttribute(pSiz, 1));

const particleUniforms = {
    uTime: { value: 0 },
    uColorHot: uniforms.uColorHot,
    uOuterRadius: diskUniforms.uOuterRadius
};

const particleMat = new THREE.ShaderMaterial({
    uniforms: particleUniforms,
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const particleSystem = new THREE.Points(pGeo, particleMat);
scene.add(particleSystem);

const uniformsSide = {
    uTime: { value: 0 },
    uL: { value: state.l },
    uM: { value: state.m },
    uAmplitude: { value: state.oscillating ? state.amplitude : 0.0 },
    uFrequencyMult: { value: 1.0 },
    uShowNodes: { value: 1.0 },
    uRealistic: { value: 0.0 },
    uColorHot: { value: new THREE.Color(1.0, 0.0, 0.0) },
    uColorCool: { value: new THREE.Color(0.0, 0.0, 1.0) },
    uSunspotThreshold: { value: state.sunspotThreshold },
    uNodeColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
    uRotationAngle: { value: 0.0 },
    uFlares: { value: 0.0 },
    uBulge: { value: 0.0 }
};

const materialSide = new THREE.ShaderMaterial({
    uniforms: uniformsSide,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    extensions: { derivatives: true }
});

const starSide = new THREE.Mesh(new THREE.SphereGeometry(1.5, 256, 256), materialSide);
starSide.visible = false;
sceneSide.add(starSide);


// --- UI ---
function updateUI() {
    let baseFreq = 1.0;
    let scale = 1.0;
    let hexColor = '#ffffff';

    if (state.selectionMode === 'paper') {
        const p = stellarTypes.find(t => t.id === state.spectralType) || stellarTypes[11];
        baseFreq = p.baseFreq;
        scale = p.scale;
        hexColor = p.hex;
    } else {
        scale = Math.pow(10, (4.44 - state.customLogg) * 0.5);
        scale = Math.max(0.2, Math.min(scale, 5.0)); // Prevent huge clipping or invisible size
        
        baseFreq = Math.pow(10, state.customLogg - 4.44) * Math.sqrt(5778 / state.customTeff);
        baseFreq = Math.max(0.01, Math.min(baseFreq, 10.0));

        const rgb = colorTemperatureToRGB(state.customTeff);
        hexColor = floatToHex(...rgb);
    }
    
    if (state.normalizeSize) {
        scale = 1.0;
    }

    star.scale.set(scale * (1.0 + state.bulge), scale * (1.0 - state.bulge * 0.4), scale * (1.0 + state.bulge));
    if (typeof diskMesh !== 'undefined') {
        diskMesh.scale.setScalar(scale);
        particleSystem.scale.setScalar(scale);
    }
    uniforms.uL.value = state.l;
    uniforms.uM.value = state.m;
    uniforms.uAmplitude.value = state.oscillating ? state.amplitude : 0.0;
    uniforms.uShowNodes.value = state.showNodes ? 1.0 : 0.0;
    uniforms.uRealistic.value = state.realistic ? 1.0 : 0.0;
    uniforms.uFlares.value = state.flareIntensity;
    uniforms.uBulge.value = state.bulge;
    
    diskMesh.visible = state.showDisk;
    particleSystem.visible = state.showDisk;
    
    if (typeof planetMesh !== 'undefined') {
        planetMesh.visible = state.showExoplanet;
        planetMaterial.color.setHex(state.planetGlow ? 0xffffff : 0x000000);
        planetMesh.scale.setScalar(state.planetRadius * scale);
    }
    
    diskUniforms.uDensity.value = state.diskDensity;
    diskUniforms.uOuterRadius.value = state.diskRadius * 1.5;
    
    if (!state.customColorHot) {
        const base = new THREE.Color(hexColor);
        const cool = base.clone().multiplyScalar(0.5);
        state.customColorHot = [base.r, base.g, base.b];
        state.customColorCool = [cool.r, cool.g, cool.b];
    }
    
    const colorHot = state.customColorHot;
    const colorCool = state.customColorCool;
    uniforms.uColorHot.value.setRGB(...colorHot);
    uniforms.uColorCool.value.setRGB(...colorCool);
    uniforms.uSunspotThreshold.value = state.sunspotThreshold;
    uniforms.uFrequencyMult.value = baseFreq * state.waveFreq;
    
    uniformsSide.uL.value = state.l;
    uniformsSide.uM.value = state.m;
    uniformsSide.uAmplitude.value = state.oscillating ? state.amplitude : 0.0;
    // Nodal surface will use Red/Blue/White
    uniformsSide.uColorHot.value.setRGB(1.0, 0.0, 0.0);
    uniformsSide.uColorCool.value.setRGB(0.0, 0.0, 1.0);
    uniformsSide.uSunspotThreshold.value = state.sunspotThreshold;
    uniformsSide.uFrequencyMult.value = uniforms.uFrequencyMult.value;
    uniformsSide.uFlares.value = state.flareIntensity;
    uniformsSide.uBulge.value = state.bulge;
    starSide.scale.set(scale * (1.0 + state.bulge), scale * (1.0 - state.bulge * 0.4), scale * (1.0 + state.bulge));

    if (state.sideBySide) {
        uniforms.uShowNodes.value = 0.0;
        uniforms.uRealistic.value = 1.0;
        uniformsSide.uShowNodes.value = 1.0;
        uniformsSide.uRealistic.value = 0.0;
        star.position.x = -scale * state.separationDistance;
        starSide.position.x = scale * state.separationDistance;
        starSide.visible = true;
        bloomPass.enabled = true; // Since realistic is active
    } else {
        uniforms.uShowNodes.value = state.showNodes ? 1.0 : 0.0;
        uniforms.uRealistic.value = state.realistic ? 1.0 : 0.0;
        star.position.x = 0;
        starSide.visible = false;
        bloomPass.enabled = state.realistic;
    }

    const luminance = colorHot[0] * 0.2126 + colorHot[1] * 0.7152 + colorHot[2] * 0.0722;
    // Map luminance such that sun-like or white stars (~0.95 to 1.0) drop the bloom multiplier near 0.
    const bloomScale = Math.max(0.02, 1.3 - (luminance * 1.3)); 
    bloomPass.strength = state.brightness * bloomScale;



    document.getElementById('l-slider').value = state.l;
    document.getElementById('l-value').textContent = state.l;
    const mSlider = document.getElementById('m-slider');
    if (mSlider) {
        mSlider.min = -state.l; mSlider.max = state.l; mSlider.value = state.m;
    }
    document.getElementById('m-value').textContent = state.m;
    document.getElementById('amplitude-slider').value = state.amplitude;
    document.getElementById('amplitude-value').textContent = state.amplitude.toFixed(2);
    document.getElementById('speed-slider').value = state.speed;
    document.getElementById('speed-value').textContent = state.speed.toFixed(2);

    const rotationSlider = document.getElementById('rotation-slider');
    if (rotationSlider) rotationSlider.value = state.rotationSpeed;
    const rotationValue = document.getElementById('rotation-value');
    if (rotationValue) rotationValue.textContent = state.rotationSpeed.toFixed(2);

    const diskSlider = document.getElementById('disk-density-slider');
    if (diskSlider) diskSlider.value = state.diskDensity;
    const diskValue = document.getElementById('disk-density-value');
    if (diskValue) diskValue.textContent = state.diskDensity.toFixed(2);

    const diskRadiusSlider = document.getElementById('disk-radius-slider');
    if (diskRadiusSlider) diskRadiusSlider.value = state.diskRadius;
    const diskRadiusValue = document.getElementById('disk-radius-value');
    if (diskRadiusValue) diskRadiusValue.textContent = state.diskRadius.toFixed(1);

    const freqSlider = document.getElementById('freq-slider');
    if (freqSlider) freqSlider.value = state.waveFreq;
    const freqValue = document.getElementById('freq-value');
    if (freqValue) freqValue.textContent = state.waveFreq.toFixed(1);

    const dd = document.getElementById('spectral-type-dropdown');
    if (dd && dd.value !== state.spectralType) dd.value = state.spectralType;



    const oscillateToggleEl = document.getElementById('oscillate-toggle');
    if (oscillateToggleEl) oscillateToggleEl.checked = state.oscillating;

    const nodeToggleEl = document.getElementById('node-toggle');
    if (nodeToggleEl) nodeToggleEl.checked = state.showNodes;


    const realisticToggleEl = document.getElementById('realistic-toggle');
    if (realisticToggleEl) realisticToggleEl.checked = state.realistic;

    const sideBySideToggleEl = document.getElementById('side-by-side-toggle');
    if (sideBySideToggleEl) sideBySideToggleEl.checked = state.sideBySide;

    const normalizeSizeToggleEl = document.getElementById('normalize-size-toggle');
    if (normalizeSizeToggleEl) normalizeSizeToggleEl.checked = state.normalizeSize;

    const bgStarsToggleEl = document.getElementById('bg-stars-toggle');
    if (bgStarsToggleEl) bgStarsToggleEl.checked = state.bgStars;

    const diskToggleEl = document.getElementById('disk-toggle');
    if (diskToggleEl) diskToggleEl.checked = state.showDisk;

    const colorHotEl = document.getElementById('color-hot');
    if (colorHotEl) colorHotEl.value = floatToHex(...state.customColorHot);
    
    const colorCoolEl = document.getElementById('color-cool');
    if (colorCoolEl) colorCoolEl.value = floatToHex(...state.customColorCool);

    const brightnessSlider = document.getElementById('brightness-slider');
    if (brightnessSlider) brightnessSlider.value = state.brightness;
    const brightnessValue = document.getElementById('brightness-value');
    if (brightnessValue) brightnessValue.textContent = state.brightness.toFixed(1);


    const separationSlider = document.getElementById('separation-slider');
    if (separationSlider) separationSlider.value = state.separationDistance;
    const separationValue = document.getElementById('separation-value');
    if (separationValue) separationValue.textContent = state.separationDistance.toFixed(1);

    // Toggle panels
    const paperModeControls = document.getElementById('paper-mode-controls');
    const customModeControls = document.getElementById('custom-mode-controls');
    if (paperModeControls) paperModeControls.style.display = state.selectionMode === 'paper' ? 'block' : 'none';
    if (customModeControls) customModeControls.style.display = state.selectionMode === 'custom' ? 'block' : 'none';
    
    const sepSliderContainer = document.getElementById('separation-slider-container');
    if (sepSliderContainer) sepSliderContainer.style.display = state.sideBySide ? 'block' : 'none';
}

// Listeners
const starModeDropdown = document.getElementById('star-mode-dropdown');
if (starModeDropdown) {
    starModeDropdown.value = state.selectionMode;
    starModeDropdown.onchange = (e) => {
        state.selectionMode = e.target.value;
        state.customColorHot = null;
        state.customColorCool = null;
        updateUI();
    };
}

const dropdown = document.getElementById('spectral-type-dropdown');
if (dropdown) {
    stellarTypes.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type.id;
        opt.textContent = type.name;
        if (type.id === state.spectralType) opt.selected = true;
        dropdown.appendChild(opt);
    });
    dropdown.onchange = (e) => {
        state.spectralType = e.target.value;
        state.customColorHot = null;
        state.customColorCool = null;
        updateUI();
    };
}

const oscillateToggleHtml = document.getElementById('oscillate-toggle');
if (oscillateToggleHtml) {
    oscillateToggleHtml.onchange = (e) => {
        state.oscillating = e.target.checked;
        updateUI();
    };
}

document.getElementById('color-hot').oninput = (e) => { state.customColorHot = hexToFloat(e.target.value); updateUI(); };
document.getElementById('color-cool').oninput = (e) => { state.customColorCool = hexToFloat(e.target.value); updateUI(); };
document.getElementById('brightness-slider').oninput = (e) => { state.brightness = parseFloat(e.target.value); updateUI(); };

document.getElementById('separation-slider').oninput = (e) => { state.separationDistance = parseFloat(e.target.value); updateUI(); };

const teffSlider = document.getElementById('teff-slider');
if (teffSlider) {
    teffSlider.oninput = (e) => {
        state.customTeff = parseFloat(e.target.value);
        document.getElementById('teff-value').textContent = state.customTeff;
        state.customColorHot = null;
        state.customColorCool = null;
        updateUI();
    };
}

const loggSlider = document.getElementById('logg-slider');
if (loggSlider) {
    loggSlider.oninput = (e) => {
        state.customLogg = parseFloat(e.target.value);
        document.getElementById('logg-value').textContent = state.customLogg.toFixed(1);
        updateUI();
    };
}

const bgStarsToggleHtml = document.getElementById('bg-stars-toggle');
if (bgStarsToggleHtml) {
    bgStarsToggleHtml.onchange = (e) => {
        state.bgStars = e.target.checked;
        updateUI();
    };
}

const sideBySideToggleHtml = document.getElementById('side-by-side-toggle');
if (sideBySideToggleHtml) {
    sideBySideToggleHtml.onchange = (e) => {
        state.sideBySide = e.target.checked;
        if (state.sideBySide) {
            state.showNodes = false;
            state.realistic = false;
        }
        updateUI();
    };
}

const normalizeSizeToggleHtml = document.getElementById('normalize-size-toggle');
if (normalizeSizeToggleHtml) {
    normalizeSizeToggleHtml.onchange = (e) => {
        state.normalizeSize = e.target.checked;
        updateUI();
    };
}

const resetCameraBtn = document.getElementById('reset-camera-btn');
if (resetCameraBtn) {
    resetCameraBtn.onclick = () => {
        const s = star.scale.x;
        camera.position.set(5 * s, 2 * s, 7 * s);
        controls.target.set(0, 0, 0);
        controls.update();
    };
}



const uiToggleBtn = document.getElementById('ui-toggle-btn');
if (uiToggleBtn) {
    uiToggleBtn.onclick = () => {
        const ui = document.getElementById('ui-overlay');
        if (ui.classList.contains('hidden')) {
            ui.classList.remove('hidden');
            uiToggleBtn.textContent = 'Hide UI';
        } else {
            ui.classList.add('hidden');
            uiToggleBtn.textContent = 'Show UI';
        }
    };
}

const welcomeModal = document.getElementById('welcome-modal-overlay');
const startBtn = document.getElementById('start-exploring-btn');
const aboutBtn = document.getElementById('about-btn');

if (startBtn && welcomeModal) {
    startBtn.onclick = () => {
        welcomeModal.classList.add('hidden');
    };
}

if (aboutBtn && welcomeModal) {
    aboutBtn.onclick = () => {
        welcomeModal.classList.remove('hidden');
    };
}

document.getElementById('freq-slider').oninput = (e) => { state.waveFreq = parseFloat(e.target.value); updateUI(); };

document.getElementById('l-slider').oninput = (e) => { state.l = parseInt(e.target.value); if (Math.abs(state.m) > state.l) state.m = 0; updateUI(); };
document.getElementById('m-slider').oninput = (e) => { state.m = parseInt(e.target.value); updateUI(); };
document.getElementById('amplitude-slider').oninput = (e) => { state.amplitude = parseFloat(e.target.value); updateUI(); };
document.getElementById('speed-slider').oninput = (e) => { state.speed = parseFloat(e.target.value); updateUI(); };
document.getElementById('rotation-slider').oninput = (e) => { state.rotationSpeed = parseFloat(e.target.value); updateUI(); };


document.getElementById('disk-density-slider').oninput = (e) => { state.diskDensity = parseFloat(e.target.value); updateUI(); };
document.getElementById('disk-radius-slider').oninput = (e) => { state.diskRadius = parseFloat(e.target.value); updateUI(); };



const nodeToggleHtml = document.getElementById('node-toggle');
if (nodeToggleHtml) {
    nodeToggleHtml.onchange = (e) => {
        state.showNodes = e.target.checked;
        if (state.showNodes) {
            state.realistic = false;
            state.sideBySide = false;
        }
        updateUI();
    };
}


const realisticToggleHtml = document.getElementById('realistic-toggle');
if (realisticToggleHtml) {
    realisticToggleHtml.onchange = (e) => {
        state.realistic = e.target.checked;
        if (state.realistic) {
            state.showNodes = false;
            state.sideBySide = false;
        }
        updateUI();
    };
}

const diskToggleHtml = document.getElementById('disk-toggle');
if (diskToggleHtml) {
    diskToggleHtml.onchange = (e) => {
        state.showDisk = e.target.checked;
        updateUI();
    };
}

const exoToggleHtml = document.getElementById('exoplanet-toggle');
if (exoToggleHtml) {
    exoToggleHtml.onchange = (e) => {
        state.showExoplanet = e.target.checked;
        updateUI();
    };
}

const planetGlowToggleHtml = document.getElementById('planet-glow-toggle');
if (planetGlowToggleHtml) {
    planetGlowToggleHtml.onchange = (e) => {
        state.planetGlow = e.target.checked;
        updateUI();
    };
}

const planetRadHtml = document.getElementById('planet-radius-slider');
if (planetRadHtml) {
    planetRadHtml.oninput = (e) => {
        state.planetRadius = parseFloat(e.target.value);
        document.getElementById('planet-radius-value').innerText = state.planetRadius.toFixed(1);
        updateUI();
    };
}

const planetDistHtml = document.getElementById('planet-distance-slider');
if (planetDistHtml) {
    planetDistHtml.oninput = (e) => {
        state.planetDistance = parseFloat(e.target.value);
        document.getElementById('planet-distance-value').innerText = state.planetDistance.toFixed(1);
        updateUI();
    };
}


function animate() {
    requestAnimationFrame(animate);
    const timeStep = 0.05 * state.speed;
    state.time += timeStep;
    state.rotationAngle += timeStep * state.rotationSpeed;
    
    uniforms.uTime.value = state.time;
    uniforms.uRotationAngle.value = state.rotationAngle;
    
    diskUniforms.uTime.value = state.time;
    if (typeof particleUniforms !== 'undefined') {
        particleUniforms.uTime.value = state.time;
    }
    
    if (typeof planetMesh !== 'undefined' && state.showExoplanet) {
        const orbitalVelocity = 1.0 / Math.pow(state.planetDistance, 1.5) * 1.5;
        const angle = state.time * orbitalVelocity;
        
        // Base scale calculation from updateUI
        let scale = 1.0;
        if (state.selectionMode === 'paper') {
            const p = stellarTypes.find(t => t.id === state.spectralType) || stellarTypes[11];
            scale = p.scale;
        } else {
            scale = Math.pow(10, (4.44 - state.customLogg) * 0.5);
            scale = Math.max(0.2, Math.min(scale, 5.0));
        }
        if (state.normalizeSize) scale = 1.0;

        planetMesh.position.x = Math.cos(angle) * (state.planetDistance * 1.5 * scale);
        planetMesh.position.z = Math.sin(angle) * (state.planetDistance * 1.5 * scale);
        planetMesh.position.y = 0;
    }
    
    if (uniformsSide) {
        uniformsSide.uTime.value = state.time;
        uniformsSide.uRotationAngle.value = state.rotationAngle;
    }


    controls.update();

    renderer.clear();
    composer.render();
    
    if (state.sideBySide) {
        renderer.clearDepth();
        renderer.render(sceneSide, camera);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    composer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);
onWindowResize();
updateUI();
animate();
