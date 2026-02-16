const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'chat-data.json');

try {
    if (fs.existsSync(dataPath)) {
        const rawData = fs.readFileSync(dataPath, 'utf8');
        const data = JSON.parse(rawData);

        if (data['Global Chat']) {
            data['Global Chat'].messages = [];
            console.log('Cleared messages for Global Chat.');
        } else {
            // If Global Chat doesn't exist, create it empty
            data['Global Chat'] = { password: null, messages: [] };
            console.log('Global Chat did not exist, created empty.');
        }

        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        console.log('Successfully updated chat-data.json');
    } else {
        console.log('chat-data.json not found.');
        // Create new
        const initialData = { "Global Chat": { password: null, messages: [] } };
        fs.writeFileSync(dataPath, JSON.stringify(initialData, null, 2));
        console.log('Created new chat-data.json');
    }
} catch (error) {
    console.error('Error processing chat data:', error);
    process.exit(1);
}
