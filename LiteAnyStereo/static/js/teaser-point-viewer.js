import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";


export function createPointViewer(containerId, initialModelPath, initialPosition) {
    const container = document.getElementById(containerId);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(
        70,
        container.clientWidth / container.clientHeight,
        0.01,
        1000
    );

    // Match your preferred orientation
    const r = initialPosition;
    const elev = THREE.MathUtils.degToRad(0);
    const azim = THREE.MathUtils.degToRad(270);

    camera.position.set(
        r * Math.cos(elev) * Math.cos(azim),
        r * Math.sin(elev),
        r * Math.cos(elev) * Math.sin(azim)
    );
    camera.up.set(0, -1, 0);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    const loader = new GLTFLoader();
    let currentCloud = null;

    function loadModel(modelPath) {
        loader.load(modelPath, (gltf) => {
            gltf.scene.traverse((obj) => {
                if (obj.isPoints) {
                    if (currentCloud) scene.remove(currentCloud);
                    obj.material.size = 0.02;
                    obj.material.color = new THREE.Color(0xffffff);
                    scene.add(obj);
                    currentCloud = obj;
                }
            });
        });
    }

    loadModel(initialModelPath);

    window.addEventListener("resize", () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();

    return { loadModel };
}

// EXPOSE VIEWER INSTANCES FOR HTML CALLBACKS
window.teaserViewers = {};
window.otherViewer = null;
window.ourViewer = null;