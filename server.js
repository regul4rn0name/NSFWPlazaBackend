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
app.use(cors());
async function connectMonogo() {
    try {
        await mongoClient.connect();
        monogoDB = mongoClient.db('themes');
    } catch (error) {
        console.error(error);
    }
}
connectMonogo();
app.get('/themes/:page', async (req, res) => {
    try {
        const page = req.params['page'];
        const skip = 20*(page-1);
        console.log(page);
        const collection = monogoDB.collection('s3api_per_key_metadata');
        const data = await collection.find({s3key: { $regex: /\/(nsfw|themes)\/[^/]+\.zip$/i }}, { projection: { _id: 1, s3key: 1 } }).skip(skip).limit(20).toArray();
        console.log(data);
        
        console.log("Filtered:", data.map(f => f.s3key));
        const result = data.map(item=>{
            const filename = item.s3key.split("/").pop();
            const preview = filename.replace(/\.zip$/i, '');
            if(!preview) return null;
            return {
                _id:item._id.toString(),
                filename:filename,
                url:preview

            };
        }).filter(Boolean);

        res.status(200).json(result);
        

    } catch (error) {
        res.status(500);
    }
})

app.get('/themes/download/:filename',(req,res)=>{
    const {filename} = req.params;
    const filepath = `/home/sava/docker-db/themes/zips/${filename}`;
    if(!fs.existsSync(filepath)) return res.status(404).send("File not Found");

    res.download(filepath,filename);

})


app.use('/themes/previews',express.static('/Users/sava/Downloads/previews'));


app.get('/', (req, res) => {
    const data = "abaunda";
    return res.json(data);
})
app.listen(4000, () => {
    console.log("pisia");

})

