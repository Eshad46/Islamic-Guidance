const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'islamic_guidance.db');

// Create and connect to database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Initialize database tables
const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Table for storing duas (both AI-generated and predefined)
            db.run(`CREATE TABLE IF NOT EXISTS duas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                category TEXT,
                arabic TEXT,
                transliteration TEXT,
                translation TEXT,
                meaning TEXT,
                keywords TEXT,
                source TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating duas table:', err);
                    reject(err);
                } else {
                    console.log('Duas table initialized');
                }
            });

            // Table for storing user dua requests/queries
            db.run(`CREATE TABLE IF NOT EXISTS dua_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query TEXT NOT NULL,
                response_title TEXT,
                response_category TEXT,
                is_ai_generated INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating dua_requests table:', err);
                    reject(err);
                } else {
                    console.log('Dua requests table initialized');
                }
            });

            // Table for storing prayer times (cached)
            db.run(`CREATE TABLE IF NOT EXISTS prayer_times (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                date TEXT NOT NULL,
                fajr TEXT,
                dhuhr TEXT,
                asr TEXT,
                maghrib TEXT,
                isha TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(latitude, longitude, date)
            )`, (err) => {
                if (err) {
                    console.error('Error creating prayer_times table:', err);
                    reject(err);
                } else {
                    console.log('Prayer times table initialized');
                }
            });

            // Table for storing user locations/preferences
            db.run(`CREATE TABLE IF NOT EXISTS user_locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                country_name TEXT,
                last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
                usage_count INTEGER DEFAULT 1
            )`, (err) => {
                if (err) {
                    console.error('Error creating user_locations table:', err);
                    reject(err);
                } else {
                    console.log('User locations table initialized');
                }
            });

            // Table for storing favorite duas
            db.run(`CREATE TABLE IF NOT EXISTS favorite_duas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dua_id INTEGER,
                user_identifier TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dua_id) REFERENCES duas(id)
            )`, (err) => {
                if (err) {
                    console.error('Error creating favorite_duas table:', err);
                    reject(err);
                } else {
                    console.log('Favorite duas table initialized');
                    resolve();
                }
            });
        });
    });
};

// Insert a dua into the database
const insertDua = (dua) => {
    return new Promise((resolve, reject) => {
        const { title, category, arabic, transliteration, translation, meaning, keywords, source = 'user' } = dua;
        const keywordsStr = Array.isArray(keywords) ? keywords.join(',') : keywords || '';
        
        db.run(
            `INSERT INTO duas (title, category, arabic, transliteration, translation, meaning, keywords, source)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, category, arabic, transliteration, translation, meaning, keywordsStr, source],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...dua });
                }
            }
        );
    });
};

// Get all duas
const getAllDuas = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM duas ORDER BY created_at DESC', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Search duas by keyword
const searchDuas = (keyword) => {
    return new Promise((resolve, reject) => {
        const searchTerm = `%${keyword}%`;
        db.all(
            `SELECT * FROM duas 
             WHERE title LIKE ? OR category LIKE ? OR keywords LIKE ? OR translation LIKE ?
             ORDER BY created_at DESC`,
            [searchTerm, searchTerm, searchTerm, searchTerm],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        );
    });
};

// Save dua request
const saveDuaRequest = (query, response, isAiGenerated = false) => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO dua_requests (query, response_title, response_category, is_ai_generated)
             VALUES (?, ?, ?, ?)`,
            [query, response?.title || null, response?.category || null, isAiGenerated ? 1 : 0],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            }
        );
    });
};

// Save prayer times
const savePrayerTimes = (latitude, longitude, date, timings) => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR REPLACE INTO prayer_times (latitude, longitude, date, fajr, dhuhr, asr, maghrib, isha)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [latitude, longitude, date, timings.Fajr, timings.Dhuhr, timings.Asr, timings.Maghrib, timings.Isha],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            }
        );
    });
};

// Get cached prayer times
const getCachedPrayerTimes = (latitude, longitude, date) => {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM prayer_times WHERE latitude = ? AND longitude = ? AND date = ?`,
            [latitude, longitude, date],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            }
        );
    });
};

// Save or update user location
const saveUserLocation = (latitude, longitude, countryName = null) => {
    return new Promise((resolve, reject) => {
        // Check if location exists
        db.get(
            `SELECT * FROM user_locations WHERE latitude = ? AND longitude = ?`,
            [latitude, longitude],
            (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    // Update existing location
                    db.run(
                        `UPDATE user_locations SET last_used = CURRENT_TIMESTAMP, usage_count = usage_count + 1, country_name = COALESCE(?, country_name) WHERE id = ?`,
                        [countryName, row.id],
                        function(updateErr) {
                            if (updateErr) {
                                reject(updateErr);
                            } else {
                                resolve({ id: row.id, ...row });
                            }
                        }
                    );
                } else {
                    // Insert new location
                    db.run(
                        `INSERT INTO user_locations (latitude, longitude, country_name) VALUES (?, ?, ?)`,
                        [latitude, longitude, countryName],
                        function(insertErr) {
                            if (insertErr) {
                                reject(insertErr);
                            } else {
                                resolve({ id: this.lastID, latitude, longitude, country_name: countryName });
                            }
                        }
                    );
                }
            }
        );
    });
};

// Get recent locations
const getRecentLocations = (limit = 10) => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM user_locations ORDER BY last_used DESC LIMIT ?`,
            [limit],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        );
    });
};

// Add favorite dua
const addFavoriteDua = (duaId, userIdentifier = 'default') => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO favorite_duas (dua_id, user_identifier) VALUES (?, ?)`,
            [duaId, userIdentifier],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            }
        );
    });
};

// Get favorite duas
const getFavoriteDuas = (userIdentifier = 'default') => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT d.* FROM duas d
             INNER JOIN favorite_duas f ON d.id = f.dua_id
             WHERE f.user_identifier = ?
             ORDER BY f.created_at DESC`,
            [userIdentifier],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        );
    });
};

// Close database connection
const closeDatabase = () => {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                reject(err);
            } else {
                console.log('Database connection closed');
                resolve();
            }
        });
    });
};

module.exports = {
    db,
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
    getFavoriteDuas,
    closeDatabase
};
