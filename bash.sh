mbrew $ npm run dev
install Alexsvensson99/tap/pkglift
python -m http.server python -m pip install -e '.[dev]'
python -m pytest
python -m mypy scientists
python scripts/verify.py
python -m scientists.runtime.cli 'research reproducibility' --json
wget --no-check-certificate https://github.com/conda-forge/miniforge/releases/latest/download/Mambaforge-Linux-x86_64.sh 
install numpy scipy scikit-learn pandas plotly matplotlib jupyter
pip3 install jupyter
pip3 install ipywidgets
# Set Vi editing mode
set editing-mode vi

# Show current Vi mode status (ins/cmd) in the prompt line
set show-mode-in-prompt on
set vi-cmd-mode-string "\1\e[2m\2[CMD]\1\e[0m\2 "
set vi-ins-mode-string "\1\e[32m\2[INS]\1\e[0m\2 "

$if mode=vi
    # In insert mode: search history using Up/Down arrows
    set keymap vi-insert
    "\e[A": history-search-backward
    "\e[B": history-search-forward

    # In command mode: search history using 'k' and 'j'
    set keymap vi-command
    "k": history-search-backward
    "j": history-search-forward
$endif
