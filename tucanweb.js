"use strict";

function onBodyload() {
  startEditor();
  writeOutputText("Loading Pyodide and the TUCAN package. This may take a few seconds ...");
}

var editor;

function startEditor() {
  editor = window.OCL.StructureEditor.createSVGEditor("editor", 1);
}

function getMolfileFromEditor() {
  let origMol = editor.getMolecule();
  let molecule = new OCL.Molecule(origMol.getAllAtoms(), origMol.getAllBonds());
  origMol.copyMolecule(molecule);
  molecule.addImplicitHydrogens();
  return molecule.toMolfileV3();
}

async function startPyodide() {
  let pyodide = await loadPyodide();
  await pyodide.loadPackage("micropip");
  const micropip = pyodide.pyimport("micropip");
  await micropip.install("texttable");

  let packages = [
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
  let [pyodide, code] = await Promise.all([pyodidePromise, (await fetch("tucanweb.py")).text()]);
  return pyodide.runPythonAsync(code);
}

var molfile_to_tucanPromise = loadTucanwebPy();

function reloadTucanwebPy() {
  molfile_to_tucanPromise = loadTucanwebPy();
}

function onFinishLoad() {
  document.getElementById("btnConvertEditor").disabled = false;
  document.getElementById("btnConvertMolfile").disabled = false;
  writeOutputText("Python environment was loaded. Have fun with TUCAN!");
}

async function convertToTucan(molfile) {
  let molfile_to_tucan = await molfile_to_tucanPromise;
  try {
    let tucan = molfile_to_tucan(molfile);
    writeOutputText(tucan);
  } catch (e) {
    console.error(e);
    writeOutputText("An error occured during the serialization to TUCAN. This might be due to an incorrect Molfile. Check your browser console (F12) for details.");
  }
}

function writeOutputText(text) {
  document.getElementById("outputtext").innerHTML = text;
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
  if (!lines[2].endsWith("V3000")) {
    console.log("You may only drag-and-drop V3000 Molfiles!")
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
