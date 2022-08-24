from tucan.canonicalization import canonicalize_molecule
from tucan.serialization import serialize_molecule
from tucan.io import graph_from_molfile_text
from pyodide.ffi import to_js
import js

js.console.log("tucanweb.py is loading")

def serialize(m):
  return serialize_molecule(canonicalize_molecule(m))

# see https://pyodide.org/en/stable/usage/type-conversions.html#calling-python-objects-from-javascript
def molfile_to_tucan(molfile):
  graph = graph_from_molfile_text(molfile)
  result = ""
  if list(graph.edges):
    result = serialize(graph)
  return to_js(result)

molfile_to_tucan