"""Composable UI helpers built on the optional DOM adapter."""

from __future__ import annotations

from typing import Any

from .elements import Element, create_element


def mount_scientists_ui(container: Element, on_run: Any) -> dict[str, Element]:
    """Mount a minimal Scientists prompt UI into an existing container."""
    heading = create_element("h1", "Aura Scientists")
    prompt = create_element("input", placeholder="Ask a scientific question...", id="scientists-prompt")
    button = create_element("button", "Run", id="scientists-run")
    output = create_element("div", id="scientists-output", classes=["scientists-output"])

    def handle_click(event: Any) -> None:
        on_run(prompt._dom_element.value, output, event)

    button.on("click", handle_click)
    container.append(heading, prompt, button, output)
    return {"heading": heading, "prompt": prompt, "button": button, "output": output}
