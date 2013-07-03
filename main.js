(function(){
	var idCanvas = 'demo-wqvg';
	var defaultWqvg = new Blob([atob('d3F2ZwEAAAAFAAAAAgAAAAEAAAAAAAAAAAAAAAAAgD8AAAAAAADAPwAAAD8AAIA/AACAPwAAAAAAAIA/AAAAAAEAAAADAAAAAQAAAAIAAAADAAAAAwAAAAQAAAAAAAAA/wAA//8A/wD//wAA/39/f/9/f3//f39/////AP//AP//AP///39/f/9/f3//f39//wAAAP//////AAD///8AAP9/f3//f39//39/fw==')]);
	bigCanvas = document.getElementById(idCanvas);
	bigCanvas.width = document.width;
	bigCanvas.height = document.height-42;

    var wqvg = new Wqvg(idCanvas);
    // wqvg.loadWqvg(defaultWqvg);

    document.getElementById('wqvgFilename').addEventListener("change", loadWqvgFromFile, false); 
	// var dataFileRequest = new XMLHttpRequest();
	// dataFileRequest.open("GET", wqvgFile, true);
	// dataFileRequest.responseType = "arraybuffer";

	// dataFileRequest.onload = loadWqvg;
	// dataFileRequest.onerror = fileLoadError;

	// dataFileRequest.send(null);

	function loadWqvgFromFile(event) {
		wqvg.loadWqvg(event.target.files[0]);
	}


	function loadWqvg(event){
		alert('readed!');
	  var arrayBuffer = dataFileRequest.response; // Note: not dataFileRequest.responseText
	  if (arrayBuffer) {
	    var byteArray = new Uint8Array(arrayBuffer);
	    for (var i = 0; i < byteArray.byteLength; i++) {
	      // do something with each byte in the array
	    }
	  }
	}

	function fileLoadError(event) {
		alert("File could not be read! Code " + event.target.error.code);
	};


})();
