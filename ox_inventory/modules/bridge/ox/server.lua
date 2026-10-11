if not lib.checkDependency('ox_core', '0.21.3', true) then return end

local Ox = require '@ox_core.lib.init' --[[@as OxServer]]

local Inventory = require 'modules.inventory.server'

AddEventHandler('ox:playerLogout', server.playerDropped)

AddEventHandler('ox:setGroup', function(source, name, grade)
	local inventory = Inventory(source)

	if not inventory then return end

	inventory.player.groups[name] = grade
end)

---@diagnostic disable-next-line: duplicate-set-field
function server.setPlayerData(player)
    player.groups = Ox.GetPlayer(player.source)?.getGroups()
    return player
end

---@diagnostic disable-next-line: duplicate-set-field
function server.hasLicense(inv, name)
	local player = Ox.GetPlayer(inv.id)

    if not player then return end

	return player.getLicense(name)
end

---@diagnostic disable-next-line: duplicate-set-field
function server.buyLicense(inv, license)
	local player = Ox.GetPlayer(inv.id)

    if not player then return end


	if player.getLicense(license.name) then
		return false, 'already_have'
	elseif Inventory.GetItemCount(inv, 'money') < license.price then
		return false, 'can_not_afford'
	end

	Inventory.RemoveItem(inv, 'money', license.price)
	player.addLicense(license.name)

	return true, 'have_purchased'
end

---@diagnostic disable-next-line: duplicate-set-field
function server.isPlayerBoss(playerId, group, grade)
	local groupData = GlobalState[('group.%s'):format(group)]

	return groupData and grade >= groupData.adminGrade
end

---@param entityId number
---@return number | string
---@diagnostic disable-next-line: duplicate-set-field
function server.getOwnedVehicleId(entityId)
    return Ox.GetVehicleFromEntity(entityId)?.id
end


function server.getAccountMoney(playerId, account)
	local player = Ox.GetPlayer(playerId)

	if player then
        if account == 'bank' then
			local accData = player.getAccount()
			return accData.balance
		elseif account == 'money' then
			return exports['ox_inventory']:Search(playerId, 'count', 'money') or 0
		end
	end

	return 0
end

function server.removeAccountMoney(playerId, account, amount)
	local player = Ox.GetPlayer(playerId)

	if player then
        if account == 'bank' then
			local accData = player.getAccount()
			accData.removeBalance({amount = amount})
			return true
		elseif account == 'money' then
			if (exports['ox_inventory']:Search(playerId, 'count', 'money') or 0) < amount then
				return false
			end

			exports['ox_inventory']:RemoveItem(playerId, 'money', amount)
			return true
		end
	end

	return false
end