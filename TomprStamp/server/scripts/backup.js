import { db } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(__dirname, '../../backups');

const TABLES = [
    'stores',
    'products',
    'orders',
    'users',
    'customers',
    'categories',
    'promotions',
    'supply_items',
    'recipes',
    'shifts',
    'wastage_logs',
    'time_logs',
    'cash_drawer_logs',
    'announcements',
    'feedback',
    'referral_logs',
    'stamp_claims'
];

async function runBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const currentBackupDir = path.join(BACKUP_DIR, timestamp);

    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR);
    }
    fs.mkdirSync(currentBackupDir);

    console.log(`Starting backup to ${currentBackupDir}...`);

    for (const table of TABLES) {
        process.stdout.write(`Backing up table: ${table}... `);
        try {
            const { data, error } = await db.from(table).select('*');
            if (error) throw error;

            const filePath = path.join(currentBackupDir, `${table}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log('Done.');
        } catch (err) {
            console.error(`FAILED: ${err.message}`);
        }
    }

    // Create a "latest" symlink or simple pointer file
    fs.writeFileSync(path.join(BACKUP_DIR, 'latest.txt'), timestamp);
    console.log('\nBackup completed successfully!');
    console.log(`Summary: ${TABLES.length} tables processed.`);
}

runBackup().catch(err => {
    console.error('Backup failed critical error:', err);
    process.exit(1);
});
