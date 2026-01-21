const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

// --- НАСТРОЙКИ ---
const bot = new Telegraf('8128840044:AAFzNTRHMXwVDvXjsuYJ3wsooCUQaJss8oQ');
const adminIds = [6521973733, 93050630, 7862142411, 7713766207, 873177209];

// --- СОСТОЯНИЯ ---
const buyingProcess = new Map(); 
const waitingForQuestion = new Set();
const adminReplyMode = new Map(); 
const requestMessages = new Map(); 
const processedRequests = new Set(); 

// --- ФУНКЦИИ ---
const getUserLink = (from) => {
    const fullName = from.first_name + (from.last_name ? ' ' + from.last_name : '');
    return from.username 
        ? `<a href="https://t.me/${from.username}">${fullName} (@${from.username})</a>` 
        : `<a href="tg://user?id=${from.id}">${fullName} (ID: ${from.id})</a>`;
};

const mainMenu = Markup.keyboard([['Инвайт 6 ранг', 'Купить 8 ранг'], ['Задать вопрос']]).resize();

async function broadcastToAdmins(reqId, text, keyboard) {
    const msgIds = [];
    for (const adminId of adminIds) {
        try {
            const m = await bot.telegram.sendMessage(adminId, text, { parse_mode: 'HTML', disable_web_page_preview: true, ...keyboard });
            msgIds.push({ chatId: adminId, messageId: m.message_id });
        } catch (e) { console.error(e); }
    }
    requestMessages.set(reqId, msgIds);
}

async function syncAdminMessages(reqId, statusText) {
    const msgs = requestMessages.get(reqId);
    if (!msgs) return;
    for (const m of msgs) {
        try { await bot.telegram.editMessageText(m.chatId, m.messageId, null, statusText, { parse_mode: 'HTML', disable_web_page_preview: true }); } catch (e) {}
    }
    requestMessages.delete(reqId);
}

// --- КОМАНДЫ ---

bot.start((ctx) => {
    const startText = '<b>Здарова, другалёк! Ты попал по адресу 😎</b>\n\n' +
        'Что тебе нужно? 6 ранг? Или хочешь сразу залететь на 8 ранг и делать дела? 💰\n\n' +
        '<b>Если есть терки или вопросы — жми на кнопки, пацыки на связи и уже ждут тебя!</b>\n' +
        '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n' +
        '<b>DEVILSIDE GRUPP X 100 GHETTO</b>\n' +
        '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n' +
        'ₘₐᵣₐₛ ₗₒₕ';
    if (fs.existsSync('./photo.jpg')) ctx.replyWithPhoto({ source: './photo.jpg' }, { caption: startText, parse_mode: 'HTML', ...mainMenu });
    else ctx.reply(startText, { parse_mode: 'HTML', ...mainMenu });
});

// ИНВАЙТ 6 РАНГ (Картинка invite.jpg)
bot.hears('Инвайт 6 ранг', async (ctx) => {
    const rId = `inv_${ctx.from.id}_${Date.now()}`;
    const inviteMsg = '✅ <b>Заявка на 6 ранг улетела. Жди ответа, малый!</b>';
    if (fs.existsSync('./invite.jpg')) await ctx.replyWithPhoto({ source: './invite.jpg' }, { caption: inviteMsg, parse_mode: 'HTML' });
    else await ctx.reply(inviteMsg, { parse_mode: 'HTML' });

    await broadcastToAdmins(rId, `🔔 <b>ИНВАЙТ:</b> ${getUserLink(ctx.from)}`, 
        Markup.inlineKeyboard([[Markup.button.callback('✅ Принять', `acc_${rId}`), Markup.button.callback('❌ Отказ', `rej_${rId}`)]])
    );
});

// КУПИТЬ 8 РАНГ (С примером "Серега Членосос")
bot.hears('Купить 8 ранг', (ctx) => {
    buyingProcess.set(ctx.from.id, { step: 'nickname' });
    const bText = '💳 <b>Ранг стоит бабок, но оно того стоит!</b>\n' +
                  'Цена: <code>4,000,000$</code> за сутки.\n\n' +
                  '<b>ВАЖНО: Покупка минимум от 14 дней!</b>\n\n' +
                  '<b>Введи свой игровой Ник-Нейм:</b>\n' +
                  '<i>Например: Серега Членосос</i>'; // ДОБАВЛЕН ПРИМЕР

    if (fs.existsSync('./priz.jpg')) ctx.replyWithPhoto({ source: './priz.jpg' }, { caption: bText, parse_mode: 'HTML' });
    else ctx.reply(bText, { parse_mode: 'HTML' });
});

// ЗАДАТЬ ВОПРОС (Картинка police.jpg)
bot.hears('Задать вопрос', async (ctx) => {
    waitingForQuestion.add(ctx.from.id);
    const qText = '<b>Излагай суть проблемы или вопрос одним сообщением:</b>\nМы всё решим.\n\n' +
                  '<i>Братух давай только без мусорских действий, добро?</i>';
    if (fs.existsSync('./police.jpg')) await ctx.replyWithPhoto({ source: './police.jpg' }, { caption: qText, parse_mode: 'HTML' });
    else await ctx.reply(qText, { parse_mode: 'HTML' });
});

bot.on('text', async (ctx) => {
    const uId = ctx.from.id;
    const txt = ctx.message.text;

    if (adminIds.includes(uId) && adminReplyMode.has(uId)) {
        bot.telegram.sendMessage(adminReplyMode.get(uId), `<b>✉️ Ответ от администрации:</b>\n\n${txt}`, { parse_mode: 'HTML' }).catch(() => {});
        ctx.reply('✅ Ответ доставлен.');
        adminReplyMode.delete(uId);
        return;
    }

    if (waitingForQuestion.has(uId)) {
        const qId = `que_${uId}_${Date.now()}`;
        ctx.reply('✅ <b>Вопрос улетел в штаб!</b>', { parse_mode: 'HTML' });
        await broadcastToAdmins(qId, `❓ <b>ВОПРОС:</b> от ${getUserLink(ctx.from)}\n<i>${txt}</i>`, Markup.inlineKeyboard([[Markup.button.callback('✍️ Ответить', `ans_${qId}`)]]));
        waitingForQuestion.delete(uId);
        return;
    }

    const buy = buyingProcess.get(uId);
    if (buy) {
        if (buy.step === 'nickname') {
            buy.nickname = txt; buy.step = 'days';
            ctx.reply('<b>На сколько дней берешь? (минимум 14):</b>', { parse_mode: 'HTML' });
        } else if (buy.step === 'days') {
            const d = parseInt(txt);
            if (!isNaN(d) && d >= 14) {
                const bId = `buy_${uId}_${Date.now()}`;
                const total = (d * 4000000).toLocaleString();
                ctx.reply(`✅ <b>Заявка принята!</b> Сумма: <code>${total}$</code>`, { parse_mode: 'HTML' });
                await broadcastToAdmins(bId, `💰 <b>8 РАНГ:</b> ${getUserLink(ctx.from)}\nНик: <code>${buy.nickname}</code>\nСрок: ${d} дн.\nБабки: <b>${total}$</b>`, 
                    Markup.inlineKeyboard([[Markup.button.callback('✅ Принять', `acc_${bId}`), Markup.button.callback('❌ Отказ', `rej_${bId}`)]])
                );
                buyingProcess.delete(uId);
            } else { ctx.reply('<b>Минимум 14 дней!</b>'); buyingProcess.delete(uId); }
        }
        return;
    }
});

bot.on('callback_query', async (ctx) => {
    const [act, type, target, ts] = ctx.callbackQuery.data.split('_');
    const key = `${type}_${target}_${ts}`;
    if (processedRequests.has(key)) return ctx.answerCbQuery('⚠️ Уже обработано!');
    const aName = ctx.from.first_name;
    const msg = ctx.callbackQuery.message.text || ctx.callbackQuery.message.caption || "";

    if (act === 'ans') {
        processedRequests.add(key);
        adminReplyMode.set(ctx.from.id, target);
        await syncAdminMessages(key, `${msg}\n\n✍️ <b>Админ ${aName} пишет ответ...</b>`);
        ctx.reply('<b>Пиши ответку этому пидору а то он заебал меня:</b>', { parse_mode: 'HTML' });
    } else if (act === 'acc') {
        processedRequests.add(key);
        let cash = "";
        if (type === 'buy') {
            const lines = msg.split('\n');
            const cLine = lines.find(l => l.includes('Бабки:'));
            if (cLine) cash = `\n💵 <b>Сумма сделки: ${cLine.split(': ')[1]}</b>`;
        }
        await syncAdminMessages(key, `${msg}\n\n🤝 <b>ПРИНЯТО админом ${aName}</b>${cash}`);
        bot.telegram.sendMessage(target, '✅ <b>Твою заявку приняли!</b>', { parse_mode: 'HTML' }).catch(() => {});
    } else if (act === 'rej') {
        processedRequests.add(key);
        await syncAdminMessages(key, `${msg}\n\n❌ <b>ОТКАЗАНО админом ${aName}</b>`);
        bot.telegram.sendMessage(target, '❌ <b>Съебался с чата уебище</b>', { parse_mode: 'HTML' }).catch(() => {});
    }
    ctx.answerCbQuery();
});

bot.launch().then(() => console.log('🚀 Шеф057, ВСЁ ГОТОВО! СЕРЕГА ДОБАВЛЕН!'));