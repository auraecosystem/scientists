# ~/.zshrc

# ------------------------------------------------------------------------------
# ZLE WORD NAVIGATION & HISTORY BINDINGS
# ------------------------------------------------------------------------------

# Option / Alt + Left Arrow -> Move backward one word
bindkey '^[[1;3D' backward-word
bindkey '^[b'     backward-word

# Option / Alt + Right Arrow -> Move forward one word
bindkey '^[[1;3C' forward-word
bindkey '^[f'     forward-word

# Ctrl + Left Arrow -> Move backward one word (xterm)
bindkey '^[[1;5D' backward-word

# Ctrl + Right Arrow -> Move forward one word (xterm)
bindkey '^[[1;5C' forward-word

# Option / Alt + Backspace -> Delete backward word
bindkey '^[^?'    backward-kill-word
bindkey '^H'      backward-kill-word

# Option / Alt + Delete -> Delete forward word
bindkey '^[[3;3~' kill-word

# Up / Down Arrows -> History Search (matches prefix currently typed)
autoload -U up-line-or-beginning-search down-line-or-beginning-search
zle -N up-line-or-beginning-search
zle -N down-line-or-beginning-search

bindkey '^[[A' up-line-or-beginning-search
bindkey '^[[B' down-line-or-beginning-search
