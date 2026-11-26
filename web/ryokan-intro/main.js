import * as THREE from 'three';
import { gsap } from 'gsap';

const canvas = document.querySelector('#scene');
const status = document.querySelector('#status');
const intro = document.querySelector('#intro');
const sceneUi = document.querySelector('#scene-ui');
const caption = document.querySelector('#caption');
const progressLabel = document.querySelector('#progress');
const mapReveal = document.querySelector('#map-reveal');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const params = new URLSearchParams(location.search);
try { history.scrollRestoration = 'manual'; } catch {}
const lang = ['ko', 'ja', 'en'].includes(params.get('lang')) ? params.get('lang') : 'ko';
const copy = {
  ko: ['아래로 스크롤해 입장하기', '쇼지 문이 열립니다', '다다미방으로 들어갑니다', '좌탁 위 지도를 펼칩니다', '지도가 펼쳐졌습니다', '계속 스크롤하면 온천 지도가 열립니다', '지도로 바로 가기'],
  ja: ['下へスクロールして入る', '障子が開きます', '畳の部屋へ進みます', '卓上の地図を広げます', '地図が広がりました', 'さらにスクロールすると温泉地図が開きます', '地図へ進む'],
  en: ['Scroll down to enter', 'The shoji doors open', 'Entering the tatami room', 'Unfolding the map on the table', 'The map is open', 'Keep scrolling to explore the onsen map', 'Skip to map']
}[lang];
const introCopy = {
  ko: ['문을 열면,<br>온천 여행이 시작됩니다.', '다다미방의 지도를 펼쳐 여행할 곳을 골라보세요.'],
  ja: ['扉の向こうに、<br>温泉の旅が始まります。', '畳の部屋で地図を広げ、旅先を選びましょう。'],
  en: ['Beyond the door,<br>the onsen journey begins.', 'Unfold the map in the tatami room and choose where to go.']
}[lang];
document.documentElement.lang = lang;
document.querySelector(`.language-switch [data-lang="${lang}"]`)?.setAttribute('aria-current', 'page');
document.querySelector('h1').innerHTML = introCopy[0];
document.querySelector('.intro__description').textContent = introCopy[1];
const destination = `../map-explore.html?lang=${lang}`;
document.querySelector('#direct').href = destination;
document.querySelector('#direct').firstChild.textContent = `${copy[6]} `;
document.querySelector('#scroll-cue span:last-child').textContent = copy[0];

const loadingManager = new THREE.LoadingManager();
const scene = new THREE.Scene();
scene.background = new THREE.Color('#251b1c');
scene.fog = new THREE.Fog('#251b1c', 11, 23);
const camera = new THREE.PerspectiveCamera(59, innerWidth / innerHeight, 0.05, 40);
const cameraBase = new THREE.Vector3(0, 1.58, 5.2);
const lookTarget = new THREE.Vector3(0, 1.38, -1.6);
let renderer;
let masterTimeline;
let isWalking = false;
let walkingBlend = 0;
let renderOnce = false;
let lowGraphics = false;
let targetProgress = 0;
let currentProgress = 0;
let navigating = false;
const clock = new THREE.Clock();
const mixerBank = [];

function box(width, height, depth, material, x, y, z, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function surfaceTexture(kind) {
  const sheet = document.createElement('canvas');
  sheet.width = sheet.height = 256;
  const c = sheet.getContext('2d');
  const bases = { wood: '#694538', darkWood: '#392821', tatami: '#afa57f', tatamiAlt: '#a79d76', plaster: '#b6a692', washi: '#e2d0af' };
  c.fillStyle = bases[kind];
  c.fillRect(0, 0, 256, 256);
  let seed = 47;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  if (kind.includes('Wood') || kind === 'wood') {
    for (let y = 2; y < 256; y += 3) {
      const offset = (random() - .5) * 7;
      c.strokeStyle = random() > .5 ? 'rgba(28,14,10,.20)' : 'rgba(255,220,170,.12)';
      c.lineWidth = random() * 1.3 + .35;
      c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(68, y + offset, 176, y - offset, 256, y + offset * .5); c.stroke();
    }
  } else if (kind.startsWith('tatami')) {
    for (let x = 0; x < 256; x += 4) {
      c.strokeStyle = x % 12 ? 'rgba(47,53,37,.15)' : 'rgba(240,226,175,.25)';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 1.5, 256); c.stroke();
    }
    for (let y = 2; y < 256; y += 7) {
      c.strokeStyle = 'rgba(61,64,42,.10)';
      c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke();
    }
  } else {
    for (let i = 0; i < 4400; i++) {
      c.fillStyle = random() > .5 ? 'rgba(91,65,42,.045)' : 'rgba(255,248,228,.07)';
      c.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1);
    }
  }
  const texture = new THREE.CanvasTexture(sheet);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function contactShadow(width, depth, x, z) {
  const canvas2d = document.createElement('canvas');
  canvas2d.width = canvas2d.height = 128;
  const c = canvas2d.getContext('2d');
  const gradient = c.createRadialGradient(64, 64, 5, 64, 64, 63);
  gradient.addColorStop(0, 'rgba(28,15,13,.43)');
  gradient.addColorStop(1, 'rgba(28,15,13,0)');
  c.fillStyle = gradient; c.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas2d), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(x, .052, z);
  scene.add(shadow);
}

// Simplified from the project's existing Japan prefecture GeoJSON, preserving
// island outlines while keeping the introduction to three source files.
const GEO_POLYGONS = [[[135.04,35.54],[134.87,35.66],[135.22,35.78],[135.31,35.69],[135.19,35.54],[135.32,35.45],[135.46,35.6],[135.53,35.38],[135.86,35.29],[135.83,34.99],[136.06,34.74],[135.76,34.73],[135.39,35.13],[134.93,35.31],[135.04,35.54]],[[130.04,33.47],[130.54,33.44],[130.35,33.14],[130.12,33.12],[130.22,32.96],[129.76,33.29],[129.85,33.56],[130.04,33.47]],[[131.11,33.18],[131.33,32.83],[131.02,32.55],[131.11,32.16],[130.4,32.12],[130.66,32.63],[130.46,32.61],[130.61,32.79],[130.41,33],[130.68,33.17],[130.99,33.02],[130.99,33.18],[131.11,33.18]],[[130.35,32.4],[129.97,32.24],[130.07,32.3],[130.02,32.53],[130.46,32.53],[130.35,32.4]],[[134.13,34.15],[133.68,34.01],[133.56,34.26],[134.13,34.4],[134.44,34.21],[134.13,34.15]],[[136.96,35.41],[137.19,35.25],[137.84,35.21],[137.48,34.67],[137.02,34.58],[137.35,34.73],[136.95,34.82],[136.98,34.96],[136.97,34.7],[136.84,34.76],[136.9,35.08],[136.77,35.02],[136.68,35.24],[136.96,35.41]],[[139.96,37.15],[140.25,37.03],[140.26,36.52],[139.73,36.2],[139.46,36.27],[139.36,36.88],[139.96,37.15]],[[138.37,35.97],[138.94,35.85],[139.13,35.56],[138.87,35.38],[138.56,35.43],[138.43,35.18],[138.25,35.33],[138.18,35.71],[138.37,35.97]],[[136.15,35.7],[136.4,35.53],[136.45,35.15],[136.37,34.9],[136.03,34.79],[135.87,34.89],[135.76,35.34],[136.17,35.57],[136.15,35.7]],[[138.64,36.41],[138.4,36.43],[138.43,36.6],[138.93,36.83],[139.1,37.06],[139.39,36.91],[139.33,36.63],[139.48,36.58],[139.36,36.38],[139.67,36.21],[139.13,36.28],[138.71,35.99],[138.58,36.17],[138.64,36.41]],[[141.48,38.98],[141.67,38.87],[141.58,38.91],[141.56,38.69],[141.44,38.67],[141.52,38.27],[141.43,38.4],[141.06,38.37],[140.79,37.77],[140.28,37.98],[140.62,38.46],[140.55,38.89],[140.83,38.96],[141.23,38.75],[141.44,38.78],[141.48,38.98]],[[138.22,35.64],[138.25,35.33],[138.44,35.18],[138.58,35.45],[139,35.4],[139.15,34.94],[138.99,34.66],[138.74,34.69],[138.78,35.02],[138.91,35.05],[138.69,35.15],[138.36,34.92],[138.23,34.59],[137.48,34.67],[137.83,35.21],[138.14,35.37],[138.22,35.64]],[[140.57,36.94],[140.81,36.83],[140.56,36.26],[140.85,35.74],[140.51,35.96],[140.15,35.85],[139.69,36.17],[140.19,36.4],[140.25,36.93],[140.46,36.79],[140.57,36.94]],[[128.15,26.72],[128.3,26.84],[128.24,26.63],[127.83,26.43],[127.92,26.3],[127.66,26.08],[127.71,26.44],[127.98,26.57],[127.88,26.71],[128.15,26.72]],[[139.87,39.12],[140.36,39.03],[140.65,38.77],[140.54,38.63],[140.62,38.46],[140.42,38.08],[140.28,38.06],[140.24,37.75],[139.63,37.89],[139.7,38.2],[139.9,38.29],[139.54,38.56],[139.87,39.12]],[[135.53,34.35],[135.73,34.23],[135.55,34.1],[135.62,33.87],[135.85,33.9],[136.01,33.72],[135.79,33.44],[135.06,33.88],[135.21,34.15],[135.07,34.3],[135.53,34.35]],[[129.38,34.42],[129.35,34.3],[129.23,34.36],[129.45,34.71],[129.38,34.42]],[[129.63,33.36],[129.79,33.37],[129.82,33.18],[130.2,32.96],[130.09,32.86],[130.34,32.86],[130.35,32.68],[130.17,32.59],[130.21,32.75],[130.08,32.79],[129.74,32.57],[129.87,32.75],[129.63,32.93],[129.68,33.1],[129.79,32.87],[130.01,32.85],[129.92,33.03],[129.55,33.22],[129.63,33.36]],[[140.88,40.51],[141,40.35],[140.65,39.39],[140.81,39.18],[140.77,38.96],[140.56,38.87],[139.87,39.12],[140.05,39.77],[139.69,40],[139.95,40.09],[139.94,40.43],[140.88,40.51]],[[134.01,35.35],[134.17,35.17],[134.4,35.25],[134.25,34.95],[134.32,34.72],[133.95,34.6],[134.05,34.58],[133.93,34.45],[133.69,34.54],[133.47,34.44],[133.29,35.1],[133.6,35.35],[133.83,35.25],[134.01,35.35]],[[130.67,33.92],[131.02,33.96],[130.96,33.83],[131.18,33.51],[130.89,33.45],[130.85,33.11],[130.68,33.17],[130.4,33],[130.34,33.2],[130.54,33.44],[130.04,33.5],[130.21,33.67],[130.4,33.6],[130.29,33.69],[130.67,33.92]],[[137.06,36.37],[137.39,36.46],[137.65,36.34],[137.59,36.01],[137.33,35.82],[137.63,35.51],[137.6,35.33],[137.19,35.25],[136.99,35.42],[136.77,35.37],[136.67,35.13],[136.41,35.22],[136.32,35.77],[136.79,35.8],[136.79,36.3],[137.06,36.37]],[[140.78,41.21],[140.91,41.55],[141.27,41.36],[141.46,41.43],[141.42,40.75],[141.68,40.45],[141.01,40.22],[140.88,40.51],[139.94,40.43],[139.86,40.61],[140.25,40.8],[140.34,41.26],[140.63,41.19],[140.73,40.83],[140.88,41.01],[141.2,40.93],[141.19,41.28],[140.78,41.21]],[[135.37,35.05],[135.74,34.8],[135.68,34.41],[135.11,34.27],[135.47,34.58],[135.37,35.05]],[[138.52,37.03],[138.7,36.74],[138.46,36.63],[138.4,36.43],[138.65,36.41],[138.58,36.17],[138.73,35.91],[138.37,35.97],[138.19,35.79],[138.14,35.37],[137.58,35.2],[137.63,35.51],[137.33,35.82],[137.59,36.01],[137.75,36.75],[137.87,36.92],[138.05,36.8],[138.52,37.03]],[[131.54,33.68],[131.74,33.46],[131.51,33.27],[131.9,33.27],[131.8,33.13],[132.08,32.93],[131.87,32.74],[131.36,32.8],[131.1,33.19],[130.99,33.02],[130.84,33.1],[130.93,33.48],[131.54,33.68]],[[136.53,35.26],[136.77,35.02],[136.53,34.61],[136.92,34.45],[136.81,34.37],[136.9,34.28],[136.66,34.35],[136.32,34.2],[136.2,34.08],[136.27,33.97],[135.97,33.72],[135.85,33.86],[136.1,34.03],[136.07,34.39],[136.23,34.49],[136.05,34.58],[136.02,34.79],[136.37,34.9],[136.53,35.26]],[[132.86,35.09],[133.32,35.01],[133.43,34.42],[132.64,34.2],[132.52,34.37],[132.14,34.24],[132.04,34.5],[132.13,34.71],[132.7,34.84],[132.86,35.09]],[[148.34,45.29],[148.66,45.54],[148.9,45.51],[148.84,45.34],[147.91,44.96],[147.66,45],[147.21,44.57],[146.87,44.45],[146.95,44.63],[147.18,44.69],[147.11,44.82],[147.87,45.23],[147.91,45.43],[148.04,45.27],[148.34,45.29]],[[141.58,45.18],[141.65,45.45],[141.94,45.52],[143,44.56],[143.56,44.25],[144.25,44.11],[144.41,43.95],[144.8,43.93],[145.33,44.35],[145.07,43.75],[145.34,43.59],[145.2,43.63],[145.39,43.29],[145.81,43.37],[144.97,42.98],[144.8,43.06],[144.77,42.93],[144.27,43],[143.92,42.87],[143.39,42.42],[143.25,41.93],[141.7,42.66],[141,42.3],[140.71,42.58],[140.47,42.59],[140.29,42.25],[140.76,42.12],[141.19,41.8],[140.97,41.71],[140.64,41.82],[140.41,41.52],[140.09,41.42],[139.98,41.61],[140.13,41.98],[139.78,42.26],[139.82,42.61],[140.52,42.99],[140.35,43.33],[141.16,43.14],[141.42,43.33],[141.33,43.73],[141.65,43.94],[141.79,44.64],[141.58,45.18]],[[145.75,44.06],[146.13,44.51],[146.58,44.46],[145.92,44.14],[145.59,43.87],[145.54,43.66],[145.43,43.72],[145.41,43.84],[145.75,44.06]],[[134.87,35.66],[135.04,35.51],[134.93,35.31],[135.39,35.13],[135.39,34.68],[135.06,34.63],[134.26,34.83],[134.27,35.02],[134.51,35.28],[134.37,35.61],[134.87,35.66]],[[134.79,34.43],[135.02,34.59],[134.95,34.27],[134.73,34.19],[134.65,34.29],[134.79,34.43]],[[139.78,36.09],[140.15,35.84],[140.51,35.96],[140.87,35.72],[140.53,35.6],[140.38,35.19],[139.89,34.9],[139.75,34.97],[139.86,35],[139.78,35.32],[140.13,35.57],[139.87,35.63],[139.78,36.09]],[[137.63,36.98],[137.76,36.67],[137.59,36.39],[137.16,36.46],[136.98,36.27],[136.79,36.3],[136.9,36.92],[137.04,36.97],[137.09,36.77],[137.32,36.76],[137.63,36.98]],[[138.94,35.85],[139.82,35.82],[139.92,35.7],[139.76,35.65],[139.79,35.53],[139.46,35.62],[139.47,35.5],[138.94,35.85]],[[139.13,36.28],[139.69,36.2],[139.89,35.78],[138.73,35.91],[139.13,36.28]],[[131.69,34.68],[131.78,34.33],[131.96,34.31],[132.07,34.47],[132.24,34.21],[132.16,33.85],[131.75,34.07],[131.27,33.92],[131.04,34.06],[130.9,33.91],[130.97,34.44],[131.31,34.38],[131.69,34.68]],[[140.28,37.98],[140.73,37.78],[140.9,37.9],[140.99,37.82],[140.97,36.97],[140.79,36.86],[140.58,36.94],[140.46,36.79],[139.9,37.15],[139.23,36.94],[139.22,37.44],[139.59,37.51],[139.71,37.86],[140.24,37.75],[140.28,37.98]],[[137.09,37.47],[137.36,37.45],[136.87,37.14],[137.06,37.11],[137.06,36.97],[136.79,36.72],[136.85,36.25],[136.67,36.07],[136.34,36.17],[136.24,36.3],[136.75,36.85],[136.72,37.33],[137.09,37.47]],[[136.24,36.3],[136.75,36.09],[136.83,35.85],[136.15,35.7],[136.17,35.57],[135.77,35.36],[135.53,35.38],[135.46,35.55],[135.72,35.48],[136.02,35.76],[136.07,35.66],[135.96,35.98],[136.24,36.3]],[[132.53,33.64],[132.94,34.14],[133.12,33.92],[133.68,34.01],[133.66,33.88],[133.19,33.79],[133.01,33.48],[132.81,33.47],[132.9,33.31],[132.62,33.18],[132.68,32.95],[132.49,32.9],[132.41,33.21],[132.56,33.22],[132.37,33.32],[132.42,33.46],[132.01,33.34],[132.53,33.64]],[[135.71,34.78],[136.06,34.74],[136.05,34.58],[136.23,34.49],[136.07,34.39],[136.1,34.03],[135.87,33.86],[135.62,33.87],[135.54,34.08],[135.73,34.23],[135.71,34.78]],[[133.24,35.55],[133.31,35.27],[133.14,35.08],[132.87,35.1],[132.7,34.84],[132.24,34.81],[131.96,34.31],[131.7,34.44],[131.69,34.68],[132.63,35.29],[132.63,35.44],[133.24,35.55]],[[141.58,40.37],[141.68,40.45],[141.82,40.27],[142,39.78],[141.95,39.59],[142.07,39.55],[141.95,39.47],[142.06,39.47],[141.85,39.03],[141.49,39],[141.44,38.78],[141.22,38.75],[140.77,38.96],[140.66,39.42],[140.9,40.21],[141.58,40.37]],[[134.37,35.61],[134.46,35.24],[134.17,35.17],[134.01,35.35],[133.83,35.25],[133.6,35.35],[133.53,35.18],[133.14,35.07],[133.31,35.27],[133.22,35.55],[133.39,35.45],[134.37,35.61]],[[134.44,34.21],[134.64,34.18],[134.63,33.86],[134.75,33.83],[134.31,33.55],[134.03,33.83],[133.66,33.87],[133.78,34.08],[134.44,34.21]],[[130.59,32.19],[131.2,31.58],[131.02,31.39],[131.13,31.28],[130.66,30.99],[130.8,31.34],[130.59,31.59],[130.76,31.56],[130.79,31.7],[130.63,31.71],[130.51,31.49],[130.67,31.27],[130.59,31.16],[130.21,31.25],[130.11,31.41],[130.33,31.56],[130.17,31.79],[130.17,32.1],[130.59,32.19]],[[130.95,30.64],[131.06,30.84],[130.87,30.34],[130.95,30.64]],[[130.52,30.23],[130.38,30.37],[130.5,30.47],[130.67,30.37],[130.52,30.23]],[[129.65,28.43],[129.69,28.53],[129.38,28.11],[129.13,28.25],[129.65,28.43]],[[139.55,38.55],[139.9,38.28],[139.68,38.17],[139.62,37.92],[139.74,37.82],[139.55,37.65],[139.59,37.51],[139.2,37.41],[139.24,36.94],[139.1,37.06],[138.7,36.74],[138.51,37.03],[138.05,36.8],[137.87,36.92],[137.76,36.77],[137.63,36.98],[138.55,37.38],[138.84,37.81],[139.37,38.11],[139.55,38.55]],[[138.24,37.8],[138.34,37.96],[138.24,38.09],[138.51,38.33],[138.43,38.09],[138.55,38.01],[138.24,37.8]],[[133.58,33.87],[134.03,33.83],[134.31,33.55],[134.18,33.24],[133.93,33.49],[133.56,33.55],[133.01,33.02],[133.02,32.72],[132.63,32.76],[132.72,32.88],[132.62,33.18],[132.9,33.32],[132.81,33.46],[133.01,33.48],[133.19,33.79],[133.58,33.87]],[[131.51,32.77],[131.89,32.75],[131.66,32.48],[131.34,31.36],[130.7,32.08],[131.11,32.16],[131.02,32.55],[131.26,32.83],[131.51,32.77]],[[139.13,35.67],[139.47,35.5],[139.53,35.64],[139.79,35.53],[139.63,35.47],[139.68,35.14],[139.44,35.32],[139.03,35.15],[138.92,35.41],[139.13,35.67]]];
let fullAtlas;
function paperTexture(index) {
  if (!fullAtlas) {
    fullAtlas = document.createElement('canvas');
    fullAtlas.width = 1536;
    fullAtlas.height = 576;
    const c = fullAtlas.getContext('2d');
    c.fillStyle = '#dfcfaf';
    c.fillRect(0, 0, 1536, 576);
    c.strokeStyle = 'rgba(92,65,48,.14)';
    c.lineWidth = 1;
    for (let x = 0; x < 1536; x += 48) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 576); c.stroke(); }
    for (let y = 0; y < 576; y += 48) { c.beginPath(); c.moveTo(0, y); c.lineTo(1536, y); c.stroke(); }
    c.strokeStyle = 'rgba(96,68,53,.45)';
    c.lineWidth = 2;
    c.strokeRect(24, 24, 1488, 528);
    // Short irregular fibres and fine pigment specks make the sheet read as
    // stiff handmade washi rather than a flat UI panel.
    let grain = 8921;
    const rand = () => ((grain = (grain * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let n = 0; n < 14000; n++) {
      const x = rand() * 1536, y = rand() * 576;
      c.strokeStyle = rand() > .5 ? 'rgba(100,72,47,.055)' : 'rgba(255,251,229,.11)';
      c.lineWidth = .4 + rand() * .7;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 2 + rand() * 9, y + (rand() - .5) * 3);
      c.stroke();
    }
    for (let x = 384; x < 1536; x += 384) {
      const fold = c.createLinearGradient(x - 10, 0, x + 10, 0);
      fold.addColorStop(0, 'rgba(75,48,29,0)');
      fold.addColorStop(.47, 'rgba(75,48,29,.11)');
      fold.addColorStop(.53, 'rgba(255,250,223,.16)');
      fold.addColorStop(1, 'rgba(255,250,223,0)');
      c.fillStyle = fold;
      c.fillRect(x - 10, 0, 20, 576);
    }
    // Geographic contours continue across the four hinged faces.
    function island(points) {
      c.beginPath();
      points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
      c.closePath();
      c.fillStyle = '#817f65';
      c.fill();
      c.strokeStyle = '#615b49';
      c.lineWidth = 1.2;
      c.stroke();
    }
    const project = ([lon, lat]) => [86 + (lon - 128) * 76, 510 - (lat - 30) * 27];
    for (const polygon of GEO_POLYGONS) {
      island(polygon.map(project));
    }
    c.fillStyle = '#9d5143';
    c.strokeStyle = '#f0ddbb';
    c.lineWidth = 4;
    const stops = [[130.5,33.5],[134.2,33.8],[135.7,34.7],[139.6,35.7],[140.8,38.3],[142.5,43.2]].map(project);
    for (const [x, y] of stops) { c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 2); c.fill(); c.stroke(); }
    c.fillStyle = '#4f3d33';
    c.textAlign = 'center';
    c.font = 'bold 33px Georgia, serif';
    c.fillText('日 本 温 泉 案 内', 768, 85);
    c.font = '24px Georgia, serif';
    for (const [label, x, y] of [['九州',225,393],['四国',550,448],['近畿',664,438],['関東',1020,345],['北海道',1250,235]]) c.fillText(label, x, y);
    c.font = '18px Georgia, serif';
    c.fillText('温泉をめぐる旅', 768, 518);
  }
  const panelCanvas = document.createElement('canvas');
  panelCanvas.width = 384;
  panelCanvas.height = 576;
  panelCanvas.getContext('2d').drawImage(fullAtlas, index * 384, 0, 384, 576, 0, 0, 384, 576);
  const texture = new THREE.CanvasTexture(panelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function buildProceduralScene() {
  const wood = new THREE.MeshStandardMaterial({ map: surfaceTexture('wood'), roughness: .84 });
  const darkWood = new THREE.MeshStandardMaterial({ map: surfaceTexture('darkWood'), roughness: .88 });
  const tatami = new THREE.MeshStandardMaterial({ map: surfaceTexture('tatami'), roughness: .98 });
  const tatamiAlt = new THREE.MeshStandardMaterial({ map: surfaceTexture('tatamiAlt'), roughness: .98 });
  const trim = new THREE.MeshStandardMaterial({ color: '#4b4039', roughness: .92 });
  const plaster = new THREE.MeshStandardMaterial({ map: surfaceTexture('plaster'), roughness: 1 });
  const washi = new THREE.MeshStandardMaterial({ map: surfaceTexture('washi'), roughness: 1, transparent: true, opacity: .72, side: THREE.DoubleSide });
  scene.add(new THREE.HemisphereLight('#f2d7ad', '#35282a', 1.45));
  const lampLight = new THREE.PointLight('#ffbb74', 27, 8, 2);
  lampLight.position.set(-2.5, 2.25, -5.5);
  scene.add(lampLight);
  const doorwayGlow = new THREE.PointLight('#ffd3a3', 16, 5, 2);
  doorwayGlow.position.set(0, 1.8, -.8);
  scene.add(doorwayGlow);

  // The front threshold is centred at x=0, so the entrance reads head-on.
  box(9, .14, 15, darkWood, 0, -.15, -1.2);
  box(8.5, .075, 10.1, trim, 0, -.04, -4.65);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 4; col++) {
      const x = (col - 1.5) * 2.05;
      const z = -8.55 + row * 1.95;
      box(1.95, .027, 1.84, (row + col) % 2 ? tatami : tatamiAlt, x, .018, z);
      box(1.99, .009, .045, trim, x, .036, z + .91);
    }
  }
  box(8.7, 3.1, .12, plaster, 0, 1.55, -9.85);
  box(.12, 3.1, 10, plaster, -4.35, 1.55, -4.75);
  box(.12, 3.1, 10, plaster, 4.35, 1.55, -4.75);
  box(8.8, .25, 10.2, darkWood, 0, 3.16, -4.75);
  for (const x of [-4.25, -2.15, 2.15, 4.25]) {
    box(.17, 3.2, .18, wood, x, 1.6, -9.78);
    box(.17, 3.2, .2, wood, x, 1.6, .05);
  }
  for (const z of [-9.8, -5.0, .05]) box(8.8, .16, .18, wood, 0, 3.08, z);
  // Shoji panels slide in their upper and lower wooden tracks.
  box(4.4, .08, .24, darkWood, 0, .07, .16);
  box(4.4, .09, .24, darkWood, 0, 3.02, .16);
  function makeDoor(x) {
    const group = new THREE.Group();
    group.position.set(x, 1.56, .1);
    box(2.06, 2.86, .055, washi, 0, 0, 0, group);
    for (const h of [-1.41, 1.41]) box(2.12, .105, .1, wood, 0, h, 0, group);
    for (const v of [-1.01, 1.01]) box(.095, 2.87, .11, wood, v, 0, 0, group);
    for (const v of [-.5, 0, .5]) box(.035, 2.78, .066, wood, v, 0, .04, group);
    for (const h of [-.83, -.28, .28, .83]) box(2.05, .035, .065, wood, 0, h, .04, group);
    box(.08, .25, .028, trim, x < 0 ? .85 : -.85, -.12, .092, group);
    scene.add(group);
    return group;
  }
  // A narrow seam of warm light makes the first scroll response legible.
  const doorLeft = makeDoor(-1.12);
  const doorRight = makeDoor(1.12);

  // A low chabudai sits fully inside the room, with its map visible from entry.
  const table = new THREE.Group();
  table.position.set(0, 0, -5.0);
  scene.add(table);
  contactShadow(3.7, 2.25, 0, -5.0);
  box(3.02, .14, 1.65, wood, 0, .67, 0, table);
  box(2.85, .035, 1.49, new THREE.MeshStandardMaterial({ color: '#654336', roughness: .72 }), 0, .75, 0, table);
  for (const x of [-1.21, 1.21]) for (const z of [-.57, .57]) box(.17, .57, .17, darkWood, x, .32, z, table);
  // Lamp shade and tokonoma give the inner room a warm focal point.
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(.31, .39, .54, 8, 1, true), new THREE.MeshStandardMaterial({ color: '#f1c887', emissive: '#d88942', emissiveIntensity: .34, side: THREE.DoubleSide }));
  shade.position.set(-2.55, 2.35, -8.6); scene.add(shade);
  box(.06, .5, .06, wood, -2.55, 2.76, -8.6);
  // A project-owned generated photograph supplies the garden's depth. If the
  // asset is absent in a copied three-file demo, the warm fallback panel stays.
  const garden = new THREE.Mesh(new THREE.PlaneGeometry(3.42, 1.79), new THREE.MeshBasicMaterial({ color: '#625542' }));
  garden.position.set(0, 1.85, -9.68);
  scene.add(garden);
  box(3.57, .09, .09, darkWood, 0, 2.78, -9.61);
  box(3.57, .09, .09, darkWood, 0, .91, -9.61);
  for (const x of [-1.78, 1.78]) box(.09, 1.87, .09, darkWood, x, 1.85, -9.61);
  new THREE.TextureLoader(loadingManager).load('../images/onsen-room-v2.webp', texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.repeat.set(.64, .53);
    texture.offset.set(.18, .44);
    garden.material.map = texture;
    garden.material.color.set('#ffffff');
    garden.material.needsUpdate = true;
    renderer.compile(scene, camera);
    renderOnce = true;
  });

  const map = new THREE.Group();
  map.position.set(-.29, .776, 0);
  table.add(map);
  const folds = [];
  let parent = map;
  const panelWidth = .58;
  const paperEdge = new THREE.MeshStandardMaterial({ color: '#e2d1ad', roughness: 1, side: THREE.DoubleSide });
  const paperBack = new THREE.MeshStandardMaterial({ map: surfaceTexture('washi'), roughness: 1, side: THREE.FrontSide });
  for (let i = 0; i < 4; i++) {
    const hinge = new THREE.Group();
    if (i > 0) hinge.position.x = panelWidth;
    parent.add(hinge);
    const panel = new THREE.Group();
    panel.position.x = panelWidth / 2;
    hinge.add(panel);
    box(panelWidth, .005, .95, paperEdge, 0, 0, 0, panel);
    const sheetFace = new THREE.PlaneGeometry(panelWidth - .004, .946);
    const art = new THREE.Mesh(sheetFace, new THREE.MeshStandardMaterial({ map: paperTexture(i), roughness: 1, side: THREE.FrontSide }));
    art.rotation.x = -Math.PI / 2;
    art.position.y = .003;
    panel.add(art);
    const back = new THREE.Mesh(sheetFace, paperBack);
    back.rotation.x = Math.PI / 2;
    back.position.y = -.003;
    panel.add(back);
    if (i > 0) {
      hinge.rotation.z = i % 2 ? Math.PI - .09 : -Math.PI + .09;
      folds.push(hinge);
    }
    parent = hinge;
  }
  return { doorLeft, doorRight, folds, map, table };
}

// Replace the returned scene bindings with GLB nodes and add an AnimationMixer
// here when production models are available; the master timeline stays intact.
function bindAnimation({ doorLeft, doorRight, folds, map }) {
  const compact = innerWidth < 640;
  const tl = gsap.timeline({ paused: true });
  tl.addLabel('doors', 0)
    .to(doorLeft.position, { x: -2.84, duration: 1.6, ease: 'power2.inOut' }, 'doors')
    .to(doorRight.position, { x: 2.84, duration: 1.6, ease: 'power2.inOut' }, 'doors')
    .to(intro, { opacity: 0, duration: .85, ease: 'power2.inOut' }, 'doors+=.22')
    .addLabel('walk', .96)
    .to(cameraBase, { z: compact ? -2.35 : -2.72, y: compact ? 1.94 : 1.53, duration: 1.87, ease: 'power2.inOut' }, 'walk')
    .to(lookTarget, { z: -5.0, y: 1.05, duration: 1.17, ease: 'power2.inOut' }, 'walk+=.7')
    .addLabel('approach', 2.83)
    .to(cameraBase, { z: -3.0, y: 2.85, duration: 1.28, ease: 'power2.inOut' }, 'approach')
    .to(lookTarget, { z: -5.0, y: .75, duration: 1.28, ease: 'power2.inOut' }, 'approach')
    .addLabel('unfold', 3.93);
  // The first two opposing creases open as a pair. Their angles cancel, so
  // the next leaf stays above the tabletop while the map expands.
  tl.to(folds[0].rotation, { z: 0, duration: 1.25, ease: 'sine.inOut' }, 'unfold')
    .to(folds[1].rotation, { z: 0, duration: 1.25, ease: 'sine.inOut' }, 'unfold')
    .to(map.position, { x: -.87, duration: 1.25, ease: 'sine.inOut' }, 'unfold')
    .to(folds[2].rotation, { z: 0, duration: 1.1, ease: 'sine.inOut' }, 'unfold+=1.25')
    .to(map.position, { x: -1.16, duration: 1.1, ease: 'sine.inOut' }, 'unfold+=1.25');
  tl.addLabel('mapOpen', 6.8)
    .to(mapReveal, { opacity: 1, duration: .22, ease: 'power2.inOut' }, 'mapOpen');
  return tl;
}

function goToMap() {
  try {
    sessionStorage.setItem('onsen-map-language', lang);
    sessionStorage.setItem('onsen-intro-unfolded', '1');
    sessionStorage.removeItem('onsen-desk-entry');
  } catch { /* Storage can be unavailable in a private window. */ }
}
document.querySelector('#direct').addEventListener('click', goToMap);

function scrollProgress() {
  const scrollable = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  return THREE.MathUtils.clamp(scrollY / scrollable, 0, 1);
}

function syncScroll() {
  targetProgress = scrollProgress();
  renderOnce = true;
}

function restoreNearMap() {
  scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * .92);
  syncScroll();
  currentProgress = targetProgress;
  masterTimeline?.progress(currentProgress);
  if (masterTimeline) updateStage(currentProgress);
  renderOnce = true;
}

function updateStage(progress) {
  const time = masterTimeline.time();
  const phase = time < .96 ? 0 : time < 2.83 ? 1 : time < 3.93 ? 2 : 3;
  const nextCaption = time >= 6.28 ? copy[4] : [copy[1], copy[2], copy[2], copy[3]][phase];
  if (caption.textContent !== nextCaption) caption.textContent = nextCaption;
  progressLabel.textContent = `0${phase + 1} / 04`;
  sceneUi.hidden = progress < .11 || time >= 6.8;
  isWalking = time >= .96 && time < 3.55 && Math.abs(targetProgress - currentProgress) > .001;
}

function resize() {
  if (!renderer) return;
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < 640 ? 100 : innerHeight > innerWidth ? innerWidth < 900 ? 68 : 64 : 59;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
  renderOnce = true;
}

function frame() {
  requestAnimationFrame(frame);
  const delta = Math.min(clock.getDelta(), .05);
  const elapsed = clock.getElapsedTime();
  if (masterTimeline) {
    const staticMode = reducedMotion.matches || lowGraphics || navigator.connection?.saveData;
    const nextProgress = staticMode
      ? (targetProgress < .18 ? 0 : 1)
      : currentProgress + (targetProgress - currentProgress) * (1 - Math.exp(-delta * 12));
    if (Math.abs(nextProgress - currentProgress) > .00005) {
      currentProgress = nextProgress;
      masterTimeline.progress(currentProgress);
      updateStage(currentProgress);
      renderOnce = true;
    }
    if (targetProgress >= .999 && currentProgress >= .995 && !navigating) {
      navigating = true;
      goToMap();
      try { sessionStorage.setItem('onsen-intro-return', '1'); } catch {}
      location.assign(destination);
      return;
    }
  }
  walkingBlend += ((isWalking ? 1 : 0) - walkingBlend) * (1 - Math.exp(-delta * 8));
  camera.position.copy(cameraBase);
  camera.position.y += Math.sin(elapsed * 10.5) * .012 * walkingBlend;
  camera.lookAt(lookTarget);
  for (const mixer of mixerBank) mixer.update(delta);
  if (renderOnce || walkingBlend > .001) {
    renderer.render(scene, camera);
    renderOnce = false;
  }
}

async function init() {
  loadingManager.itemStart('procedural-scene');
  loadingManager.onLoad = () => {
    status.textContent = '';
    document.documentElement.classList.add('ready');
  };
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    const gl = renderer.getContext();
    const gpuInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const gpuName = gpuInfo ? String(gl.getParameter(gpuInfo.UNMASKED_RENDERER_WEBGL)) : '';
    lowGraphics = /SwiftShader|llvmpipe|software/i.test(gpuName) && !params.has('force3d');
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    const nodes = buildProceduralScene();
    masterTimeline = bindAnimation(nodes);
    resize();
    camera.position.copy(cameraBase);
    camera.lookAt(lookTarget);
    renderer.compile(scene, camera);
    renderer.render(scene, camera);
    loadingManager.itemEnd('procedural-scene');
    syncScroll();
    updateStage(0);
    try {
      if (sessionStorage.getItem('onsen-intro-return') === '1') {
        sessionStorage.removeItem('onsen-intro-return');
        requestAnimationFrame(() => {
          restoreNearMap();
        });
      }
    } catch {}
    requestAnimationFrame(frame);
  } catch (error) {
    console.error('Ryokan scene failed to initialize:', error);
    status.textContent = '3D 공간을 열 수 없습니다. 지도로 바로 이동할 수 있습니다.';
    addEventListener('scroll', () => {
      if (scrollProgress() > .95 && !navigating) {
        navigating = true;
        goToMap();
        location.assign(destination);
      }
    }, { passive: true });
  }
}

addEventListener('resize', resize, { passive: true });
addEventListener('scroll', syncScroll, { passive: true });
addEventListener('resize', syncScroll, { passive: true });
addEventListener('pageshow', event => {
  navigating = false;
  if (event.persisted) {
    requestAnimationFrame(() => requestAnimationFrame(restoreNearMap));
    setTimeout(restoreNearMap, 120);
  } else syncScroll();
}, { passive: true });
init();
