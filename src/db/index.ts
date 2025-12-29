import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('dfm.db');

export const initDatabase = () => {
    try {
        db.execSync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS aircraft (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        part_num TEXT,
        serial_num TEXT,
        motors TEXT NOT NULL,
        batteries_main TEXT NOT NULL,
        batteries_spare TEXT NOT NULL,
        cameras TEXT NOT NULL,
        total_hours INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS owners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        id_type TEXT NOT NULL,
        id_num TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pilots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cc TEXT NOT NULL UNIQUE,
        license_num TEXT NOT NULL,
        license_type TEXT NOT NULL,
        license_expiry TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS flights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        duration INTEGER DEFAULT 0,
        crew TEXT NOT NULL,
        equipment TEXT NOT NULL,
        prevuelo TEXT,
        postvuelo TEXT,
        cronometro TEXT,
        carga TEXT,
        fases TEXT,
        signatures TEXT,
        pdf_path TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // Best-effort migrations for older installs
        try { db.execSync(`ALTER TABLE aircraft ADD COLUMN part_num TEXT;`); } catch {}
        try { db.execSync(`ALTER TABLE aircraft ADD COLUMN serial_num TEXT;`); } catch {}
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};
