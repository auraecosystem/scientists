import ipywidgets as widgets
from IPython.display import display

def update_plot(year_range):
    start_year, end_year = year_range
    mask = (x >= start_year) & (x <= end_year)

    fig, ax = plt.subplots(figsize=(10, 6))
    plot(x[mask], y1[mask], ax, f'Increase in mean Fortune 500 company profits from {start_year} to {end_year}', 'Profit (millions)')
    plt.show()

year_range_slider = widgets.IntRangeSlider(
    value=[1955, 2005],
    min=1955,
    max=2005,
    step=1,
    description='Year range:',
    continuous_update=False
)

widgets.interact(update_plot, year_range=year_range_slider)
