from scientists.web import Element, create_element
from scientists.web.ui import mount_scientists_ui


def test_web_exports_are_importable_without_pyScript_runtime() -> None:
    assert Element is not None
    assert callable(create_element)
    assert callable(mount_scientists_ui)


def test_web_adapter_does_not_import_pyscript_eagerly() -> None:
    import sys

    assert "pyscript" not in sys.modules
