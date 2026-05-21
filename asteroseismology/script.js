import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- Configuration & State ---
const state = {
    preset: 'sun',
    type: 'p', // 'p' or 'g'
    l: 2,
    m: 0,
    amplitude: 0.1,
    speed: 1.0,
    showNodes: true,
    glow: false,
    realistic: false,
    time: 0,
    audioEnabled: false
};

// --- Preset Definitions ---
const presets = {
    'sun': {
        name: "Sun (Main Sequence)",
        colorHot: [1.0, 1.0, 0.8],
        colorCool: [1.0, 0.5, 0.0],
        scale: 1.0,
        defaultType: 'p',
        defaultL: 2,
        defaultM: 0,
        baseFreq: 1.0,
        baseAmp: 0.1,
        audioPitch: 440,
        desc: "The Sun has a massive radiative zone and an outer convective envelope where p-modes are driven."
    },
    'giant': {
        name: "Red Giant",
        colorHot: [1.0, 0.8, 0.4],
        colorCool: [0.8, 0.1, 0.0],
        scale: 2.2,
        defaultType: 'p', 
        defaultL: 1,
        defaultM: 0,
        baseFreq: 0.3,
        baseAmp: 0.15,
        audioPitch: 110,
        desc: "Red Giants have extremely expanded convective envelopes and tiny, dense cores where g-modes live."
    },
    'dwarf': {
        name: "White Dwarf",
        colorHot: [0.9, 0.9, 1.0],
        colorCool: [0.4, 0.5, 1.0],
        scale: 0.4,
        defaultType: 'g',
        defaultL: 2,
        defaultM: 2,
        baseFreq: 2.5,
        baseAmp: 0.08,
        audioPitch: 880,
        desc: "White Dwarfs are almost entirely core material, with very thin atmosphere layers."
    }
};

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
        float phi = atan(nPos.z, nPos.x);
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
    
    uniform float uTime;
    uniform int uL;
    uniform int uM;
    uniform float uAmplitude;
    uniform float uFrequencyMult;

    void main() {
        vNormal = normal;
        vLocalPosition = position;
        vec3 nPos = normalize(position);
        float harmonic = calculateHarmonic(uL, uM, nPos);
        vHarmonicRaw = harmonic;
        
        vDisplacement = harmonic * sin(uTime * uFrequencyMult);
        
        vec3 newPosition = position + normal * vDisplacement * uAmplitude;
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
    
    uniform vec3 uColorHot;
    uniform vec3 uColorCool;
    uniform float uShowNodes;
    uniform float uRealistic;
    uniform float uTime;
    
    mat2 rotate2D(float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat2(c, -s, s, c);
    }
    
    void main() {
        // Macroscopic temperature shifts due to displacement (asteroseismology p-modes)
        float t = vDisplacement * -1.5 + 0.5; 
        vec3 color = mix(uColorCool, uColorHot, t);
        
        if (uRealistic > 0.5) {
            // 1. ROTATION FIX: 
            // Differential rotation shears 3D noise into "Jupiter bands". 
            // We use slow solid-body rotation here to preserve the plasma structures.
            float rotAngle = uTime * 0.05; 
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
            float penumbra = smoothstep(0.30, 0.38, spotNoise); 
            float umbra = smoothstep(0.38, 0.45, spotNoise);    
            
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

            // Apply final surface and re-apply macroscopic asteroseismology lighting
            color = surfaceColor * mix(0.7, 1.3, t);

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
            float dist = abs(vHarmonicRaw) / fwidth(vHarmonicRaw);
            float edge = 1.0 - smoothstep(0.0, 1.2, dist); 
            color = mix(color, vec3(0.02, 0.02, 0.05), edge);
        }
        
        // Realistic Limb Darkening
        vec3 viewDirOut = normalize(cameraPosition - vWorldPosition);
        float limbFactor = max(0.0, dot(normalize(vNormal), viewDirOut));
        limbFactor = pow(limbFactor, 0.6) * 0.8 + 0.2; 
        
        gl_FragColor = vec4(color * limbFactor * 1.2, 1.0); 
    }
`;

// --- Scene Initialization ---
const canvas = document.querySelector('#star-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
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

// --- Lightcurve System ---
const lcCanvas = document.querySelector('#lightcurve-canvas');
const lcCtx = lcCanvas.getContext('2d');
let lcData = new Array(200).fill(0);

function updateLightcurve() {
    const p = presets[state.preset];
    const freqMult = p.baseFreq * (state.type === 'g' ? 0.2 : 1.0);
    const cancellation = state.l === 0 ? 1.0 : 1.0 / (state.l + 1.0);
    let flux = Math.sin(state.time * freqMult) * cancellation;

    lcData.push(flux * state.amplitude);
    if (lcData.length > 200) lcData.shift();

    const w = lcCanvas.width, h = lcCanvas.height;
    lcCtx.clearRect(0, 0, w, h);

    // Axes
    const padding = 30;
    const plotW = w - padding - 5;
    const plotH = h - padding - 10;
    const plotX = padding;
    const plotY = 5;

    lcCtx.strokeStyle = '#555';
    lcCtx.lineWidth = 1;
    lcCtx.font = '10px sans-serif';
    lcCtx.fillStyle = '#888';

    // Y-Axis
    lcCtx.beginPath();
    lcCtx.moveTo(plotX, plotY);
    lcCtx.lineTo(plotX, plotY + plotH);
    lcCtx.stroke();
    lcCtx.textAlign = 'right';
    lcCtx.fillText('0.0', plotX - 5, plotY + plotH / 2 + 3);
    lcCtx.fillText(`+${state.amplitude.toFixed(2)}`, plotX - 5, plotY + 10);
    lcCtx.fillText(`-${state.amplitude.toFixed(2)}`, plotX - 5, plotY + plotH);
    lcCtx.save();
    lcCtx.translate(10, h / 2);
    lcCtx.rotate(-Math.PI / 2);
    lcCtx.textAlign = 'center';
    lcCtx.fillText('ΔF/F', 0, 0);
    lcCtx.restore();

    // X-Axis
    lcCtx.beginPath();
    lcCtx.moveTo(plotX, plotY + plotH / 2);
    lcCtx.lineTo(plotX + plotW, plotY + plotH / 2);
    lcCtx.stroke();
    lcCtx.textAlign = 'center';
    lcCtx.fillText('Time', plotX + plotW / 2, h - 2);

    // Draw Plot
    lcCtx.strokeStyle = '#00c8ff';
    lcCtx.lineWidth = 2;
    lcCtx.beginPath();
    for (let i = 0; i < lcData.length; i++) {
        const x = plotX + (i / (lcData.length - 1)) * plotW;
        const y = (plotY + plotH / 2) - (lcData[i] / state.amplitude) * (plotH / 2);
        if (i === 0) lcCtx.moveTo(x, y);
        else lcCtx.lineTo(x, y);
    }
    lcCtx.stroke();
}

// --- Sonification ---
let audioCtx, oscillator, gainNode;
function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
}

function updateAudio() {
    if (!state.audioEnabled || !audioCtx) return;
    const p = presets[state.preset];
    const freqMult = p.baseFreq * (state.type === 'g' ? 0.2 : 1.0);
    oscillator.frequency.setTargetAtTime(p.audioPitch * state.speed, audioCtx.currentTime, 0.1);
    const flux = Math.abs(Math.sin(state.time * freqMult)) * state.amplitude;
    gainNode.gain.setTargetAtTime(flux * 2.0, audioCtx.currentTime, 0.05);
}

// --- Star Geometry & Material ---
const uniforms = {
    uTime: { value: 0 },
    uL: { value: state.l },
    uM: { value: state.m },
    uAmplitude: { value: state.amplitude },
    uFrequencyMult: { value: 1.0 },
    uShowNodes: { value: 1.0 },
    uRealistic: { value: 0.0 },
    uColorHot: { value: new THREE.Color(...presets.sun.colorHot) },
    uColorCool: { value: new THREE.Color(...presets.sun.colorCool) }
};

const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    extensions: { derivatives: true }
});

const star = new THREE.Mesh(new THREE.SphereGeometry(1.5, 128, 128), material);
scene.add(star);

// --- Starfield ---
let starfieldMat;
function createStarfield() {
    const geo = new THREE.BufferGeometry();
    starfieldMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.15,
        sizeAttenuation: true
    });
    const verts = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000, y = (Math.random() - 0.5) * 2000, z = (Math.random() - 0.5) * 2000;
        if (Math.sqrt(x*x + y*y + z*z) > 100) verts.push(x, y, z);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    scene.add(new THREE.Points(geo, starfieldMat));
}
createStarfield();

// --- UI ---
function updateUI() {
    const p = presets[state.preset];
    uniforms.uL.value = state.l;
    uniforms.uM.value = state.m;
    uniforms.uAmplitude.value = state.amplitude;
    uniforms.uShowNodes.value = state.showNodes ? 1.0 : 0.0;
    uniforms.uRealistic.value = state.realistic ? 1.0 : 0.0;
    uniforms.uColorHot.value.setRGB(...p.colorHot);
    uniforms.uColorCool.value.setRGB(...p.colorCool);
    uniforms.uFrequencyMult.value = p.baseFreq * (state.type === 'g' ? 0.2 : 1.0);
    star.scale.setScalar(p.scale);

    bloomPass.enabled = state.glow || state.realistic;

    // RESTORED: Background stars remain bright white regardless of glowing state
    if (starfieldMat) {
        starfieldMat.color.setHex(0xffffff);
    }

    document.getElementById('l-slider').value = state.l;
    document.getElementById('l-value').textContent = state.l;
    const mSlider = document.getElementById('m-slider');
    mSlider.min = -state.l; mSlider.max = state.l; mSlider.value = state.m;
    document.getElementById('m-value').textContent = state.m;
    document.getElementById('amplitude-slider').value = state.amplitude;
    document.getElementById('amplitude-value').textContent = state.amplitude.toFixed(2);
    document.getElementById('speed-slider').value = state.speed;
    document.getElementById('speed-value').textContent = state.speed.toFixed(1);

    document.querySelectorAll('.presets button').forEach(btn => btn.classList.toggle('active', btn.id === `preset-${state.preset}`));
    document.getElementById('p-mode-btn').classList.toggle('active', state.type === 'p');
    document.getElementById('g-mode-btn').classList.toggle('active', state.type === 'g');

    const audioBtn = document.getElementById('audio-btn');
    if (audioBtn) {
        audioBtn.textContent = state.audioEnabled ? "Disable Sound" : "Enable Sound";
        audioBtn.classList.toggle('active', state.audioEnabled);
    }

    const nodeToggleEl = document.getElementById('node-toggle');
    if (nodeToggleEl) nodeToggleEl.checked = state.showNodes;

    const glowToggleEl = document.getElementById('glow-toggle');
    if (glowToggleEl) glowToggleEl.checked = state.glow;

    const realisticToggleEl = document.getElementById('realistic-toggle');
    if (realisticToggleEl) realisticToggleEl.checked = state.realistic;
}

// Listeners
document.getElementById('preset-sun').onclick = () => { state.preset = 'sun'; state.type = presets.sun.defaultType; state.l = presets.sun.defaultL; state.m = presets.sun.defaultM; state.amplitude = presets.sun.baseAmp; updateUI(); };
document.getElementById('preset-giant').onclick = () => { state.preset = 'giant'; state.type = presets.giant.defaultType; state.l = presets.giant.defaultL; state.m = presets.giant.defaultM; state.amplitude = presets.giant.baseAmp; updateUI(); };
document.getElementById('preset-dwarf').onclick = () => { state.preset = 'dwarf'; state.type = presets.dwarf.defaultType; state.l = presets.dwarf.defaultL; state.m = presets.dwarf.defaultM; state.amplitude = presets.dwarf.baseAmp; updateUI(); };

document.getElementById('p-mode-btn').onclick = () => { state.type = 'p'; updateUI(); };
document.getElementById('g-mode-btn').onclick = () => { state.type = 'g'; updateUI(); };

document.getElementById('l-slider').oninput = (e) => { state.l = parseInt(e.target.value); if (Math.abs(state.m) > state.l) state.m = 0; updateUI(); };
document.getElementById('m-slider').oninput = (e) => { state.m = parseInt(e.target.value); updateUI(); };
document.getElementById('amplitude-slider').oninput = (e) => { state.amplitude = parseFloat(e.target.value); updateUI(); };
document.getElementById('speed-slider').oninput = (e) => { state.speed = parseFloat(e.target.value); updateUI(); };

document.getElementById('audio-btn').onclick = () => {
    initAudio();
    state.audioEnabled = !state.audioEnabled;
    if (state.audioEnabled) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
    } else {
        if (audioCtx.state === 'running') audioCtx.suspend();
    }
    updateUI();
};

const nodeToggleHtml = document.getElementById('node-toggle');
if (nodeToggleHtml) {
    nodeToggleHtml.onchange = (e) => {
        state.showNodes = e.target.checked;
        if (state.showNodes) {
            state.glow = false;
            state.realistic = false;
        }
        updateUI();
    };
}

const glowToggleHtml = document.getElementById('glow-toggle');
if (glowToggleHtml) {
    glowToggleHtml.onchange = (e) => {
        state.glow = e.target.checked;
        if (state.glow) {
            state.showNodes = false;
            state.realistic = false;
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
            state.glow = false;
        }
        updateUI();
    };
}

window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'g' || e.key.toLowerCase() === 'l') {
        state.glow = !state.glow;
        if (state.glow) state.showNodes = false;
        updateUI();
    }
});

function animate() {
    requestAnimationFrame(animate);
    state.time += 0.05 * state.speed;
    uniforms.uTime.value = state.time;

    updateLightcurve();
    updateAudio();
    controls.update();

    composer.render();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    composer.setSize(window.innerWidth, window.innerHeight);

    lcCanvas.width = lcCanvas.clientWidth;
    lcCanvas.height = lcCanvas.clientHeight;
}
window.addEventListener('resize', onWindowResize);
onWindowResize();
updateUI();
animate();