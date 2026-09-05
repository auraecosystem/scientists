from pyscript import web


# Create a simple div.
div = web.div("Hello, World!")

# Create with attributes.
link = web.a("Click me", href="https://example.com", target="_blank")

# Create with classes and styles.
button = web.button(
    "Submit",
    classes=["primary", "large"],
    style={"background-color": "blue", "color": "white"},
    id="submit-btn"
)
class Element:
    """
    The base class for all [HTML elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements).

    Provides a Pythonic interface to DOM elements with support for attributes,
    events, styles, classes, and DOM manipulation. It can create new elements
    or wrap existing DOM elements.

    Elements are typically created using the tag-specific classes found
    within this namespace (e.g. `web.div`, `web.span`, `web.button`):

    ```python
    from pyscript import web


    # Create a simple div.
    div = web.div("Hello, World!")

    # Create with attributes.
    link = web.a("Click me", href="https://example.com", target="_blank")

    # Create with classes and styles.
    button = web.button(
        "Submit",
        classes=["primary", "large"],
        style={"background-color": "blue", "color": "white"},
        id="submit-btn"
    )
    ```

    !!! info

        Some elements have an underscore suffix in their class names (e.g.
        `select_`, `input_`).

        This is to avoid clashes with Python keywords. The underscore is removed
        when determining the actual HTML tag name.

    Wrap existing DOM elements found on the page:

    ```python
    # Find and wrap an element by CSS selector.
    existing = web.page.find(".my_class")[0]

    # Or, better, just use direct ID lookup (with or without the
    # leading '#').
    existing = web.page["my-element"]
    ```

    Element attributes are accessible as Python properties:

    ```python
    # Get attributes.
    element_id = div.id
    element_title = div.title
    element_href = link.href

    # Set attributes.
    div.id = "new-id"
    div.title = "Tooltip text"
    link.href = "https://new-url.com"

    # HTML content.
    div.innerHTML = "<b>Bold text</b>"
    div.textContent = "Plain text"
    ```

    CSS classes are managed through a `set`-like interface:

    ```python
    # Add classes.
    element.classes.add("active")
    element.classes.add("highlighted")

    # Remove classes.
    element.classes.remove("inactive")
    element.classes.discard("maybe-missing")  # No error if absent

    # Check membership.
    if "active" in element.classes:
        print("Element is active")

    # Iterate over classes.
    for cls in element.classes:
        print(cls)
    ```

    Explicit CSS styles are managed through a `dict`-like interface:

    ```python
    # Set styles using CSS property names (hyphenated).
    element.style["color"] = "red"
    element.style["background-color"] = "#f0f0f0"
    element.style["font-size"] = "16px"

    # Get styles.
    color = element.style["color"]

    # Remove styles.
    del element.style["margin"]
    ```

    Add, find, and navigate elements:

    ```python
    # Append children.
    parent.append(child_element)
    parent.append(child1, child2, child3)  # Multiple at once

    # Find descendants using CSS selectors.
    buttons = parent.find("button")
    items = parent.find(".item-class")

    # Navigate the tree.
    child = parent.children[0]
    parent_elem = child.parent

    # Access children by index or slice.
    first_child = parent[0]
    first_three = parent[0:3]

    # Get a child explicitly by ID. Returns None if not found.
    specific = parent["child-id"]
    ```

    Attach event listeners to elements:

    ```python
    button = web.button("Click me")

    # Use the @when decorator with event name.
    from pyscript import when

    @when("click", button)
    def handle_click(event):
        print("Clicked!")

    # Or use the on_* event directly with @when.
    @when(button.on_click)
    def handle_click(event):
        print("Also works!")

    # Pass handlers during element creation.
    button = web.button("Click", on_click=handle_click)
    ```

    Update multiple properties at once:

    ```python
    element.update(
        classes=["active", "highlighted"],
        style={"color": "red", "font-size": "20px"},
        id="updated-id",
        title="New tooltip"
    )
    ```

    !!! warning
        **Some HTML attributes clash with Python keywords and use trailing
        underscores**.

    Use `for_` instead of `for`, and `class_` instead of `class`.

    ```python
    # The 'for' attribute (on labels)
    label = web.label("Username", for_="username-input")

    # The 'class' attribute (although 'classes' is preferred)
    div.class_ = "my-class"
    ```

    Create copies of elements:

    ```python
    original = web.div("Original content", id="original")
    clone = original.clone(clone_id="cloned")
    ```

    Access the underlying DOM element when needed:

    ```python
    # Most DOM properties and methods are accessible directly.
    element.focus()
    element.scrollIntoView()
    bounding_rect = element.getBoundingClientRect()

    # Or access the raw DOM element.
    dom_element = element._dom_element
    ```
    """

    # Lookup table: tag name -> Element subclass.
    element_classes_by_tag_name = {}

    @classmethod
    def get_tag_name(cls):
        """
        Get the HTML tag name for this class.

        Classes ending with underscore (e.g. `input_`) have it removed to get
        the actual HTML tag name.
        """
        return cls.__name__.replace("_", "")

    @classmethod
    def register_element_classes(cls, element_classes):
        """
        Register `Element` subclasses for tag-based lookup.
        """
        for element_class in element_classes:
            tag_name = element_class.get_tag_name()
            cls.element_classes_by_tag_name[tag_name] = element_class

    @classmethod
    def unregister_element_classes(cls, element_classes):
        """
        Unregister `Element` subclasses from tag-based lookup.
        """
        for element_class in element_classes:
            tag_name = element_class.get_tag_name()
            cls.element_classes_by_tag_name.pop(tag_name, None)

    @classmethod
    def wrap_dom_element(cls, dom_element):
        """
        Wrap a DOM element in the appropriate `Element` subclass.

        Looks up the subclass by tag name. Unknown tags use the base `Element`
        class.
        """
        element_cls = cls.element_classes_by_tag_name.get(
            dom_element.tagName.lower(), cls
        )
        return element_cls(dom_element=dom_element)

    def __init__(self, dom_element=None, classes=None, style=None, **kwargs):
        """
        Create or wrap a DOM element.

        If `dom_element` is `None`, this creates a new element. Otherwise wraps
        the provided DOM element. The `**kwargs` can include HTML attributes
        and event handlers (names starting with `on_`).
        """
        # Create or wrap the DOM element.
        if is_none(dom_element):
            self._dom_element = document.createElement(type(self).get_tag_name())
        else:
            self._dom_element = dom_element
        # Event handling.
        self._on_events = {}
        self.update(classes=classes, style=style, **kwargs)

    def __eq__(self, obj):
        """
        Check equality by comparing underlying DOM elements.
        """
        return isinstance(obj, Element) and obj._dom_element == self._dom_element

    def __getitem__(self, key):
        """
        Get an item within this element.

        Behaviour depends on the key type:

        - Integer: returns the child at that index.
        - Slice: returns a collection of children in that slice.
        - String: looks up an element by id (with or without '#' prefix).

        ```python
        element[0]          # First child.
        element[1:3]        # Second and third children.
        element["my-id"]    # Element with id="my-id" (or None).
        element["#my-id"]   # Same as above (# is optional).
        ```
        """

        if isinstance(key, (int, slice)):
            return self.children[key]
        if isinstance(key, str):
            return _find_by_id(self._dom_element, key)
        raise TypeError(
            f"Element indices must be integers, slices, or strings, "
            f"not {type(key).__name__}."
        )

    def __getattr__(self, name):
        """
        Get an attribute from the element.

        Attributes starting with `on_` return `Event` instances. Other
        attributes are retrieved from the underlying DOM element.
        """
        if name.startswith("on_"):
            return self.get_event(name)
        dom_name = self._normalize_attribute_name(name)
        return getattr(self._dom_element, dom_name)

    def __setattr__(self, name, value):
        """
        Set an attribute on the element.

        Private attributes (starting with `_`) are set on the Python object.
        Public attributes are set on the underlying DOM element. Attributes
        starting with `on_` are treated as events.
        """
        if name.startswith("_"):
            super().__setattr__(name, value)
        elif name.startswith("on_"):
            # Separate events...
            self.get_event(name).add_listener(value)
        else:
            # ...from regular attributes.
            dom_name = self._normalize_attribute_name(name)
            setattr(self._dom_element, dom_name, value)

    def _normalize_attribute_name(self, name):
        """
        Normalize Python attribute names to DOM attribute names.

        Removes trailing underscores and maps special cases.
        """
        if name.endswith("_"):
            name = name[:-1]
        if name == "for":
            return "htmlFor"
        if name == "class":
            return "className"
        return name

    def get_event(self, name):
        """
        Get an `Event` instance for the specified event name.

        Event names must start with `on_` (e.g. `on_click`). Creates and
        caches `Event` instances that are triggered when the DOM event fires.
        """
        if not name.startswith("on_"):
            raise ValueError("Event names must start with 'on_'.")
        event_name = name[3:]  # Remove 'on_' prefix.
        if not hasattr(self._dom_element, event_name):
            raise ValueError(f"Element has no '{event_name}' event.")
        if name in self._on_events:
            return self._on_events[name]
        # Create Event instance and wire it to the DOM event.
        ev = Event()
        self._on_events[name] = ev
        self._dom_element.addEventListener(event_name, create_proxy(ev.trigger))
        return ev

    @property
    def children(self):
        """
        Return this element's children as an `ElementCollection`.
        """
        return ElementCollection.wrap_dom_elements(self._dom_element.children)

    @property
    def classes(self):
        """
        Return the element's CSS classes as a `set`-like `Classes` object.

        Supports set operations: `add`, `remove`, `discard`, `clear`.
        Check membership with `in`, iterate with `for`, get length with `len()`.

        ```python
        element.classes.add("active")
        if "disabled" in element.classes:
            ...
        ```
        """
        if not hasattr(self, "_classes"):
            self._classes = Classes(self)
        return self._classes

    @property
    def style(self):
        """
        Return the element's CSS styles as a `dict`-like `Style` object.

        Access using `dict`-style syntax with standard
        [CSS property names (hyphenated)](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference).

        ```python
        element.style["background-color"] = "red"
        element.style["font-size"] = "16px"
        del element.style["margin"]
        ```
        """
        if not hasattr(self, "_style"):
            self._style = Style(self)
        return self._style

    @property
    def parent(self):
        """
        Return this element's parent `Element`, or `None`.
        """
        if is_none(self._dom_element.parentElement):
            return None
        return Element.wrap_dom_element(self._dom_element.parentElement)

    def append(self, *items):
        """
        Append items to this element's `children`.

        Accepts `Element` instances, `ElementCollection` instances, lists,
        tuples, raw DOM elements, NodeLists, str, int, float, and bool.
        """
        for item in items:
            if isinstance(item, Element):
                self._dom_element.appendChild(item._dom_element)
            elif isinstance(item, ElementCollection):
                for element in item:
                    self._dom_element.appendChild(element._dom_element)
            elif isinstance(item, (list, tuple)):
                for child in item:
                    self.append(child)
            elif hasattr(item, "tagName"):
                # Raw DOM element.
                self._dom_element.appendChild(item)
            elif hasattr(item, "length"):
                # NodeList or similar iterable.
                for element in item:
                    self._dom_element.appendChild(element)
            elif isinstance(item, (str, int, float, bool)):
                self._dom_element.append(item)
            else:
                raise TypeError(f"Cannot append {type(item).__name__} to element.")

    def clone(self, clone_id=None):
        """
        Clone this element and its underlying DOM element.

        Optionally assign a new `id` to the clone.
        """
        clone = Element.wrap_dom_element(self._dom_element.cloneNode(True))
        clone.id = clone_id
        return clone

    def find(self, selector):
        """
        Find all descendant elements matching the
        [CSS `selector`](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Selectors).

        Returns an `ElementCollection` (possibly empty).

        ```python
        element.find("div")              # All div descendants.
        element.find(".my-class")        # All elements with class.
        element.find("#my-id")           # Element with id (as collection).
        element.find("div.my-class")     # All divs with class.
        ```
        """
        return _find_and_wrap(self._dom_element, selector)

    def show_me(self):
        """
        Scroll this element into view.
        """
        self._dom_element.scrollIntoView()

    def update(self, classes=None, style=None, **kwargs):
        """
        Update this element's `classes`, `style`, and `attributes`
        (via arbitrary `**kwargs`).

        Convenience method for bulk updates.
        """
        if classes:
            if isinstance(classes, str):
                self.classes.add(classes)
            else:
                for class_name in classes:
                    self.classes.add(class_name)
        if style:
            for key, value in style.items():
                self.style[key] = value
        for name, value in kwargs.items():
            setattr(self, name, value)
