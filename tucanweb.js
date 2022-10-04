"use strict";

function onBodyLoad() {
  writeLog("Loading Pyodide and the TUCAN package. This may take a few seconds ...");
}

function getKetcher(id) {
  return document.getElementById(id).contentWindow.ketcher;
}

function onKetcher1Loaded() {
  // Chrome fires the onload event too early, so we might need to wait until 'ketcher' exists.
  const ketcher = getKetcher("ketcher1");
  if (ketcher) {
    ketcher.editor.subscribe("change", data => onChangeInKetcher1());
    ketcher.editor.options({"showHydrogenLabels":"Hetero"});
  } else {
    setTimeout(() => onKetcher1Loaded(), 0);
  }
}

function onChangeInKetcher1() {
  if (getKetcher("ketcher1").editor.struct().isBlank()) {
    writeResult("", "tucanFromEditor");
  }
}

async function getMolfileFromKetcher() {
  let molfile = await getKetcher("ketcher1").getMolfile("v3000");
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

async function setMoleculeInKetcher2(molfile) {
  await getKetcher("ketcher2").setMolecule(molfile);
}

function clearKetcher2() {
  getKetcher("ketcher2").editor.clear();
}

async function startPyodide() {
  const pyodide = await loadPyodide();
  await pyodide.loadPackage("micropip");
  const micropip = pyodide.pyimport("micropip");
  await micropip.install(["texttable", "antlr4-python3-runtime==4.11.1"]);

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

var tucanwebPyPromise = loadTucanwebPy();

function reloadTucanwebPy() {
  tucanwebPyPromise = loadTucanwebPy();
}

function onFinishLoad() {
  document.getElementById("btnConvertMolfileFromEditor").disabled = false;
  document.getElementById("btnConvertMolfileFromTextarea").disabled = false;
  document.getElementById("btnConvertTucanToMolfileInEditor").disabled = false;
  document.getElementById("btnConvertTucanToMolfileInTextarea").disabled = false;
  writeLog("Python environment was loaded. Have fun with TUCAN!");
}

async function convertMolfileFromEditor() {
  document.getElementById("btnConvertMolfileFromEditor").disabled = true;
  molfileToTucan(await getMolfileFromKetcher(), "tucanFromEditor");
  document.getElementById("btnConvertMolfileFromEditor").disabled = false;
}

async function convertMolfileFromTextarea() {
  document.getElementById("btnConvertMolfileFromTextarea").disabled = true;
  molfileToTucan(Promise.resolve(document.getElementById("molfileTextarea").value), "tucanFromMolfile");
  document.getElementById("btnConvertMolfileFromTextarea").disabled = false;
}

async function molfileToTucan(molfilePromise, outputPreId) {
  writeResult("", outputPreId);
  const [molfile_to_tucan] = await tucanwebPyPromise;
  try {
    const tucan = molfile_to_tucan(await molfilePromise);
    writeResult(tucan, outputPreId);
  } catch (e) {
    console.error(e);
    writeLog("An error occured during the serialization to TUCAN. This might be due to an incorrect Molfile. Check your browser console (F12) for details.");
  }
}

async function convertTucanToMolfileInEditor() {
  document.getElementById("btnConvertTucanToMolfileInEditor").disabled = true;
  clearKetcher2();
  await tucanToMolfile(document.getElementById("tucanTextarea1").value, async(molfile) => await setMoleculeInKetcher2(molfile));
  document.getElementById("btnConvertTucanToMolfileInEditor").disabled = false;
}

async function convertTucanToMolfileInTextarea() {
  document.getElementById("btnConvertTucanToMolfileInTextarea").disabled = true;
  tucanToMolfile(document.getElementById("tucanTextarea2").value, molfile => writeResult(molfile, "molfileFromTucan"));
  document.getElementById("btnConvertTucanToMolfileInTextarea").disabled = false;
}

async function tucanToMolfile(tucan, action) {
  const [, tucan_to_molfile] = await tucanwebPyPromise;
  try {
    const molfile = tucan_to_molfile(tucan);
    await action(molfile);
  } catch (e) {
    console.error(e);
    writeLog("An error occured during the conversion to Molfile. This might be due to an incorrect TUCAN string. Check your browser console (F12) for details.");
  }
}

function writeResult(text, id) {
  document.getElementById(id).innerHTML = text;
}

function writeLog(text) {
  document.getElementById("log").innerHTML = new Date().toLocaleTimeString() + ": " + text;
}

tucanwebPyPromise.then(() => onFinishLoad());

function onTextareaDragover(event) {
  event.stopPropagation();
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
}

async function onMolfileTextareaDrop(event) {
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

  document.getElementById("molfileTextarea").value = content;
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
