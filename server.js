const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
    initializeDatabase,
    insertDua,
    getAllDuas,
    searchDuas,
    saveDuaRequest,
    savePrayerTimes,
    getCachedPrayerTimes,
    saveUserLocation,
    getRecentLocations,
    addFavoriteDua,
    getFavoriteDuas
} = require('./db');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Serve static frontend
app.use(express.static(path.join(__dirname, '.')));

// Initialize database on startup
initializeDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
});

// Dua API endpoint with database integration
app.post('/api/dua', async (req, res) => {
    const query = (req.body?.query || '').toString().trim();
    if (!query) return res.status(400).json({ error: 'Query is required' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'Server missing GEMINI_API_KEY' });

    try {
        const prompt = `
You are an Islamic assistant. Given a user need, return a concise dua or surah snippet with Arabic, transliteration, translation, and a short context. Keep it brief (~80 words). Only respond with Islamic supplications; if unsure, say you are not sure.

User request: "${query}"
Respond as compact JSON: {"title":"","category":"","arabic":"","transliteration":"","translation":"","meaning":""}
`;

        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 },
        });

        const text = result.response?.text?.() || '';
        let parsed = null;
        try {
            parsed = JSON.parse(text);
        } catch (err) {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                parsed = JSON.parse(match[0]);
            }
        }

        if (!parsed || !parsed.arabic) {
            // Save request even if no valid response
            await saveDuaRequest(query, null, true).catch(console.error);
            return res.status(200).json({ fallback: true, message: text.trim() });
        }

        // Save AI-generated dua to database
        try {
            const savedDua = await insertDua({ ...parsed, source: 'ai' });
            await saveDuaRequest(query, parsed, true);
            return res.json({ fallback: false, dua: parsed, id: savedDua.id });
        } catch (dbErr) {
            console.error('Database save error:', dbErr);
            // Still return the response even if database save fails
            return res.json({ fallback: false, dua: parsed });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'AI request failed' });
    }
});

// Get all duas from database
app.get('/api/duas', async (req, res) => {
    try {
        const duas = await getAllDuas();
        return res.json({ duas });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch duas' });
    }
});

// Search duas
app.get('/api/duas/search', async (req, res) => {
    const keyword = req.query.q || '';
    if (!keyword) {
        return res.status(400).json({ error: 'Search keyword is required' });
    }
    try {
        const duas = await searchDuas(keyword);
        return res.json({ duas });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Search failed' });
    }
});

// Save prayer times with caching
app.post('/api/prayer-times', async (req, res) => {
    const { latitude, longitude, timings } = req.body;
    if (!latitude || !longitude || !timings) {
        return res.status(400).json({ error: 'Latitude, longitude, and timings are required' });
    }
    try {
        const today = new Date().toISOString().split('T')[0];
        await savePrayerTimes(latitude, longitude, today, timings);
        await saveUserLocation(latitude, longitude).catch(console.error);
        return res.json({ success: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to save prayer times' });
    }
});

// Get cached prayer times
app.get('/api/prayer-times', async (req, res) => {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    try {
        const today = new Date().toISOString().split('T')[0];
        const cached = await getCachedPrayerTimes(parseFloat(latitude), parseFloat(longitude), today);
        if (cached) {
            return res.json({ cached: true, timings: {
                Fajr: cached.fajr,
                Dhuhr: cached.dhuhr,
                Asr: cached.asr,
                Maghrib: cached.maghrib,
                Isha: cached.isha
            }});
        }
        return res.json({ cached: false });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to get cached prayer times' });
    }
});

// Get recent locations
app.get('/api/locations/recent', async (req, res) => {
    try {
        const locations = await getRecentLocations(10);
        return res.json({ locations });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to get recent locations' });
    }
});

// Add favorite dua
app.post('/api/duas/favorite', async (req, res) => {
    const { duaId, userIdentifier = 'default' } = req.body;
    if (!duaId) {
        return res.status(400).json({ error: 'Dua ID is required' });
    }
    try {
        await addFavoriteDua(duaId, userIdentifier);
        return res.json({ success: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to add favorite' });
    }
});

// Get favorite duas
app.get('/api/duas/favorite', async (req, res) => {
    const userIdentifier = req.query.user || 'default';
    try {
        const duas = await getFavoriteDuas(userIdentifier);
        return res.json({ duas });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to get favorite duas' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Ensure database is initialized
    try {
        await initializeDatabase();
        console.log('Database ready');
    } catch (err) {
        console.error('Database initialization error:', err);
    }
});

