// This file is part of wvg, a web viewer for vector gradients.

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

(function(){
	var idCanvas = 'demo-wqvg';
	var idContentBloc = 'content_bloc';

    // Canvas and wqvg initialisation
	var contentBloc = document.getElementById(idContentBloc);
	var bigCanvas = document.getElementById(idCanvas);
	var webglErrorMessage = document.getElementById("webgl_error_message");
    var fileChooser = document.getElementById('wqvgFilename');
    var infoText = document.getElementById("info_text");

    var samples_buttons = document.getElementsByClassName("wqvg_sample");

    try {
    	var wqvg = new WqvgViewer(idCanvas);
    }
    catch(e) {
        bigCanvas.style.display = "none";
        webglErrorMessage.style.display = "block";
        return;
    }
	wqvg.addControls();

	fileChooser.addEventListener("change", loadWqvgFromFile, false); 

	function loadWqvgFromFile(event) {
		wqvg.loadWqvg(event.target.files[0]);
	}

    // Automatic resizing of the canvas
    function resizeDemoCanvas() {
        console.log("Resize:", contentBloc.clientWidth, contentBloc.clientHeight);
        wqvg.resize(contentBloc.clientWidth, contentBloc.clientHeight);
    }
    window.addEventListener("resize", resizeDemoCanvas, false);
    resizeDemoCanvas();

    wqvg.onload = function(wqvg) {
        infoText.innerHTML = wqvg.qvgComment
            .replace(/\n/g, "<br />")
            .replace(/(http:\/\/\S*)/g, "<a href=\"$1\">$1</a>");
    }

    // File loading
    var wqvgRequest = null;
    var sampleId = null;
    var terminateWqvgFromHttp = function() {
        if(wqvgRequest !== null && wqvgRequest.readyState !== 4) {
            console.log("Abort loading sample '"+sampleId+"' from HTTP.");
            wqvgRequest.abort();
        }
        wqvgRequest = null;
        if(sampleId) {
            var sampleElem = document.getElementById(sampleId);
            if(sampleElem) {
                sampleElem.classList.remove("selected_sample");
                var progressBar = sampleElem.getElementsByTagName("progress")[0];
                progressBar.style.display = "none";
            }
        }
        sampleId = null;
    }

    var loadWqvgFromHttp = function(id) {
        terminateWqvgFromHttp();

        sampleId = id;
        console.log("Loading '"+sampleId+"' from HTTP...");

        try {
    	    var wqvgRequest = new XMLHttpRequest();
	        wqvgRequest.open("GET", "sample/"+sampleId+".wqvg", true);
	        wqvgRequest.responseType = "blob";

	        wqvgRequest.addEventListener("load", function(e) {
                console.log("Successfully loaded '"+sampleId+"' from HTTP.");
		        wqvg.loadWqvg(e.target.response);
                terminateWqvgFromHttp();
	        }, false);
	        wqvgRequest.addEventListener("error", function(e) {
                console.log("'"+sampleId+"' loading failed.");
                terminateWqvgFromHttp();
	        }, false);
	        wqvgRequest.addEventListener("progress", function(e) {
                if(e.lengthComputable)
                    progressBar.value = e.loaded / e.total;
	        }, false);

            var sampleElem = document.getElementById(sampleId);
            if(sampleElem)
                sampleElem.classList.add("selected_sample");

            var progressBar = sampleElem.getElementsByTagName("progress")[0];
            progressBar.style.display = "block";
            progressBar.value = 0;

        	wqvgRequest.send();
        }
        catch(e) {
            console.error("Failed to load '"+sampleId+"' from HTTP.");
            console.error(e.name + ": " + e.message);
            terminateWqvgFromHttp();
        }
    }

    var loadSample = function(e) {
        loadWqvgFromHttp(e.target.id);
    }

    for(var i=0; i<samples_buttons.length; ++i) {
        samples_buttons[i].addEventListener("click", loadSample, false);
    }
})();

