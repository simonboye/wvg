function Wqvg(idCanvas){
	var self = this;

	this.initWebGL = function (idCanvas) {
	    var canvas = document.getElementById(idCanvas);
	    if(!canvas) { alert("Erreur de chargement canvas"); return; }

		var gl = null;
		try { gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl"); } 
		catch(e) {
			alert("WebGL non pris en chage par votre navigateur, merci d'utiliser firefox ou google chrome en dernière version"); return;
		}

		self.vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(self.vertexShader, "attribute highp vec2 vx_position;\nvoid main() {\ngl_Position = vec4(vx_position-vec2(.5, .5), .0, 1.);\n}\n");
		gl.compileShader(self.vertexShader);
		if(!gl.getShaderParameter(self.vertexShader, gl.COMPILE_STATUS)) {
			console.log("Vertex shader log:");
			console.log(gl.getShaderInfoLog(self.vertexShader));
		}

		self.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(self.fragmentShader, "void main() {\ngl_FragColor = vec4(1., 0., 0., 1.);\n}\n");
		gl.compileShader(self.fragmentShader);
		if(!gl.getShaderParameter(self.fragmentShader, gl.COMPILE_STATUS)) {
			console.log("Fragment shader log:\n");
			console.log(gl.getShaderInfoLog(self.fragmentShader));
		}

		self.triangleProgram = gl.createProgram();
		gl.attachShader(self.triangleProgram, self.vertexShader);
		gl.attachShader(self.triangleProgram, self.fragmentShader);
		gl.linkProgram(self.triangleProgram);
		if(!gl.getProgramParameter(self.triangleProgram, gl.LINK_STATUS)) {
			console.log("Triangle program log:\n");
			console.log(gl.getProgramInfoLog(self.triangleProgram));
		}


		self.nbVertex = 3;
		self.nbTriangle = 1;
		self.nbSingular = 0;

		self.vertexArray = new Float32Array(6);
		self.vertexArray[0] = 0; self.vertexArray[1] = 0;
		self.vertexArray[2] = 1; self.vertexArray[3] = 0;
		self.vertexArray[4] = 0; self.vertexArray[5] = 1;

		self.indexArray = new Uint16Array(3);
		for(var i=0; i<3; ++i)
			self.indexArray[i] = i;

		self.vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, self.vertexArray, gl.STATIC_DRAW);

		self.indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, self.indexArray, gl.STATIC_DRAW);

		gl.clearColor(0.0, 0.0, 0.0, 1.0); // fond noir
		gl.viewport(0, 0, canvas.width, canvas.height);

		return gl;
	}

	this.render = function(){
		self.gl.clear(this.gl.COLOR_BUFFER_BIT);

		if(self.nbTriangle == 0)
			return;

		self.gl.useProgram(self.triangleProgram);

		var positionLoc = self.gl.getAttribLocation(self.triangleProgram, "vx_position");
		if(positionLoc >= 0) {
			self.gl.enableVertexAttribArray(positionLoc);
			self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.vertexBuffer);
			self.gl.vertexAttribPointer(positionLoc, 2, self.gl.FLOAT, false, 8, 0);
			console.log("OKI !");
		}

		self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, self.indexBuffer);
		self.gl.drawElements(self.gl.TRIANGLES, (self.nbTriangle + self.nbSingular) * 3, self.gl.UNSIGNED_SHORT, 0);
		console.log(self.nbTriangle);

		if(positionLoc >= 0)
			self.gl.disableVertexAttribArray(positionLoc);
	}

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
			self.nbVertex = header[2];
			self.nbTriangle = header[3];
			self.nbSingular = header[4];
			console.log("nbVertex:", self.nbVertex);
			console.log("nbTriangle:", self.nbTriangle);
			console.log("nbSingular:", self.nbSingular);

			var vertexDataSize = (2 * self.nbVertex) * 4;
			if(pos + vertexDataSize > rawBuffer.byteLength) { console.log("Error: Unexpected end of file."); return; }
			console.log("nbCoord:", vertexDataSize, "pos:", pos);
			self.vertexArray = new Float32Array(rawBuffer, pos, 2 * self.nbVertex);
			console.log(self.vertexArray);
			pos += vertexDataSize;

			var nbIndex = 3 * (self.nbTriangle+self.nbSingular);
			if(pos + nbIndex * 4 > rawBuffer.byteLength) { console.log("Error: Unexpected end of file."); return; }
			var indexArrayTmp = new Uint32Array(rawBuffer, pos, nbIndex);
			self.indexArray = new Uint16Array(indexArrayTmp);
			pos += nbIndex * 2;
			console.log(self.indexArray);

			self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.vertexBuffer);
			self.gl.bufferData(self.gl.ARRAY_BUFFER, self.vertexArray, self.gl.STATIC_DRAW);

			self.gl.bindBuffer(self.gl.ELEMENT_ARRAY_BUFFER, self.indexBuffer);
			self.gl.bufferData(self.gl.ELEMENT_ARRAY_BUFFER, self.indexArray, self.gl.STATIC_DRAW);

			self.render();
		};
		reader.onerror = function(event) {
			console.log("Error: cannot read blob.");
		};
		reader.readAsArrayBuffer(wqvgBlob);
	}

	this.gl = this.initWebGL(idCanvas); // prévoir fallback canvas 2D
	this.render();
}