-- Conversion des 103 items SQL. Hypothèse : poids SQL en kg, poids ox_inventory en g.
-- rare et can_remove ne sont pas des champs standards ox_inventory.
-- pepperspray : can_remove = -1 dans le SQL ; aucune restriction de transfert ajoutée.
-- zetony : poids SQL -1 remplacé par 0.
-- Définitions seules : relier les utilisations et effets aux scripts du serveur.
return {
    ['money'] = { label = 'Argent', weight = 0, stack = true, close = false },
    ['black_money'] = { label = 'Argent sale', weight = 0, stack = true, close = false },
    ['armor'] = { label = 'Kevlar', weight = 3000, stack = true, close = true },
    ['bandage'] = { label = 'Bandage', weight = 200, stack = true, close = true },
    ['basic_cuff'] = { label = 'Menottes Basique', weight = 300, stack = true, close = true },
    ['basic_key'] = { label = 'Clefs de Menottes Basique', weight = 100, stack = true, close = true },
    ['beer'] = { label = 'Bière', weight = 100, stack = true, close = true },
    ['blowpipe'] = { label = 'Chalumeaux', weight = 1500, stack = true, close = true },
    ['bread'] = { label = 'Pain', weight = 100, stack = true, close = true },
    ['burger'] = { label = 'Burger', weight = 300, stack = true, close = true },
    ['carokit'] = { label = 'Kit carosserie', weight = 3000, stack = true, close = true },
    ['carotool'] = { label = 'Outils carosserie', weight = 4000, stack = true, close = true },
    ['chip'] = { label = 'Jeton', weight = 0, stack = true, close = true },
    ['cigarette'] = { label = 'Cigarette', weight = 100, stack = true, close = true },
    ['clip'] = { label = 'Chargeur', weight = 300, stack = true, close = true },
    ['coca'] = { label = 'Coca', weight = 100, stack = true, close = true },
    ['coke'] = { label = 'Coke', weight = 1000, stack = true, close = true },
    ['coke_pooch'] = { label = 'Pochon de coke', weight = 250, stack = true, close = true },
    ['cola'] = { label = 'Cola', weight = 200, stack = true, close = true },
    ['corde'] = { label = 'Corde', weight = 2000, stack = true, close = true },
    ['defibrillateur'] = { label = 'Défibrillateur', weight = 2000, stack = true, close = true },
    ['feuille_coca'] = { label = 'Feuille de coca', weight = 1000, stack = true, close = true },
    ['firstaidkit'] = { label = 'Trousse premier secours', weight = 1000, stack = true, close = true },
    ['fixkit'] = { label = 'Kit réparation', weight = 1500, stack = true, close = true },
    ['fixtool'] = { label = 'Outils réparation', weight = 2000, stack = true, close = true },
    ['gazbottle'] = { label = 'Bouteille de gaz', weight = 2000, stack = true, close = true },
    ['gitanes'] = { label = 'Gitanes', weight = 100, stack = true, close = true },
    ['grand_cru'] = { label = 'Grand cru', weight = 200, stack = true, close = true },
    ['grapperaisin'] = { label = 'Grappe de raisin', weight = 300, stack = true, close = true },
    ['handcuff'] = { label = 'Serre câble ', weight = 300, stack = true, close = true },
    ['ice'] = { label = 'Glaçon', weight = 100, stack = true, close = true },
    ['jager'] = { label = 'Jägermeister', weight = 500, stack = true, close = true },
    ['jagerbomb'] = { label = 'Jägermeister', weight = 500, stack = true, close = true },
    ['jagercerbere'] = { label = 'Jäger Cerbère', weight = 500, stack = true, close = true },
    ['jumelles'] = { label = 'Jumelles', weight = 250, stack = true, close = true },
    ['yusuf'] = { label = 'Skin de Luxe', weight = 4000, stack = true, close = true },
    ['grip'] = { label = 'Poignée', weight = 1000, stack = true, close = true },
    ['magazine'] = { label = 'Chargeur agrandi', weight = 2000, stack = true, close = true },
    ['silencieux'] = { label = 'Silencieux', weight = 1000, stack = true, close = true },
    ['flashlight'] = { label = 'Lampe', weight = 1000, stack = true, close = true },
    ['scope'] = { label = 'Viseur', weight = 1000, stack = true, close = true },
    ['jus_coca'] = { label = 'Jus de coca', weight = 500, stack = true, close = true },
    ['jus_raisin'] = { label = 'Jus de raisin', weight = 500, stack = true, close = true },
    ['jusfruit'] = { label = 'Jus de fruits', weight = 500, stack = true, close = true },
    ['limonade'] = { label = 'Limonade', weight = 500, stack = true, close = true },
    ['lockpick'] = { label = 'Pied de Biche', weight = 1000, stack = true, close = true },
    ['malbora'] = { label = 'Malboro', weight = 100, stack = true, close = true },
    ['martini'] = { label = 'Martini blanc', weight = 1000, stack = true, close = true },
    ['meat'] = { label = 'Viande', weight = 300, stack = true, close = true },
    ['medikit'] = { label = 'Medikit', weight = 2000, stack = true, close = true },
    ['menthe'] = { label = 'Feuille de menthe', weight = 1000, stack = true, close = true },
    ['meth'] = { label = 'Meth', weight = 1000, stack = true, close = true },
    ['meth_pooch'] = { label = 'Pochon de meth', weight = 250, stack = true, close = true },
    ['metreshooter'] = { label = 'Mètre de shooter', weight = 100, stack = true, close = true },
    ['mixapero'] = { label = 'Mix Apéritif', weight = 100, stack = true, close = true },
    ['mojito'] = { label = 'Mojito', weight = 100, stack = true, close = true },
    ['opium'] = { label = 'Opium', weight = 1000, stack = true, close = true },
    ['opium_pooch'] = { label = 'Pochon d\'opium', weight = 250, stack = true, close = true },
    ['orange'] = { label = 'Orange', weight = 100, stack = true, close = true },
    ['orange_juice'] = { label = 'Jus d\'orange', weight = 300, stack = true, close = true },
    ['oxygen_mask'] = { label = 'Masque à Oxygène', weight = 600, stack = true, close = true },
    ['pepperspray'] = { label = 'Gazeuse', weight = 1000, stack = true, close = true },
    ['phone'] = { label = 'Téléphone', weight = 300, stack = true, close = true },
    ['piluleoubli'] = { label = 'GHB', weight = 1000, stack = true, close = true },
    ['police_cuff'] = { label = 'Menottes LSPD', weight = 300, stack = true, close = true },
    ['police_key'] = { label = 'Clefs de Menottes LSPD', weight = 100, stack = true, close = true },
    ['pomme'] = { label = 'Pomme', weight = 100, stack = true, close = true },
    ['radio'] = { label = 'Radio', weight = 500, stack = true, close = true },
    ['raisin'] = { label = 'Raisin', weight = 300, stack = true, close = true },
    ['redbull'] = { label = 'Redbull', weight = 300, stack = true, close = true },
    ['repairkit'] = { label = 'Repairkit', weight = 2000, stack = true, close = true },
    ['rhum'] = { label = 'Rhum', weight = 400, stack = true, close = true },
    ['rhumcoca'] = { label = 'Rhum-Coca', weight = 500, stack = true, close = true },
    ['rhumfruit'] = { label = 'Rhum-Jus de fruits', weight = 500, stack = true, close = true },
    ['tabac'] = { label = 'Tabac', weight = 500, stack = true, close = true },
    ['tabacblond'] = { label = 'Tabac Blond', weight = 500, stack = true, close = true },
    ['tabacblondsec'] = { label = 'Tabac Blond Séché', weight = 500, stack = true, close = true },
    ['tabacbrun'] = { label = 'Tabac Brun', weight = 500, stack = true, close = true },
    ['tabacbrunsec'] = { label = 'Tabac Brun Séché', weight = 500, stack = true, close = true },
    ['tarte_pomme'] = { label = 'Tarte aux Pommes', weight = 300, stack = true, close = true },
    ['teqpaf'] = { label = 'Teq\'paf', weight = 500, stack = true, close = true },
    ['tequila'] = { label = 'Tequila', weight = 500, stack = true, close = true },
    ['vine'] = { label = 'Vin', weight = 500, stack = true, close = true },
    ['vittvin'] = { label = 'Vin Blanc', weight = 500, stack = true, close = true },
    ['vodka'] = { label = 'Vodka', weight = 300, stack = true, close = true },
    ['vodkaenergy'] = { label = 'Vodka-Energy', weight = 400, stack = true, close = true },
    ['vodkafruit'] = { label = 'Vodka-Jus de fruits', weight = 300, stack = true, close = true },
    ['vodkaredbull'] = { label = 'Vodka-Redbull', weight = 300, stack = true, close = true },
    ['water'] = { label = 'Bouteille d\'eau', weight = 100, stack = true, close = true },
    ['weed'] = { label = 'Weed', weight = 1000, stack = true, close = true },
    ['weed_pooch'] = { label = 'Pochon de weed', weight = 250, stack = true, close = true },
    ['whisky'] = { label = 'Whisky', weight = 400, stack = true, close = true },
    ['whiskycoca'] = { label = 'Whisky-coca', weight = 500, stack = true, close = true },
    ['gym_membership'] = { label = 'Pass membre GYM', weight = 500, stack = true, close = true },
    ['fishingrod'] = { label = 'Canne à pêche', weight = 500, stack = true, close = true },
    ['macro'] = { label = 'Macro', weight = 500, stack = true, close = true },
    ['bar'] = { label = 'Bar', weight = 500, stack = true, close = true },
    ['dorade'] = { label = 'Dorade', weight = 500, stack = true, close = true },
    ['lieu'] = { label = 'Lieu', weight = 500, stack = true, close = true },
    ['raie'] = { label = 'Raie', weight = 500, stack = true, close = true },
    ['sardine'] = { label = 'Sardine', weight = 500, stack = true, close = true },
    ['saumon'] = { label = 'Saumon', weight = 500, stack = true, close = true },
    ['thon'] = { label = 'Thon', weight = 500, stack = true, close = true },
    ['requin'] = { label = 'Requin', weight = 2000, stack = true, close = true },
    ['zetony'] = { label = 'Jetons', weight = 0, stack = true, close = true },

    ['clothing'] = {
        label = 'Clothing',
        consume = 0,
    },

    -- Tenue complete (creee par shopbuilder). Glisse-la sur la case "Tenue" du milieu pour equiper toutes les pieces.
    ['clothes_outfit'] = {
        label = 'Tenue',
        weight = 500,
        stack = false,
        close = false,
        description = 'Une tenue complete. Glisse-la sur la case Tenue de ton inventaire pour la porter.',
    },

    ['clothes_hat'] = {
        label = 'Hat',
        weight = 50,
        stack = false,
        close = false,
        buttons = {
            {
                label = 'Show/Hide Hair',
                action = function(slot)
                    TriggerEvent('p_itemclothes/client/toggleHair')
                end
            },
        },
        consume = 0,
        server = {
            export = 'p_itemclothes.useClothingItem'
        }
    },

    ['clothes_ears'] = {
        label = 'Ear Accessories',
        weight = 50,
        stack = false,
        close = false,
        consume = 0,
        server = {
            export = 'p_itemclothes.useClothingItem'
        }
    },

    ['clothes_tshirt'] = {
        label = 'T-Shirt',
        weight = 50,
        stack = false,
        close = false,
        consume = 0,
        server = {
            export = 'p_itemclothes.useClothingItem'
        }
    },

    ['clothes_torso'] = {
        label = 'Jacket',
        weight = 50,
        stack = false,
        close = false,
        consume = 0,
        server = {
            export = 'p_itemclothes.useClothingItem'
        }
    },

    ['clothes_arms'] = {
        label = 'Gloves',
        weight = 50,
        stack = false,
        close = false,
        consume = 0,
        server = {
            export = 'p_itemclothes.useClothingItem'
        }
    },

    ['clothes_pants'] = {
        label = 'Pants',
        weight = 50,
        stack = false,
        close = false,
        consume = 0,
        server = {
            export = 'p_itemclothes.useClothingItem'
        }
    },

    ['clothes_shoes'] = {
        label = 'Shoes',
        weight = 50,
        stack = false,
        close = false,
        consume = 0,
        server = {
            export = 'p_itemclothes.useClothingItem'
        }
    },

    ['clothes_mask'] = {
        label = 'Mask',
        weight = 50,
        stack = false,
        close = false,
        buttons = {
            {
                label = 'Show/Hide Face',
                action = function(slot)
                    TriggerEvent('p_itemclothes/client/toggleFace')
                end
            },
            {
                label = 'Show/Hide Hair',
                action = function(slot)
                    TriggerEvent('p_itemclothes/client/toggleHair')
                end
            },
        },
        consume = 0,
        server = {
            export = 'p_itemclothes.useClothingItem'
        }
    },

    ['clothes_glasses'] = {
        label = 'Glasses',
        weight = 50,
        stack = false,
        close = false,
        consume = 0,
        server = {
            export = 'p_itemclothes.useClothingItem'
        }
    },

    ['clothes_vest'] = {
        label = 'Vest',
        weight = 50,
        stack = false,
        close = false,
        consume = 0,
        server = {
            export = 'p_itemclothes.useClothingItem'
        }
    },

    ['clothes_bag'] = {
        label = 'Bag',
        weight = 50,
        stack = false,
        close = false,
        consume = 0,
        server = {
            export = 'p_itemclothes.useClothingItem'
        }
    },

    ['clothes_watch'] = {
        label = 'Watch',
        weight = 50,
        stack = false,
        close = false,
        consume = 0,
        server = {
            export = 'p_itemclothes.useClothingItem'
        }
    },

    ['clothes_chain'] = {
        label = 'Chain',
        weight = 50,
        stack = false,
        close = false,
        consume = 0,
        server = {
            export = 'p_itemclothes.useClothingItem'
        }
    },

    ['clothes_bracelet'] = {
        label = 'Bracelet',
        weight = 50,
        stack = false,
        close = false,
        consume = 0,
        server = {
            export = 'p_itemclothes.useClothingItem'
        }
    },

    ['code'] = {
        label = 'Code de la route',
        weight = 0,
        stack = false,
        close = true,
        consume = 0,
    },

    ['drive'] = {
        label = 'Permis de conduire',
        weight = 0,
        stack = false,
        close = true,
        consume = 0,
    },

    ['drive_bike'] = {
        label = 'Permis moto',
        weight = 0,
        stack = false,
        close = true,
        consume = 0,
    },

    ['drive_truck'] = {
        label = 'Permis camion',
        weight = 0,
        stack = false,
        close = true,
        consume = 0,
    },

    ['weapon'] = {
        label = 'PPA',
        weight = 0,
        stack = false,
        close = true,
        consume = 0,
    },

    ['phone'] = {
        label = 'Téléphone',
        weight = 190,
        stack = false,
        consume = 0,
        close = true,
     -- LB Phone handles ox_inventory:usedItem and the phone metadata.
    },

}
