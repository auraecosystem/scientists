from pyscript import document

def calculate_square(event):
    # Grab the input element from the webpage
    input_element = document.querySelector("#number-input")
    user_value = input_element.value
    
    # Select the output container
    output_element = document.querySelector("#result")
    
    try:
        # Convert string input to integer and calculate square
        number = int(user_value)
        square = number * number
        output_element.innerText = f"💡 Result: The square of {number} is {square}."
    except ValueError:
        output_element.innerText = "⚠️ Please enter a valid number!"
