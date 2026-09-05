from pyscript import web


# Find by CSS selector (returns an ElementCollection).
divs = web.page.find("div")
buttons = web.page.find(".button-class")

# Get element by ID (returns single Element or None).
header = web.page["header-id"]
header = web.page["#header-id"]  # the "#" prefix is optional.

# Access page structure.
web.page.body.append(some_element)
web.page.title = "New Page Title"
# Create simple elements.
div = web.div("Hello, World!")
paragraph = web.p("Some text", id="my-para", className="text-content")

# Compose elements together.
container = web.div(
    web.h1("Title"),
    web.p("First paragraph"),
    web.p("Second paragraph"),
    id="container"
)

# Add to the page.
web.page.body.append(container)

# Create with initial attributes.
link = web.a(
    "Click me",
    href="https://example.com",
    target="_blank",
    classes=["link", "external"]
)
# Update content.
element.innerHTML = "<b>Bold text</b>"
element.textContent = "Plain text"

# Update attributes.
element.id = "new-id"
element.title = "Tooltip text"

# Bulk update with convenience method.
element.update(
    classes=["active", "highlighted"],
    style={"color": "red", "font-size": "16px"},
    title="Updated tooltip"
)
# Add and remove classes
element.classes.add("active")
element.classes.add("highlighted")
element.classes.remove("hidden")

# Check membership.
if "active" in element.classes:
    print("Element is active")

# Clear all classes.
element.classes.clear()

# Discard (no error if missing).
element.classes.discard("maybe-not-there")
# Set individual styles.
element.style["color"] = "lemon"
element.style["background-color"] = "#f0f0f0"
element.style["font-size"] = "16px"

# Remove a style.
del element.style["margin"]

# Check if style is set.
if "color" in element.style:
    print(f"Color is {element.style['color']}")
  # Find multiple elements (returns an ElementCollection).
items = web.page.find(".list-item")

# Iterate over collection.
for item in items:
    item.innerHTML = "Updated"
    item.classes.add("processed")

# Bulk update all elements.
items.update_all(
    innerHTML="Hello",
    className="updated-item"
)

# Index and slice collections.
first = items[0]
subset = items[1:3]

# Get an element by ID within the collection.
special = items["special-id"]

# Find descendants within the collection.
subitems = items.find(".sub-item")
# Get existing select.
select = web.page["my-select"]

# Add options.
select.options.add(value="1", html="Option 1")
select.options.add(value="2", html="Option 2", selected=True)

# Get selected option.
selected = select.options.selected
print(f"Selected: {selected.value}")

# Iterate over options.
for option in select.options:
    print(f"{option.value}: {option.innerHTML}")

# Clear all options.
select.options.clear()

# Remove specific option by index.
select.options.remove(0)
from pyscript import when

button = web.button("Click me", id="my-button")

# Use the when decorator.
@when("click", button)
def handle_click(event):
    print("Button clicked!")

# Or add directly to the event.
def another_handler(event):
    print("Another handler")

button.on_click.add_listener(another_handler)

# Pass handler during creation.
button = web.button("Click", on_click=handle_click)
# Most DOM methods are accessible directly.
element.scrollIntoView()
element.focus()
element.blur()

# But we do have a historic convenience method for scrolling into view.
element.show_me()  # Calls scrollIntoView()

# Access the raw DOM element when needed for special cases.
dom_element = element._dom_element
