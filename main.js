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
	bigCanvas = document.getElementById(idCanvas);
//	bigCanvas.width = document.width;
//	bigCanvas.height = document.height-42;

	var wqvg = new WqvgViewer(idCanvas);
	wqvg.addControls();

	document.getElementById('wqvgFilename').addEventListener("change", loadWqvgFromFile, false); 

	function loadWqvgFromFile(event) {
		wqvg.loadWqvg(event.target.files[0]);
	}


	// loading default Image
	var defaultImage = new XMLHttpRequest();
	defaultImage.open("GET", "data.wqvg", true);
	defaultImage.responseType = "blob";

	defaultImage.onload = function(e) {
		wqvg.loadWqvg(e.target.response);
	};

	defaultImage.send();
})();
