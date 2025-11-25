"use strict";

function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iNormalBuffer = gl.createBuffer();
  this.iTangentBuffer = gl.createBuffer();
  this.iIndexBuffer = gl.createBuffer();
  this.iTexCoordBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData = function (data) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(data.vertexList),
      gl.STATIC_DRAW
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(data.normalList),
      gl.STATIC_DRAW
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(data.tangentList),
      gl.STATIC_DRAW
    );

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(data.indexList),
      gl.STATIC_DRAW
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(data.texCoordList),
      gl.STATIC_DRAW
    );

    this.count = data.indexList.length;
  };

  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
    gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
    gl.vertexAttribPointer(shProgram.iAttribTangent, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribTangent);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
    gl.vertexAttribPointer(shProgram.iAttribTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribTexCoord);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
  };
}

function calculateSurfacePoint(u, v, isUpperHemisphere = true) {
  const cosU = Math.cos(u);
  const cosV = Math.cos(v);
  let zExpression = (-3.0 * cosU + -3.0 * cosV) / (3.0 + 4.0 * cosU * cosV);
  zExpression = Math.max(-1, Math.min(1, zExpression));
  let z = Math.acos(zExpression);
  if (!isUpperHemisphere) z = -z;
  return { x: u, y: v, z: z };
}

function generateHemisphere(surface, uSteps, vSteps, isUpperHemisphere) {
  const uMin = -Math.PI,
    uMax = Math.PI;
  const vMin = -Math.PI,
    vMax = Math.PI;
  const uStep = (uMax - uMin) / uSteps;
  const vStep = (vMax - vMin) / vSteps;
  const vertexMap = [];
  let vertexOffset = surface.vertexList.length / 3;

  for (let i = 0; i <= vSteps; i++) {
    vertexMap[i] = [];
    for (let j = 0; j <= uSteps; j++) {
      const u = uMin + j * uStep;
      const v = vMin + i * vStep;
      const p = calculateSurfacePoint(u, v, isUpperHemisphere);
      surface.vertexList.push(p.x, p.y, p.z);
      surface.texCoordList.push(j / uSteps, i / vSteps);
      vertexMap[i][j] = vertexOffset++;
    }
  }

  for (let i = 0; i < vSteps; i++) {
    for (let j = 0; j < uSteps; j++) {
      const idx1 = vertexMap[i][j];
      const idx2 = vertexMap[i][j + 1];
      const idx3 = vertexMap[i + 1][j];
      const idx4 = vertexMap[i + 1][j + 1];
      surface.indexList.push(idx1, idx2, idx3);
      surface.indexList.push(idx2, idx4, idx3);
    }
  }
}

function calculateAngle(a, b, c) {
  const ab = m4.subtractVectors(b, a);
  const ac = m4.subtractVectors(c, a);
  const lenAB = m4.length(ab);
  const lenAC = m4.length(ac);
  const cosTheta = m4.dot(ab, ac) / (lenAB * lenAC);
  const clampedCos = Math.max(-1, Math.min(1, cosTheta));
  return Math.acos(clampedCos);
}

function CreateSurfaceData(uSteps, vSteps) {
  const surface = {
    vertexList: [],
    normalList: [],
    tangentList: [],
    indexList: [],
    texCoordList: [],
  };

  generateHemisphere(surface, uSteps, vSteps, true);
  generateHemisphere(surface, uSteps, vSteps, false);

  const numVertices = surface.vertexList.length / 3;
  const accumNormals = new Array(numVertices).fill().map(() => [0, 0, 0]);
  const accumTangents = new Array(numVertices).fill().map(() => [0, 0, 0]);

  for (let t = 0; t < surface.indexList.length; t += 3) {
    const idx1 = surface.indexList[t];
    const idx2 = surface.indexList[t + 1];
    const idx3 = surface.indexList[t + 2];

    const v1 = surface.vertexList.slice(idx1 * 3, idx1 * 3 + 3);
    const v2 = surface.vertexList.slice(idx2 * 3, idx2 * 3 + 3);
    const v3 = surface.vertexList.slice(idx3 * 3, idx3 * 3 + 3);

    const uv1 = surface.texCoordList.slice(idx1 * 2, idx1 * 2 + 2);
    const uv2 = surface.texCoordList.slice(idx2 * 2, idx2 * 2 + 2);
    const uv3 = surface.texCoordList.slice(idx3 * 2, idx3 * 2 + 2);

    const edge1 = m4.subtractVectors(v2, v1);
    const edge2 = m4.subtractVectors(v3, v1);

    const deltaUV1 = [uv2[0] - uv1[0], uv2[1] - uv1[1]];
    const deltaUV2 = [uv3[0] - uv1[0], uv3[1] - uv1[1]];

    const f = 1.0 / (deltaUV1[0] * deltaUV2[1] - deltaUV2[0] * deltaUV1[1]);

    const tangent = [
      f * (deltaUV2[1] * edge1[0] - deltaUV1[1] * edge2[0]),
      f * (deltaUV2[1] * edge1[1] - deltaUV1[1] * edge2[1]),
      f * (deltaUV2[1] * edge1[2] - deltaUV1[1] * edge2[2]),
    ];

    const faceNormal = m4.normalize(m4.cross(edge1, edge2));

    const angle1 = calculateAngle(v1, v2, v3);
    const angle2 = calculateAngle(v2, v1, v3);
    const angle3 = calculateAngle(v3, v1, v2);

    for (let k = 0; k < 3; k++) {
      accumNormals[idx1][k] += faceNormal[k] * angle1;
      accumNormals[idx2][k] += faceNormal[k] * angle2;
      accumNormals[idx3][k] += faceNormal[k] * angle3;

      accumTangents[idx1][k] += tangent[k] * angle1;
      accumTangents[idx2][k] += tangent[k] * angle2;
      accumTangents[idx3][k] += tangent[k] * angle3;
    }
  }

  for (let i = 0; i < numVertices; i++) {
    const norm = m4.normalize(accumNormals[i]);
    if (m4.lengthSq(norm) === 0) {
      norm[0] = 0;
      norm[1] = 0;
      norm[2] = 1;
    }
    surface.normalList.push(...norm);

    const tan = m4.normalize(accumTangents[i]);
    if (m4.lengthSq(tan) === 0) {
      tan[0] = 1;
      tan[1] = 0;
      tan[2] = 0;
    }
    surface.tangentList.push(...tan);
  }

  return surface;
}
