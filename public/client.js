import * as THREE from '/build/three.module.js';
import {OrbitControls} from '/jsm/controls/OrbitControls.js';
import Stats from '/jsm/libs/stats.module.js';
import { GUI } from './jsm/libs/dat.gui.module.js';
import { RGBELoader } from './jsm/loaders/RGBELoader.js';


const params = {
    color: 0xffffff,
    transmission: 0.90,
    envMapIntensity: 1,
    lightIntensity: 1,
    exposure: 1
};

let container, stats;
let camera, scene, renderer;

let hdrCubeRenderTarget;
let mesh1, mesh2;

const hdrEquirect = new RGBELoader()
    .setDataType( THREE.UnsignedByteType )
    .setPath( 'textures/equirectangular/' )
    .load( 'royal_esplanade_1k.hdr', function () {

        init();
        animate();

    } );

function init() {

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    container.appendChild( renderer.domElement );

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = params.exposure;

    renderer.outputEncoding = THREE.sRGBEncoding;

    scene = new THREE.Scene();
    scene.background = hdrEquirect;

    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 2000 );
    camera.position.set( 0, 0, 120 );

    //

    const pmremGenerator = new THREE.PMREMGenerator( renderer );
    hdrCubeRenderTarget = pmremGenerator.fromEquirectangular( hdrEquirect );
    hdrEquirect.dispose();
    pmremGenerator.dispose();

    scene.background = hdrCubeRenderTarget.texture;

    //

    const geometry = new THREE.SphereBufferGeometry( 20, 64, 32 );

    const texture = new THREE.CanvasTexture( generateTexture() );
    texture.magFilter = THREE.NearestFilter;
    texture.wrapT = THREE.RepeatWrapping;
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set( 1, 3.5 );

    const material = new THREE.MeshPhysicalMaterial( {
        color: params.color,
        metalness: 0,
        roughness: 0,
        alphaMap: texture,
        alphaTest: 0.5,
        envMap: hdrCubeRenderTarget.texture,
        envMapIntensity: params.envMapIntensity,
        depthWrite: false,
        transmission: params.transmission, // use material.transmission for glass materials
        opacity: 1, // set material.opacity to 1 when material.transmission is non-zero
        transparent: true
    } );

    const material1 = new THREE.MeshPhysicalMaterial().copy( material );

    const material1b = new THREE.MeshPhysicalMaterial().copy( material );
    material1b.side = THREE.BackSide;

    const material2 = new THREE.MeshPhysicalMaterial().copy( material );
    material2.premultipliedAlpha = true;

    const material2b = new THREE.MeshPhysicalMaterial().copy( material );
    material2b.premultipliedAlpha = true;
    material2b.side = THREE.BackSide;

    mesh1 = new THREE.Mesh( geometry, material1 );
    mesh1.position.x = - 30.0;
    scene.add( mesh1 );

    let mesh = new THREE.Mesh( geometry, material1b );
    mesh.renderOrder = - 1;
    mesh1.add( mesh );

    mesh2 = new THREE.Mesh( geometry, material2 );
    mesh2.position.x = 30.0;
    scene.add( mesh2 );

    mesh = new THREE.Mesh( geometry, material2b );
    mesh.renderOrder = - 1;
    mesh2.add( mesh );

    //

    const spotLight1 = new THREE.SpotLight( 0xffffff, params.lightIntensity );
    spotLight1.position.set( 100, 200, 100 );
    spotLight1.angle = Math.PI / 6;
    scene.add( spotLight1 );

    const spotLight2 = new THREE.SpotLight( 0xffffff, params.lightIntensity );
    spotLight2.position.set( - 100, - 200, - 100 );
    spotLight2.angle = Math.PI / 6;
    scene.add( spotLight2 );

    //

    stats = new Stats();
    container.appendChild( stats.dom );

    const controls = new OrbitControls( camera, renderer.domElement );
    controls.minDistance = 10;
    controls.maxDistance = 150;

    window.addEventListener( 'resize', onWindowResize, false );

    //

    const gui = new GUI();

    gui.addColor( params, 'color' )
        .onChange( function () {

            material1.color.set( params.color );
            material2.color.set( params.color );
            material1b.color.set( params.color );
            material2b.color.set( params.color );

        } );

    gui.add( params, 'transmission', 0, 1 )
        .onChange( function () {

            material1.transmission = material2.transmission = params.transmission;
            material1b.transmission = material2b.transmission = params.transmission;

        } );

    gui.add( params, 'envMapIntensity', 0, 1 )
        .name( 'envMap intensity' )
        .onChange( function () {

            material1.envMapIntensity = material2.envMapIntensity = params.envMapIntensity;
            material1b.envMapIntensity = material2b.envMapIntensity = params.envMapIntensity;

        } );

    gui.add( params, 'lightIntensity', 0, 1 )
        .name( 'light intensity' )
        .onChange( function () {

            spotLight1.intensity = spotLight2.intensity = params.lightIntensity;

        } );

    gui.add( params, 'exposure', 0, 1 )
        .onChange( function () {

            renderer.toneMappingExposure = params.exposure;

        } );

    gui.open();

}

function onWindowResize() {

    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize( width, height );

}

//

function generateTexture() {

    const canvas = document.createElement( 'canvas' );
    canvas.width = 2;
    canvas.height = 2;

    const context = canvas.getContext( '2d' );
    context.fillStyle = 'white';
    context.fillRect( 0, 1, 2, 1 );

    return canvas;

}

function animate() {

    requestAnimationFrame( animate );

    const t = performance.now();

    mesh1.rotation.x = mesh2.rotation.x = t * 0.0002;
    mesh1.rotation.z = mesh2.rotation.z = - t * 0.0002;

    stats.begin();
    renderer.render( scene, camera );
    stats.end();

}

/*const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 2;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({
    color: 0x00f000,
    wireframe: true
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}, false);

const stats = Stats();
document.body.appendChild(stats.dom);

var animate = function () {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    controls.update();
    render();
    stats.update();
};

function render() {
    renderer.render(scene, camera);
}

animate();*/