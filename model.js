"use strict";

function Model(name) {
  this.name = name;
  this.vertexBuffer = gl.createBuffer();
  this.vertexCount = 0;

  this.BufferData = function (vertices) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
    this.vertexCount = vertices.length / 3;
  };

  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);
    gl.drawArrays(gl.LINE_STRIP, 0, this.vertexCount);
  };
}

function calculateZCoordinate(u, v, isUpperHemisphere = true) {
  const numerator = -3 * (Math.cos(u) + Math.cos(v));
  const denominator = 3 + 4 * Math.cos(u) * Math.cos(v);
  const cosValue = numerator / denominator;
  const clampedCosValue = Math.max(-1, Math.min(1, cosValue));

  return isUpperHemisphere
    ? Math.acos(clampedCosValue)
    : -Math.acos(clampedCosValue);
}

function generateHemisphereVertices(
  parameterStep,
  parameterRange,
  isUpperHemisphere = true
) {
  const vertices = [];

  for (let u = -parameterRange; u <= parameterRange; u += parameterStep) {
    for (let v = -parameterRange; v <= parameterRange; v += parameterStep) {
      const z = calculateZCoordinate(u, v, isUpperHemisphere);
      vertices.push(u, v, z);

      if (u + parameterStep <= parameterRange) {
        const uNext = u + parameterStep;
        const zNext = calculateZCoordinate(uNext, v, isUpperHemisphere);
        vertices.push(uNext, v, zNext);
      }

      if (v + parameterStep <= parameterRange) {
        const vNext = v + parameterStep;
        const zNext = calculateZCoordinate(u, vNext, isUpperHemisphere);
        vertices.push(u, vNext, zNext);
      }
    }
  }

  return vertices;
}

function CreateSurfaceData() {
  const parameterStep = 0.1;
  const parameterRange = Math.PI;

  const upperHemisphere = generateHemisphereVertices(
    parameterStep,
    parameterRange,
    true
  );
  const lowerHemisphere = generateHemisphereVertices(
    parameterStep,
    parameterRange,
    false
  );

  return upperHemisphere.concat(lowerHemisphere);
}
