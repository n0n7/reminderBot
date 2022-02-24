require('dotenv').config()
const { Client, Intents } = require('discord.js')
const mongoose = require('mongoose')
const Reminder = require('./Reminder.js')

const bot = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] })

const TOKEN = process.env.CLIENT_TOKEN
const prefix = '$'
const databaseName = 'reminderBot'
const url = `mongodb://localhost:27017/${databaseName}`

// connect database
mongoose.connect(url, { useNewUrlParser: true })


bot.on('ready', () => {
    console.log('bot is ready!')
})


bot.on('messageCreate', (msg) => {

    function getFirstParameter(string) {
        // get first parameter and the argument
        string = string.trimLeft()
        let index = string.indexOf(' ')
        if (index < 0) {
            return [string, '']
        }
        return [string.substring(0, index), string.substring(index + 1)]
    }


    if (msg.author.bot) {
        // if sender is bot
        return
    }
    if (!msg.content.startsWith(prefix)) {
        return
    }

    const user = msg.author
    // get cmd and args
    const index = msg.content.indexOf(' ') // splitting point
    const cmd = msg.content.substring(1, index)
    const args = msg.content.substring(index + 1)

    switch (cmd) {
        case 'create':
            // $create {date} {content}
            /*
                date format:
                - {time}{unit}
                - {dd/mm/yyyy}
                - {hh:mm}
                - {dd/mm/yyyy-hh:mm}
            */
            const [dateString, content] = getFirstParameter(args)

            if (content === '') {
                msg.reply(`the content of the reminder can't be empty`)
            }

            // STEP 1: create date element
            const reminderTime = new Date()

            const numberAndUnitRegex = /^\d+[smhdSMHD]$/
            const dateTimeRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/\d\d\d\d-([0-1][0-9]|2[0-3]):([0-5][0-9])$/
            const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/(\d\d\d\d)/
            const timeRegex = /([0-1][0-9]|2[0-3]):([0-5][0-9])$/
            const fullDateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/(\d\d\d\d)$/
            const fullTimeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/
            
            // set dateTime
            if (numberAndUnitRegex.test(dateString)) {
                // {number}{unit}
                const timeUnit = dateString.slice(-1).toLowerCase()
                let additionalTime = parseInt(dateString.slice(0, -1))

                // calculate additional time in millisecond
                switch (timeUnit) {
                    case 's':
                        additionalTime *= 1000
                        break
                    case 'm':
                        additionalTime *= 60000
                        break
                    case 'h':
                        additionalTime *= 3600000
                        break
                    case 'd':
                        additionalTime *= 86400000
                        break
                    default:
                        additionalTime *= 60000
                }

                // set time
                reminderTime.setTime(reminderTime.getTime() + additionalTime)

            } else if (dateTimeRegex.test(dateString)) {
                // {dd/mm/yyyy-hh:mm}
                const [, day, month, year] = dateString.match(dateRegex)
                reminderTime.setDate(parseInt(day))
                reminderTime.setMonth(parseInt(month) - 1)
                reminderTime.setFullYear(parseInt(year))

                const [, hour, minute] = dateString.match(timeRegex)
                reminderTime.setHours(parseInt(hour))
                reminderTime.setMinutes(parseInt(minute))

            } else if (fullDateRegex.test(dateString)) {
                // {dd/mm/yyyy}
                const [, day, month, year] = dateString.match(dateRegex)
                reminderTime.setDate(parseInt(day))
                reminderTime.setMonth(parseInt(month) - 1)
                reminderTime.setFullYear(parseInt(year))

            } else if (fullTimeRegex.test(dateString)) {
                // {hh:mm}
                const [, hour, minute] = dateString.match(timeRegex)
                reminderTime.setHours(parseInt(hour))
                reminderTime.setMinutes(parseInt(minute))

            } else {
                // wrong format case
                console.log('wrong date format')
                msg.reply('wrong date format')
                return
            }

            // store data in db + send reply to user
            const reminder = new Reminder({
                date: reminderTime,
                channelId: msg.channel.id,
                msgId: msg.id,
                content: content
            })

            reminder.save().then(() => {
                msg.reply('msg has been saved')
                console.log(`save msg '${msg.content}'`)
            }).catch((e) => console.error(e))

            break

        case 'check':
            // $check

            break

        case 'remove':
            // $remove ?????

            break

        case 'edit':
            // $edit

            break

        default:
            // error msg
            console.log('unknown command')
            msg.reply('unknown command')

        
            
    }

})


// login
bot.login(TOKEN);


// check the reminder
const checkIntervalTime = 5 * 1000
setInterval(() => {
    Reminder.find({}, (err, reminder) => {
        // filter reminder that will be reply
        const currentTime = new Date().getTime()
        reminder = reminder.filter(e => (currentTime < e.date.getTime() && e.date.getTime() < currentTime + checkIntervalTime))

        // send reply for each msg
        reminder.forEach(e => {
            bot.channels.fetch(e.channelId).then((textchannel) => {
                textchannel.messages.fetch(e.msgId).then((msg) => {
                    msg.reply('kuay')
                })
            })
        })
    })
}, checkIntervalTime)