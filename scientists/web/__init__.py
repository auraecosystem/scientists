"""Browser DOM adapter for the Scientists runtime.

The scientific core stays browser-independent. This package is an optional
PyScript presentation adapter for applications that need Python-driven DOM UI.
"""

from .elements import Element, create_element

__all__ = ["Element", "create_element"]
