python -m http.server python -m pip install -e '.[dev]'
python -m pytest
python -m mypy scientists
python scripts/verify.py
python -m scientists.runtime.cli 'research reproducibility' --json
wget --no-check-certificate https://github.com/conda-forge/miniforge/releases/latest/download/Mambaforge-Linux-x86_64.sh 
install numpy scipy scikit-learn pandas plotly matplotlib jupyter
pip3 install jupyter

