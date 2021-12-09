import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import GUI from 'lil-gui'

import boilerVertexShader from './shaders/vertex.glsl'
import boilerVertexParticles from './shaders/vertexParticles.glsl'
import boilerFragmentShader from './shaders/fragment.glsl'
import fragmentSimulation from './shaders/fragmentSimulation.glsl'




const WIDTH=512

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x3a3b3c) //0x132020

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 3
camera.position.y = 2 
camera.position.z = 3
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true


/**
 * Shader Mats
 */
 

let shaderMaterial = null

shaderMaterial= new THREE.ShaderMaterial({
    vertexShader:boilerVertexParticles,
    fragmentShader:boilerFragmentShader,
    uniforms:{
        positionTexture:{value:null},
        uTime:{value:0},
        uFrequency:{value:5.0},
        uAmplitude:{value:1.0},
        uMaxDistance:{value:2.0}
    }


}) 


//Loaders

 const gltfLoader = new GLTFLoader()

 function loadGLTFModel(url){
    return new Promise(resolve =>{
        gltfLoader.load(url,resolve)
  })
}


let trex= null


const p1 = loadGLTFModel('models/Trex.glb')
.then(result=>{trex = result.scene.children[0]}) 

let modelVertexNumber = 0
let modelPos = 0
let positionVariable = null
let gpuCompute = null

Promise.all([p1]).then( ()=>{
    

    trex.geometry.scale(0.05,0.05,0.05)
    trex.geometry.translate(0,0,-1)
    modelPos = trex.geometry.attributes.position.array
    modelVertexNumber = modelPos.length/3
    

}).then(()=>{
//GPGPU a.k.a FBO

gpuCompute = new GPUComputationRenderer( WIDTH, WIDTH, renderer )
let dtPosition= gpuCompute.createTexture()

//Fill Positions
let arr = dtPosition.image.data

for (let i = 0; i<arr.length; i=i+4){

    let rand = Math.floor(Math.random() * modelVertexNumber)

    let x = modelPos[3* rand]
    let y = modelPos[3* rand + 1]
    let z = modelPos[3* rand + 2]

    arr[i]=x
    arr[i+1]=y
    arr[i+2]=z
    arr[i+3] = 1
}


positionVariable = gpuCompute.addVariable('texturePosition',fragmentSimulation, dtPosition)

positionVariable.material.uniforms['uTime'] = {value:0}

// positionVariable.material.uniforms['uFrequency'] = {value:5.0} //5.0
// positionVariable.material.uniforms['uAmplitude'] = {value:0.5} //0.0005
// positionVariable.material.uniforms['maxDistance'] = {value:4.0} //0.0005

positionVariable.wrapS = THREE.RepeatWrapping
positionVariable.wrapT = THREE.RepeatWrapping

gpuCompute.init()
    
//GUI
const gui = new GUI()


// gui.add(positionVariable.material.uniforms.uFrequency, 'value').min(0).max(20).step(0.0001).name('Frequency')
// gui.add(positionVariable.material.uniforms.uAmplitude, 'value').min(0).max(20).step(0.0001).name('Amplitude')
// gui.add(positionVariable.material.uniforms.maxDistance, 'value').min(0).max(20).step(0.0001).name('maxDistance')

gui.add(shaderMaterial.uniforms.uFrequency,'value').min(0).max(20).step(0.0001).name('Frequency')
gui.add(shaderMaterial.uniforms.uAmplitude,'value').min(0).max(20).step(0.0001).name('Amplitude')
gui.add(shaderMaterial.uniforms.uMaxDistance,'value').min(0).max(20).step(0.0001).name('maxDistance')




//Geometry

let geometry = new THREE.BufferGeometry()
let positions = new Float32Array(WIDTH*WIDTH*3)
let reference = new Float32Array(WIDTH*WIDTH*2)

for(let i = 0;i<WIDTH*WIDTH;i++){
    let x = Math.random()
    let y = Math.random()
    let z = Math.random()

    let xx = (i%WIDTH)/WIDTH
    let yy = (i/WIDTH)/WIDTH

    positions.set([x,y,z],i*3)
    reference.set([xx,yy],i*2)
}
geometry.setAttribute('position',new THREE.BufferAttribute(positions,3))
geometry.setAttribute('reference',new THREE.BufferAttribute(reference,2))

geometry = trex.geometry //for GPGPU disable this

const points = new THREE.Points(geometry,shaderMaterial)
scene.add(points)

animateScene()

})







/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))


/**
 * Animate
 */
const clock = new THREE.Clock()
let lastElapsedTime = 0


const animateScene = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - lastElapsedTime
    lastElapsedTime = elapsedTime

    // Update controls
    controls.update()

    //Update shader with time
    shaderMaterial.uniforms.uTime.value = elapsedTime

    //Enable below for GPGPU
    // positionVariable.material.uniforms['uTime'].value = elapsedTime
    // gpuCompute.compute()
    // shaderMaterial.uniforms.positionTexture.value = gpuCompute.getCurrentRenderTarget(positionVariable).texture
    
    // Render
    renderer.render(scene, camera)

    // Call animateScene again on the next frame
    window.requestAnimationFrame(animateScene)
}

