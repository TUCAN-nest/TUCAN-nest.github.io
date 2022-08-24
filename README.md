# Invoking TUCAN in the browser via Pyodide

## Run
- Start a simple HTTP server: `python3 -m http.server`

## Building the wheels
- Clone TUCAN repository: `git clone https://github.com/JanCBrammer/TUCAN.git`
- Build a Python wheel for TUCAN: `cd TUCAN; python3 -m pip install build; python3 -m build`

- Build the igraph wheel: not yet automated, see [python-igraph#560](https://github.com/igraph/python-igraph/issues/560)

## Limitations / Problems
- The additional Python wheels need to be distributed via the local web server due to CORS policies.
