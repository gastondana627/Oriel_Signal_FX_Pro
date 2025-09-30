// --- CONFIGURATION PANEL ---
window.config = {
    shape: 'cube',
    size: 4,
    baseColor: 0xffffff,
    glowColor: 0x8309D5,
    rotationSpeed: 0.1,
    pulseIntensity: 1.5,
    bassFrequency: 2,
    trebleFrequency: 50
};

// --- 1. SETUP ---
const container = document.getElementById('graph-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 10;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- WINDOW RESIZE HANDLER ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- 2. PAUSED STATE ---
let isAnimationPaused = false;
window.setAnimationPaused = function(pausedState) {
    isAnimationPaused = pausedState;
}

// --- 3. AUDIO ANALYSIS SETUP ---
let analyser;
let dataArray;
function initAudio() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioElement = document.getElementById('background-music');
    const source = audioContext.createMediaElementSource(audioElement);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    return audioContext;
}

// --- 4. CREATE THE OBJECT & MATERIALS ---
let shape;
const material = new THREE.MeshBasicMaterial({ color: config.baseColor, wireframe: true });
const baseColor = new THREE.Color(config.baseColor);
const glowColor = new THREE.Color(config.glowColor);

window.recreateShape = function() {
    if (shape) { scene.remove(shape); }
    let geometry;
    switch (config.shape) {
        case 'sphere':
            geometry = new THREE.SphereGeometry(config.size / 1.5, 32, 16);
            break;
        case 'icosahedron':
            geometry = new THREE.IcosahedronGeometry(config.size / 1.5, 1);
            break;
        case 'torus':
            geometry = new THREE.TorusGeometry(config.size / 2, config.size / 5, 16, 100);
            break;
        case 'dodecahedron':
            geometry = new THREE.DodecahedronGeometry(config.size / 1.5);
            break;
        case 'torusKnot':
            geometry = new THREE.TorusKnotGeometry(config.size / 2.5, config.size / 8, 100, 16);
            break;
        case 'cone':
            geometry = new THREE.ConeGeometry(config.size / 2, config.size, 32);
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(config.size / 2, config.size / 2, config.size, 32);
            break;
        case 'octahedron':
            geometry = new THREE.OctahedronGeometry(config.size / 1.5);
            break;
        case 'tetrahedron':
            geometry = new THREE.TetrahedronGeometry(config.size / 1.5);
            break;
        case 'ring':
            geometry = new THREE.RingGeometry(config.size / 4, config.size / 2, 32);
            break;
        case 'plane':
            geometry = new THREE.PlaneGeometry(config.size, config.size, 10, 10);
            break;
        case 'spikySphere':
            geometry = new THREE.IcosahedronGeometry(config.size / 2, 5);
            const positionAttribute = geometry.getAttribute('position');
            const vertex = new THREE.Vector3();
            for (let i = 0; i < positionAttribute.count; i++){
                vertex.fromBufferAttribute(positionAttribute, i);
                vertex.multiplyScalar(1 + (Math.random() * 0.4 - 0.2));
                positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
            }
            break;
        case 'torusLarge':
            geometry = new THREE.TorusGeometry(config.size / 1.5, config.size / 10, 16, 100);
            break;
        case 'conePointy':
             geometry = new THREE.ConeGeometry(config.size / 4, config.size, 32);
            break;
        case 'crystalTall':
            geometry = new THREE.CylinderGeometry(config.size/4, config.size/3, config.size, 6);
            break;
        case 'twistedBox':
            geometry = new THREE.BoxGeometry(config.size, config.size, config.size, 10, 10, 10);
            const pos = geometry.getAttribute('position');
            const v = new THREE.Vector3();
            for (let i = 0; i < pos.count; i++) {
                v.fromBufferAttribute(pos, i);
                const twist = Math.sin(v.y * 0.5) * 0.5;
                const sinTwist = Math.sin(twist);
                const cosTwist = Math.cos(twist);
                const x = v.x * cosTwist - v.z * sinTwist;
                const z = v.z * cosTwist + v.x * sinTwist;
                pos.setXYZ(i, x, v.y, z);
            }
            break;
        case 'wavyPlane':
            geometry = new THREE.PlaneGeometry(config.size * 1.5, config.size * 1.5, 50, 50);
            const p = geometry.getAttribute('position');
            for (let i = 0; i < p.count; i++) {
                const z = 0.5 * Math.sin(p.getX(i) * 2) + 0.3 * Math.cos(p.getY(i) * 2);
                p.setZ(i, z);
            }
            break;
        case 'polyStar':
            const starPoints = [];
            for (let i = 0; i < 10; i++) {
                const l = i % 2 === 0 ? config.size / 2 : config.size / 4;
                const a = i / 10 * 2 * Math.PI;
                starPoints.push(new THREE.Vector2(Math.cos(a) * l, Math.sin(a) * l));
            }
            const starShape = new THREE.Shape(starPoints);
            geometry = new THREE.ShapeGeometry(starShape);
            break;
        case 'randomPoly':
             geometry = new THREE.IcosahedronGeometry(config.size / 2, 2);
             const rPos = geometry.getAttribute('position');
             const rV = new THREE.Vector3();
             for (let i = 0; i < rPos.count; i++) {
                rV.fromBufferAttribute(rPos, i);
                rV.multiplyScalar(0.8 + Math.random() * 0.4);
                rPos.setXYZ(i, rV.x, rV.y, rV.z);
            }
            break;
        case 'cube':
        default:
            geometry = new THREE.BoxGeometry(config.size, config.size, config.size);
            break;
    }
    shape = new THREE.Mesh(geometry, material);
    scene.add(shape);
}
// This call creates the initial shape when the script loads
recreateShape();

// --- 5. ANIMATE ---
function animate() {
    requestAnimationFrame(animate);
    if (isAnimationPaused) return;

    const elapsedTime = clock.getElapsedTime();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(shape);
    let isHovering = intersects.length > 0;

    if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        const bassValue = (dataArray[config.bassFrequency] + dataArray[config.bassFrequency + 1]) / 2 / 255;
        let bassScale = 1 + bassValue * config.pulseIntensity;
        if (isHovering) {
            bassScale *= 1.2;
        }
        shape.scale.set(bassScale, bassScale, bassScale);
        glowColor.set(config.glowColor);
        const trebleValue = (dataArray[config.trebleFrequency] + dataArray[config.trebleFrequency + 1]) / 2 / 255;
        material.color.copy(baseColor).lerp(glowColor, trebleValue);
    }

    shape.rotation.x = elapsedTime * config.rotationSpeed;
    shape.rotation.y = elapsedTime * config.rotationSpeed * 1.5;
    renderer.render(scene, camera);

    if (window.capturer) capturer.capture(renderer.domElement);
}
animate();

// --- 6. EVENT LISTENERS ---
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});
window.addEventListener('click', () => {
    if (raycaster.intersectObject(shape).length > 0) {
        if (window.togglePlayPause) {
            window.togglePlayPause();
        }
    }
});