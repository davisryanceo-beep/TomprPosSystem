import axios from 'axios';

async function fetchMods() {
    try {
        const res = await axios.get('https://flowspos.com/api/modifiers?storeId=0b157bd7-de29-4fb5-ba37-29bdc8c114ea');
        console.log("Success:", JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error("Error:", err.message);
    }
}
fetchMods();
