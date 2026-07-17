# Font Post

A local, searchable postcard preview catalog for 10,599 `.ttf` files. It reads directly from the expanded font folder and sends fonts to the browser only when they are visible. Nothing is installed.

## Run

From the repository root:

```bash
.venv/bin/python -B experiments/font-catalog/server.py
```

Then open <http://127.0.0.1:5050>.

## Choose and organize fonts

1. Use a rotating affirmation, a short attributed quote, or type your own postcard message.
2. Pick a playful font mood.
3. Rate fonts as **Pass**, **Maybe**, **Nice**, **Love**, or **Top tier**. Ratings train a private local sorter; keys 1–5 work too.
4. Switch between postcard, accent, character-set, and editorial stress-test specimens.
5. Review related Regular, Bold, Italic, and Bold Italic family members together.
6. Add custom tags to create subsets such as “logo ideas,” “soft,” or “client A.”
7. Open **Best so far** to review your strongest candidates.
8. Use **Library** to search, smart-sort, filter by accent/family completeness or your tags, and switch between cards and a compact long list.

To use another expanded folder, ZIP, or port:

```bash
.venv/bin/python -B experiments/font-catalog/server.py "/path/to/fonts-or-folder" --port 5051
```

## Notes

- Tags and picks are saved in browser local storage.
- Ratings and the learned taste profile stay in browser local storage too.
- Font names, styles, family relationships, and selected character coverage are read from the TrueType metadata at startup.
- “Download” copies only the selected font file.
- A browser preview does not validate the font's license or full character set. Verify licensing before commercial use.
