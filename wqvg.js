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

function Wqvg(idCanvas) {
	var self = this;

	this.initWebGL = function (idCanvas) {
		self.canvas = document.getElementById(idCanvas);
		if(!self.canvas) { alert("Erreur de chargement canvas"); return; }

		self.gl = null;
		try { self.gl = self.canvas.getContext("webgl") || self.canvas.getContext("experimental-webgl"); } 
		catch(e) {}
		if(!self.gl) {
			alert("Your web browser does not support WebGL. This demo won't work.");
			return;
		}
		self.gl = WebGLDebugUtils.makeDebugContext(self.gl);

		var vertCommonSrc = "\
			uniform highp mat4 viewMatrix;\n\
			attribute highp vec4 vx_position;\n\
			attribute mediump vec2 vx_triDataCoord;\n\
			attribute mediump vec3 vx_linearBasis;\n\
			varying mediump vec2 triDataCoord;\n\
			varying mediump vec3 linearBasis;\n\
			void main() {\n\
				gl_Position = viewMatrix * vx_position;\n\
				triDataCoord = vx_triDataCoord;\n\
//				triDataCoord = vx_position.xy;\n\
				linearBasis = vx_linearBasis;\n\
			}\n\
		";

		var fragTriangleSrc = "\
			uniform sampler2D color;\n\
			uniform mediump float offset;\n\
			varying mediump vec2 triDataCoord;\n\
			varying mediump vec3 linearBasis;\n\
			lowp vec4 quadraticInterp(in lowp vec4 colors[6]) {\n\
				return\n\
					colors[0] * linearBasis.x * (2. * linearBasis.x - 1.) +\n\
					colors[1] * linearBasis.y * (2. * linearBasis.y - 1.) +\n\
					colors[2] * linearBasis.z * (2. * linearBasis.z - 1.) +\n\
					colors[3] * 4. * linearBasis.y * linearBasis.z +\n\
					colors[4] * 4. * linearBasis.z * linearBasis.x +\n\
					colors[5] * 4. * linearBasis.x * linearBasis.y;\n\
			}\n\
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

		var fragSingularSrc = "\
			uniform sampler2D color;\n\
			uniform mediump float offset;\n\
			varying mediump vec2 triDataCoord;\n\
			varying mediump vec3 linearBasis;\n\
			lowp vec4 quadraticInterp(in lowp vec4 colors[6]) {\n\
				return\n\
					colors[0] * linearBasis.x * (2. * linearBasis.x - 1.) +\n\
					colors[1] * linearBasis.y * (2. * linearBasis.y - 1.) +\n\
					colors[2] * linearBasis.z * (2. * linearBasis.z - 1.) +\n\
					colors[3] * 4. * linearBasis.y * linearBasis.z +\n\
					colors[4] * 4. * linearBasis.z * linearBasis.x +\n\
					colors[5] * 4. * linearBasis.x * linearBasis.y;\n\
			}\n\
			void main() {\n\
				gl_FragColor = vec4(1., 0., 0., 1.);\n\
				gl_FragColor = vec4(linearBasis, 1.);\n\
				//gl_FragColor = vec4(triDataCoord*512., 0., 1.);\n\
				lowp vec4 colors[6];\n\
				colors[0] = ( texture2D(color, triDataCoord + vec2(offset*0., 0))\n\
							  + texture2D(color, triDataCoord + vec2(offset*3., 0)) ) * .5;\n\
				colors[1] = texture2D(color, triDataCoord + vec2(offset*1., 0));\n\
				colors[2] = texture2D(color, triDataCoord + vec2(offset*2., 0));\n\
				colors[3] = texture2D(color, triDataCoord + vec2(offset*4., 0));\n\
				colors[4] = texture2D(color, triDataCoord + vec2(offset*5., 0));\n\
				colors[5] = texture2D(color, triDataCoord + vec2(offset*6., 0));\n\
				gl_FragColor = quadraticInterp(colors);\n\
//				gl_FragColor = texture2D(color, triDataCoord);\n\
//				gl_FragColor = vec4(triDataCoord, 0., 1.);\n\
			}\n\
		";

		self.positionLoc = 0;
		self.triDataCoordLoc = 1;
		self.linearBasisLoc = 2;

		self.vertCommonShader = self.gl.createShader(self.gl.VERTEX_SHADER);
		self.gl.shaderSource(self.vertCommonShader, vertCommonSrc);
		self.gl.compileShader(self.vertCommonShader);
		if(!self.gl.getShaderParameter(self.vertCommonShader, self.gl.COMPILE_STATUS)) {
			console.log("vertCommon log:");
			console.log(self.gl.getShaderInfoLog(self.vertCommonShader));
		}

		self.fragTriangleShader = self.gl.createShader(self.gl.FRAGMENT_SHADER);
		self.gl.shaderSource(self.fragTriangleShader, fragTriangleSrc);
		self.gl.compileShader(self.fragTriangleShader);
		if(!self.gl.getShaderParameter(self.fragTriangleShader, self.gl.COMPILE_STATUS)) {
			console.log("fragTriangleShader log:\n");
			console.log(self.gl.getShaderInfoLog(self.fragTriangleShader));
		}

		self.fragSingularShader = self.gl.createShader(self.gl.FRAGMENT_SHADER);
		self.gl.shaderSource(self.fragSingularShader, fragSingularSrc);
		self.gl.compileShader(self.fragSingularShader);
		if(!self.gl.getShaderParameter(self.fragSingularShader, self.gl.COMPILE_STATUS)) {
			console.log("fragSingularShader log:\n");
			console.log(self.gl.getShaderInfoLog(self.fragSingularShader));
		}

		self.triangleProgram = self.gl.createProgram();
		self.gl.attachShader(self.triangleProgram, self.vertCommonShader);
		self.gl.attachShader(self.triangleProgram, self.fragTriangleShader);
		self.gl.bindAttribLocation(self.triangleProgram, self.positionLoc, "vx_position");
		self.gl.bindAttribLocation(self.triangleProgram, self.triDataCoordLoc, "vx_triDataCoord");
		self.gl.bindAttribLocation(self.triangleProgram, self.linearBasisLoc, "vx_linearBasis");
		self.gl.linkProgram(self.triangleProgram);
		if(!self.gl.getProgramParameter(self.triangleProgram, self.gl.LINK_STATUS)) {
			console.log("triangle program log:\n");
			console.log(self.gl.getProgramInfoLog(self.triangleProgram));
		}
		
		self.viewMatrixTriangleLoc = self.gl.getUniformLocation(self.triangleProgram, "viewMatrix")
		self.colorTriangleLoc = self.gl.getUniformLocation(self.triangleProgram, "color")
		self.offsetTriangleLoc = self.gl.getUniformLocation(self.triangleProgram, "offset")
		
		self.singularProgram = self.gl.createProgram();
		self.gl.attachShader(self.singularProgram, self.vertCommonShader);
		self.gl.attachShader(self.singularProgram, self.fragSingularShader);
		self.gl.bindAttribLocation(self.singularProgram, self.positionLoc, "vx_position");
		self.gl.bindAttribLocation(self.singularProgram, self.triDataCoordLoc, "vx_triDataCoord");
		self.gl.bindAttribLocation(self.singularProgram, self.linearBasisLoc, "vx_linearBasis");
		self.gl.linkProgram(self.singularProgram);
		if(!self.gl.getProgramParameter(self.singularProgram, self.gl.LINK_STATUS)) {
			console.log("singular program log:\n");
			console.log(self.gl.getProgramInfoLog(self.singularProgram));
		}
		
		self.viewMatrixSingularLoc = self.gl.getUniformLocation(self.singularProgram, "viewMatrix")
		self.colorSingularLoc = self.gl.getUniformLocation(self.singularProgram, "color")
		self.offsetSingularLoc = self.gl.getUniformLocation(self.singularProgram, "offset")

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

		self.gl.clearColor(0.0, 0.0, 0.0, 1.0); // fond noir
		self.gl.viewport(0, 0, self.canvas.width, self.canvas.height);
		
		self.viewCenter = [ .5, .5 ];
		self.zoom = 550.;
	};

	this.render = function(){
		console.log("Render");

		self.gl.clear(self.gl.COLOR_BUFFER_BIT);

		var viewMatrix = [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		];
		viewMatrix[0] = 2.*self.zoom / self.canvas.width;
		viewMatrix[5] = 2.*self.zoom / self.canvas.height;
		viewMatrix[12] = -self.viewCenter[0] * viewMatrix[0];
		viewMatrix[13] = -self.viewCenter[1] * viewMatrix[5];
//		console.log("viewMatrix:", viewMatrix);
		if(self.nbTriangle && self.nbTriangle != 0) {
			self.gl.useProgram(self.triangleProgram);
			
			if(self.viewMatrixTriangleLoc)
				self.gl.uniformMatrix4fv(self.viewMatrixTriangleLoc, false, viewMatrix);
			
			if(self.colorTriangleLoc) {
				self.gl.activeTexture(self.gl.TEXTURE0);
				self.gl.bindTexture(self.gl.TEXTURE_2D, self.colorTexture);
				self.gl.uniform1i(self.colorTriangleLoc, 0);
			}
			
			if(self.offsetTriangleLoc)
				self.gl.uniform1f(self.offsetTriangleLoc, 1./self.colorTextureWidth);

			self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.vertexBuffer);

			self.gl.enableVertexAttribArray(self.positionLoc);
			self.gl.vertexAttribPointer(self.positionLoc, 2,
					self.gl.FLOAT, false, self.nbVxComponent*4, 0);

			self.gl.enableVertexAttribArray(self.triDataCoordLoc);
			self.gl.vertexAttribPointer(self.triDataCoordLoc, 2,
					self.gl.FLOAT, false, self.nbVxComponent*4, 2*4);

			self.gl.enableVertexAttribArray(self.linearBasisLoc);
			self.gl.vertexAttribPointer(self.linearBasisLoc, 3,
					self.gl.FLOAT, false, self.nbVxComponent*4, 4*4);

			self.gl.drawArrays(self.gl.TRIANGLES, 0, self.nbTriangle*3);

			self.gl.disableVertexAttribArray(self.linearBasisLoc);
			self.gl.disableVertexAttribArray(self.triDataCoordLoc);
			self.gl.disableVertexAttribArray(self.positionLoc);
		}
		
		if(self.nbSingular && self.nbSingular != 0) {
			self.gl.useProgram(self.singularProgram);
			
			if(self.viewMatrixSingularLoc)
				self.gl.uniformMatrix4fv(self.viewMatrixSingularLoc, false, viewMatrix);

			if(self.colorSingularLoc) {
				self.gl.activeTexture(self.gl.TEXTURE0);
				self.gl.bindTexture(self.gl.TEXTURE_2D, self.colorTexture);
				self.gl.uniform1i(self.colorSingularLoc, 0);
			}
			
			if(self.offsetSingularLoc)
				self.gl.uniform1f(self.offsetSingularLoc, 1./self.colorTextureWidth);

			self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.vertexBuffer);

			self.gl.enableVertexAttribArray(self.positionLoc);
			self.gl.vertexAttribPointer(self.positionLoc, 2,
					self.gl.FLOAT, false, self.nbVxComponent*4, 0);

			self.gl.enableVertexAttribArray(self.triDataCoordLoc);
			self.gl.vertexAttribPointer(self.triDataCoordLoc, 2,
					self.gl.FLOAT, false, self.nbVxComponent*4, 2*4);

			self.gl.enableVertexAttribArray(self.linearBasisLoc);
			self.gl.vertexAttribPointer(self.linearBasisLoc, 3,
					self.gl.FLOAT, false, self.nbVxComponent*4, 4*4);

			self.gl.drawArrays(self.gl.TRIANGLES, self.nbTriangle*3, self.nbSingular*3);

			self.gl.disableVertexAttribArray(self.linearBasisLoc);
			self.gl.disableVertexAttribArray(self.triDataCoordLoc);
			self.gl.disableVertexAttribArray(self.positionLoc);
		}
	};

	this.loadWqvg = function (wqvgBlob){
		var reader = new FileReader();
		reader.onload = function(event) {
			var rawBuffer = event.target.result;

			var pos = 0;
			var nbHeaderInt = 5; // 5 Uint32
			if(nbHeaderInt * 4 > rawBuffer.byteLength) { console.log("Error: Unexpected end of file."); return; }
			var header = new Uint32Array(rawBuffer, pos, nbHeaderInt);
			pos += nbHeaderInt * 4;

			if(header[0] != 0x67767177 || header[1] != 1) {
				console.log("Error: file with wrong header.");
				return;
			}
			var nbVertex = header[2];
			var nbTriangle = header[3];
			var nbSingular = header[4];
			console.log("nbVertex:", nbVertex);
			console.log("nbTriangle:", nbTriangle);
			console.log("nbSingular:", nbSingular);

			var vertexDataSize = (2 * nbVertex) * 4;
			if(pos + vertexDataSize > rawBuffer.byteLength) { console.log("Error: Unexpected end of file."); return; }
			console.log("nbCoord:", vertexDataSize, "pos:", pos);
			var vertexArray = new Float32Array(rawBuffer, pos, 2 * nbVertex);
//			console.log(vertexArray);
			pos += vertexDataSize;

			var nbIndex = 3 * (nbTriangle+nbSingular);
			if(pos + nbIndex * 4 > rawBuffer.byteLength) { console.log("Error: Unexpected end of file."); return; }
			var indexArray = new Uint32Array(rawBuffer, pos, nbIndex);
			pos += nbIndex * 4;
//			console.log(indexArray);

			var nbColor = 6*nbTriangle + 7*nbSingular;
			if(pos + nbColor * 4 > rawBuffer.byteLength) { console.log("Error: Unexpected end of file."); return; }
			var colorArray = new Uint32Array(rawBuffer, pos, nbColor);
			pos += nbColor * 4;
//			console.log(colorArray);

			self.initBuffers(nbTriangle, nbSingular,
				vertexArray, indexArray, colorArray);

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

		self.nbVxComponent = 7;
		self.nbTriangleComponent = 6;
		self.nbSingularComponent = 7;
		
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
		self.vertexArray = new Float32Array((self.nbTriangle+self.nbSingular) * 3 * self.nbVxComponent);
		self.colorTextureArray = new Uint32Array(self.colorTextureWidth * self.colorTextureHeight);
		var index = 0;
		var halfTexelX = .5 / self.colorTextureWidth;
		var halfTexelY = .5 / self.colorTextureHeight;
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
				self.vertexArray[index++] = (vx == 0)? 1: 0;
				self.vertexArray[index++] = (vx == 1)? 1: 0;
				self.vertexArray[index++] = (vx == 2)? 1: 0;
			}
			var baseDataIndex = dataCoordX + dataCoordY*self.colorTextureWidth;
			for(var col=0; col<nbColor; ++col) {
				self.colorTextureArray[baseDataIndex + col] = colors[colorIndex++];
			}
		}
//		console.log("vertexArray:", self.vertexArray);
//		console.log("textureSize:", self.colorTextureWidth, self.colorTextureHeight);
		self.colorTextureArray = new Uint8Array(self.colorTextureArray.buffer);
//		console.log("colorTextureArray:", self.colorTextureArray);
		
		if(self.vertexBuffer === undefined)
			self.vertexBuffer = self.gl.createBuffer();
		self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.vertexBuffer);
		self.gl.bufferData(self.gl.ARRAY_BUFFER, self.vertexArray, self.gl.STATIC_DRAW);
		
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
		self.zoom = ((zoomX < zoomY)? zoomX: zoomY) * .95;
	};

/*	this.loadShader = function(shaderId) {
		var elem = document.getElementById(shaderId);
		if(!elem)
			return null;

		var shaderType =
			(elem.type == "x-shader/x-vertex")? gl.VERTEX_SHADER:
			(elem.type == "x-shader/x-fragment")? gl.FRAGMENT_SHADER: null;
		
		if(!shaderType)
			return null;
			
		var source = 0;
		var content = elem.firstChild;
		while(content) {
			if(content.nodeType == content.TEXT_NODE)
				source += content.textContent;
			content = content.nextSibling;
		}
	
		self.vertexShader = gl.createShader(shaderType);
		gl.shaderSource(self.vertexShader, source);
		gl.compileShader(self.vertexShader);
		if(!gl.getShaderParameter(self.vertexShader, gl.COMPILE_STATUS)) {
			console.log("Vertex shader log:");
			console.log(gl.getShaderInfoLog(self.vertexShader));
		}
	};*/

	this.initWebGL(idCanvas); // prévoir fallback canvas 2D
	this.render();
}
