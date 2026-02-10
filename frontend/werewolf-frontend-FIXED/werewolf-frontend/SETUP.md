# 🎮 Setup Guide for Beginners

Follow these steps to get the frontend running on your computer!

## Step 1: Install Required Software

### Install Node.js
1. Go to https://nodejs.org/
2. Download the **LTS version** (left button)
3. Run the installer
4. Click "Next" through everything
5. Restart your computer

### Install VS Code (Code Editor)
1. Go to https://code.visualstudio.com/
2. Download for your operating system
3. Install it
4. Open VS Code

## Step 2: Get the Code

### Option A: Download ZIP
1. Download the `werewolf-frontend` folder
2. Extract it to your Desktop
3. In VS Code: File → Open Folder → Select `werewolf-frontend`

### Option B: Use Git (if you know how)
```bash
git clone <your-repo-url>
cd werewolf-frontend
```

## Step 3: Install Dependencies

1. In VS Code, open the Terminal:
   - **Windows:** Press `Ctrl + `` (backtick key)
   - **Mac:** Press `Cmd + `` (backtick key)
   - Or use: View → Terminal

2. Type this command and press Enter:
```bash
npm install
```

3. Wait... this will take 2-3 minutes
4. You should see a bunch of text scrolling
5. When it's done, you'll see a new `node_modules` folder

## Step 4: Start the Development Server

1. In the same terminal, type:
```bash
npm run dev
```

2. You should see:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

3. Hold `Ctrl` (or `Cmd` on Mac) and click on `http://localhost:5173/`
4. Your browser will open with the game! 🎉

## Step 5: Make Changes

1. Open any file in `src/pages/` 
2. Make a change (like changing text)
3. Save the file (`Ctrl+S` or `Cmd+S`)
4. Your browser will automatically update!

## Common Problems

### "npm is not recognized"
- Node.js wasn't installed correctly
- Restart your computer
- Try installing Node.js again

### "Cannot find module"
- Run `npm install` again
- Make sure you're in the correct folder

### Port 5173 already in use
- Close other terminals
- Or change port in `vite.config.js`

### Nothing happens when I save
- Make sure you're editing files in `src/`
- Check the terminal for errors

## Folder Structure (What's What?)

```
werewolf-frontend/
├── src/                    ← Your code goes here!
│   ├── pages/             ← All the different pages
│   │   ├── Home/          ← Main menu
│   │   ├── CreateRoom/    ← Create game room
│   │   ├── JoinGame/      ← Join existing game
│   │   ├── Lobby/         ← Waiting room
│   │   └── Game/          ← Actual game
│   ├── components/        ← Reusable pieces
│   │   └── ui/            ← Buttons, cards, inputs
│   └── context/           ← Shared data
├── public/                ← Put images here
├── node_modules/          ← Dependencies (don't touch!)
└── package.json           ← Project info
```

## Making Your First Change

Let's change the title!

1. Open `src/pages/Home/Home.jsx`
2. Find this line:
```jsx
<h1 className="text-4xl font-bold mb-2">Murder in Olympus</h1>
```
3. Change it to:
```jsx
<h1 className="text-4xl font-bold mb-2">My Awesome Game</h1>
```
4. Save the file
5. Check your browser - it changed! ✨

## Adding Your Logo

1. Put your logo image in the `public/` folder
2. Name it `logo.png`
3. Open `src/pages/Home/Home.jsx`
4. Find the TODO comment
5. Uncomment the `<img>` line
6. Save!

## Testing Pages

- Home: http://localhost:5173/
- Create Room: http://localhost:5173/create
- Join Game: http://localhost:5173/join
- Lobby: http://localhost:5173/lobby
- Game: http://localhost:5173/game

## Stopping the Server

Press `Ctrl+C` in the terminal (Mac: `Cmd+C`)

## Starting Again Later

1. Open VS Code
2. Open Terminal
3. Type `npm run dev`
4. Press Enter

## Need More Help?

- Check the main README.md
- Ask your team
- Google the error message
- Check VS Code's Problems panel (View → Problems)

---

**You're all set!** Happy coding! 🚀
