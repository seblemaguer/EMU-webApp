'use strict';

angular.module('emuwebApp')
	.service('Ssffparserservice', function Ssffparserservice($q, viewState) {

		// shared service object
		var sServObj = {};

		var worker = new Worker('scripts/workers/ssffParserWorker.js');
		var defer;

		worker.addEventListener('message', function (e) {
			// console.log('Worker said: ', e.data);
			defer.resolve(e.data);
		}, false);

		sServObj.parseSsffArr = function (ssffArray) {
			defer = $q.defer();
			worker.postMessage({
				'cmd': 'parseArr',
				'ssffArr': ssffArray
			}); // Send data to our worker. 
			return defer.promise;
		};

		return sServObj;

		// sServObj.vs = viewState;

		// sServObj.ssffData = {};

		// sServObj.headID = 'SSFF -- (c) SHLRC\n';
		// sServObj.machineID = 'Machine IBM-PC\n';
		// sServObj.sepString = '-----------------\n';

		// sServObj.ssffData.ssffTrackName = '';
		// sServObj.ssffData.sampleRate = -1;
		// sServObj.ssffData.startTime = -1;
		// sServObj.ssffData.origFreq = -1;
		// sServObj.ssffData.Columns = [];


		// /**
		//  * convert arraybuffer containing a ssff file
		//  * to a javascript object
		//  * @param buf arraybuffer containing ssff file
		//  * @param name is ssffTrackName
		//  * @returns ssff javascript object
		//  */
		// sServObj.ssff2jso = function (buf, name) {
		// 	var my = this;
		// 	sServObj.ssffData.ssffTrackName = name;
		// 	sServObj.ssffData.Columns = [];
		// 	// console.log('SSFF loaded');

		// 	var uIntBuffView = new Uint8Array(buf);

		// 	// Causes "RangeError: Maximum call stack size exceeded"
		// 	// with some browsers (?)(Chrome/Chromium on Ubuntu)
		// 	//var buffStr = String.fromCharCode.apply(null, uIntBuffView);
		// 	var buffStr = '';
		// 	var i;
		// 	for (i = 0; i < uIntBuffView.length; i++) {
		// 		buffStr = buffStr + String.fromCharCode(uIntBuffView[i]);
		// 	}

		// 	var newLsep = buffStr.split(/^/m);

		// 	//check if header has headID and machineID
		// 	if (newLsep[0] !== my.headID) {
		// 		alert('SSFF parse error: first line != SSFF -- (c) SHLRC');
		// 		return;
		// 	}
		// 	if (newLsep[1] !== my.machineID) {
		// 		alert('SSFF parse error: machineID != Machine IBM-PC');
		// 		return;
		// 	}

		// 	// search header for Record_Freq and Start_Time
		// 	this.ssffData.sampleRate = undefined;
		// 	this.ssffData.startTime = undefined;
		// 	var counter = 0;
		// 	while (newLsep[counter] !== this.sepString) {
		// 		if (newLsep[counter].split(/[ ,]+/)[0] === 'Record_Freq') {
		// 			// console.log("FOUND Record_Freq")
		// 			this.ssffData.sampleRate = parseFloat(newLsep[counter].split(/[ ,]+/)[1].replace(/(\r\n|\n|\r)/gm, ''));
		// 		}
		// 		if (newLsep[counter].split(/[ ,]+/)[0] === 'Start_Time') {
		// 			// console.log("FOUND Start_Time")
		// 			this.ssffData.startTime = parseFloat(newLsep[counter].split(/[ ,]+/)[1].replace(/(\r\n|\n|\r)/gm, ''));
		// 		}
		// 		counter += 1;
		// 	}

		// 	// check if found Record_Freq and Start_Time
		// 	if (this.ssffData.sampleRate === undefined || this.ssffData.startTime === undefined) {
		// 		alert('SSFF parse error: Required fields Record_Freq or Start_Time not set!');
		// 	}


		// 	for (var i = 4; i < newLsep.length; i++) {
		// 		if (newLsep[i].split(/[ ,]+/)[0] === 'Original_Freq') {
		// 			this.ssffData.origFreq = parseFloat(newLsep[i].split(/[ ,]+/)[2].replace(/(\r\n|\n|\r)/gm, ''));
		// 		}
		// 		if (newLsep[i] === this.sepString) {
		// 			break;
		// 		}
		// 		var lSpl = newLsep[i].split(/[ ]+/);

		// 		if (lSpl[0] === 'Column') {
		// 			this.ssffData.Columns.push({
		// 				'name': lSpl[1],
		// 				'ssffdatatype': lSpl[2],
		// 				'length': parseInt(lSpl[3].replace(/(\r\n|\n|\r)/gm, ''), 10),
		// 				'values': []
		// 			});
		// 		}
		// 	}

		// 	var curBinIdx = newLsep.slice(0, i + 1).join('').length;

		// 	var curBufferView, curBuffer, curLen;

		// 	while (curBinIdx <= uIntBuffView.length) {

		// 		for (i = 0; i < this.ssffData.Columns.length; i++) {
		// 			//console.log(this.ssffData.Columns[i].length);
		// 			if (this.ssffData.Columns[i].ssffdatatype === 'DOUBLE') {
		// 				curLen = 8 * this.ssffData.Columns[i].length;
		// 				curBuffer = buf.subarray(curBinIdx, curLen);
		// 				curBufferView = new Float64Array(curBuffer);
		// 				this.ssffData.Columns[i].values.push(Array.prototype.slice.call(curBufferView));
		// 				curBinIdx += curLen;

		// 			} else if (this.ssffData.Columns[i].ssffdatatype === 'FLOAT') {
		// 				curLen = 4 * this.ssffData.Columns[i].length;
		// 				curBuffer = buf.subarray(curBinIdx, curLen);
		// 				curBufferView = new Float32Array(curBuffer);
		// 				this.ssffData.Columns[i].values.push(Array.prototype.slice.call(curBufferView));
		// 				curBinIdx += curLen;

		// 			} else if (this.ssffData.Columns[i].ssffdatatype === 'SHORT') {
		// 				curLen = 2 * this.ssffData.Columns[i].length;
		// 				curBuffer = buf.subarray(curBinIdx, curLen);
		// 				curBufferView = new Uint16Array(curBuffer);
		// 				this.ssffData.Columns[i].values.push(Array.prototype.slice.call(curBufferView));
		// 				curBinIdx += curLen;

		// 			} else if (this.ssffData.Columns[i].ssffdatatype === 'BYTE') {
		// 				curLen = 1 * this.ssffData.Columns[i].length;
		// 				curBuffer = buf.subarray(curBinIdx, curLen);
		// 				curBufferView = new Uint8Array(curBuffer);
		// 				this.ssffData.Columns[i].values.push(Array.prototype.slice.call(curBufferView));
		// 				curBinIdx += curLen;
		// 			} else {
		// 				alert('not supported... only doubles, floats, short  column types and for now');
		// 				return;
		// 			}

		// 		} //for
		// 	} //while
		// 	// console.log(this.ssffData);
		// 	// console.log(JSON.stringify(this.ssffData, undefined, 2));
		// 	return this.ssffData;

		// };

		// /**
		//  * convert javascript object of label file to
		//  * array buffer containing
		//  * @param ssff javascipt object
		//  * @returns ssff arraybuffer
		//  */
		// sServObj.jso2ssff = function (jso) {
		// 	var my = this;
		// 	// create header
		// 	var headerStr = this.headID + this.machineID;
		// 	headerStr += 'Record_Freq ' + this.vs.round(jso.sampleRate, 1) + '\n';
		// 	headerStr += 'Start_Time ' + jso.startTime + '\n';

		// 	jso.Columns.forEach(function (col) {
		// 		// console.log(col.name)
		// 		headerStr += 'Column ' + col.name + ' ' + col.ssffdatatype + ' ' + col.length + '\n';
		// 	});

		// 	headerStr += 'Original_Freq DOUBLE ' + this.vs.round(jso.origFreq, 1) + '\n';
		// 	headerStr += this.sepString;

		// 	// convert buffer to header
		// 	var ssffBufView = new Uint8Array(this.stringToUint(headerStr));

		// 	var curBufferView, curArray;

		// 	curBufferView = new Uint16Array(jso.Columns[0].length);
		// 	curArray = jso.Columns[0].values[0];

		// 	// loop through vals and append array of each column to ssffBufView
		// 	jso.Columns[0].values.forEach(function (curArray, curArrayIDX) {
		// 		jso.Columns.forEach(function (curCol) {
		// 			if (curCol.ssffdatatype === 'SHORT') {
		// 				curBufferView = new Uint16Array(curCol.length);
		// 				curCol.values[curArrayIDX].forEach(function (val, valIDX) {
		// 					curBufferView[valIDX] = val;
		// 				});
		// 				var tmp = new Uint8Array(curBufferView.buffer);
		// 				ssffBufView = my.Uint8Concat(ssffBufView, tmp);
		// 			} else {
		// 				alert('Only SHORT columns supported for now!!!');
		// 				return;
		// 			}
		// 		});
		// 	});

		// 	// console.log(String.fromCharCode.apply(null, ssffBufView));
		// 	return ssffBufView.buffer;
		// };

		// /**
		//  * helper function to convert string to Uint8Array
		//  * @param string
		//  */
		// sServObj.stringToUint = function (string) {
		// 	// var string = btoa(unescape(encodeURIComponent(string)));
		// 	var charList = string.split('');
		// 	var uintArray = [];
		// 	for (var i = 0; i < charList.length; i++) {
		// 		uintArray.push(charList[i].charCodeAt(0));
		// 	}
		// 	return new Uint8Array(uintArray);
		// };

		// /**
		//  *
		//  */
		// sServObj.Uint8Concat = function (first, second) {
		// 	var firstLength = first.length;
		// 	var result = new Uint8Array(firstLength + second.length);

		// 	result.set(first);
		// 	result.set(second, firstLength);

		// 	return result;
		// };

		// return sServObj;

	});