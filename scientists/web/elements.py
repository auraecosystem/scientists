"""Small, dependency-light PyScript DOM adapter.

PyScript is imported lazily so importing ``scientists.web`` does not make the
scientific Python runtime depend on a browser. DOM objects are intentionally
kept behind this adapter boundary.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Any


class Element:
    """Pythonic wrapper around a browser DOM element exposed by PyScript."""

    def __init__(self, dom_element: Any) -> None:
        self._dom_element = dom_element

    @property
    def id(self) -> str:
        return str(self._dom_element.id)

    @id.setter
    def id(self, value: str) -> None:
        self._dom_element.id = value

    @property
    def text(self) -> str:
        return str(self._dom_element.textContent or "")

    @text.setter
    def text(self, value: str) -> None:
        self._dom_element.textContent = value

    @property
    def classes(self) -> Any:
        return self._dom_element.classList

    @property
    def style(self) -> Any:
        return self._dom_element.style

    @property
    def children(self) -> list[Element]:
        return [Element(child) for child in self._dom_element.children]

    @property
    def parent(self) -> Element | None:
        parent = self._dom_element.parentElement
        return None if parent is None else Element(parent)

    def attr(self, name: str, value: Any = None) -> Any:
        """Get an attribute when value is omitted, otherwise set it."""
        if value is None:
            return self._dom_element.getAttribute(name)
        self._dom_element.setAttribute(name, str(value))
        return value

    def add_class(self, *names: str) -> Element:
        self._dom_element.classList.add(*names)
        return self

    def remove_class(self, *names: str) -> Element:
        self._dom_element.classList.remove(*names)
        return self

    def set_style(self, **styles: str) -> Element:
        for name, value in styles.items():
            css_name = name.replace("_", "-")
            self._dom_element.style.setProperty(css_name, value)
        return self

    def append(self, *items: Any) -> Element:
        for item in items:
            if isinstance(item, Element):
                self._dom_element.appendChild(item._dom_element)
            elif isinstance(item, (str, int, float, bool)):
                self._dom_element.append(str(item))
            elif isinstance(item, Iterable) and not isinstance(item, (bytes, bytearray, Mapping)):
                self.append(*item)
            else:
                self._dom_element.appendChild(item)
        return self

    def find(self, selector: str) -> list[Element]:
        return [Element(node) for node in self._dom_element.querySelectorAll(selector)]

    def on(self, event: str, handler: Any) -> Element:
        """Attach a browser event handler through PyScript's proxy mechanism."""
        from pyscript import create_proxy

        self._dom_element.addEventListener(event, create_proxy(handler))
        return self

    def show_me(self) -> Element:
        self._dom_element.scrollIntoView()
        return self

    def focus(self) -> Element:
        self._dom_element.focus()
        return self


def create_element(tag: str, text: str | None = None, **attributes: Any) -> Element:
    """Create a DOM element using PyScript's browser document."""
    from pyscript import document

    element = Element(document.createElement(tag))
    if text is not None:
        element.text = text
    for name, value in attributes.items():
        if name == "classes":
            class_names = value.split() if isinstance(value, str) else list(value)
            element.add_class(*class_names)
        elif name == "style":
            element.set_style(**value)
        elif name.startswith("on_"):
            element.on(name[3:], value)
        else:
            element.attr(name.rstrip("_"), value)
    return element
