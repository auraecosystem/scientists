# Scientists PyScript browser entrypoint

This directory contains the optional PyScript browser integration for Aura Scientists.

`scientists.html` provides a local page shell with a `#scientists-app` mount point. Its local PyScript entrypoint is `pyscript/entrypoint.py`.

The entrypoint mounts the `scientists.web` DOM adapter and connects the prompt to the deterministic Scientists runtime through `mount_scientists_ui`.

The browser adapter remains optional. The core Python runtime does not import PyScript eagerly, so normal command-line and server execution remain browser-independent.

## Runtime requirement

The page expects a PyScript-capable host/runtime to execute the local `type="py"` module. This repository does not redirect the page to third-party documentation or remote example pages.
