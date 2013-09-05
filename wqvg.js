// This file is part of wvg, a web viewer for vector gradients.
//
// Copyright (C) 2013 Simon Boyé and Millicent Billette
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

var WqvgViewer_vertCommonSrc = "\
uniform highp mat4 viewMatrix;\n\
\n\
attribute highp vec4 vx_position;\n\
attribute mediump vec2 vx_triDataCoord;\n\
attribute mediump vec3 vx_linearBasis;\n\
attribute mediump vec4 vx_singularAngle;\n\
\n\
varying mediump vec2 position;\n\
varying mediump vec2 triDataCoord;\n\
varying mediump vec3 linearBasis;\n\
varying mediump vec4 singularAngle;\n\
\n\
void main() {\n\
	gl_Position = viewMatrix * vx_position;\n\
	position = vx_position.xy;\n\
	triDataCoord = vx_triDataCoord;\n\
//				triDataCoord = vx_position.xy;\n\
	linearBasis = vx_linearBasis;\n\
	singularAngle = vec4(vx_position.xy - vx_singularAngle.xy, vx_singularAngle.zw);\n\
}\n\
 ";

var WqvgViewer_fragTriangleSrc = "\
uniform sampler2D color;\n\
uniform mediump float offset;\n\
\n\
varying mediump vec2 triDataCoord;\n\
varying mediump vec3 linearBasis;\n\
\n\
lowp vec4 quadraticInterp(in lowp vec4 colors[6]) {\n\
	return\n\
		colors[0] * linearBasis.x * (2. * linearBasis.x - 1.) +\n\
		colors[1] * linearBasis.y * (2. * linearBasis.y - 1.) +\n\
		colors[2] * linearBasis.z * (2. * linearBasis.z - 1.) +\n\
		colors[3] * 4. * linearBasis.y * linearBasis.z +\n\
		colors[4] * 4. * linearBasis.z * linearBasis.x +\n\
		colors[5] * 4. * linearBasis.x * linearBasis.y;\n\
}\n\
\n\
void main() {\n\
	gl_FragColor = vec4(1., 0., 0., 1.);\n\
	gl_FragColor = vec4(linearBasis, 1.);\n\
	//gl_FragColor = vec4(triDataCoord*512., 0., 1.);\n\
	lowp vec4 colors[6];\n\
	colors[0] = texture2D(color, triDataCoord + vec2(offset*0., 0));\n\
	colors[1] = texture2D(color, triDataCoord + vec2(offset*1., 0));\n\
	colors[2] = texture2D(color, triDataCoord + vec2(offset*2., 0));\n\
	colors[3] = texture2D(color, triDataCoord + vec2(offset*3., 0));\n\
	colors[4] = texture2D(color, triDataCoord + vec2(offset*4., 0));\n\
	colors[5] = texture2D(color, triDataCoord + vec2(offset*5., 0));\n\
	gl_FragColor = quadraticInterp(colors);\n\
//				gl_FragColor = texture2D(color, triDataCoord);\n\
//				gl_FragColor = vec4(triDataCoord, 0., 1.);\n\
}\n\
 ";

var WqvgViewer_fragSingularSrc = "\
uniform sampler2D color;\n\
uniform mediump float offset;\n\
\n\
varying mediump vec2 position;\n\
varying mediump vec2 triDataCoord;\n\
varying mediump vec3 linearBasis;\n\
varying mediump vec4 singularAngle;\n\
\n\
const mediump float pi = 3.141592654;\n\
\n\
lowp vec4 quadraticInterp(in lowp vec4 colors[6]) {\n\
	return\n\
		colors[0] * linearBasis.x * (2. * linearBasis.x - 1.) +\n\
		colors[1] * linearBasis.y * (2. * linearBasis.y - 1.) +\n\
		colors[2] * linearBasis.z * (2. * linearBasis.z - 1.) +\n\
		colors[3] * 4. * linearBasis.y * linearBasis.z +\n\
		colors[4] * 4. * linearBasis.z * linearBasis.x +\n\
		colors[5] * 4. * linearBasis.x * linearBasis.y;\n\
}\n\
\n\
void main() {\n\
	mediump float alpha = atan(singularAngle.y, singularAngle.x);\n\
	alpha = (((alpha < singularAngle.z-1.)? alpha+pi*2.0: alpha)\n\
		- singularAngle.z) / singularAngle.w;\n\
\n\
	lowp vec4 colors[6];\n\
	colors[0] = mix(\n\
		texture2D(color, triDataCoord + vec2(offset*0., 0)),\n\
		texture2D(color, triDataCoord + vec2(offset*3., 0)), alpha);\n\
	colors[1] = texture2D(color, triDataCoord + vec2(offset*1., 0));\n\
	colors[2] = texture2D(color, triDataCoord + vec2(offset*2., 0));\n\
	colors[3] = texture2D(color, triDataCoord + vec2(offset*4., 0));\n\
	colors[4] = texture2D(color, triDataCoord + vec2(offset*5., 0));\n\
	colors[5] = texture2D(color, triDataCoord + vec2(offset*6., 0));\n\
	gl_FragColor = quadraticInterp(colors);\n\
//				gl_FragColor = texture2D(color, triDataCoord);\n\
//				gl_FragColor = vec4(triDataCoord, 0., 1.);\n\
//	gl_FragColor = vec4(vec3(alpha), 1.);\n\
//	gl_FragColor = vec4(position.xy-singularAngle.xy, 0., 1.);\n\
}\n\
 ";

function getOffset(el) {
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return [ _x, _y ];
}

function WqvgViewer(idCanvas) {
	var self = this;
	
	this.compileShaderFromSources = function(sources, type, name) {
		var shader = self.gl.createShader(type);
		self.gl.shaderSource(shader, sources);
		self.gl.compileShader(shader);
		if(!self.gl.getShaderParameter(shader, self.gl.COMPILE_STATUS)) {
			console.error("Error: Shader '"+name+"':");
			console.group();
			console.warn(self.gl.getShaderInfoLog(shader));
			console.groupEnd();
			return null;
		}
		return shader;
	};
	
	this.linkProgram = function(program, name) {
		self.gl.bindAttribLocation(program, self.positionLoc, "vx_position");
		self.gl.bindAttribLocation(program, self.triDataCoordLoc, "vx_triDataCoord");
		self.gl.bindAttribLocation(program, self.linearBasisLoc, "vx_linearBasis");
		self.gl.bindAttribLocation(program, self.singularAngleLoc, "vx_singularAngle");
		self.gl.linkProgram(program);
		if(!self.gl.getProgramParameter(program, self.gl.LINK_STATUS)) {
			console.error("Error: Program '"+name+"':");
			console.group();
			console.warn(self.gl.getProgramInfoLog(self.triangleProgram));
			console.groupEnd();
		}
		// Caches uniforms locations directly in the program object.
		program.viewMatrixLoc = self.gl.getUniformLocation(program, "viewMatrix");
		program.colorLoc = self.gl.getUniformLocation(program, "color");
		program.offsetLoc = self.gl.getUniformLocation(program, "offset");
	};

	this.initWebGL = function (idCanvas) {
		// Context creation...
		self.canvas = document.getElementById(idCanvas);
		if(!self.canvas) { alert("Erreur de chargement canvas"); return; }

		self.gl = null;
		try { self.gl = self.canvas.getContext("webgl") || self.canvas.getContext("experimental-webgl"); } 
		catch(e) {}
		if(!self.gl) {
			throw Error("Failed to create WebGL context.");
			return;
		}
		self.gl = WebGLDebugUtils.makeDebugContext(self.gl);

		// Vertex attibute bindings
		self.positionLoc = 0;
		self.triDataCoordLoc = 1;
		self.linearBasisLoc = 2;
		self.singularAngleLoc = 3;

        // Shader compilation...
		self.vertCommonShader = self.compileShaderFromSources(
			WqvgViewer_vertCommonSrc, self.gl.VERTEX_SHADER, "vertCommon");
		self.fragTriangleShader = self.compileShaderFromSources(
			WqvgViewer_fragTriangleSrc, self.gl.FRAGMENT_SHADER, "fragTriangle");
		self.fragSingularShader = self.compileShaderFromSources(
			WqvgViewer_fragSingularSrc, self.gl.FRAGMENT_SHADER, "fragSingular");

		self.triangleProgram = self.gl.createProgram();
		self.gl.attachShader(self.triangleProgram, self.vertCommonShader);
		self.gl.attachShader(self.triangleProgram, self.fragTriangleShader);
		self.linkProgram(self.triangleProgram, "triangle");
		
		self.singularProgram = self.gl.createProgram();
		self.gl.attachShader(self.singularProgram, self.vertCommonShader);
		self.gl.attachShader(self.singularProgram, self.fragSingularShader);
		self.linkProgram(self.singularProgram, "singular");
		
		// Default image...
		// TODO: Load somthing nice !
		self.initBuffers(1, 0, [
			0, 0,
			1, 0,
			0, 1
		], [ 0, 1, 2 ], [
			0xff0000ff,
			0xff00ff00,
			0xffff0000,
			0xffffff00,
			0xffff00ff,
			0xff00ffff ]);

		// Global GL parameters
		self.gl.clearColor(0.0, 0.0, 0.0, 1.0);
		self.gl.viewport(0, 0, self.canvas.width, self.canvas.height);
		
		// View parameters
		self.viewCenter = [ 0.5, 0.5 ];
		self.zoom = 550.0;
	};

    this.resize = function(width, height) {
        self.gl.canvas.width = width;
        self.gl.canvas.height = height;
		self.gl.viewport(0, 0, width, height);
        self.render();
    }
	
	this.renderPass = function(program, buffer, offset, size) {
		self.gl.useProgram(program);
		
		if(program.viewMatrixLoc)
			self.gl.uniformMatrix4fv(program.viewMatrixLoc, false, self.viewMatrix);
		
		if(program.colorLoc) {
			self.gl.activeTexture(self.gl.TEXTURE0);
			self.gl.bindTexture(self.gl.TEXTURE_2D, self.colorTexture);
			self.gl.uniform1i(program.colorLoc, 0);
		}
		
		if(program.offsetLoc)
			self.gl.uniform1f(program.offsetLoc, 1.0/self.colorTextureWidth);

		self.gl.bindBuffer(self.gl.ARRAY_BUFFER, buffer);

		self.gl.enableVertexAttribArray(self.positionLoc);
		self.gl.vertexAttribPointer(self.positionLoc, 2,
				self.gl.FLOAT, false, self.nbVxComponent*4, 0 + self.nbVxComponent*4*offset);

		self.gl.enableVertexAttribArray(self.triDataCoordLoc);
		self.gl.vertexAttribPointer(self.triDataCoordLoc, 2,
				self.gl.FLOAT, false, self.nbVxComponent*4, 2*4 + self.nbVxComponent*4*offset);

		self.gl.enableVertexAttribArray(self.linearBasisLoc);
		self.gl.vertexAttribPointer(self.linearBasisLoc, 3,
				self.gl.FLOAT, false, self.nbVxComponent*4, 4*4 + self.nbVxComponent*4*offset);
				
		if(program == self.singularProgram) {
			self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.singularAngleBuffer);
			self.gl.enableVertexAttribArray(self.singularAngleLoc);
			self.gl.vertexAttribPointer(self.singularAngleLoc, 4,
					self.gl.FLOAT, false, 4*4, 0);
		}

		self.gl.drawArrays(self.gl.TRIANGLES, 0, size);

		self.gl.disableVertexAttribArray(program.offsetLoc);
		self.gl.disableVertexAttribArray(program.colorLoc);
		self.gl.disableVertexAttribArray(program.viewMatrixLoc);
	};

	this.render = function(){
		//console.log("Render");

		self.gl.clear(self.gl.COLOR_BUFFER_BIT);

		self.viewMatrix = [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		];
		self.viewMatrix[0] = 2.0*self.zoom / self.canvas.width;
		self.viewMatrix[5] = 2.0*self.zoom / self.canvas.height;
		self.viewMatrix[12] = -self.viewCenter[0] * self.viewMatrix[0];
		self.viewMatrix[13] = -self.viewCenter[1] * self.viewMatrix[5];
//		console.log("viewMatrix:", viewMatrix);
		if(self.nbTriangle !== 0)
			self.renderPass(self.triangleProgram, self.vertexBuffer,
				0, self.nbTriangle*3);
		if(self.nbSingular !== 0)
			self.renderPass(self.singularProgram, self.vertexBuffer,
				self.nbTriangle*3, self.nbSingular*3);
	};

	this.loadWqvg = function(wqvgBlob){
		var reader = new FileReader();
		reader.onload = function(event) {
			var rawBuffer = event.target.result;

			var pos = 0;
			var nbHeaderInt = 5; // 5 Uint32
			if(nbHeaderInt * 4 > rawBuffer.byteLength) { console.log("Error: Unexpected end of file."); return; }
			var header = new Uint32Array(rawBuffer, pos, nbHeaderInt);
			pos += nbHeaderInt * 4;

			if(header[0] != 0x67767177 || header[1] > 2) {
				console.log("Error: file with wrong header.");
				return;
			}
			var nbVertex = header[2];
			var nbTriangle = header[3];
			var nbSingular = header[4];
			console.log("nbVertex:", nbVertex);
			console.log("nbTriangle:", nbTriangle);
			console.log("nbSingular:", nbSingular);

            self.qvgComment = "";
            if(header[1] >= 2) {    // File has comment
                var commentSize = (new Uint32Array(rawBuffer, pos, 1))[0];
    			pos += 4;
                var asciiBuffer = new Uint8Array(rawBuffer, pos, commentSize);
//                self.qvgComment = String.fromCharCode.apply(null, asciiBuffer);
                var charList = [];
                var encodePos = 0;
                for(var c=0; c<asciiBuffer.length; ++c) {
                    if((asciiBuffer[c] & 0x80) == 0)
                        charList[encodePos] = String.fromCharCode(asciiBuffer[c]);
                    else if((asciiBuffer[c] & 0xe0) == 0xc0) {
                        charList[encodePos] = String.fromCharCode(((asciiBuffer[c] & 0x1f) << 6) | (asciiBuffer[c+1] & 0x3f));
                        ++c;
                    }
                    else
                        charList[encodePos] = "?";
                    ++encodePos;
                }
                self.qvgComment = charList.join("");
    			pos += commentSize;
                console.log(self.qvgComment);
            }

			var vertexDataSize = (2 * nbVertex) * 4;
			if(pos + vertexDataSize > rawBuffer.byteLength) { console.log("Error: Unexpected end of file."); return; }
			var vertexArray = new Float32Array(rawBuffer.slice(pos, pos+vertexDataSize));
			pos += vertexDataSize;
//			console.log(vertexArray);

			var indexDataSize = 3 * (nbTriangle+nbSingular) * 4;
			if(pos + indexDataSize > rawBuffer.byteLength) { console.log("Error: Unexpected end of file."); return; }
			var indexArray = new Uint32Array(rawBuffer.slice(pos, pos + indexDataSize));
			pos += indexDataSize;
//			console.log(indexArray);

			var colorDataSize = (6*nbTriangle + 7*nbSingular) * 4;
			if(pos + colorDataSize > rawBuffer.byteLength) { console.log("Error: Unexpected end of file."); return; }
			var colorArray = new Uint32Array(rawBuffer.slice(pos, pos + colorDataSize));
			pos += colorDataSize;
//			console.log(colorArray);

			self.initBuffers(nbTriangle, nbSingular,
				vertexArray, indexArray, colorArray);

            if(self.onload)
                self.onload(self);
			self.render();
		};
		reader.onerror = function(event) {
			console.log("Error: cannot read blob.");
		};
		reader.readAsArrayBuffer(wqvgBlob);
	};
	
	this.initBuffers = function(nbTriangle, nbSingular, positions, indices, colors) {
		self.nbTriangle = nbTriangle;
		self.nbSingular = nbSingular;

		self.nbVxComponent = 7;	// coord: 2, color index: 2, linear basis: 3
		self.nbTriangleComponent = 6;
		self.nbSingularComponent = 7;
		
		// Starts for a texture of 16 by 16, and grow it until we can fit all
		// color nodes.
		// TODO: Refactor this !
		self.colorTextureWidth = 16;
		self.colorTextureHeight = 16;
		var triPerRow = Math.floor(self.colorTextureWidth / self.nbTriangleComponent);
		var singPerRow = Math.floor(self.colorTextureWidth / self.nbSingularComponent);
		var singHeight = (self.nbTriangle-1) / triPerRow + 1;
		var totalHeight = singHeight + (self.nbSingular-1) / singPerRow + 1;
		while(totalHeight > self.colorTextureHeight && self.colorTextureHeight < 1024) {
			self.colorTextureWidth *= 2;
			triPerRow = Math.floor(self.colorTextureWidth / self.nbTriangleComponent);
			singPerRow = Math.floor(self.colorTextureWidth / self.nbSingularComponent);
			singHeight = Math.floor((self.nbTriangle-1) / triPerRow) + 1;
			totalHeight = singHeight + Math.floor((self.nbSingular-1) / singPerRow) + 1;
			if(totalHeight > self.colorTextureHeight)
				self.colorTextureHeight *= 2;
		}
		
		// Fill vertex array and generate a texture containing the color nodes.
		self.vertexArray = new Float32Array((self.nbTriangle+self.nbSingular) * 3 * self.nbVxComponent);
		self.colorTextureArray = new Uint32Array(self.colorTextureWidth * self.colorTextureHeight);
		//	sing vertex coord: 2, angle between i and(v0, v1), angle of the singular vertex.
		self.singularAngleArray = new Float32Array(self.nbSingular * 3 * 4);
		var index = 0;
		var singArrayIndex = 0;
		var halfTexelX = 0.5 / self.colorTextureWidth;
		var halfTexelY = 0.5 / self.colorTextureHeight;
		var colorIndex = 0;
		for(var tri=0; tri<(self.nbTriangle+self.nbSingular); ++tri) {
			var nbColor = (tri<self.nbTriangle)? 6: 7; // Singular triangles have 7 colors.
			var colorBase = (tri<self.nbTriangle)?
				6 * tri:
				7 * tri - self.nbTriangle;
			var dataCoordX = ((tri<self.nbTriangle)?
				tri%triPerRow: (tri-self.nbTriangle)%singPerRow) * nbColor;
			var dataCoordY = Math.floor((tri<self.nbTriangle)?
				tri/triPerRow: singHeight + (tri-self.nbTriangle)/singPerRow);
			for(var vx=0; vx<3; ++vx) {
				// Vertex coords - vec2
				self.vertexArray[index++] = positions[indices[tri*3 + vx] * 2 + 0];
				self.vertexArray[index++] = positions[indices[tri*3 + vx] * 2 + 1];

				// Triangle texture coords
				self.vertexArray[index++] = dataCoordX / self.colorTextureWidth + halfTexelX;
				self.vertexArray[index++] = dataCoordY / self.colorTextureHeight + halfTexelY;
				
				// Linear basis functions - vec3
				self.vertexArray[index++] = (vx === 0)? 1: 0;
				self.vertexArray[index++] = (vx === 1)? 1: 0;
				self.vertexArray[index++] = (vx === 2)? 1: 0;
			}
			var baseDataIndex = dataCoordX + dataCoordY*self.colorTextureWidth;
			for(var col=0; col<nbColor; ++col) {
				self.colorTextureArray[baseDataIndex + col] = colors[colorIndex++];
			}
			if(tri >= self.nbTriangle) {
				var v0x = positions[indices[tri*3 + 0] * 2 + 0];
				var v0y = positions[indices[tri*3 + 0] * 2 + 1];
				var v1x = positions[indices[tri*3 + 1] * 2 + 0];
				var v1y = positions[indices[tri*3 + 1] * 2 + 1];
				var v2x = positions[indices[tri*3 + 2] * 2 + 0];
				var v2y = positions[indices[tri*3 + 2] * 2 + 1];
				var ax_01 = Math.atan2(v1y-v0y, v1x-v0x);
				var ax_02 = Math.atan2(v2y-v0y, v2x-v0x);
				if(ax_02 < ax_01)
					ax_02 += Math.PI * 2.0;
				for(var i=0; i<3; ++i) {
					self.singularAngleArray[singArrayIndex++] = v0x;
					self.singularAngleArray[singArrayIndex++] = v0y;
					self.singularAngleArray[singArrayIndex++] = ax_01;
					self.singularAngleArray[singArrayIndex++] = ax_02 - ax_01;
				}
			}
		}
//		console.log("vertexArray:", self.vertexArray);
//		console.log("textureSize:", self.colorTextureWidth, self.colorTextureHeight);
		self.colorTextureArray = new Uint8Array(self.colorTextureArray.buffer);
//		console.log("colorTextureArray:", self.colorTextureArray);
		
		// Creation and loading of vertex array
		if(self.vertexBuffer === undefined)
			self.vertexBuffer = self.gl.createBuffer();
		self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.vertexBuffer);
		self.gl.bufferData(self.gl.ARRAY_BUFFER, self.vertexArray, self.gl.STATIC_DRAW);
		
		if(self.singularAngleBuffer === undefined)
			self.singularAngleBuffer = self.gl.createBuffer();
		self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.singularAngleBuffer);
		self.gl.bufferData(self.gl.ARRAY_BUFFER, self.singularAngleArray, self.gl.STATIC_DRAW);
		
		// Creation and loading of the color node texture
		if(self.colorTexture === undefined)
			self.colorTexture = self.gl.createTexture();
		self.gl.bindTexture(self.gl.TEXTURE_2D, self.colorTexture);
		self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
		self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);
		self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
		self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);
		self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA,
			self.colorTextureWidth, self.colorTextureHeight, 0,
			self.gl.RGBA, self.gl.UNSIGNED_BYTE, self.colorTextureArray);
		
		// Bounding box computation and view initialization.
		// TODO: Move this in a separate method, resetView().
		var minX = positions[0];
		var minY = positions[1];
		var maxX = positions[0];
		var maxY = positions[1];
		for(var i=0; i<positions.length/2; ++i) {
			if(positions[2*i + 0] < minX) minX = positions[2*i + 0];
			if(positions[2*i + 1] < minY) minY = positions[2*i + 1];
			if(positions[2*i + 0] > maxX) maxX = positions[2*i + 0];
			if(positions[2*i + 1] > maxY) maxY = positions[2*i + 1];
		}
		self.viewCenter = [ (minX + maxX) / 2, (minY + maxY) / 2 ];
		var zoomX = self.canvas.width / (maxX - minX);
		var zoomY = self.canvas.height / (maxY - minY);
		self.zoom = ((zoomX < zoomY)? zoomX: zoomY) * 0.95;
	};
	
	this.screenToScene = function(screen) {
		return [
			self.viewCenter[0] + (screen[0] - self.canvas.width / 2) / self.zoom,
			self.viewCenter[1] - (screen[1] - self.canvas.height / 2) / self.zoom
		];
	};
	
	this.sceneToScreen = function(scene) {
		return [
			(scene[0] - self.viewCenter[0]) * self.zoom + self.canvas.width / 2,
			-(scene[1] - self.viewCenter[1]) * self.zoom + self.canvas.height / 2,
		];
	};
	
	this.addControls = function (controlList){
		if(!controlList) controlList = ['zoom','translate'];
		if(controlList.indexOf('zoom') != -1) {
			var mouseWheelHandler = function(e){
				var delta = e.wheelDelta || -e.deltaY;
				var factor = (delta>0.0)? 1.1: 1.0/1.1;
				
				var offset = getOffset(self.canvas);
				var scenePos = self.screenToScene(
					[ e.clientX - offset[0], e.clientY - offset[1] ]);
				
				self.viewCenter = [
					scenePos[0] + (self.viewCenter[0] - scenePos[0]) / factor,
					scenePos[1] + (self.viewCenter[1] - scenePos[1]) / factor
				];
				self.zoom *= factor;
				self.render();
				e.preventDefault();
			};

			self.canvas.addEventListener("wheel", mouseWheelHandler, false);
			self.canvas.addEventListener('mousewheel', mouseWheelHandler, false);
		}
		if(controlList.indexOf('translate') != -1) {
			var mouseUpHandler = function(e) {
				if(e.button === 0) {
					self.lastMousePos = [ e.clientX, e.clientY ];
					window.removeEventListener('mousemove', mouseMoveHandler);
					window.removeEventListener('mouseup', mouseUpHandler);
				}
			};
			var mouseDownHandler = function(e) {
				if(e.button === 0) {
					e.preventDefault();
					self.lastMousePos = [ e.clientX, e.clientY ];
					window.addEventListener('mousemove', mouseMoveHandler);
					window.addEventListener('mouseup', mouseUpHandler);
				}
			};
			var mouseMoveHandler = function(e) {
				self.viewCenter = [
					self.viewCenter[0] - (e.clientX-self.lastMousePos[0])/self.zoom,
					self.viewCenter[1] + (e.clientY-self.lastMousePos[1])/self.zoom
				];
				self.lastMousePos = [ e.clientX, e.clientY ];
				self.render();
			};
			
			self.canvas.addEventListener('mousedown', mouseDownHandler);
		}
	};

	this.initWebGL(idCanvas); // TODO: (later) Cavas 2D fallback ?
	this.render();
}
