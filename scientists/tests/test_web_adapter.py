from scientists.web import Element, create_element
from scientists.web.ui import execute_prompt, mount_scientists_ui


def test_web_exports_are_importable_without_pyscript_runtime() -> None:
    assert Element is not None
    assert callable(create_element)
    assert callable(execute_prompt)
    assert callable(mount_scientists_ui)


def test_web_adapter_does_not_import_pyscript_eagerly() -> None:
    import sys

    assert "pyscript" not in sys.modules


def test_execute_prompt_uses_scientists_runtime() -> None:
    result = execute_prompt("Explain the scientific method")

    assert result.startswith("Objective: Explain the scientific method")
    assert "aura:scientific-method" in result
    assert "verified=True" in result


def test_execute_prompt_rejects_empty_objective() -> None:
    assert execute_prompt("   ") == "Enter a scientific question or research objective."
