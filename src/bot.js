const Discord = require('discord.js'),
  fetch = require('node-fetch')

const DISCORD_REGEX = /col-md">(.{2,32}#\d{4})/i

const client = new Discord.Client({
  disableEveryone: true
})

async function getUUIDForName(ign) {
  try {
    const res = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(
        ign
      )}`
    )
    const json = await res.json()
    return json.id
  } catch (err) {
    return false
  }
}

async function getDiscordForUUID(uuid) {
  try {
    const res = await fetch(`https://namemc.com/profile/${uuid}`)
    const text = await res.text()
    const matches = text.match(DISCORD_REGEX)
    if (!matches) return false
    return matches[1]
  } catch (err) {
    return false
  }
}

async function playerInGuild(uuid) {
  try {
    const res = await fetch(
      `https://api.hypixel.net/guild?key=${process.env.HYPIXEL_KEY}&id=${
        process.env.GUILD_ID
      }`
    )
    const { guild } = await res.json()
    const memberMap = guild.members.map(m => m.uuid)
    return memberMap.includes(uuid)
  } catch (err) {
    return false
  }
}

async function rmMessage(msg, timeout = 5000) {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      await msg.delete()
      resolve()
    }, timeout)
  })
}

client.on('ready', () => {
  console.log('Bot is ready')
})

client.on('message', async msg => {
  if (msg.channel.id !== process.env.CHANNEL_VERIFICATION) return
  if (msg.author.bot) return
  await msg.delete()

  let ign = msg.content
  if (!ign.match(/^\w{3,16}$/i)) {
    let newMsg = await msg.channel.send(
      `<@${msg.author.id}>, that IGN is not valid.`
    )
    await newMsg.delete(5000)
    return
  }

  const uuid = await getUUIDForName(ign)
  if (!uuid) {
    let newMsg = await msg.channel.send(
      `<@${msg.author.id}>, that IGN is not valid.`
    )
    await newMsg.delete(5000)
    return
  }

  const discord = await getDiscordForUUID(uuid)
  if (!discord) {
    let newMsg = await msg.channel.send(
      `<@${
        msg.author.id
      }>, you have not linked your Discord to your NameMC profile. Please do this before continuing. (https://namemc.com).`
    )
    await newMsg.delete(5000)
    return
  }

  if (discord !== `${msg.author.username}#${msg.author.discriminator}`) {
    let newMsg = await msg.channel.send(
      `<@${
        msg.author.id
      }>, the Discord on your NameMC profile does not match your current Discord. Please fix this before continuing. (https://namemc.com).`
    )
    await newMsg.delete(5000)
    return
  }

  const inGuild = await playerInGuild(uuid)
  if (!inGuild) {
    let newMsg = await msg.channel.send(
      `<@${msg.author.id}>, you're not in the guild.`
    )
    await newMsg.delete(5000)
    return
  }

  let newMsg = await msg.channel.send(
    `You will now get the Guild Member role in 5 seconds.`
  )
  await newMsg.delete(5000)
  const reason = `Verified that the user was ${ign} (${uuid}) on Minecraft and was in the guild.`
  let member = msg.guild.members.get(msg.author.id)
  await member.addRole(process.env.ROLE_MEMBER, reason)
  await member.setNickname(ign)
  return
})

client.login(process.env.TOKEN)

process.on('unhandledRejection', err => {
  console.log(err)
})
