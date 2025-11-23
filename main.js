"use strict";

let gl;
let shProgram;
let spaceball;
let surface;

let lastTime = 0;
const fps = 30;
const interval = 1000 / fps;

let textureCenter = [0.5, 0.5];
let textureAngle = 0.0;
let textureScale = 1.0;

function deg2rad(angle) {
  return (angle * Math.PI) / 180;
}

function handleKeyDown(event) {
  const step = 0.05;

  switch (event.key.toLowerCase()) {
    case "a":
      textureCenter[0] -= step;
      console.log("Center U:", textureCenter[0]);
      break;
    case "d":
      textureCenter[0] += step;
      console.log("Center U:", textureCenter[0]);
      break;
    case "s":
      textureCenter[1] -= step;
      console.log("Center V:", textureCenter[1]);
      break;
    case "w":
      textureCenter[1] += step;
      console.log("Center V:", textureCenter[1]);
      break;
    case "q":
      textureAngle += 0.1;
      break;
    case "e":
      textureAngle -= 0.1;
      break;
  }
}

function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;
  this.iAttribVertex = -1;
  this.iAttribNormal = -1;
  this.iAttribTexCoord = -1;
  this.iColor = -1;
  this.iModelViewProjectionMatrix = -1;
  this.iLightPosition = -1;
  this.iNormalMatrix = -1;
  this.iModelViewMatrix = -1;
  this.iViewPosition = -1;
  this.iAmbientStrength = -1;
  this.iSpecularStrength = -1;
  this.iShininess = -1;
  this.iTexCenter = -1;
  this.iTexAngle = -1;
  this.iTexScale = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  let projection = m4.perspective(Math.PI / 8, 1, 1, 60);
  let modelView = spaceball.getViewMatrix();
  let rotateToPointZero = m4.axisRotation([1, 0, 0], -Math.PI / 10);
  let translateToPointZero = m4.translation(0, 0, -20);
  let matAccum0 = m4.multiply(rotateToPointZero, modelView);
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
  let modelViewProjection = m4.multiply(projection, matAccum1);
  let normalMatrix = calculateNormalMatrix(matAccum1);
  gl.uniformMatrix4fv(
    shProgram.iModelViewProjectionMatrix,
    false,
    modelViewProjection
  );
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccum1);
  gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

  const viewPosition = [0.0, 0.0, 30.0];
  const time = performance.now();
  const lightPosition = updateLightPosition(time);
  const ambientStrength = 0.1;
  const specularStrength = 0.3;
  const shininess = 30.0;

  gl.uniform3fv(shProgram.iLightPosition, lightPosition);
  gl.uniform3fv(shProgram.iViewPosition, viewPosition);
  gl.uniform1f(shProgram.iAmbientStrength, ambientStrength);
  gl.uniform1f(shProgram.iSpecularStrength, specularStrength);
  gl.uniform1f(shProgram.iShininess, shininess);
  gl.uniform2fv(shProgram.iTexCenter, textureCenter);
  gl.uniform1f(shProgram.iTexAngle, textureAngle);
  gl.uniform1f(shProgram.iTexScale, textureScale);
  gl.uniform4fv(shProgram.iColor, [0.0, 0.0, 1.0, 1.0]);
  surface.Draw();
}

function updateLightPosition(time) {
  const angle = time * 0.001;
  const h = 5;
  const r = 10;
  const x = r * Math.cos(angle);
  const y = h;
  const z = r * Math.sin(angle) - 20;
  return [x, y, z];
}

function calculateNormalMatrix(modelViewMatrix) {
  let normalMatrix = m4.inverse(modelViewMatrix);
  normalMatrix = m4.transpose(normalMatrix);
  return normalMatrix;
}

function frameControl(time) {
  const deltaTime = time - lastTime;
  if (deltaTime >= interval) {
    lastTime = time - (deltaTime % interval);
    draw();
  }
  requestAnimationFrame(frameControl);
}

function startAnimation() {
  requestAnimationFrame(frameControl);
}

function updateSurface() {
  const uSteps = parseInt(document.getElementById("uGranularity").value, 10);
  const vSteps = parseInt(document.getElementById("vGranularity").value, 10);
  if (isNaN(uSteps) || isNaN(vSteps) || uSteps <= 0 || vSteps <= 0) {
    console.error("Invalid u,v values");
    return;
  }
  const data = CreateSurfaceData(uSteps, vSteps);
  gl.bindBuffer(gl.ARRAY_BUFFER, surface.iVertexBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(data.vertexList),
    gl.STATIC_DRAW
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, surface.iNormalBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(data.normalList),
    gl.STATIC_DRAW
  );
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, surface.iIndexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(data.indexList),
    gl.STATIC_DRAW
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, surface.iTexCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(data.texCoordList),
    gl.STATIC_DRAW
  );
  surface.count = data.indexList.length;
  draw();
}

function loadTexture(gl, imageUrl) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const img = new Image();
  img.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    console.log(`Texture loaded ${imageUrl}`);
  };
  img.src = imageUrl;
  return texture;
}

function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
  shProgram = new ShaderProgram("Basic", prog);
  shProgram.Use();
  shProgram.iAttribVertex = gl.getAttribLocation(prog, "inVertex");
  shProgram.iAttribNormal = gl.getAttribLocation(prog, "inNormal");
  shProgram.iAttribTexCoord = gl.getAttribLocation(prog, "inTexCoords");
  shProgram.iColor = gl.getUniformLocation(prog, "color");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(
    prog,
    "ModelViewProjectionMatrix"
  );
  shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
  shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
  shProgram.iLightPosition = gl.getUniformLocation(prog, "lightPosition");
  shProgram.iViewPosition = gl.getUniformLocation(prog, "viewPosition");
  shProgram.iAmbientStrength = gl.getUniformLocation(prog, "ambientStrength");
  shProgram.iSpecularStrength = gl.getUniformLocation(prog, "specularStrength");
  shProgram.iShininess = gl.getUniformLocation(prog, "shininess");
  shProgram.iTexCenter = gl.getUniformLocation(prog, "texCenter");
  shProgram.iTexAngle = gl.getUniformLocation(prog, "texAngle");
  shProgram.iTexScale = gl.getUniformLocation(prog, "texScale");

  const diffuseTexture = loadTexture(gl, "diffuse.png");
  const specularTexture = loadTexture(gl, "specular.png");

  if (!diffuseTexture || !specularTexture) {
    console.error("Failed to load textures");
    return;
  }

  const diffuseLocation = gl.getUniformLocation(prog, "diffTexture");
  const specularLocation = gl.getUniformLocation(prog, "specTexture");

  if (!diffuseLocation || !specularLocation) {
    console.error("Texture uniforms not found");
    return;
  }

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
  gl.uniform1i(diffuseLocation, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, specularTexture);
  gl.uniform1i(specularLocation, 1);
  surface = new Model("Surface");
  surface.BufferData(CreateSurfaceData(25, 25));
  gl.enable(gl.DEPTH_TEST);
}

function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error(
      "Vertex shader compilation error: " + gl.getShaderInfoLog(vsh)
    );
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error(
      "Fragment shader compilation error: " + gl.getShaderInfoLog(fsh)
    );
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Program linking error: " + gl.getProgramInfoLog(prog));
  }
  return prog;
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
      "<p>Sorry, unable to get WebGL context.</p>";
    return;
  }

  try {
    initGL();
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, unable to initialize WebGL context: " + e + "</p>";
    return;
  }

  window.addEventListener("keydown", handleKeyDown);

  spaceball = new TrackballRotator(canvas, draw, 0);
  startAnimation();
}
