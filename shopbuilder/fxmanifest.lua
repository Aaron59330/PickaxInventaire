fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'shopbuilder'
description 'Shop Builder ESX : crée n\'importe quelle boutique (supérette, armurerie, vêtements, coiffeur, pharmacie, bar, marché noir...) en jeu, avec stocks, promos, accès par métier, statistiques (UI + oxmysql)'
version '1.0.0'

shared_scripts {
    'config.lua',
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/core.lua',
    'server/builder.lua',
    'server/shop.lua',
}

client_scripts {
    'client/main.lua',
    'client/clothing.lua',
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js',
    'sql/install.sql',
}

dependencies {
    'es_extended',
    'oxmysql',
}
