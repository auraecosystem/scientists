# Enable terminfo keyboard handling
typeset -g -A key

key[Home]="${terminfo[khome]}"
key[End]="${terminfo[kend]}"
key[Up]="${terminfo[kcuu1]}"
key[Down]="${terminfo[kcud1]}"

# Bind using terminfo values safely
[[ -n "${key[Home]}" ]] && bindkey "${key[Home]}" beginning-of-line
[[ -n "${key[End]}"  ]] && bindkey "${key[End]}"  end-of-line
