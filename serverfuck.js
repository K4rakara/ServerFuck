// ServerFuck
// ===============================================================================================
// A backend that runs on BrainFuck.
// Sorry not sorry.
// ===============================================================================================
// Copyright (C) 2019 Karakara.
// Liscensed under the MIT liscense, see LISCENSE for details.


// Includes ======================================================================================
const http = require('http');
const fs = require('fs');
const path = require('path');


// Variables =====================================================================================
let config = require('./config.json');


// Functions =====================================================================================
let tools = {
	verbose : (msg) => {
		if (config.verbose) {
			console.log(msg);
		}
	},
	bfVerbose : (msg) => {
		if (config.bfVerbose) {
			console.log(msg);
		}
	},
	prevOccur : (str, target, pos) => {
		return str.lastIndexOf(target, pos);
	},
	nextOccur : (str, target, pos) => {
		return str.indexOf(target, pos);
	},
	toHex : (num) => {
		return num.toString(16);
	}
};

let brainfuckInterp = (code, input) => { // I made this interpreter from scratch, so its probably very inefficient.
	tools.verbose('Starting execution of BrainFuck code...');
	let bfInputPointer = 0;
	let bfOutputBuffer = '';
	let bfExecPointer = 0;
	let bfMemoryPointer = 0;
	let bfMemory = [];
	for (let i = 0; i < 65536; i++) {
		bfMemory.push(0);
	}
	while (bfExecPointer < code.length) { // Execute code.
		let op = code.substring(bfExecPointer, bfExecPointer + 1); // Current operand.
		if (op === '>') { // Move data pointer forward.
			let before = bfMemoryPointer;
			bfMemoryPointer++;
			if (bfMemoryPointer > 65536) { // fake 16-bit overflow.
				bfMemoryPointer = 0;
			}
			tools.bfVerbose(`${brainfuckOperandInfo(op, bfExecPointer)} Moved data pointer forwards (Was 0x${tools.toHex(before)}, now is 0x${tools.toHex(bfMemoryPointer)}).`);
		} else if (op === '<') { // Move data pointer backward.
			let before = bfMemoryPointer;
			bfMemoryPointer--;
			if (bfMemoryPointer < 0) { // fake 16-bit underflow.
				bfMemoryPointer = 65536;
			}
			tools.bfVerbose(`${brainfuckOperandInfo(op, bfExecPointer)} Moved data pointer backwards (Was 0x${tools.toHex(before)}, now is 0x${tools.toHex(bfMemoryPointer)}).`);
		} else if (op === '+') { // Increase value at the memory pointer.
			let before = bfMemory[bfMemoryPointer];
			bfMemory[bfMemoryPointer]++;
			if (bfMemory[bfMemoryPointer] > 255) { // fake 8-bit overflow.
				bfMemory[bfMemoryPointer] = 0;
			}
			tools.bfVerbose(`${brainfuckOperandInfo(op, bfExecPointer)} Increased value at 0x${tools.toHex(bfMemoryPointer)} by 1. (Was ${before}, now is ${bfMemory[bfMemoryPointer]}).`);
		} else if (op === '-') { // Decrease value at the memory pointer.
			let before = bfMemory[bfMemoryPointer];
			bfMemory[bfMemoryPointer]--;
			if (bfMemory[bfMemoryPointer] < 0) { // fake 8-bit underflow.
				bfMemory[bfMemoryPointer] = 255;
			}
			tools.bfVerbose(`${brainfuckOperandInfo(op, bfExecPointer)} Decreased value at 0x${tools.toHex(bfMemoryPointer)} by 1. (Was ${before}, now is ${bfMemory[bfMemoryPointer]}).`);
		} else if (op === '.') { // Output value from the memory pointer.
			let out = String.fromCharCode(bfMemory[bfMemoryPointer]);
			bfOutputBuffer = bfOutputBuffer.concat(out);
			tools.bfVerbose(`${brainfuckOperandInfo(op, bfExecPointer)} Added "${out}" to output buffer.\n${brainfuckIndentLog()}${(' ').repeat(10)}--> Current output buffer: ${bfOutputBuffer}`);
		} else if (op === ',') { // Input value to the memory pointer.
			let inp = input.substring(bfInputPointer, bfInputPointer+1);
			bfMemory[bfMemoryPointer] = inp.charCodeAt(0);
			bfInputPointer++;
			tools.bfVerbose(`${brainfuckOperandInfo(op, bfExecPointer)} Got "${inp}" from input buffer and wrote it to 0x${tools.toHex(bfMemoryPointer)}.`);
		} else if (op === '[') { // Conditional begin.
			let result = false; // If the condition resulted true.
			if (bfMemory[bfMemoryPointer] === 0) {
				let jumpTo = tools.nextOccur(code, ']', bfExecPointer);
				bfExecPointer = jumpTo;
				result = true;
			}
			tools.bfVerbose(`${brainfuckOperandInfo(op, bfExecPointer)} Is ${tools.toHex(bfMemoryPointer)} == 0? Result: ${result ? 'yes' : 'no'}.\n${brainfuckIndentLog()}${(' ').repeat(10)}${result ? `--> Jump to character #${bfExecPointer}.` : `--> Continue.`}`);
		} else if (op == ']') { // Conditional end.
			let result = false; // If the condition resulted true.
			if (bfMemory[bfMemoryPointer] != 0) {
				let jumpTo = tools.prevOccur(code, '[', bfExecPointer);
				bfExecPointer = jumpTo;
				result = true;
			}
			tools.bfVerbose(`${brainfuckOperandInfo(op, bfExecPointer)} Is ${tools.toHex(bfMemoryPointer)} != 0? Result: ${!result ? 'yes' : 'no'}.\n${brainfuckIndentLog()}${(' ').repeat(10)}${result ? `--> Jump to character #${bfExecPointer}.` : `--> Continue.`}`);
		}
		tools.bfVerbose(brainfuckIndentLog());
		bfExecPointer++;
	}
	tools.verbose('Completed execution of BrainFuck code.');
	return bfOutputBuffer;
};

let brainfuckIndentLog = () => {
	return `${('░').repeat(10)} `;
};

let brainfuckOperandInfo = (op, execPointer) => {
	return `${brainfuckIndentLog()}Operand at character #${execPointer}: ${op}\n${brainfuckIndentLog()}${(' ').repeat(10)}-->`; // Returns a string of "operand at character #x: y \n (tab here)-->"
};

let brainfuckGetFile = (file) => {
	let content = '';
	if (file == 'none') {
		tools.verbose('No script file specified.');
		content = '-[--->+<]>-------.-[--->+<]>.[--->+<]>-----.---[->++++<]>-.+++[->+++<]>+.-[--->+<]>----.---------.+++++++.++++.[---->+<]>+++.[-->+++++++<]>.++.---.+++++++.[------>+<]>.-----.+.-.-[--->+<]>.';
	} else {
		data = fs.readFileSync(path.join('./', file), 'utf-8');
		content = data;
	}
	return content;
};


// Initalize =====================================================================================
tools.verbose('Loading configuration...');

// Load in the config.
let fileContent = fs.readFileSync('./config.json');
let jsonContent = JSON.parse(fileContent);
if (typeof jsonContent.onRequest != 'undefined') config.onRequest = jsonContent.onRequest;
if (typeof jsonContent.verbose != 'undefined') config.verbose = jsonContent.verbose;
if (typeof jsonContent.bfVerbose != 'undefined') config.bfVerbose = jsonContent.bfVerbose; 
tools.verbose('Loaded configuration.');


// Start server ==================================================================================
tools.verbose('Creating server object...');
http.createServer(async (req, res) => {
	tools.verbose('New HTTP request detected.');
	tools.verbose('Handling HTTP request...');
	let script = brainfuckGetFile(config.onRequest);
	let output = brainfuckInterp(script, req.url.substring(1));
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.write(output);
	res.end();
}).listen(8080);
tools.verbose('Created server object.');
console.log('Server running on http://localhost:8080.');
