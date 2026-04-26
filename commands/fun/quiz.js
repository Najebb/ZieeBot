const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addXp } = require('../../utils/xpManager');

// Bank soal quiz
const quizBank = [
  {
    question: 'Berapa hasil dari 7 × 8?',
    options: ['54', '56', '58', '62'],
    answer: 1 // index 1 = 56
  },
  {
    question: 'Planet mana yang dikenal sebagai "Planet Merah"?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturnus'],
    answer: 1
  },
  {
    question: 'Siapa penemu lampu pijar?',
    options: ['Nikola Tesla', 'Thomas Edison', 'Alexander Graham Bell', 'Benjamin Franklin'],
    answer: 1
  },
  {
    question: 'Bahasa pemrograman apa yang digunakan untuk membuat bot ini?',
    options: ['Python', 'Java', 'JavaScript', 'C++'],
    answer: 2
  },
  {
    question: 'Berapa jumlah provinsi di Indonesia?',
    options: ['34', '33', '38', '30'],
    answer: 2
  },
  {
    question: 'Hewan tercepat di darat adalah?',
    options: ['Singa', 'Cheetah', 'Kuda', 'Harimau'],
    answer: 1
  },
  {
    question: 'Tahun berapa Indonesia merdeka?',
    options: ['1945', '1950', '1949', '1942'],
    answer: 0
  },
  {
    question: 'Simbol kimia untuk air adalah?',
    options: ['CO2', 'O2', 'H2O', 'NaCl'],
    answer: 2
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('🧠 Quiz random, pilih jawaban yang benar! Dapat XP!'),

  async execute(interaction) {
    // Pilih soal random
    const soal = quizBank[Math.floor(Math.random() * quizBank.length)];

    const embed = new EmbedBuilder()
      .setTitle('🧠 Quiz Time!')
      .setDescription(soal.question)
      .setColor('#f1c40f')
      .setFooter({ text: 'Pilih jawaban dalam 30 detik!' })
      .setTimestamp();

    // Buat tombol A B C D
    const labels = ['A', 'B', 'C', 'D'];
    const row = new ActionRowBuilder();
    soal.options.forEach((opt, i) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`quiz_${i}`)
          .setLabel(`${labels[i]}. ${opt}`)
          .setStyle(ButtonStyle.Primary)
      );
    });

    const msg = await interaction.reply({ embeds: [embed], components: [row] });

    // Collector jawaban
    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id && i.customId.startsWith('quiz_'),
      time: 30000 // 30 detik
    });

    let answered = false;

    collector.on('collect', async i => {
      answered = true;
      const pilihan = parseInt(i.customId.split('_')[1]);
      const benar = pilihan === soal.answer;

      if (benar) {
        // Reward XP
        const xpReward = 25;
        addXp(interaction.guild.id, interaction.user.id, xpReward);

        const correctEmbed = new EmbedBuilder()
          .setTitle('✅ Benar!')
          .setDescription(`Jawaban: **${soal.options[soal.answer]}**\n🎁 Dapat **${xpReward} XP**!`)
          .setColor('#57f287')
          .setTimestamp();
        await i.update({ embeds: [correctEmbed], components: [] });
      } else {
        const wrongEmbed = new EmbedBuilder()
          .setTitle('❌ Salah!')
          .setDescription(`Jawaban yang benar: **${soal.options[soal.answer]}**`)
          .setColor('#ff0000')
          .setTimestamp();
        await i.update({ embeds: [wrongEmbed], components: [] });
      }
      collector.stop();
    });

    collector.on('end', async () => {
      if (!answered) {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('⏰ Waktu Habis!')
          .setDescription(`Jawaban yang benar: **${soal.options[soal.answer]}**`)
          .setColor('#95a5a6')
          .setTimestamp();
        await msg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
      }
    });
  }
};
