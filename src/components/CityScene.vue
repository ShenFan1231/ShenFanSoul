<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { TrafficMode } from '../types'

const props = defineProps<{ mode: TrafficMode; intensity: number; theme: 'dark' | 'light' }>()
const emit = defineEmits<{ select: [district: string] }>()
const host = ref<HTMLDivElement>()

let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let controls: OrbitControls
let frame = 0
let resizeObserver: ResizeObserver
const roadMaterials: THREE.MeshStandardMaterial[] = []
const buildingMaterials: THREE.MeshStandardMaterial[] = []
const edgeMaterials: THREE.LineBasicMaterial[] = []
const vehicles: Vehicle[] = []
const selectable: THREE.Object3D[] = []
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const animationMixers: THREE.AnimationMixer[] = []
let previousFrameTime = performance.now()
let incidentRing: THREE.Mesh
let busLine: THREE.Line
let groundMaterial: THREE.MeshStandardMaterial
let grid: THREE.GridHelper

interface Vehicle {
  group: THREE.Group
  axis: 'x' | 'z'
  direction: number
  lane: number
  progress: number
  speed: number
  bus: boolean
}

const districtNames = ['滨江片区', '中央商务区', '科创片区', '北站枢纽', '云港片区']

function seeded(index: number) {
  const x = Math.sin(index * 999.31) * 43758.5453
  return x - Math.floor(x)
}

function addRoad(x: number, z: number, width: number, depth: number, district: string) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x11181b,
    roughness: 0.72,
    metalness: 0.12,
  })
  buildingMaterials.push(material)
  const road = new THREE.Mesh(new THREE.BoxGeometry(width, 0.16, depth), material)
  road.position.set(x, 0.08, z)
  road.userData.district = district
  roadMaterials.push(material)
  selectable.push(road)
  scene.add(road)
}

function addLaneGlow(axis: 'x' | 'z', offset: number, cross: number) {
  const points = axis === 'x'
    ? [new THREE.Vector3(-42, 0.21, cross + offset), new THREE.Vector3(42, 0.21, cross + offset)]
    : [new THREE.Vector3(cross + offset, 0.21, -42), new THREE.Vector3(cross + offset, 0.21, 42)]
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x406064, transparent: true, opacity: 0.42 }))
  scene.add(line)
}

function createBuilding(x: number, z: number, w: number, d: number, h: number, index: number) {
  const palette = [0x294148, 0x30464b, 0x35474d, 0x253f46]
  const material = new THREE.MeshStandardMaterial({
    color: palette[index % palette.length],
    roughness: 0.42,
    metalness: 0.55,
    emissive: index % 4 === 0 ? 0x0b2629 : 0x081214,
    emissiveIntensity: 0.68,
  })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.position.set(x, h / 2 + 0.2, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.district = districtNames[index % districtNames.length]
  selectable.push(mesh)
  scene.add(mesh)

  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x5c7d80, transparent: true, opacity: 0.54 })
  edgeMaterials.push(edgeMaterial)
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    edgeMaterial,
  )
  edges.position.copy(mesh.position)
  scene.add(edges)

  if (h > 10 && index % 3 === 0) {
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8),
      new THREE.MeshBasicMaterial({ color: 0x72f1d0 }),
    )
    beacon.position.set(x, h + 1, z)
    scene.add(beacon)
  }

  const windowCount = Math.min(6, Math.max(2, Math.floor(h / 3)))
  const windows = new THREE.Group()
  const windowMaterial = new THREE.MeshBasicMaterial({
    color: index % 5 === 0 ? 0xf4c86b : 0x56b8ad,
    transparent: true,
    opacity: 0.7,
  })
  for (let floor = 0; floor < windowCount; floor += 1) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.68, 0.1), windowMaterial)
    strip.position.set(x, 1.5 + floor * (h - 2) / windowCount, z + d / 2 + 0.006)
    windows.add(strip)
  }
  scene.add(windows)
}

function createVehicle(index: number): Vehicle {
  const bus = index % 11 === 0
  const color = bus ? 0x38a8ff : [0xdce7e7, 0x42d9b2, 0xf2bd5a, 0xd76155][index % 4]
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(bus ? 2.1 : 1.15, bus ? 0.6 : 0.46, bus ? 0.72 : 0.62),
    new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.4 }),
  )
  body.position.y = bus ? 0.62 : 0.48
  group.add(body)
  const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xeafcff })
  const light = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.42), lightMaterial)
  light.position.set(bus ? 1.08 : 0.61, bus ? 0.64 : 0.5, 0)
  group.add(light)
  scene.add(group)
  const axis = index % 2 === 0 ? 'x' : 'z'
  const roadIndex = index % 4
  const roads = [-24, -8, 8, 24]
  return {
    group,
    axis,
    direction: index % 3 === 0 ? -1 : 1,
    lane: roads[roadIndex] + (index % 2 === 0 ? 1.15 : -1.15),
    progress: seeded(index + 70) * 84 - 42,
    speed: (0.035 + seeded(index + 120) * 0.055) * (bus ? 0.7 : 1),
    bus,
  }
}

function addRoundabout() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(5.2, 6.4, 64),
    new THREE.MeshStandardMaterial({ color: 0x182225, roughness: 0.7, metalness: 0.2, side: THREE.DoubleSide }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.18
  scene.add(ring)

  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(4.7, 4.7, 0.5, 48),
    new THREE.MeshStandardMaterial({ color: 0x18372f, roughness: 0.85 }),
  )
  island.position.y = 0.2
  scene.add(island)
  for (let i = 0; i < 10; i += 1) {
    const tree = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.6, 7),
      new THREE.MeshStandardMaterial({ color: 0x2c7560, roughness: 0.9 }),
    )
    const angle = i / 10 * Math.PI * 2
    tree.position.set(Math.cos(angle) * 3, 1.05, Math.sin(angle) * 3)
    scene.add(tree)
  }
}

function createIncident() {
  incidentRing = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.2, 48),
    new THREE.MeshBasicMaterial({ color: 0xff675f, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  )
  incidentRing.rotation.x = -Math.PI / 2
  incidentRing.position.set(24, 0.32, -8)
  scene.add(incidentRing)

  const points = [
    new THREE.Vector3(-42, 0.3, -22.8), new THREE.Vector3(-12, 0.3, -22.8),
    new THREE.Vector3(-7, 0.3, -8.8), new THREE.Vector3(8, 0.3, -8.8),
    new THREE.Vector3(9.1, 0.3, 8), new THREE.Vector3(42, 0.3, 8),
  ]
  busLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x3aaeff, transparent: true, opacity: 0.9 }),
  )
  scene.add(busLine)
}

async function loadCharacter() {
  const loader = new GLTFLoader()
  try {
    const gltf = await loader.loadAsync(new URL('../glb/matilda.glb', import.meta.url).href)
    const character = gltf.scene
    const initialBox = new THREE.Box3().setFromObject(character)
    const initialSize = initialBox.getSize(new THREE.Vector3())
    const targetHeight = 1.8
    const scale = initialSize.y > 0 ? targetHeight / initialSize.y : 1
    character.scale.setScalar(scale)

    const box = new THREE.Box3().setFromObject(character)
    const center = box.getCenter(new THREE.Vector3())
    character.position.set(-center.x, -box.min.y, -center.z)
    character.name = 'MatildaCharacter'

    character.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true
      object.receiveShadow = true
      object.frustumCulled = true
    })
    const anchor = new THREE.Group()
    anchor.name = 'MatildaCharacterAnchor'
    anchor.position.set(0, 0.51, 14)
    anchor.rotation.y = Math.PI * 0.15
    anchor.add(character)
    scene.add(anchor)

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.54, 0.1, 28),
      new THREE.MeshStandardMaterial({
        color: 0x17443c,
        emissive: 0x0b6b58,
        emissiveIntensity: 0.55,
        roughness: 0.42,
        metalness: 0.48,
      }),
    )
    pedestal.position.set(0, 0.46, 14)
    pedestal.receiveShadow = true
    scene.add(pedestal)

    const characterLight = new THREE.PointLight(0xffe2ba, 3.5, 6, 1.8)
    characterLight.position.set(0, 3.2, 14)
    scene.add(characterLight)

    if (gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(anchor)
      mixer.clipAction(gltf.animations[0]).play()
      animationMixers.push(mixer)
    }
  } catch (error) {
    console.error('Unable to load Matilda character model.', error)
  }
}

function initScene() {
  if (!host.value) return
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x070b0d)
  scene.fog = new THREE.FogExp2(0x070b0d, 0.0105)

  camera = new THREE.PerspectiveCamera(42, host.value.clientWidth / host.value.clientHeight, 0.1, 240)
  camera.position.set(48, 52, 55)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7))
  renderer.setSize(host.value.clientWidth, host.value.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.5
  host.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.045
  controls.minDistance = 35
  controls.maxDistance = 105
  controls.maxPolarAngle = Math.PI * 0.46
  controls.target.set(0, 1.5, 0)
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.22

  scene.add(new THREE.HemisphereLight(0xa7d8d4, 0x172226, 2.25))
  const sun = new THREE.DirectionalLight(0xd9f4f0, 3.7)
  sun.position.set(24, 50, 18)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -55
  sun.shadow.camera.right = 55
  sun.shadow.camera.top = 55
  sun.shadow.camera.bottom = -55
  scene.add(sun)

  groundMaterial = new THREE.MeshStandardMaterial({ color: 0x111b1d, roughness: 0.92, metalness: 0.08 })
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    groundMaterial,
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  grid = new THREE.GridHelper(100, 50, 0x234b4b, 0x17272a)
  grid.position.y = 0.025
  ;(grid.material as THREE.Material).transparent = true
  ;(grid.material as THREE.Material).opacity = 0.22
  scene.add(grid)

  const roads = [-24, -8, 8, 24]
  roads.forEach((position, index) => {
    addRoad(0, position, 88, 4.8, districtNames[index])
    addRoad(position, 0, 4.8, 88, districtNames[index])
    addLaneGlow('x', 0, position)
    addLaneGlow('z', 0, position)
  })

  let buildingIndex = 0
  for (let bx = -3; bx <= 3; bx += 1) {
    for (let bz = -3; bz <= 3; bz += 1) {
      if (Math.abs(bx) === 0 || Math.abs(bz) === 0) continue
      const x = bx * 8 + (seeded(buildingIndex) - 0.5) * 1.2
      const z = bz * 8 + (seeded(buildingIndex + 1) - 0.5) * 1.2
      const h = 3.5 + seeded(buildingIndex + 2) * (Math.abs(bx) + Math.abs(bz) < 4 ? 13 : 7)
      createBuilding(x, z, 3.2 + seeded(buildingIndex + 3) * 2, 3.2 + seeded(buildingIndex + 4) * 2, h, buildingIndex)
      buildingIndex += 1
    }
  }

  addRoundabout()
  createIncident()
  for (let i = 0; i < 52; i += 1) vehicles.push(createVehicle(i))
  void loadCharacter()
  updateMode()
  updateTheme()

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(host.value)
  animate()
}

function onResize() {
  if (!host.value || !renderer || !camera) return
  camera.aspect = host.value.clientWidth / host.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(host.value.clientWidth, host.value.clientHeight)
}

function onPointerDown(event: PointerEvent) {
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hit = raycaster.intersectObjects(selectable, false)[0]
  if (hit?.object.userData.district) {
    emit('select', hit.object.userData.district)
    controls.autoRotate = false
    const target = hit.point.clone()
    target.y = 1.5
    controls.target.lerp(target, 0.72)
  }
}

function updateMode() {
  if (!scene) return
  const light = props.theme === 'light'
  const colors: Record<TrafficMode, number> = light
    ? { overview: 0x899b9d, congestion: 0x9c7772, transit: 0x7894a2, incident: 0x9d746f }
    : { overview: 0x11191c, congestion: 0x271616, transit: 0x101c24, incident: 0x251516 }
  roadMaterials.forEach((material, index) => {
    material.color.set(index % 3 === 0 && props.mode === 'congestion' ? (light ? 0xa76b62 : 0x4c211b) : colors[props.mode])
    material.emissive.set(light ? 0x101819 : props.mode === 'transit' ? 0x071724 : props.mode === 'congestion' ? 0x190706 : 0x020708)
    material.emissiveIntensity = light ? 0.08 : props.mode === 'overview' ? 0.2 : 0.7
  })
  if (incidentRing) incidentRing.visible = props.mode === 'overview' || props.mode === 'incident' || props.mode === 'congestion'
  if (busLine) busLine.visible = props.mode === 'overview' || props.mode === 'transit'
  vehicles.forEach((vehicle) => {
    vehicle.group.visible = props.mode !== 'transit' || vehicle.bus
  })
  if (props.mode === 'incident') {
    controls.autoRotate = false
    controls.target.set(24, 1.5, -8)
  } else {
    controls.autoRotate = true
    controls.target.lerp(new THREE.Vector3(0, 1.5, 0), 0.6)
  }
}

function updateTheme() {
  if (!scene || !renderer) return
  const light = props.theme === 'light'
  const background = light ? 0xdfe8e8 : 0x070b0d
  scene.background = new THREE.Color(background)
  scene.fog = new THREE.FogExp2(background, light ? 0.008 : 0.0105)
  renderer.toneMappingExposure = light ? 1.12 : 1.5
  groundMaterial?.color.set(light ? 0xbccaca : 0x111b1d)
  buildingMaterials.forEach((material, index) => {
    const lightPalette = [0x8ca3a6, 0x9aaeb0, 0x7f989b, 0xa6b7b8]
    const darkPalette = [0x294148, 0x30464b, 0x35474d, 0x253f46]
    material.color.set((light ? lightPalette : darkPalette)[index % 4])
    material.emissive.set(light ? 0x182426 : index % 4 === 0 ? 0x0b2629 : 0x081214)
    material.emissiveIntensity = light ? 0.16 : 0.68
  })
  edgeMaterials.forEach((material) => {
    material.color.set(light ? 0x466c70 : 0x5c7d80)
    material.opacity = light ? 0.72 : 0.54
  })
  if (grid) {
    ;(grid.material as THREE.Material).opacity = light ? 0.32 : 0.22
  }
  updateMode()
}

function animate() {
  frame = requestAnimationFrame(animate)
  const currentFrameTime = performance.now()
  const time = currentFrameTime * 0.001
  const delta = Math.min((currentFrameTime - previousFrameTime) / 1000, 0.05)
  previousFrameTime = currentFrameTime
  animationMixers.forEach((mixer) => mixer.update(delta))
  const trafficFactor = 0.45 + props.intensity * 0.65
  vehicles.forEach((vehicle) => {
    vehicle.progress += vehicle.speed * vehicle.direction * trafficFactor
    if (vehicle.progress > 43) vehicle.progress = -43
    if (vehicle.progress < -43) vehicle.progress = 43
    if (vehicle.axis === 'x') {
      vehicle.group.position.set(vehicle.progress, 0, vehicle.lane)
      vehicle.group.rotation.y = vehicle.direction < 0 ? Math.PI : 0
    } else {
      vehicle.group.position.set(vehicle.lane, 0, vehicle.progress)
      vehicle.group.rotation.y = vehicle.direction < 0 ? -Math.PI / 2 : Math.PI / 2
    }
  })
  if (incidentRing?.visible) {
    const pulse = 1 + ((time * 0.65) % 1) * 2.2
    incidentRing.scale.setScalar(pulse)
    ;(incidentRing.material as THREE.MeshBasicMaterial).opacity = 1 - ((time * 0.65) % 1)
  }
  controls.update()
  renderer.render(scene, camera)
}

watch(() => props.mode, updateMode)
watch(() => props.theme, updateTheme)

onMounted(initScene)
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  renderer?.domElement.removeEventListener('pointerdown', onPointerDown)
  controls?.dispose()
  animationMixers.forEach((mixer) => mixer.stopAllAction())
  animationMixers.length = 0
  renderer?.dispose()
  scene?.traverse((object) => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose()
    if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose())
    else mesh.material?.dispose()
  })
})
</script>

<template>
  <div ref="host" class="city-scene" aria-label="三维城市交通态势场景" />
</template>
