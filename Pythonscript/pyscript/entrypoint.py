"""PyScript browser entrypoint for the Scientists runtime.

This module is intentionally small: PyScript owns the browser lifecycle while
``scientists.web`` owns DOM adaptation and the core Scientists runtime remains
independent of the browser.
"""

from pyscript import document

from scientists.web import Element
from scientists.web.ui import mount_scientists_ui


def mount() -> dict[str, Element]:
    """Mount Scientists into the page element with id ``scientists-app``."""
    container = document.querySelector("#scientists-app")
    if container is None:
        raise RuntimeError("Missing #scientists-app container")
    return mount_scientists_ui(Element(container))


mount()
