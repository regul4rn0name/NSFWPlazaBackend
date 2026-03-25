require('dotenv').config();
const express = require('express');
const mongodb = require('mongodb');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const { join } = require('path');
const path = require('path');
const AdmZip = require('adm-zip');


const app = express();
app.use(express.json());
const baseDir = "/app"
const mongoUri = process.env.MONGO_URI;
const mongoClient = new mongodb.MongoClient(mongoUri);
let mongoDB;
app.use(cors());
async function connectMongo() {
  try {
    await mongoClient.connect();
    mongoDB = mongoClient.db('themes');
  } catch (error) {
    console.error(error);
  }
}
connectMongo();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { collection } = req.params;
    const allowed = ["themes", "splashes", "badges"];
    if (!allowed.includes(collection)) return cb(new Error("Invalid collection name"));

    const targetDir = path.join(baseDir, collection, "zips");
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});



const upload = multer({storage});

app.get('/:collection/length', async (req, res) => {
  const { collection } = req.params;
  try {
    if (!["themes", "splashes", "badges"].includes(collection)) {
      return res.status(400).json({ error: "Invalid collection name" });
    }

    if (!mongoDB) {
      return res.status(503).json({ error: "Database not connected yet" });
    }

    const dbCollection = mongoDB.collection(collection);

    const count = await dbCollection.countDocuments({});

    const pages = Math.ceil(count / 20);

    return res.status(200).json({ count, pages });
  } catch (error) {
    console.error("Error getting collection length:", error);
    return res.status(500).json({ error: "Failed to get collection length" });
  }
});

// ------------------ TAGGING API ------------------

// Get items with empty tags for a given collection
app.get("/:collection/empty-tags", async (req, res) => {
  try {
    const { collection } = req.params;
    if (!["badges", "splashes", "themes"].includes(collection)) {
      return res.status(400).json({ error: "Invalid collection name" });
    }

    const dbCollection = mongoDB.collection(collection);
    const items = await dbCollection
      .find({
        $or: [
          { tags: { $exists: false } },
          { tags: { $size: 0 } }
        ],
      })
      .toArray();

    const result = items.map((item) => {
      const filename = item.name.split("/").pop();
      const url = filename.replace(/\.zip$/i, "");
      return {
        _id: item._id.toString(),
        filename,
        url,
        tags: Array.isArray(item.tags) ? item.tags : [],
      };
    });


    console.log("Result count:", result.length);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching empty tags:", error);
    res.status(500).json({ error: "Failed to fetch empty tags" });
  }
});


// Add or update tags for an item in any collection
app.post("/:collection/:id/tags", express.json(), async (req, res) => {
  try {
    const { collection, id } = req.params;
    const { tags } = req.body;

    if (!["badges", "splashes", "themes"].includes(collection)) {
      return res.status(400).json({ error: "Invalid collection name" });
    }
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: "Tags must be an array" });
    }

    const dbCollection = mongoDB.collection(collection);
    const result = await dbCollection.updateOne(
      { _id: new mongodb.ObjectId(id) },
      { $set: { tags } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating tags:", error);
    res.status(500).json({ error: "Failed to update tags" });
  }
});
// END
app.post('/add/:collection', upload.single("zip"), async (req, res) => {
  try {
    const { collection } = req.params;
    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];
    const zip = req.file;
    if (!zip) return res.status(400).send(`No ${collection} zip uploaded`);


    let nameFromFrontend = req.body.name?.trim() || zip.originalname;
    let safeName = nameFromFrontend.replace(/[^a-zA-Z0-9-_]/g, "_");
    if (!safeName.endsWith(".zip")) safeName += ".zip";

    const baseName = safeName.replace(/\.zip$/i, "");
    let finalName = safeName;
    let counter = 1;
    while (await mongoDB.collection("moderate").findOne({ name: finalName })) {
      finalName = `${baseName}_${counter}.zip`;
      counter++;
    }


    const targetDir = path.join(baseDir, collection, "zips");
    fs.mkdirSync(targetDir, { recursive: true });
    const newZipPath = path.join(targetDir, finalName);
    fs.renameSync(zip.path, newZipPath);


    const zipFile = new AdmZip(newZipPath);
    const previewFile = zipFile.getEntry("preview.png");
    let previewOutput = null;
    if (previewFile) {
      const previewDir = path.join(baseDir, collection, "previews");
      fs.mkdirSync(previewDir, { recursive: true });
      previewOutput = path.join(previewDir, finalName.replace(/\.zip$/i, ".png"));
      fs.writeFileSync(previewOutput, previewFile.getData());
    }

    const dbCollection = mongoDB.collection("moderate");
    const now = new Date();

    await dbCollection.insertOne({
      name: finalName,
      tags,
      date:now,
      collection,
      send:false
    });

    res.json({
      success: true,
      collection,
      zipPath: newZipPath,
      previewPath: previewOutput,
    });

  } catch (error) {
    console.error("Upload failed:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get('/:type/:page', async (req, res) => {
  try {
    if(!['themes','badges','splashes'].includes(req.params['type'])){
      return res.status(400);
    }
    const type = req.params['type'];
    const page = req.params['page'];
    const skip = 20 * (page - 1);
    console.log(page);
    const collection = mongoDB.collection(type);
    const {search='',sort='name',order='asc'} = req.query;
    const query = {};
    if(search){
      query.name = new RegExp(search,'i');
    }
    const sortQuery = {
      [sort]:order === 'asc' ? 1:-1
    };
    
    const data = await collection.find(query).sort(sortQuery).skip(skip).limit(20).toArray();
    console.log("Filtered:", data.map(f => f.name));
    const result = data.map(item => {
      const filename = item.name.split("/").pop();
      const preview = filename.replace(/\.zip$/i, '');
      if (!preview) return null;
      return {
        _id: item._id.toString(),
        filename: filename,
        url: preview

      };
    }).filter(Boolean);

    res.status(200).json(result);


  } catch (error) {
    res.status(500);
  }
})

app.get('/:collection/download/:filename', async (req, res) => {
  try {
    const { filename,collection } = req.params;
    const dbCollection = await mongoDB.collection(collection);
    const record = await dbCollection.findOne({'name':filename});
    if(!record['downloads']){
      record['downloads'] = 1;
    }else{
      record['downloads']++;
  }
   const result =  await dbCollection.updateOne({'_id':record._id},{$set:{'downloads':record.downloads}})
   console.log(result);
   console.log(record);
    const filepath = `/app/${collection}/zips/${filename}`;
    if (!fs.existsSync(filepath)) return res.status(404).send("File not Found");

    res.download(filepath, filename);
  } catch (error) {
    console.log(error);
    
    const { filename,collection } = req.params;
    const filepath = `/app/${collection}/zips/${filename}`;
    if (!fs.existsSync(filepath)) return res.status(404).send("File not Found");

    res.download(filepath, filename);
  }
  

})

app.use('/splashes/previews', express.static('/app/splashes/previews'));
app.use('/badges/previews', express.static('/app/badges/previews'));
app.use('/themes/previews', express.static('/app/themes/previews/'));

app.get('/', (req, res) => {
  const data = "abaunda";
  return res.json(data);
})
app.listen(4000, () => {
  console.log("pisia");

})

