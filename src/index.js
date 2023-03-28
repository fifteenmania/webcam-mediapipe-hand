import { FilesetResolver, GestureRecognizer, HandLandmarker } from '@mediapipe/tasks-vision';
import handLandmarkerModel from './assets/hand_landmarker.task';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module'
import {
  BufferAttribute,
  Vector3,
  Line,
  LineBasicMaterial,
  BufferGeometry,
  WebGLRenderer,
  sRGBEncoding,
  Scene,
  DirectionalLight,
  PerspectiveCamera,
  Group,
  GridHelper,
  Clock,
  AxesHelper,
  Mesh,
} from 'three';

const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = sRGBEncoding;
document.body.appendChild(renderer.domElement);

const camera = new PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.aspect = window.innerWidth / window.innerHeight;
camera.position.set(0, 1.6, 6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.screenSpacePanning = true;
controls.target.set(0, 1, 0);
controls.update();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

const scene = new Scene();

const gridHelper = new GridHelper();
scene.add(gridHelper);

const axesHelper = new AxesHelper(5);
scene.add(axesHelper);

const stats = Stats()
document.body.appendChild(stats.dom)

const clock = new Clock();
clock.start();

const vision = await FilesetResolver.forVisionTasks(
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
);

const handLandmarker = await HandLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: handLandmarkerModel,
    maxNumHands: 1,
    minDetectionConfidence: 0.5,
  },
})
await handLandmarker.setOptions({ runningMode: "video" });

const connectors = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [5, 9],
  [9, 13],
  [13, 17],
];
const indexBuffer = new Int16Array(connectors.length * 2);
for (let i = 0; i < connectors.length; i++) {
  const connector = connectors[i];
  indexBuffer[i * 2] = connector[0];
  indexBuffer[i * 2 + 1] = connector[1];
}

const handMaterial = new LineBasicMaterial({ color: 0xffffff });
const positionBuffer = new Float32Array(21 * 3);
const handGeometry = new BufferGeometry();
handGeometry.setAttribute('position', new BufferAttribute(positionBuffer, 3));
handGeometry.setIndex(indexBuffer);
const handLine = new Mesh(handGeometry, handMaterial);
scene.add(handLine);

let drawCount = 0;

navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
  const video = document.createElement('video');
  video.srcObject = stream;
  video.onloadedmetadata = () => {
    video.play();
    video.addEventListener('play', () => {
      const render = () => {
        if (video.paused || video.ended) return;
        const detections = handLandmarker.detectForVideo(video, Date.now());
        if (detections.landmarks.length > 0) {
          if (drawCount === 1) {
            handLine.geometry.attributes.position.needsUpdate = true;
          }
          updatePositionsWithlandmarks(detections.landmarks[0]);
          drawCount++;
        }
        renderer.render(scene, camera);
        stats.update();
        requestAnimationFrame(render);
      };
      render();
    });
  };
});

function updatePositionsWithlandmarks(landmarks) {
  const positions = handLine.geometry.attributes.position.array;
  for (let i = 0; i < landmarks.length; i++) {
    const landmark = landmarks[i];
    positions[i * 3] = landmark.x;
    positions[i * 3 + 1] = landmark.y;
    positions[i * 3 + 2] = landmark.z;
  }
}
