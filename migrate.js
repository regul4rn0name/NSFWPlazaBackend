const { MongoClient } = require("mongodb");

const uri = "mongodb://localhost:27017";
const dbName = "themes";
const sourceCollectionName = "s3api_per_key_metadata";
const themesCollectionName = "themes";
const badgesCollectionName = "badges";
const splashesCollectionName = "splashes";

async function migrate() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    const sourceCol = db.collection(sourceCollectionName);
    const themesCol = db.collection(themesCollectionName);
    const badgesCol = db.collection(badgesCollectionName);
    const splashesCol = db.collection(splashesCollectionName);

    const docs = await sourceCol.find({}).toArray();
    console.log(`Found ${docs.length} documents.`);

    const themesBatch = [];
    const badgesBatch = [];
    const splashesBatch = [];

    for (const doc of docs) {
      const s3key = doc.s3key || "";

      // Convert to lower case for case-insensitive match
      const lowerKey = s3key.toLowerCase();

      // Extract file name
      const fileName = s3key.split("/").pop() || s3key;

      const newDoc = {
        name: fileName,
        tags: [],
        date: "21.09.2025 12:00",
      };

      if (lowerKey.includes("/badges/")) {
        badgesBatch.push(newDoc);
      } else if (lowerKey.includes("/splashes/")) { // fixed plural 's'
        splashesBatch.push(newDoc);
      } else {
        themesBatch.push(newDoc);
      }
    }

    if (themesBatch.length) await themesCol.insertMany(themesBatch);
    if (badgesBatch.length) await badgesCol.insertMany(badgesBatch);
    if (splashesBatch.length) await splashesCol.insertMany(splashesBatch);

    console.log("Migration complete!");
  } catch (err) {
    console.error("Error during migration:", err);
  } finally {
    await client.close();
  }
}

migrate();
