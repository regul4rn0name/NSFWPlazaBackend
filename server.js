require('dotenv').config();
const express = require('express');
const mongodb = require('mongodb');
const cors = require('cors');
const admZip = require('adm-zip');
const fs = require('fs');
const { error } = require('console');

const app = express();

const mongoUri = process.env.MONGO_URI;
const mongoClient = new mongodb.MongoClient(mongoUri);
let monogoDB;

async function connectMonogo() {
    try {
        await mongoClient.connect();
        monogoDB = mongoClient.db('themes');
    } catch (error) {
        console.error(error);
    }
}
connectMonogo();
app.get('/themes', async (req, res) => {
    try {
        const collection = monogoDB.collection('s3api_per_key_metadata');
        const data = await collection.find({s3key: { $regex: /\/(nsfw|themes)\/[^/]+\.zip$/i }}, { projection: { _id: 1, s3key: 1 } }).limit(20).toArray();
        console.log(data);
        
        const filtered = data.filter(item=>{
            const parts = item.s3key.split('/');
            const parrentFolder = parts[parts.length-2]?.toLowerCase();
            return parrentFolder === 'nsfw' || parrentFolder === 'themes';

        });
        console.log("Filtered:", filtered.map(f => f.s3key));
        const result = filtered.map(item=>{
            const filename = item.s3key.split("/").pop();
            const zip = new admZip(`/Users/sava/Downloads/themes/${filename}`);
            const entries = zip.getEntries();
            const preview = entries.find(e=> e.entryName.toLowerCase() === 'preview.png');
            if(!preview) return null;
            const base64 = preview.getData().toString('base64');
            return {
                _id:item._id.toString(),
                filename:preview.entryName,
                base64:`data:image/png;base64,${base64}`

            };
        }).filter(Boolean);

        res.status(200).json(result);
        

    } catch (error) {
        res.status(500);
    }
})


app.use(cors());
app.get('/', (req, res) => {
    const data = "abaunda";
    return res.json(data);
})
app.listen(3001, () => {
    console.log("pisia");

})