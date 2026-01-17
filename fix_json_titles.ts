
import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = './public';
const FILES_TO_CHECK = ['user_1.json', 'user_2.json', 'summary_groups_test_data.json'];

function sanitizeName(name: any) {
    if (!name || typeof name !== 'string') return name;
    // Replace "OFFICER" with empty string, clean up double spaces
    return name.replace(/\s+OFFICER/i, '').replace(/\s+/g, ' ').trim();
}

function processFile(filename: string) {
    const filePath = path.join(PUBLIC_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${filename} (not found)`);
        return;
    }

    console.log(`Processing ${filename}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    let changed = false;

    if (data.summaryGroups && Array.isArray(data.summaryGroups)) {
        data.summaryGroups.forEach((group: any) => {
            const oldName = group.name;
            const newName = sanitizeName(oldName);
            if (oldName !== newName) {
                console.log(`  Fixed Group: "${oldName}" -> "${newName}"`);
                group.name = newName;
                changed = true;
            }

            // Also check competitiveGroupKey just in case
            if (group.competitiveGroupKey) {
                const oldKey = group.competitiveGroupKey;
                const newKey = sanitizeName(oldKey);
                if (oldKey !== newKey) {
                    console.log(`  Fixed Key: "${oldKey}" -> "${newKey}"`);
                    group.competitiveGroupKey = newKey;
                    changed = true;
                }
            }
        });
    }

    if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Saved changes to ${filename}`);
    } else {
        console.log(`No changes needed for ${filename}`);
    }
}

FILES_TO_CHECK.forEach(processFile);
