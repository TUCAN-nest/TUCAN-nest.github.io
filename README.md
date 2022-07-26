# Invoking TUCAN in the browser via PyScript

## Unsolved problems / showstoppers
- The igraph library is required by TUCAN, but it is [not shipped by Pyodide](https://pyodide.org/en/stable/usage/packages-in-pyodide.html) (networkx is ...). Unfortunately, [igraph does not supply](https://pypi.org/project/igraph/#files) pure (i.e. architecture-independent) wheels and thus cannot be used by Pyodide's package management.

## Install
- Clone TUCAN repository: `git clone https://github.com/JanCBrammer/TUCAN.git`
- Checkout last commit of TUCAN before igraph was introduced: `cd TUCAN; git checkout ca6d4f86cf439ab9dba453326a3de5f18b04f18e`
- Remove the rdkit dependency in pyproject.toml and the code using rdkit in tucan/io.py.
- Build a Python wheel from TUCAN: `python3 -m pip install build; python3 -m build`
- Start a simple HTTP server: `cd ..; python3 -m http.server`

## Limitations / Problems
- Unlike `pip install`, the `paths` directive of `<py-env>` cannot be used with a GitHub repo URL.
- The TUCAN library needs to be distributed via the local web server due to CORS policies.
- [Pyscript's `<py-button>` is broken at the moment](https://github.com/pyscript/pyscript/issues/485#issuecomment-1184788100). The workaround is a [Python proxy](https://www.jhanley.com/pyscript-javascript-callbacks/).