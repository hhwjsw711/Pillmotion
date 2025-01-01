const emojis = [
    "🌟",
    "💫",
    "✨",
    "🔥",
    "⚡️",
    "💥",
    "🌪️",
    "🎭",
    "🎪",
    "🎬",
    "🎯",
    "🎲",
    "🎨",
    "🌈",
    "💎",
    "🔮",
    "⚔️",
    "🛡️",
    "🏆",
    "👑",
];

export const getRandomEmoji = () =>
    emojis[Math.floor(Math.random() * emojis.length)];
