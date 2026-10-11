fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'p_outfits'
description 'Tenues completes : item "Tenue" a glisser sur la case Tenue de ox_inventory (equipe / retire toutes les pieces, avec p_itemclothes)'
version '2.0.0'

shared_scripts {
    '@ox_lib/init.lua',
    'config.lua',
}

client_script 'client.lua'
server_script 'server.lua'

dependencies {
    'ox_lib',
    'ox_inventory',
    'p_itemclothes',
}
