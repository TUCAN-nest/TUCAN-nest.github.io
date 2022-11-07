"use strict";

function onBodyLoad() {
  clearLog();
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
    ketcher.editor.options({"showHydrogenLabels":"off"});
  } else {
    setTimeout(() => onKetcher1Loaded(), 0);
  }
}

function onChangeInKetcher1() {
  if (getKetcher("ketcher1").editor.struct().isBlank()) {
    clearLog();
    writeResult("", "tucanFromEditor");
  }
}

async function getMolfileFromKetcher1() {
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

function onKetcher2Loaded() {
  const ketcher = getKetcher("ketcher2");
  if (ketcher) {
    ketcher.editor.options({"showHydrogenLabels":"off"});
  } else {
    setTimeout(() => onKetcher2Loaded(), 0);
  }
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
    "scipy",
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
  document.getElementById("btnConvertTucanToCanonicalTucan").disabled = false;
  clearLog();
  writeLog("Python environment was loaded. Have fun with TUCAN!");
}

async function convertMolfileFromEditor() {
  document.getElementById("btnConvertMolfileFromEditor").disabled = true;

  try {
    clearLog();
    writeResult("", "tucanFromEditor");

    const tucan = await molfileToTucan(getMolfileFromKetcher1());

    writeResult(tucan, "tucanFromEditor");
    writeLog("TUCAN successfully generated from drawn structure.");
  } catch (e) {
    writeLog("An error occured during the serialization to TUCAN - this might be due to an incorrect Molfile:\n" + e);
  }

  document.getElementById("btnConvertMolfileFromEditor").disabled = false;
}

async function convertMolfileFromTextarea() {
  document.getElementById("btnConvertMolfileFromTextarea").disabled = true;

  try {
    clearLog();
    writeResult("", "tucanFromMolfile");

    const tucan = await molfileToTucan(Promise.resolve(document.getElementById("molfileTextarea").value));

    writeResult(tucan, "tucanFromMolfile");
    writeLog("TUCAN successfully generated from Molfile.");
  } catch (e) {
    writeLog("An error occured during the serialization to TUCAN. This might be due to an incorrect Molfile. Error:\n" + e);
  }

  document.getElementById("btnConvertMolfileFromTextarea").disabled = false;
}

async function molfileToTucan(molfilePromise) {
  const [molfile_to_tucan] = await tucanwebPyPromise;
  return molfile_to_tucan(await molfilePromise);
}

async function convertTucanToMolfileInEditor() {
  document.getElementById("btnConvertTucanToMolfileInEditor").disabled = true;

  try {
    // clear outputs
    clearLog();
    clearKetcher2();
    document.getElementById("nonCanonicalTucanAlert1").hidden = true;

    // get necessary data
    const tucan = document.getElementById("tucanTextarea1").value.trim();

    // transform data
    const [molfile, canonicalTucan] = await tucanToMolfile(tucan, false);

    // fill outputs
    if (tucan !== canonicalTucan) {
        document.getElementById("nonCanonicalTucanAlert1").hidden = false;
        document.getElementById("canonicalTucan1").innerHTML = canonicalTucan;
    }
    await setMoleculeInKetcher2(molfile);
    writeLog("Molfile successfully generated from TUCAN");
  } catch (e) {
    writeLog("An error occured during the conversion to Molfile. This might be due to an incorrect TUCAN string. Error:\n" + e);
  }

  document.getElementById("btnConvertTucanToMolfileInEditor").disabled = false;
}

async function convertTucanToMolfileInTextarea() {
  document.getElementById("btnConvertTucanToMolfileInTextarea").disabled = true;

  try {
    // clear outputs
    clearLog();
    writeResult("", "molfileFromTucan");
    document.getElementById("nonCanonicalTucanAlert2").hidden = true;

    // get necessary data
    const tucan = document.getElementById("tucanTextarea2").value.trim();
    const calcCoordinates = document.getElementById("calcCoordinatesCheckbox").checked;

    // transform data
    const [molfile, canonicalTucan] = await tucanToMolfile(tucan, calcCoordinates)

    // fill outputs
    if (tucan !== canonicalTucan) {
        document.getElementById("nonCanonicalTucanAlert2").hidden = false;
        document.getElementById("canonicalTucan2").innerHTML = canonicalTucan;
    }
    writeResult(molfile, "molfileFromTucan");
    writeLog("Molfile successfully generated from TUCAN");
  } catch (e) {
    writeLog("An error occured during the conversion to Molfile. This might be due to an incorrect TUCAN string. Error:\n" + e);
  }

  document.getElementById("btnConvertTucanToMolfileInTextarea").disabled = false;
}

async function tucanToMolfile(tucan, calcCoordinates) {
  const [, tucan_to_molfile] = await tucanwebPyPromise;
  return tucan_to_molfile(tucan, calcCoordinates);
}

async function convertTucanToCanonicalTucan() {
  document.getElementById("btnConvertTucanToCanonicalTucan").disabled = true;

  try {
    // clear outputs
    clearLog();
    writeResult("", "canonicalTucan");
    document.getElementById("canonicalTucanAlert").hidden = true;

    // get necessary data
    const tucan = document.getElementById("tucanTextarea3").value.trim();

    // transform data
    const [, canonicalTucan] = await tucanToMolfile(tucan, false)

    // fill outputs
    if (tucan === canonicalTucan) {
        document.getElementById("canonicalTucanAlert").hidden = false;
    }
    writeResult(canonicalTucan, "canonicalTucan");
    writeLog("Canonical TUCAN successfully generated from TUCAN");
  } catch (e) {
    writeLog("An error occured during the conversion to canonical TUCAN. This might be due to an incorrect TUCAN string. Error:\n" + e);
  }

  document.getElementById("btnConvertTucanToCanonicalTucan").disabled = false;
}

function writeResult(text, id) {
  document.getElementById(id).innerHTML = text;
}

function writeLog(text) {
  const logText = new Date().toLocaleTimeString() + ": " + text;

  // escape HTML tags
  const textNode = document.createTextNode(logText);

  document.getElementById("log").appendChild(textNode);
}

function clearLog() {
  document.getElementById("log").innerHTML = "";
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
  const lines = content.split(/\r?\n/);
  if (lines.length < 4 || !lines[3].endsWith("V3000")) {
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
