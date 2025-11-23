"use strict";

let gl;
let surface;
let shProgram;
let spaceball;

function deg2rad(angle) {
  return (angle * Math.PI) / 180;
}

function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;

  this.iAttribVertex = -1;
  this.iAttribNormal = -1;
  this.iColor = -1;
  this.iModelViewProjectionMatrix = -1;
  this.iLightPosition = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

function updateLightPosition(time) {
  const angle = time * 0.001;
  const radius = 15;
  const height = 15;

  const x = radius * Math.cos(angle);
  const y = height;
  const z = radius * Math.sin(angle) - 20;
  return [x, y, z];
}

function updateSurface() {
  const uSteps = parseInt(document.getElementById("uGranularity").value, 10);
  const vSteps = parseInt(document.getElementById("vGranularity").value, 10);

  const data = CreateSurfaceData(uSteps, vSteps);

  surface.BufferData(data);

  draw();
}

function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram("Basic", prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(
    prog,
    "ModelViewProjectionMatrix"
  );
  shProgram.iColor = gl.getUniformLocation(prog, "color");
  shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
  shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
  shProgram.iLightPosition = gl.getUniformLocation(prog, "lightPosition");

  shProgram.iViewPosition = gl.getUniformLocation(prog, "viewPosition");
  shProgram.iAmbientStrength = gl.getUniformLocation(prog, "ambientStrength");
  shProgram.iSpecularStrength = gl.getUniformLocation(prog, "specularStrength");
  shProgram.iShininess = gl.getUniformLocation(prog, "shininess");

  surface = new Model("Surface");
  surface.BufferData(CreateSurfaceData(25, 25));

  gl.enable(gl.DEPTH_TEST);
}

function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}

function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let projection = m4.perspective(Math.PI / 8, 1, 1, 60);
  let modelView = spaceball.getViewMatrix();

  let rotateToPointZero = m4.axisRotation([1, 0, 0], -Math.PI / 6);
  let translateToPointZero = m4.translation(0, 0, -20);

  let matAccum0 = m4.multiply(rotateToPointZero, modelView);
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

  let modelViewProjection = m4.multiply(projection, matAccum1);

  gl.uniformMatrix4fv(
    shProgram.iModelViewProjectionMatrix,
    false,
    modelViewProjection
  );

  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccum1);

  const time = performance.now();
  const lightPosition = updateLightPosition(time);

  const ambientStrength = 0.1;
  const specularStrength = 0.5;
  const shininess = 10.0;

  const viewPosition = [0.0, 0.0, 30.0];

  gl.uniform3fv(shProgram.iLightPosition, lightPosition);
  gl.uniform3fv(shProgram.iViewPosition, viewPosition);
  gl.uniform1f(shProgram.iAmbientStrength, ambientStrength);
  gl.uniform1f(shProgram.iSpecularStrength, specularStrength);
  gl.uniform1f(shProgram.iShininess, shininess);

  gl.uniform4fv(shProgram.iColor, [0, 0, 1, 1]);
  surface.Draw();
}

function startAnimation() {
  function animate() {
    draw();
    requestAnimationFrame(animate);
  }
  animate();
}

function init() {
  let canvas;
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    if (!gl) {
      throw "Browser does not support WebGL";
    }
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL();
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " +
      e +
      "</p>";
    return;
  }
  spaceball = new TrackballRotator(canvas, draw, 0);
  startAnimation();
}
