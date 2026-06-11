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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    let renderQueued = false;

    function render() {
        renderQueued = false;
        renderer.render(scene, camera);
    }

    function requestRender() {
        if (renderQueued) return;
        renderQueued = true;
        requestAnimationFrame(render);
    }

    controls.addEventListener("change", requestRender);

    const loader = new GLTFLoader();
    let currentCloud = null;

    function disposeObject(object) {
        object.traverse((child) => {
            if (child.geometry) {
                child.geometry.dispose();
            }

            if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((material) => {
                    Object.keys(material).forEach((key) => {
                        const value = material[key];
                        if (value && value.isTexture) {
                            value.dispose();
                        }
                    });
                    material.dispose();
                });
            }
        });
    }

    function loadModel(modelPath, onError) {
        if (!modelPath) {
            return;
        }

        loader.load(modelPath, (gltf) => {
            let hasPoints = false;

            if (currentCloud) {
                scene.remove(currentCloud);
                disposeObject(currentCloud);
                currentCloud = null;
            }

            gltf.scene.traverse((obj) => {
                if (obj.isPoints) {
                    obj.material.size = 0.02;
                    obj.material.color = new THREE.Color(0xffffff);
                    hasPoints = true;
                }
            });

            if (!hasPoints) {
                if (onError) onError();
                return;
            }

            scene.add(gltf.scene);
            currentCloud = gltf.scene;

            const box = new THREE.Box3().setFromObject(gltf.scene);
            if (!box.isEmpty()) {
                const sphere = box.getBoundingSphere(new THREE.Sphere());
                const distance = Math.max(sphere.radius * 2.2, initialPosition);
                camera.near = Math.max(sphere.radius / 100, 0.001);
                camera.far = Math.max(sphere.radius * 100, 1000);
                camera.position.set(
                    sphere.center.x + distance * Math.cos(elev) * Math.cos(azim),
                    sphere.center.y + distance * Math.sin(elev),
                    sphere.center.z + distance * Math.cos(elev) * Math.sin(azim)
                );
                controls.target.copy(sphere.center);
                camera.updateProjectionMatrix();
                controls.update();
            }

            requestRender();
        }, undefined, () => {
            if (onError) onError();
        });
    }

    loadModel(initialModelPath);

    window.addEventListener("resize", () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        requestRender();
    });

    requestRender();

    return { loadModel };
}

// EXPOSE VIEWER INSTANCES FOR HTML CALLBACKS
window.teaserViewers = {};
window.otherViewer = null;
window.ourViewer = null;
