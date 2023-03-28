import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import gestureModel from './assets/gesture_recognizer.task';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module'
import {
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

const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: gestureModel,
  },
  minTrackingConfidence: 0.5,
  minHandDetectionConfidence: 0.5,
  numHands: 2,
});

const connectors = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [0, 9, 10, 11, 12],
  [0, 13, 14, 15, 16],
  [0, 17, 18, 19, 20],
];

const $canvas = renderer.domElement;
/** @type {CanvasRenderingContext2D} */
const width = 640;
const height = 480;
$canvas.width = width;
$canvas.height = height;

const material = new LineBasicMaterial({ color: 0xffffff });

gestureRecognizer.setOptions({ runningMode: 'video' });
navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
  const video = document.createElement('video');
  video.srcObject = stream;
  video.onloadedmetadata = () => {
    console.log('video loaded');
    video.play();
    gestureRecognizer.setOptions({ input: video });
    video.addEventListener('play', () => {
      console.log('video playing');
      const render = () => {
        if (video.paused || video.ended) return;
        const results = gestureRecognizer.recognizeForVideo(video, Date.now());
        if (results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          const handGroup = new Group();
          handGroup.name = 'handGroup';
          scene.traverse((child) => {
            if (child.name === 'handGroup') {
              scene.remove(child);
            }
          });
          for (let i = 0; i < connectors.length; i++) {
            const connector = connectors[i];
            const linePoints = [];
            for (let j = 0; j < connector.length; j++) {
              const landmark = landmarks[connector[j]];
              linePoints.push(new Vector3(landmark.x, landmark.y, landmark.z));
            }
            const geometry = new BufferGeometry().setFromPoints(linePoints);
            const line = new Line(geometry, material);
            handGroup.add(line);
          }
          scene.add(handGroup);
        }
        renderer.render(scene, camera);
        stats.update()
        requestAnimationFrame(render);
      };
      render();
    });
  };
});
