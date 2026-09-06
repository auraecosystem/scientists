import kagglehub

# Download latest version
path = kagglehub.model_download("auraecosystem/neuromindai/other/default")

print("Path to model files:", path)
