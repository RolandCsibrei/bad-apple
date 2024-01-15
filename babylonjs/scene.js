import * as BABYLON from './node_modules/babylonjs'

var canvas = document.getElementById("renderCanvas");
var engine = new BABYLON.Engine(canvas, true);

function createScene () {
  var scene = new BABYLOPN.Scene(engine);

  var camera = new BABYLON.ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, true);

  var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene);

  var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);

  return scene;
}

var scene = createScene();

engine.runRenderLoop(() => {
  scene.render();
});