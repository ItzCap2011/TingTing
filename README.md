# Tingxie · Chinese handwriting practice

This folder is a complete static website. It runs directly in modern browsers on laptops, phones and iPads, with no server-side code or build step.

## Publish with GitHub Pages

1. Unzip `tingxie-github-pages.zip`.
2. Create a new GitHub repository.
3. Upload **the contents of the unzipped folder** to the repository root. Do not upload only the ZIP file.
4. Commit the files to the `main` branch.
5. Open the repository's **Settings → Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Select the `main` branch and the `/(root)` folder, then save.

GitHub will show the public website address after deployment finishes. It normally follows this pattern:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`

## Notes

- Vocabulary decks are stored in each visitor's browser using local storage. Visitors do not share decks with one another.
- Mandarin pronunciation uses the device's available Chinese speech voice.
- Handwriting stroke data loads from jsDelivr, so handwriting practice requires an internet connection.
- The site is responsive and supports touch, stylus and mouse input.

## Main files

- `index.html` — application page
- `app.js` — practice, deck and dictionary behaviour
- `style.css` — responsive layout
- `dictionary.json` — Chinese dictionary data
- `hanzi-writer.min.js` — handwriting engine
- `manifest.webmanifest` and icons — installable web-app metadata
- `sw.js` — offline caching for the main app files

Dictionary and handwriting-library licence notices are included in the package.
