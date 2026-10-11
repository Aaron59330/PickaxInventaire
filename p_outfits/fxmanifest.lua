fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'p_outfits'
description 'Tenues sauvegardees (ESX) - branche sur le bloc "Tenue" de ox_inventory et p_itemclothes'
version '1.0.0'

shared_scripts {
    '@ox_lib/init.lua',
    'config.lua',
}

client_script 'client.lua'

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server.lua',
}

dependencies {
    'ox_lib',
    'oxmysql',
    'es_extended',
    'ox_inventory',
    'p_itemclothes',
}
