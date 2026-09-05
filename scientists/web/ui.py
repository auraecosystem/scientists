"""Composable UI helpers built on the optional DOM adapter."""

from __future__ import annotations

from typing import Any, Callable

from scientists.core.models import AgentTask
from scientists.runtime.cli import build_runtime

from .elements import Element, create_element


RunCallback = Callable[[str], str]


def execute_prompt(prompt: str) -> str:
    """Execute a browser prompt through the deterministic Scientists runtime."""
    objective = prompt.strip()
    if not objective:
        return "Enter a scientific question or research objective."

    result = build_runtime().execute(
        AgentTask(id="pyscript-task", objective=objective)
    )
    evidence = ", ".join(result.evidence) if result.evidence else "none"
    return f"{result.answer}\n\nverified={result.verified} evidence={evidence}"


def mount_scientists_ui(
    container: Element,
    on_run: RunCallback = execute_prompt,
) -> dict[str, Element]:
    """Mount a Scientists prompt UI and connect it to a runtime callback."""
    heading = create_element("h1", "Aura Scientists")
    prompt = create_element(
        "input",
        placeholder="Ask a scientific question...",
        id="scientists-prompt",
    )
    button = create_element("button", "Run", id="scientists-run")
    output = create_element("div", id="scientists-output", classes=["scientists-output"])

    def handle_click(event: Any) -> None:
        try:
            output.text = on_run(str(prompt._dom_element.value))
        except Exception as exc:
            output.text = f"Scientists runtime error: {exc}"

    button.on("click", handle_click)
    container.append(heading, prompt, button, output)
    return {"heading": heading, "prompt": prompt, "button": button, "output": output}
