## NSFWPlazaBackend
Backend for https://github.com/regul4rn0name/NSFWPlaza

## Archive and downloads

The website has been shut down. A backup of the project data was created on **2026-10-26**:

- [MongoDB database dump](https://gofile.io/d/75YCt9lg) — all six collections in the `themes` database, in MongoDB's compressed archive format.
- [All themes and assets](https://gofile.io/d/Yyna99hs) — 10,603 files from `themes`, `splashes`, `badges`, and `uploads`, split into 17 archive parts (18.16 GB total). The folder also contains `SHA256SUMS`, a file inventory, a manifest, and restore instructions.

The backups are public, unencrypted Gofile guest uploads. They are hosted by Gofile without using the project owner's existing accounts. Free guest hosting is temporary, so the links may expire.

### Extract the assets

Download all 17 `nsfwplaza-assets.tar.gz.part001` through `nsfwplaza-assets.tar.gz.part017` files into the same directory, then run:

```sh
cat nsfwplaza-assets.tar.gz.part* | tar -xzf -
```

### Restore the database

Download `nsfwplaza-db.archive.gz` and restore it into your own MongoDB instance with MongoDB Database Tools:

```sh
mongorestore --uri='YOUR_MONGODB_URI' --archive=nsfwplaza-db.archive.gz --gzip
```

After downloading both the database and asset parts into one directory, verify them against the included `SHA256SUMS` file with `sha256sum -c SHA256SUMS` (Linux) or `shasum -a 256 -c SHA256SUMS` (macOS).
