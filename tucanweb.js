"use strict";

function onBodyLoad() {
  writeLog("Loading Pyodide and the TUCAN package. This may take a few seconds ...");
}

function getKetcher() {
  return document.getElementById("ketcher").contentWindow.ketcher;
}

function onKetcherLoaded() {
  // Chrome fires the onload event too early, so we might need to wait until 'ketcher' exists.
  const ketcher = getKetcher();
  if (ketcher) {
    ketcher.editor.subscribe("change", data => onChangeInKetcher());
  } else {
    setTimeout(() => onKetcherLoaded(), 0);
  }
}

function onChangeInKetcher() {
  if (getKetcher().editor.struct().isBlank()) {
    writeTucan("", "tucanFromEditor");
  }
}

async function getMolfileFromKetcher() {
  let molfile = await getKetcher().getMolfile("v3000");
  if (document.getElementById("addImplicitHydrogensCheckbox").checked) {
    molfile = addHsToMolfile(molfile);
  }
  return molfile;
}

function addHsToMolfile(molfile) {
  const molObj = OCL.Molecule.fromMolfile(molfile);
  molObj.addImplicitHydrogens();
  return molObj.toMolfileV3();
}

async function startPyodide() {
  const pyodide = await loadPyodide();
  await pyodide.loadPackage("micropip");
  const micropip = pyodide.pyimport("micropip");
  await micropip.install("texttable");

  const packages = [
    "networkx",
    "dist/igraph-0.9.11-cp310-cp310-emscripten_3_1_14_wasm32.whl",
    "dist/tucan-0.1.0-py2.py3-none-any.whl"
  ];
  await pyodide.loadPackage(packages);

  console.log("Pyodide is ready!");
  return pyodide;
}

var pyodidePromise = startPyodide();

async function loadTucanwebPy() {
  const [pyodide, code] = await Promise.all([pyodidePromise, (await fetch("tucanweb.py")).text()]);
  return pyodide.runPythonAsync(code);
}

var molfile_to_tucanPromise = loadTucanwebPy();

function reloadTucanwebPy() {
  molfile_to_tucanPromise = loadTucanwebPy();
}

function onFinishLoad() {
  document.getElementById("btnConvertEditor").disabled = false;
  document.getElementById("btnConvertMolfile").disabled = false;
  writeLog("Python environment was loaded. Have fun with TUCAN!");
}

async function convertFromEditor() {
  document.getElementById("btnConvertEditor").disabled = true;
  convertToTucan(await getMolfileFromKetcher(), "tucanFromEditor");
  document.getElementById("btnConvertEditor").disabled = false;
}

async function convertFromTextarea() {
  document.getElementById("btnConvertMolfile").disabled = true;
  convertToTucan(Promise.resolve(document.getElementById("textarea").value), "tucanFromMolfile")
  document.getElementById("btnConvertMolfile").disabled = false;
}

async function convertToTucan(molfilePromise, outputPreId) {
  const molfile_to_tucan = await molfile_to_tucanPromise;
  try {
    const tucan = molfile_to_tucan(await molfilePromise);
    writeTucan(tucan, outputPreId);
  } catch (e) {
    console.error(e);
    writeLog("An error occured during the serialization to TUCAN. This might be due to an incorrect Molfile. Check your browser console (F12) for details.");
  }
}

function writeTucan(tucan, id) {
  document.getElementById(id).innerHTML = tucan;
}

function writeLog(text) {
  document.getElementById("log").innerHTML = new Date().toLocaleTimeString() + ": " + text;
}

molfile_to_tucanPromise.then(() => onFinishLoad());

function onTextareaDragover(event) {
  event.stopPropagation();
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
}

async function onTextareaDrop(event) {
  event.stopPropagation();
  event.preventDefault();

  const content = await extractContent(event.dataTransfer);
  if (!content) {
    return;
  }

  // make sure we only insert V3000 Molfiles
  const lines = content.match(/[^\r\n]+/g);
  if (lines.length < 3 || !lines[2].endsWith("V3000")) {
    writeLog("Drag-and-drop: You may only drag-and-drop V3000 Molfiles.")
    return;
  }

  document.getElementById("textarea").value = content;
}

async function extractContent(dataTransfer) {
  const items = dataTransfer.items;
  if (!items || items.length == 0) {
    return null;
  }
  const item = items[0];

  if (item.kind === "file") {
    return await item.getAsFile().text();
  } else if (item.kind === "string") {
    return new Promise(resolve => {
      item.getAsString(data => resolve(data));
    });
  }
  return null;
}
