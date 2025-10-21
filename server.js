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
        const collection = monogoDB.collection('themes');
        const data = await collection.find().skip(skip).limit(20).toArray();
        console.log("Filtered:", data.map(f => f.name));
        const result = data.map(item=>{
            const filename = item.name.split("/").pop();
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
    const filepath = `/app/themes/zips/${filename}`;
    if(!fs.existsSync(filepath)) return res.status(404).send("File not Found");

    res.download(filepath,filename);

})


app.use('/themes/previews', express.static('/app/themes/previews/'));


app.get('/splashes/:page', async (req, res) => {
    try {
        const page = req.params['page'];
        const skip = 20*(page-1);
        console.log(page);
        const collection = monogoDB.collection('splashes');
        const data = await collection.find().skip(skip).limit(20).toArray();
        console.log(data);
        
        console.log("Filtered:", data.map(f => f.name));
        const result = data.map(item=>{
            const filename = item.name.split("/").pop();
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

app.get('/splashes/download/:filename',(req,res)=>{
    const {filename} = req.params;
    const filepath = `/app/splashes/zips/${filename}`;
    if(!fs.existsSync(filepath)) return res.status(404).send("File not Found");

    res.download(filepath,filename);

})


app.use('/splashes/previews', express.static('/app/splashes/previews'));


app.get('/badges/:page', async (req, res) => {
    try {
        const page = req.params['page'];
        const skip = 20*(page-1);
        console.log(page);
        const collection = monogoDB.collection('badges');
        const data = await collection.find().skip(skip).limit(20).toArray();
        console.log(data);
        
        console.log("Filtered:", data.map(f => f.name));
        const result = data.map(item=>{
            const filename = item.name.split("/").pop();
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

app.get('/badges/download/:filename',(req,res)=>{
    const {filename} = req.params;
    const filepath = `/app/badges/zips/${filename}`;
    if(!fs.existsSync(filepath)) return res.status(404).send("File not Found");

    res.download(filepath,filename);

})


app.use('/badges/previews', express.static('/app/badges/previews'));


app.get('/', (req, res) => {
    const data = "abaunda";
    return res.json(data);
})
app.listen(4000, () => {
    console.log("pisia");

})

