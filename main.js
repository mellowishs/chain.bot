const { 
  Client, 
  GatewayIntentBits, 
  AuditLogEvent, 
  PermissionsBitField 
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = "MTQ2MTQxNDEwMTY3MzcwOTcxNA.GqKL_J.Ge1-WXXy71l0AjsoEMR4QSBZwLMnOW22bulW1A";
const OWNER_ID = "1459544780630523904"; // bot owner (you)

// ---------------- READY ----------------
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ---------------- MODERATION COMMANDS ----------------
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  if (message.content.startsWith("!ban")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
    const user = message.mentions.members.first();
    if (!user) return message.reply("❌ Mention a user");

    await user.ban({ reason: "Moderation ban" });
    message.channel.send(`🔨 Banned ${user.user.tag}`);
  }

  if (message.content.startsWith("!kick")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;
    const user = message.mentions.members.first();
    if (!user) return message.reply("❌ Mention a user");

    await user.kick("Moderation kick");
    message.channel.send(`👢 Kicked ${user.user.tag}`);
  }
});

// ---------------- ANTI-RAID (JOIN SPAM) ----------------
let joinMap = new Map();

client.on("guildMemberAdd", async (member) => {
  const now = Date.now();
  joinMap.set(member.guild.id, (joinMap.get(member.guild.id) || []).filter(t => now - t < 10000));
  joinMap.get(member.guild.id).push(now);

  if (joinMap.get(member.guild.id).length >= 5) {
    member.guild.members.cache.forEach(m => {
      if (!m.permissions.has(PermissionsBitField.Flags.Administrator)) {
        m.timeout(10 * 60 * 1000).catch(() => {});
      }
    });
    console.log("🚨 Anti-raid triggered");
  }
});

// ---------------- ANTI-NUKE (CHANNEL DELETE) ----------------
client.on("channelDelete", async (channel) => {
  const logs = await channel.guild.fetchAuditLogs({
    limit: 1,
    type: AuditLogEvent.ChannelDelete
  });

  const entry = logs.entries.first();
  if (!entry) return;

  const executor = entry.executor;
  if (executor.id === OWNER_ID) return;

  const member = await channel.guild.members.fetch(executor.id);
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    await member.roles.set([]);
    console.log(`🚨 Anti-nuke removed roles from ${executor.tag}`);
  }
});

// ---------------- ANTI-NUKE (ROLE DELETE) ----------------
client.on("roleDelete", async (role) => {
  const logs = await role.guild.fetchAuditLogs({
    limit: 1,
    type: AuditLogEvent.RoleDelete
  });

  const entry = logs.entries.first();
  if (!entry) return;

  const executor = entry.executor;
  if (executor.id === OWNER_ID) return;

  const member = await role.guild.members.fetch(executor.id);
  await member.roles.set([]);
  console.log(`🚨 Anti-nuke triggered on role delete`);
});

// ---------------- LOGIN ----------------
client.login(TOKEN);
