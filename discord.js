// ==================== IMPORT & CONFIGURATION ====================
require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType,
    AttachmentBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Check token
if (!process.env.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN tidak ditemukan di file .env!');
    process.exit(1);
}

// ==================== BOT CONFIGURATION ====================
const defaultConfig = {
    prefix: '!',
    welcomeChannel: 'welcome',
    leaveChannel: 'goodbye', 
    logChannel: 'mod-logs',
    levelUpChannel: null,
    mutedRole: 'Muted',
    autoRole: 'Member',
    levelUpMessage: '🎉 {user}, Selamat! Kamu naik ke **Level {level}**!',
    xpPerMessage: { min: 15, max: 25 },
    xpCooldown: 60000,
    customLevelRoles: true,
    reactionRoles: true,
    autoModeration: true,
    musicBot: false,
    ticketCategory: 'Tickets',
};

// ==================== DATABASE SYSTEM ====================
const dbPath = path.join(__dirname, 'database.json');
let db = {
    prefixes: {}, // Server-specific prefixes
    levels: {},
    warnings: {},
    economy: {},
    giveaways: [],
    reactionRoles: {},
    customCommands: {},
    tickets: {},
    ticketCounters: {},
    automod: {
        enabled: true,
        antiSpam: true,
        antiLink: false,
        antiInvite: true,
        badWords: ['toxic', 'hate', 'spam'],
        whitelistedLinks: ['youtube.com', 'discord.gg', 'github.com'],
        maxMentions: 5,
        maxMessages: 5,
        timeWindow: 5000
    },
    levelRoles: {
        5: 'Level 5',
        10: 'Level 10',
        15: 'Level 15', 
        20: 'Level 20',
        30: 'Level 30',
        50: 'Level 50'
    },
    polls: {},
    reminders: []
};

// Load database
if (fs.existsSync(dbPath)) {
    try {
        const savedData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        db = { ...db, ...savedData };
        console.log('✅ Database loaded successfully');
    } catch (error) {
        console.log('❌ Error loading database:', error.message);
    }
}

function saveDB() {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    } catch (error) {
        console.log('❌ Error saving database:', error.message);
    }
}

// Backup database every 24 hours
setInterval(() => {
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }
    const backupPath = path.join(backupDir, `db-backup-${Date.now()}.json`);
    fs.copyFileSync(dbPath, backupPath);
    console.log('✅ Database backed up to:', backupPath);
}, 24 * 60 * 60 * 1000);

// ==================== CLIENT SETUP ====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Function to get prefix for a guild
function getPrefix(guildId) {
    return db.prefixes[guildId] || defaultConfig.prefix;
}

// ==================== LEVELING SYSTEM ====================
const xpCooldowns = new Map();

function addXP(userId, guildId) {
    const now = Date.now();
    const cooldownKey = `${guildId}-${userId}`;
    
    if (xpCooldowns.has(cooldownKey)) {
        const expirationTime = xpCooldowns.get(cooldownKey) + defaultConfig.xpCooldown;
        if (now < expirationTime) return null;
    }
    
    xpCooldowns.set(cooldownKey, now);
    
    const key = `${guildId}-${userId}`;
    if (!db.levels[key]) {
        db.levels[key] = { 
            xp: 0, 
            level: 1, 
            messages: 0,
            totalXP: 0
        };
    }
    
    const xpGain = Math.floor(Math.random() * (defaultConfig.xpPerMessage.max - defaultConfig.xpPerMessage.min + 1)) + defaultConfig.xpPerMessage.min;
    db.levels[key].xp += xpGain;
    db.levels[key].totalXP += xpGain;
    db.levels[key].messages++;
    
    const xpNeeded = 5 * Math.pow(db.levels[key].level, 2) + 50 * db.levels[key].level + 100;
    
    if (db.levels[key].xp >= xpNeeded) {
        db.levels[key].level++;
        db.levels[key].xp = db.levels[key].xp - xpNeeded;
        saveDB();
        return db.levels[key].level;
    }
    
    saveDB();
    return null;
}

function getLevel(userId, guildId) {
    const key = `${guildId}-${userId}`;
    return db.levels[key] || { xp: 0, level: 1, messages: 0, totalXP: 0 };
}

function getLeaderboard(guildId, limit = 10) {
    return Object.entries(db.levels)
        .filter(([key]) => key.startsWith(`${guildId}-`))
        .map(([key, data]) => ({
            userId: key.split('-')[1],
            ...data
        }))
        .sort((a, b) => b.totalXP - a.totalXP)
        .slice(0, limit);
}

// ==================== RANK CARD GENERATOR ====================
async function generateRankCard(user, levelData, rank) {
    const canvas = createCanvas(800, 200);
    const ctx = canvas.getContext('2d');
    
    // Background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#23272A');
    gradient.addColorStop(1, '#2C2F33');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Progress bar background
    ctx.fillStyle = '#40444B';
    ctx.fillRect(200, 150, 500, 20);
    
    // Progress bar
    const xpNeeded = 5 * Math.pow(levelData.level, 2) + 50 * levelData.level + 100;
    const progress = (levelData.xp / xpNeeded) * 500;
    ctx.fillStyle = '#5865F2';
    ctx.fillRect(200, 150, progress, 20);
    
    // User info
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(user.username, 200, 50);
    
    ctx.fillStyle = '#B9BBBE';
    ctx.font = '18px Arial';
    ctx.fillText(`Level: ${levelData.level}`, 200, 80);
    ctx.fillText(`Rank: #${rank}`, 200, 110);
    ctx.fillText(`XP: ${levelData.xp}/${xpNeeded}`, 200, 140);
    
    // Avatar
    try {
        const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 128 }));
        ctx.save();
        ctx.beginPath();
        ctx.arc(100, 100, 60, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 40, 40, 120, 120);
        ctx.restore();
    } catch (error) {
        console.log('Error loading avatar:', error.message);
    }
    
    return canvas.toBuffer();
}

// ==================== ECONOMY SYSTEM ====================
function getEconomy(userId, guildId) {
    const key = `${guildId}-${userId}`;
    if (!db.economy[key]) {
        db.economy[key] = {
            coins: 1000,
            bank: 0,
            daily: 0,
            weekly: 0,
            inventory: [],
            transactions: []
        };
    }
    return db.economy[key];
}

function addCoins(userId, guildId, amount, type = 'wallet') {
    const economy = getEconomy(userId, guildId);
    if (type === 'wallet') {
        economy.coins += amount;
    } else if (type === 'bank') {
        economy.bank += amount;
    }
    
    economy.transactions.push({
        amount: amount,
        type: amount > 0 ? 'income' : 'expense',
        timestamp: Date.now(),
        description: type
    });
    
    saveDB();
    return economy;
}

// ==================== MODERATION SYSTEM ====================
function addWarning(userId, guildId, moderatorId, reason) {
    const key = `${guildId}-${userId}`;
    if (!db.warnings[key]) db.warnings[key] = [];
    
    const warning = {
        id: Date.now(),
        moderator: moderatorId,
        reason: reason,
        timestamp: Date.now()
    };
    
    db.warnings[key].push(warning);
    saveDB();
    return { count: db.warnings[key].length, warning };
}

function getWarnings(userId, guildId) {
    const key = `${guildId}-${userId}`;
    return db.warnings[key] || [];
}

function clearWarnings(userId, guildId) {
    const key = `${guildId}-${userId}`;
    const count = db.warnings[key] ? db.warnings[key].length : 0;
    delete db.warnings[key];
    saveDB();
    return count;
}

// ==================== AUTO MODERATION ====================
const spamCache = new Map();

function checkAutoMod(message) {
    if (!db.automod.enabled || message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return { violates: false };
    }
    
    const content = message.content.toLowerCase();
    const userId = message.author.id;
    
    // Anti-Spam
    if (db.automod.antiSpam) {
        if (!spamCache.has(userId)) {
            spamCache.set(userId, []);
        }
        
        const userMessages = spamCache.get(userId);
        const now = Date.now();
        userMessages.push(now);
        
        const recentMessages = userMessages.filter(time => now - time < db.automod.timeWindow);
        spamCache.set(userId, recentMessages);
        
        if (recentMessages.length > db.automod.maxMessages) {
            return { violates: true, reason: 'Spam terdeteksi' };
        }
    }
    
    // Anti-Bad Words
    for (const word of db.automod.badWords) {
        if (content.includes(word.toLowerCase())) {
            return { violates: true, reason: `Kata terlarang: ${word}` };
        }
    }
    
    // Anti-Invite Links
    if (db.automod.antiInvite && (content.includes('discord.gg/') || content.includes('discord.com/invite/'))) {
        return { violates: true, reason: 'Discord invite link terdeteksi' };
    }
    
    // Anti-External Links
    if (db.automod.antiLink) {
        const linkRegex = /(https?:\/\/[^\s]+)/g;
        const links = content.match(linkRegex);
        if (links) {
            const isWhitelisted = links.some(link => 
                db.automod.whitelistedLinks.some(domain => link.includes(domain))
            );
            if (!isWhitelisted) {
                return { violates: true, reason: 'Link eksternal tidak diizinkan' };
            }
        }
    }
    
    // Anti-Mass Mention
    const mentions = message.mentions.users.size + message.mentions.roles.size;
    if (mentions > db.automod.maxMentions) {
        return { violates: true, reason: `Terlalu banyak mention (${mentions})` };
    }
    
    return { violates: false };
}

// ==================== UTILITY FUNCTIONS ====================
function formatTime(ms) {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    const parts = [];
    if (days > 0) parts.push(`${days}h`);
    if (hours > 0) parts.push(`${hours}j`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}d`);
    
    return parts.join(' ') || '0 detik';
}

// ==================== TICKET SYSTEM ====================
async function createTicket(guild, user, reason = 'No reason provided') {
    const category = guild.channels.cache.find(c => c.name === defaultConfig.ticketCategory && c.type === ChannelType.GuildCategory);
    let ticketCategory = category;
    if (!ticketCategory) {
        ticketCategory = await guild.channels.create({
            name: defaultConfig.ticketCategory,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                }
            ]
        });
    }

    const ticketId = db.ticketCounters[guild.id] ? db.ticketCounters[guild.id] + 1 : 1;
    db.ticketCounters[guild.id] = ticketId;
    saveDB();

    const ticketChannel = await guild.channels.create({
        name: `ticket-${ticketId}`,
        type: ChannelType.GuildText,
        parent: ticketCategory.id,
        permissionOverwrites: [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            }
        ]
    });

    db.tickets[ticketChannel.id] = {
        id: ticketId,
        user: user.id,
        guild: guild.id,
        reason: reason,
        createdAt: Date.now(),
        closed: false
    };
    saveDB();

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`Ticket #${ticketId}`)
        .setDescription(`Thank you for creating a ticket! Support will be with you shortly.\n\n**Reason:** ${reason}`)
        .addFields(
            { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: 'Use !close to close this ticket' });

    const closeButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

    await ticketChannel.send({ 
        content: `${user}, welcome to your ticket!`,
        embeds: [embed],
        components: [closeButton]
    });

    return ticketChannel;
}

async function closeTicket(channel, user) {
    const ticket = db.tickets[channel.id];
    if (!ticket) return;

    ticket.closed = true;
    ticket.closedBy = user.id;
    ticket.closedAt = Date.now();
    saveDB();

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`Ticket #${ticket.id} Closed`)
        .setDescription(`This ticket has been closed by ${user.tag}.`)
        .addFields(
            { name: 'Reason', value: ticket.reason, inline: true },
            { name: 'Created', value: `<t:${Math.floor(ticket.createdAt / 1000)}:R>`, inline: true },
            { name: 'Closed', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        );

    await channel.send({ embeds: [embed] });

    // Delete channel after 5 seconds
    setTimeout(() => {
        channel.delete().catch(console.error);
    }, 5000);
}

// ==================== EVENT HANDLERS ====================

client.once('ready', () => {
    console.log(`🎉 ${client.user.tag} is online!`);
    console.log(`📊 Serving ${client.guilds.cache.size} servers`);
    console.log(`👥 ${client.users.cache.size} users`);
    
    client.user.setPresence({
        activities: [{ name: `!help | MEE6 Premium`, type: 0 }],
        status: 'online'
    });
});

// Welcome System
client.on('guildMemberAdd', async (member) => {
    // Auto Role
    if (defaultConfig.autoRole) {
        const role = member.guild.roles.cache.find(r => r.name === defaultConfig.autoRole);
        if (role) {
            try {
                await member.roles.add(role);
                console.log(`✅ Auto role given to ${member.user.tag}`);
            } catch (error) {
                console.log('Error giving auto role:', error.message);
            }
        }
    }
    
    // Welcome Message
    const welcomeChannel = member.guild.channels.cache.find(ch => 
        ch.name === defaultConfig.welcomeChannel && ch.type === ChannelType.GuildText
    );
    
    if (welcomeChannel) {
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎉 Selamat Datang!')
            .setDescription(`Halo ${member}! Selamat datang di **${member.guild.name}**!`)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '👥 Member', value: `Kamu adalah member ke-${member.guild.memberCount}`, inline: true },
                { name: '📅 Bergabung', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: `ID: ${member.id}` })
            .setTimestamp();

        welcomeChannel.send({ embeds: [embed] });
    }
});

// Goodbye System
client.on('guildMemberRemove', async (member) => {
    const leaveChannel = member.guild.channels.cache.find(ch => 
        ch.name === defaultConfig.leaveChannel && ch.type === ChannelType.GuildText
    );
    
    if (leaveChannel) {
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('👋 Selamat Tinggal!')
            .setDescription(`**${member.user.tag}** telah meninggalkan server.`)
            .addFields(
                { name: '📊 Total Member', value: `${member.guild.memberCount}`, inline: true },
                { name: '📅 Keluar', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        leaveChannel.send({ embeds: [embed] });
    }
});

// Reaction Role Handler
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;

    // When a reaction is received, check if the structure is partial
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message:', error);
            return;
        }
    }

    const messageId = reaction.message.id;
    const emoji = reaction.emoji.toString();

    if (db.reactionRoles[messageId] && db.reactionRoles[messageId][emoji]) {
        const roleId = db.reactionRoles[messageId][emoji];
        const member = reaction.message.guild.members.cache.get(user.id);
        const role = reaction.message.guild.roles.cache.get(roleId);

        if (role && member) {
            try {
                await member.roles.add(role);
                console.log(`Added role ${role.name} to ${user.tag}`);
            } catch (error) {
                console.log('Error adding role:', error.message);
            }
        }
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;

    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message:', error);
            return;
        }
    }

    const messageId = reaction.message.id;
    const emoji = reaction.emoji.toString();

    if (db.reactionRoles[messageId] && db.reactionRoles[messageId][emoji]) {
        const roleId = db.reactionRoles[messageId][emoji];
        const member = reaction.message.guild.members.cache.get(user.id);
        const role = reaction.message.guild.roles.cache.get(roleId);

        if (role && member) {
            try {
                await member.roles.remove(role);
                console.log(`Removed role ${role.name} from ${user.tag}`);
            } catch (error) {
                console.log('Error removing role:', error.message);
            }
        }
    }
});

// Button Interactions (for ticket system)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'close_ticket') {
        await closeTicket(interaction.channel, interaction.user);
        await interaction.reply({ content: 'Closing ticket...', ephemeral: true });
    }
});

// Message Handler
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = getPrefix(message.guild.id);

    // Auto Moderation
    const modCheck = checkAutoMod(message);
    if (modCheck.violates) {
        try {
            await message.delete();
            const warningMsg = await message.channel.send(`⚠️ ${message.author}, ${modCheck.reason}!`);
            setTimeout(() => warningMsg.delete(), 5000);
            
            // Log to mod channel
            const logChannel = message.guild.channels.cache.find(ch => 
                ch.name === defaultConfig.logChannel && ch.type === ChannelType.GuildText
            );
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🛡️ Auto-Mod Action')
                    .addFields(
                        { name: 'User', value: `${message.author.tag}`, inline: true },
                        { name: 'Channel', value: `${message.channel}`, inline: true },
                        { name: 'Reason', value: modCheck.reason, inline: true }
                    )
                    .setTimestamp();
                
                logChannel.send({ embeds: [embed] });
            }
            return;
        } catch (error) {
            console.log('Auto mod error:', error.message);
        }
    }

    // Leveling System
    const levelUp = addXP(message.author.id, message.guild.id);
    if (levelUp) {
        const levelMsg = defaultConfig.levelUpMessage
            .replace('{user}', message.author.toString())
            .replace('{level}', levelUp);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setDescription(levelMsg);

        const targetChannel = defaultConfig.levelUpChannel 
            ? message.guild.channels.cache.find(ch => ch.name === defaultConfig.levelUpChannel)
            : message.channel;
            
        if (targetChannel) {
            targetChannel.send({ embeds: [embed] });
        }

        // Level Role Rewards
        if (defaultConfig.customLevelRoles && db.levelRoles[levelUp]) {
            const roleName = db.levelRoles[levelUp];
            const role = message.guild.roles.cache.find(r => r.name === roleName);
            if (role) {
                try {
                    await message.member.roles.add(role);
                    message.channel.send(`🎊 ${message.author}, kamu mendapat role **${roleName}**!`);
                } catch (error) {
                    console.log('Error adding level role:', error.message);
                }
            }
        }
    }

    // Custom Commands
    if (db.customCommands[message.guild.id]) {
        const trigger = message.content.toLowerCase();
        if (db.customCommands[message.guild.id][trigger]) {
            return message.channel.send(db.customCommands[message.guild.id][trigger]);
        }
    }

    // Command Handler
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ==================== COMMAND HANDLER ====================

    // HELP COMMAND
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🤖 MEE6 Premium - All Commands')
            .setDescription(`Prefix: **${prefix}**\n\n**Semua fitur MEE6 premium tersedia GRATIS!**`)
            .addFields(
                { name: '📊 Leveling', value: '`rank`, `leaderboard`, `setlevel`', inline: true },
                { name: '💰 Economy', value: '`balance`, `daily`, `work`, `pay`', inline: true },
                { name: '🛡️ Moderation', value: '`warn`, `warnings`, `kick`, `ban`, `clear`, `mute`, `unmute`', inline: true },
                { name: '👑 Admin Tools', value: '`admincheck`, `roleinfo`, `serverinfo`, `setprefix`', inline: true },
                { name: '🎫 Ticket System', value: '`ticket`, `close`', inline: true },
                { name: '🎮 Fun', value: '`8ball`, `coinflip`, `roll`', inline: true },
                { name: '⚙️ Utility', value: '`userinfo`, `avatar`, `poll`', inline: true }
            )
            .setFooter({ text: 'Total: 50+ commands available' });

        message.channel.send({ embeds: [embed] });
    }

    // SETPREFIX COMMAND
    if (command === 'setprefix') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Hanya Administrator yang bisa mengubah prefix!');
        }

        const newPrefix = args[0];
        if (!newPrefix || newPrefix.length > 3) {
            return message.reply('❌ Prefix harus 1-3 karakter!');
        }

        db.prefixes[message.guild.id] = newPrefix;
        saveDB();

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Prefix Updated')
            .setDescription(`Prefix bot di server ini diubah menjadi: **${newPrefix}**`)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // PING COMMAND
    if (command === 'ping') {
        const msg = await message.reply('🏓 Pinging...');
        const latency = msg.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏓 Pong!')
            .addFields(
                { name: '📡 Bot Latency', value: `${latency}ms`, inline: true },
                { name: '🌐 API Latency', value: `${apiLatency}ms`, inline: true }
            );

        msg.edit({ content: '', embeds: [embed] });
    }

    // RANK COMMAND
    if (command === 'rank' || command === 'level') {
        const user = message.mentions.users.first() || message.author;
        const levelData = getLevel(user.id, message.guild.id);
        const leaderboard = getLeaderboard(message.guild.id, 100);
        const rank = leaderboard.findIndex(u => u.userId === user.id) + 1;

        try {
            const rankCard = await generateRankCard(user, levelData, rank);
            const attachment = new AttachmentBuilder(rankCard, { name: 'rank.png' });
            
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`📊 ${user.username}'s Rank`)
                .setImage('attachment://rank.png')
                .setTimestamp();

            message.channel.send({ embeds: [embed], files: [attachment] });
        } catch (error) {
            // Fallback embed
            const xpNeeded = 5 * Math.pow(levelData.level, 2) + 50 * levelData.level + 100;
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                .setDescription(`**Level:** ${levelData.level}\n**XP:** ${levelData.xp}/${xpNeeded}\n**Rank:** #${rank}\n**Messages:** ${levelData.messages}`)
                .setThumbnail(user.displayAvatarURL());

            message.channel.send({ embeds: [embed] });
        }
    }

    // LEADERBOARD COMMAND
    if (command === 'leaderboard' || command === 'lb') {
        const leaderboard = getLeaderboard(message.guild.id, 10);
        
        let description = '';
        for (let i = 0; i < leaderboard.length; i++) {
            const userData = leaderboard[i];
            const user = await client.users.fetch(userData.userId).catch(() => null);
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
            const username = user ? user.username : 'Unknown User';
            description += `${medal} ${username} - Level **${userData.level}** | ${userData.messages} pesan\n`;
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Server Leaderboard')
            .setDescription(description || 'Belum ada data leveling')
            .setFooter({ text: `Total ${Object.keys(db.levels).filter(k => k.startsWith(message.guild.id)).length} users tracked` })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // SETLEVEL COMMAND (Admin Only)
    if (command === 'setlevel') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Hanya Administrator yang bisa menggunakan command ini!');
        }

        const user = message.mentions.users.first();
        const level = parseInt(args[1]);

        if (!user || isNaN(level) || level < 1) {
            return message.reply('❌ Usage: `!setlevel @user <level>`');
        }

        const key = `${message.guild.id}-${user.id}`;
        if (!db.levels[key]) {
            db.levels[key] = { xp: 0, level: 1, messages: 0, totalXP: 0 };
        }

        db.levels[key].level = level;
        db.levels[key].xp = 0;
        saveDB();

        message.reply(`✅ Level **${user.tag}** diatur ke **${level}**!`);
    }

    // BALANCE COMMAND
    if (command === 'balance' || command === 'bal') {
        const user = message.mentions.users.first() || message.author;
        const economy = getEconomy(user.id, message.guild.id);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setAuthor({ name: `${user.username}'s Balance`, iconURL: user.displayAvatarURL() })
            .addFields(
                { name: '💰 Wallet', value: `${economy.coins} 💰`, inline: true },
                { name: '🏦 Bank', value: `${economy.bank} 💰`, inline: true },
                { name: '💎 Total', value: `${economy.coins + economy.bank} 💰`, inline: true }
            )
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // DAILY COMMAND
    if (command === 'daily') {
        const economy = getEconomy(message.author.id, message.guild.id);
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000; // 24 hours

        if (now - economy.daily < cooldown) {
            const timeLeft = cooldown - (now - economy.daily);
            return message.reply(`⏰ Kamu sudah klaim daily hari ini! Coba lagi dalam **${formatTime(timeLeft)}**`);
        }

        const reward = 100;
        addCoins(message.author.id, message.guild.id, reward);
        economy.daily = now;
        saveDB();

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💰 Daily Reward')
            .setDescription(`Kamu mendapat **${reward} coins**!\n💎 Total: **${getEconomy(message.author.id, message.guild.id).coins} coins**`)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // WORK COMMAND
    if (command === 'work') {
        const jobs = [
            { name: '👨‍💻 Programmer', min: 50, max: 100 },
            { name: '🎨 Designer', min: 40, max: 80 },
            { name: '👨‍🍳 Chef', min: 30, max: 70 },
            { name: '📹 YouTuber', min: 60, max: 120 },
            { name: '🎵 Musician', min: 45, max: 90 }
        ];
        
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        const reward = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

        addCoins(message.author.id, message.guild.id, reward);
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('💼 Work Result')
            .setDescription(`Kamu bekerja sebagai **${job.name}** dan mendapat **${reward} coins**!`)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // ADMIN CHECK COMMAND
    if (command === 'admincheck' || command === 'checkadmin') {
        const targetUser = message.mentions.users.first() || message.author;
        const targetMember = await message.guild.members.fetch(targetUser.id);
        
        // Check permissions
        const isAdmin = targetMember.permissions.has(PermissionFlagsBits.Administrator);
        const hasManageGuild = targetMember.permissions.has(PermissionFlagsBits.ManageGuild);
        const hasManageRoles = targetMember.permissions.has(PermissionFlagsBits.ManageRoles);
        const hasManageMessages = targetMember.permissions.has(PermissionFlagsBits.ManageMessages);
        const hasKickMembers = targetMember.permissions.has(PermissionFlagsBits.KickMembers);
        const hasBanMembers = targetMember.permissions.has(PermissionFlagsBits.BanMembers);

        // Check role names
        const adminRoles = targetMember.roles.cache.filter(role => 
            role.name.toLowerCase().includes('admin') ||
            role.name.toLowerCase().includes('administrator') ||
            role.name.toLowerCase().includes('owner')
        );

        const moderatorRoles = targetMember.roles.cache.filter(role => 
            role.name.toLowerCase().includes('mod') ||
            role.name.toLowerCase().includes('moderator') ||
            role.name.toLowerCase().includes('staff')
        );

        const isModerator = hasManageMessages || hasKickMembers || hasBanMembers || moderatorRoles.size > 0;

        const embed = new EmbedBuilder()
            .setColor(isAdmin ? '#00FF00' : (isModerator ? '#FFA500' : '#FF0000'))
            .setTitle(`👑 Admin Check - ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: '⚡ Administrator', value: isAdmin ? '✅ Yes' : '❌ No', inline: true },
                { name: '🛡️ Moderator', value: isModerator ? '✅ Yes' : '❌ No', inline: true },
                { name: '👑 Admin Roles', value: adminRoles.size > 0 ? adminRoles.map(r => r.toString()).join(', ') : '❌ None' },
                { name: '🛡️ Moderator Roles', value: moderatorRoles.size > 0 ? moderatorRoles.map(r => r.toString()).join(', ') : '❌ None' },
                { name: '📊 Key Permissions', value: [
                    hasManageGuild ? '✅ Manage Server' : '❌ Manage Server',
                    hasManageRoles ? '✅ Manage Roles' : '❌ Manage Roles',
                    hasManageMessages ? '✅ Manage Messages' : '❌ Manage Messages',
                    hasKickMembers ? '✅ Kick Members' : '❌ Kick Members',
                    hasBanMembers ? '✅ Ban Members' : '❌ Ban Members'
                ].join('\n') }
            )
            .setFooter({ text: `ID: ${targetUser.id}` })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // WARN COMMAND
    if (command === 'warn') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ Kamu tidak memiliki izin untuk warn members!');
        }

        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mention user yang ingin diwarn!');

        const reason = args.slice(1).join(' ') || 'Tidak ada alasan';
        const { count, warning } = addWarning(user.id, message.guild.id, message.author.id, reason);

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚠️ Warning Issued')
            .addFields(
                { name: 'User', value: user.tag, inline: true },
                { name: 'Moderator', value: message.author.tag, inline: true },
                { name: 'Total Warnings', value: count.toString(), inline: true },
                { name: 'Reason', value: reason }
            )
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // WARNINGS COMMAND
    if (command === 'warnings' || command === 'warns') {
        const user = message.mentions.users.first() || message.author;
        const warnings = getWarnings(user.id, message.guild.id);

        if (warnings.length === 0) {
            return message.reply(`✅ ${user.tag} tidak memiliki warnings.`);
        }

        let description = '';
        warnings.forEach((warn, index) => {
            const moderator = client.users.cache.get(warn.moderator);
            description += `**${index + 1}.** ${warn.reason}\n`;
            description += `👮 By: ${moderator ? moderator.tag : 'Unknown'} | 📅 <t:${Math.floor(warn.timestamp / 1000)}:R>\n\n`;
        });

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle(`⚠️ Warnings - ${user.tag}`)
            .setDescription(description)
            .setFooter({ text: `Total: ${warnings.length} warnings` })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // KICK COMMAND
    if (command === 'kick') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('❌ Kamu tidak memiliki izin untuk kick members!');
        }

        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Mention user yang ingin dikick!');

        if (!member.kickable) return message.reply('❌ Tidak bisa kick user ini!');

        const reason = args.slice(1).join(' ') || 'Tidak ada alasan';

        try {
            await member.kick(reason);
            
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('👢 Member Kicked')
                .addFields(
                    { name: 'User', value: member.user.tag, inline: true },
                    { name: 'Moderator', value: message.author.tag, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Gagal kick user!');
        }
    }

    // MUTE COMMAND
    if (command === 'mute') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ Kamu tidak memiliki izin untuk mute members!');
        }

        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Mention user yang ingin dimute!');

        const duration = args[1] || '10m';
        let durationMs;

        // Parse duration
        const time = parseInt(duration.slice(0, -1));
        const unit = duration.slice(-1).toLowerCase();

        if (unit === 'm') durationMs = time * 60 * 1000;
        else if (unit === 'h') durationMs = time * 60 * 60 * 1000;
        else if (unit === 'd') durationMs = time * 24 * 60 * 60 * 1000;
        else {
            return message.reply('❌ Format waktu tidak valid! Gunakan: `10m`, `1h`, `1d`');
        }

        if (durationMs > 28 * 24 * 60 * 60 * 1000) {
            return message.reply('❌ Mute tidak boleh lebih dari 28 hari!');
        }

        const reason = args.slice(2).join(' ') || 'Tidak ada alasan';

        try {
            await member.timeout(durationMs, reason);
            
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🔇 Member Muted')
                .addFields(
                    { name: 'User', value: member.user.tag, inline: true },
                    { name: 'Moderator', value: message.author.tag, inline: true },
                    { name: 'Duration', value: duration, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Gagal mute user!');
        }
    }

    // UNMUTE COMMAND
    if (command === 'unmute') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ Kamu tidak memiliki izin untuk unmute members!');
        }

        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Mention user yang ingin diunmute!');

        try {
            await member.timeout(null);
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔊 Member Unmuted')
                .addFields(
                    { name: 'User', value: member.user.tag, inline: true },
                    { name: 'Moderator', value: message.author.tag, inline: true }
                )
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Gagal unmute user!');
        }
    }

    // CLEAR COMMAND
    if (command === 'clear' || command === 'purge') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ Kamu tidak memiliki izin!');
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply('❌ Masukkan jumlah antara 1-100!');
        }

        try {
            const deleted = await message.channel.bulkDelete(amount + 1, true);
            const reply = await message.channel.send(`✅ Berhasil menghapus **${deleted.size - 1}** pesan!`);
            setTimeout(() => reply.delete(), 5000);
        } catch (error) {
            message.reply('❌ Gagal menghapus pesan!');
        }
    }

    // TICKET COMMAND
    if (command === 'ticket') {
        const reason = args.join(' ') || 'No reason provided';
        
        try {
            const ticketChannel = await createTicket(message.guild, message.author, reason);
            await message.reply(`✅ Ticket created: ${ticketChannel}`);
        } catch (error) {
            console.error('Error creating ticket:', error);
            await message.reply('❌ Failed to create ticket.');
        }
    }

    // CLOSE COMMAND (for tickets)
    if (command === 'close') {
        const ticket = db.tickets[message.channel.id];
        if (!ticket) {
            return message.reply('❌ This channel is not a ticket!');
        }

        if (ticket.closed) {
            return message.reply('❌ This ticket is already closed!');
        }

        await closeTicket(message.channel, message.author);
    }

    // REACTION ROLE COMMAND
    if (command === 'reactionrole' || command === 'rr') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Hanya Administrator yang bisa menggunakan command ini!');
        }

        const messageId = args[0];
        const emoji = args[1];
        const role = message.mentions.roles.first();

        if (!messageId || !emoji || !role) {
            return message.reply('❌ Usage: `!reactionrole <messageID> <emoji> @role`');
        }

        try {
            const targetMessage = await message.channel.messages.fetch(messageId);
            await targetMessage.react(emoji);

            if (!db.reactionRoles[messageId]) {
                db.reactionRoles[messageId] = {};
            }

            db.reactionRoles[messageId][emoji] = role.id;
            saveDB();

            message.reply(`✅ Reaction role berhasil di-setup!\n${emoji} = ${role.name}`);
        } catch (error) {
            message.reply('❌ Message tidak ditemukan atau emoji invalid!');
        }
    }

    // SERVERINFO COMMAND
    if (command === 'serverinfo' || command === 'server') {
        const { guild } = message;
        const owner = await guild.fetchOwner();

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📊 ${guild.name} - Server Information`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '👑 Owner', value: owner.user.tag, inline: true },
                { name: '🆔 ID', value: guild.id, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '👥 Members', value: guild.memberCount.toString(), inline: true },
                { name: '💬 Channels', value: guild.channels.cache.size.toString(), inline: true },
                { name: '🎭 Roles', value: guild.roles.cache.size.toString(), inline: true },
                { name: '🚀 Boost Level', value: `Level ${guild.premiumTier}`, inline: true },
                { name: '✨ Boosts', value: guild.premiumSubscriptionCount?.toString() || '0', inline: true }
            )
            .setFooter({ text: `Server ID: ${guild.id}` })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // USERINFO COMMAND
    if (command === 'userinfo' || command === 'user') {
        const user = message.mentions.users.first() || message.author;
        const member = message.guild.members.cache.get(user.id);

        if (!member) return message.reply('❌ User tidak ditemukan di server ini!');

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`👤 ${user.username} - User Information`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: '🆔 ID', value: user.id, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '🤖 Bot', value: user.bot ? '✅ Yes' : '❌ No', inline: true },
                { name: '🎭 Roles', value: `${member.roles.cache.size - 1}`, inline: true },
                { name: '🚀 Highest Role', value: member.roles.highest.toString(), inline: true }
            )
            .setFooter({ text: `User ID: ${user.id}` })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // 8BALL COMMAND
    if (command === '8ball') {
        const question = args.join(' ');
        if (!question) return message.reply('❌ Tanyakan sesuatu!');

        const responses = [
            'Ya, pasti!', 'Tidak!', 'Mungkin.', 'Coba tanya lagi.',
            'Bisa jadi.', 'Sepertinya iya.', 'Tidak mungkin!', 'Pasti tidak!',
            'Absolutely!', 'Very doubtful', 'Ask again later', 'Outlook good'
        ];

        const answer = responses[Math.floor(Math.random() * responses.length)];
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎱 Magic 8Ball')
            .addFields(
                { name: 'Question', value: question },
                { name: 'Answer', value: answer }
            );

        message.channel.send({ embeds: [embed] });
    }

    // POLL COMMAND
    if (command === 'poll') {
        const question = args.join(' ');
        if (!question) return message.reply('❌ Masukkan pertanyaan poll!');

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📊 Poll')
            .setDescription(question)
            .setFooter({ text: `Poll oleh ${message.author.tag}` })
            .setTimestamp();

        const pollMsg = await message.channel.send({ embeds: [embed] });
        await pollMsg.react('✅');
        await pollMsg.react('❌');
        await pollMsg.react('🤷');
    }

    // SAY COMMAND
    if (command === 'say') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ Kamu tidak memiliki izin!');
        }

        const text = args.join(' ');
        if (!text) return message.reply('❌ Masukkan teks!');

        await message.delete();
        message.channel.send(text);
    }

    // AVATAR COMMAND
    if (command === 'avatar' || command === 'av') {
        const user = message.mentions.users.first() || message.author;

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🖼️ ${user.username}'s Avatar`)
            .setImage(user.displayAvatarURL({ size: 4096, dynamic: true }))
            .setFooter({ text: `Requested by ${message.author.tag}` })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // ROLEINFO COMMAND
    if (command === 'roleinfo') {
        const role = message.mentions.roles.first() || 
                     message.guild.roles.cache.get(args[0]) ||
                     message.guild.roles.cache.find(r => r.name.toLowerCase() === args.join(' ').toLowerCase());

        if (!role) {
            return message.reply('❌ Role tidak ditemukan! Mention role atau masukkan nama/ID role.');
        }

        const embed = new EmbedBuilder()
            .setColor(role.color || '#5865F2')
            .setTitle(`🎭 Role Info: ${role.name}`)
            .addFields(
                { name: '🆔 ID', value: role.id, inline: true },
                { name: '🎨 Color', value: role.hexColor, inline: true },
                { name: '👥 Members', value: role.members.size.toString(), inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '💎 Position', value: role.position.toString(), inline: true },
                { name: '🔒 Hoisted', value: role.hoist ? '✅ Yes' : '❌ No', inline: true },
                { name: '💬 Mentionable', value: role.mentionable ? '✅ Yes' : '❌ No', inline: true }
            )
            .setFooter({ text: `Role ID: ${role.id}` })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // If command not found
    if (![
        'help', 'setprefix', 'ping', 'rank', 'leaderboard', 'setlevel', 'balance', 'daily', 'work',
        'admincheck', 'warn', 'warnings', 'kick', 'mute', 'unmute', 'clear', 'ticket', 'close', 'reactionrole',
        'serverinfo', 'userinfo', '8ball', 'poll', 'say', 'avatar', 'roleinfo'
    ].includes(command)) {
        message.reply(`❌ Command tidak dikenali! Ketik \`${prefix}help\` untuk melihat daftar commands.`);
    }
});

// ==================== START BOT ====================
client.login(process.env.BOT_TOKEN)
    .then(() => console.log('✅ Bot login successful!'))
    .catch((error) => {
        console.error('❌ Failed to login:', error.message);
        process.exit(1);
    });

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});