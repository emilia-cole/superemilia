# Super Emilia World

A little platform adventure with five lands plus seven secret lands, 144 stages, twelve boss battles, and fifteen companion buddies. Run, double jump, bounce on grumps, discover hidden pipe entrances, collect coins in mini-games, cheer up grumpy bosses, and rescue friends.

Play at **https://superemilia.com/world/**. The site is hosted on GitHub Pages.

## The game menu

**https://superemilia.com** opens a game menu with eight games: Super Emilia World, Mystery Egg Bakery (`/bakery/`), Memory Match (`/memory/`), Buddy Garden (`/garden/`), Dress-Up Studio (`/studio/`), Pet Vet Clinic (`/vet/`), Buddy Kart Racing (`/race/`), and Fishing Friends (`/fish/`). Each card shows the player's saved progress (read from the same browser save the game uses) and changes its button to keep playing once there is progress. Inside the game, **← All games** in the footer returns to the menu. Because the menu and every game share the superemilia.com address, saved progress carries over automatically.

The menu also has a **🏆 Prize Room**: every game has 4 or 5 prizes (38 in all, counting the grand prize), worked out from each game's own save. Examples are finishing your first level, hatching an egg, finding a garden buddy, helping a rare pet, and winning 1st place in a race. Winning a prize in all 8 games gives the 🌟 **Super Emilia Superstar** grand prize. Prizes won since the last visit are marked NEW. The prize rules live in the second `<script>` in `public/index.html`.

On page load, the cover artwork appears for five seconds before fading into the ready screen. Phones use the square cover and wider screens use the landscape cover. **Skip intro** or Escape dismisses it early. Gameplay waits for the player to start.

## Memory Match

**https://superemilia.com/memory/** is a card-flipping memory game. Twelve levels unlock one at a time, growing from 6 cards to 36, with decks of buddies, treats, pets, and lands. Finishing a level in fewer turns earns up to 3 stars (36 in all). Each level allows one **Peek** that shows every card for a moment. Winning a level for the first time gives that level's prize (a ribbon, teddy bear, rocket, and more) on the **Prize shelf**; getting 3 stars turns the prize gold. Winning all 12 levels gives the **Memory Champion trophy**, and all 36 stars gives the **Golden crown**. Tap any prize you've won to put it on the back of your cards (gold prizes and grand prizes shine), and press **✨ Show off** to open **My Prize Room**, a display case of everything you've collected. The game menu's card also shows how many prizes you have. Progress is saved in the browser under `superEmiliaMemory`.

## Buddy Garden

**https://superemilia.com/garden/** is a gardening game. Pick a seed and tap an empty plot to plant it, tap it to water it (each plant needs water 3 times), then pick it when it blooms to earn coins. New seeds unlock as you harvest more. Mystery seeds can grow into one of 12 garden buddies; each buddy that moves in adds +1 coin to every harvest. The shop sells seeds, up to 12 plots, decorations, a big watering can, and magic soil. Weeds sometimes pop up in empty plots. The garden book lists every plant and buddy found. Progress is saved under `superEmiliaGarden`.

## Dress-Up Studio

**https://superemilia.com/studio/** is a dress-up and fashion show game. Pick a buddy model and choose a hat, top, bottoms, shoes, an extra, colors, and a pattern. Each show has a theme (Royal Ball, Beach Day, Snow Day, and six more); items the judges love for it are marked 💚. **Walk the runway** and three judges score the outfit on the theme, colors, and style, up to 30 points and 3 stars. Shows earn coins to buy more clothes, colors, patterns, and models. Progress is saved under `superEmiliaStudio`.

## Pet Vet Clinic

**https://superemilia.com/vet/** is a pet doctor game. Each day a few patients come in with problems like a fever, a scraped knee, or muddy fur. Every problem shows which tools it needs, in order (for a fever: thermometer, then medicine). A wrong tool makes the pet wiggle and lights up the right one. New problems and tools arrive on later days, pets can have up to three problems at once, and rare unicorns, dragons, and dinos sometimes visit. Coins buy clinic decorations, a lollipop jar, and gold stickers. The patient book lists every pet you have helped. Progress is saved under `superEmiliaVet`.

## Buddy Kart Racing

**https://superemilia.com/race/** is a go-kart racing game. The kart drives itself; hold ◀ ▶ (or the arrow keys, or press either side of the track) to steer around 3 laps against three buddy racers. Yellow pads give a boost, 🎁 boxes give a boost, rocket, or shield (tap the item button or press space to use it), and obstacles spin you out. Leaving the road slows you down. Finishing in the top 3 earns a trophy and unlocks the next of six tracks: Candy Lane, Beach Boardwalk, Jungle Run, Snowy Peaks (slippery), Space Speedway, and Rainbow Road. Coins buy faster karts and new drivers in the garage. Progress is saved under `superEmiliaRace`.

## Fishing Friends

**https://superemilia.com/fish/** is a fishing game. Tap **Cast**, wait for the bobber to dip and the ❗ to show, tap **Reel!**, then keep tapping to fill the green bar before the fish pulls away (the space bar works too). Six spots (Lily Pond, Rushing River, Misty Lake, Sunny Ocean, Icy Sea, and Magic Lagoon) each have common, uncommon, rare, and legendary fish, 31 in all, plus hidden treasure. Coins unlock new spots and buy stronger rods, golden bait (more rare fish), and aquarium decorations. Every new kind of fish swims in your aquarium, and the fish book records how many you caught and the biggest. Progress is saved under `superEmiliaFish`.

## Controls

| Action | Keyboard |
| --- | --- |
| Move | Arrow keys or A / D |
| Jump / double jump | Space, Up, or W |
| Run | Hold Shift |
| World power | E |
| Explore a pipe | Down or S while standing on its opening |
| Pause / resume | P |

On-screen controls support touch. Tap **Run** to toggle sprinting, use the large direction and jump buttons, and press **↓** on a pipe opening. Toast messages appear below the top HUD.

Game text does not select on long presses. The play area and touch controls suppress browser pan, zoom, double-tap, and callout gestures; non-passive touch handlers also cancel default gestures on the canvas and game controls. Pointer controls still support moving and jumping with separate fingers. Help, maps, and settings remain scrollable.

**How to play** opens a scrollable popup from the footer or Settings. It pauses a running game and resumes it on close. Escape, the close button, or **Got it!** dismiss it; opening it from an already paused or ready screen preserves that state.

Use **Map** to choose one of five lands and a level spot. Completed stages and found treasures appear on the map. All stages are available to explore.

## Bosses and buddies

Stage 12 of every land ends in a boss arena. After the finish flag, a crowned grump guards a caged buddy. Bounce on the boss's head to cheer it up: five bounces in Gentle mode, seven in Adventure. Side contact costs a heart. The boss hops toward Emilia, and between hops it drops three or four themed objects at once; a flashing shadow marks each landing spot first. Its big landings send shockwaves along the ground that Emilia must jump over (from the start in Adventure, after the first bounce in Gentle). The arena also has the land's own switching obstacles (lasers, candy canes, thorny vines, jelly blobs, or toy blocks): two in Gentle mode and three in Adventure, taking turns switching on after a warning. The boss speeds up and attacks more often as it loses health. Two ? blocks in Gentle mode (one in Adventure) hold a heart and a shield. Losing every heart restarts the boss battle in both modes: an "Out of hearts" screen appears, then the boss returns at full strength and the arena's ? blocks refill.

| Land | Boss | Falling objects | Buddy reward |
| --- | --- | --- | --- |
| Space | Captain Grumpcomet | Comets | Orbit 👽 |
| Candy | The Sour Gumdrop | Candies | Taffy 🐷 |
| Forest | Old Grumblestump | Acorns | Hazel 🦔 |
| Squishy World | Wobblegrump | Bubbles | Bloop 🐙 |
| Cozy Home | The Dust Bunny King | Socks | Biscuit 🐶 |

Pip, Mochi, and Luna are available from the start. Cheering up a boss frees its buddy, who joins Emilia right away and stays unlocked in Settings and the Character Studio. Every win awards 25 celebration stars, and a land's boss can be replayed anytime from stage 12. Locked buddies appear dimmed with a hint naming their boss. The map marks each stage 12 with a crown until its boss is cheered up, then shows the buddy earned there.

## Star Shop

Stars from blocks, bounces, gems, and finished stages can be spent in the **Star Shop** (✦ Shop in the header, or in Settings). Spending stars never removes a milestone hat: the bow, top hat, and crown unlock by total stars ever collected.

| Item | Cost | What it does |
| --- | --- | --- |
| 🫧 Bubble shield | 12 | Blocks one bump during the first 20 seconds |
| 👟 Zoom boots | 10 | Extra-fast running for the first 10 seconds |
| ✨ Star sparkle | 20 | Unstoppable for the first 8 seconds |
| 💖 Bonus heart | 25 | Start with 4 hearts instead of 3 |
| 🧢 Cap | 25 | A hat to keep |
| 🌸 Flower crown | 40 | A hat to keep |
| 🌈 Rainbow hat | 60 | A hat to keep |

Coins from the secret coin rooms buy cosmetics in the same shop:

| Item | Cost | What it does |
| --- | --- | --- |
| 💗 Heart, 🍃 leaf, 🫧 bubble, or ⭐ star trail | 30 / 35 / 40 / 50 coins | Little icons float behind Emilia while she runs; one trail at a time, tap again to stop |
| Gold, Ruby, Ocean, or Midnight outfit | 40 coins each | Special outfit colors, also selectable in Characters once bought |
| 👒 Sun hat / 🎓 Graduation cap | 45 / 50 coins | Hats to keep |
| 🔄 Star swap | 10 coins | Trades for 6 stars |

Later additions to the same shop, which is now split into tabs (Power-ups, Avatars, Hats, Trails, Colors, Buddy gear):

- **Avatars:** play the whole game as a 🐰 Bunny (60 stars), 🐱 Kitty (60 coins), 🐼 Panda (80 stars), 🐸 Frog (70 coins), 🦊 Fox (90 stars), 🤖 Robot (100 coins), 🦄 Unicorn (120 stars), or 🐉 Dragon (150 coins). Owned avatars can be recolored in Characters, still wear hats and trails, and Emilia is always free to switch back to.
- **Power-ups:** 🧲 Star magnet (15 stars, pulls in nearby stars for 20 seconds) and 🪶 Feather jump (18 stars, triple jump for 15 seconds).
- **Hats:** 🍓 Strawberry hat (30 stars), 🌻 Sunflower (35 stars), 🎧 Headphones (35 coins), 🧁 Cupcake hat (40 coins).
- **Trails:** 🌸 flower and 🍬 candy (35 coins), 🎵 music and ❄️ snowflake (40 coins).
- **Outfit colors:** Coral, Teal, Lilac, and Silver (30 coins each).
- **Buddy gear:** 🌼 Flower clip and 🕶️ Sunglasses (25 coins), 🎉 Party hat (30 coins), for any buddy.

More items added after that:

- **Avatars:** 🐻 Bear (70 stars), 🐧 Penguin (80 coins), 🐭 Mouse (50 stars).
- **Celebrations** (new tab): 🎆 Fireworks (40 coins), 🎈 Balloon party (35 coins), 💖 Heart shower (30 stars), 🌈 Rainbow party (45 stars). The chosen one bursts out at every finish flag and boss win; tap again to turn it off.
- **Power-up:** 🍀 Lucky clover (16 stars), every star counts double for the first 30 seconds.
- **Hats:** 🌹 Rose and 🦋 Butterfly clip (30 stars), 🎈 Balloon (35 stars), 🍄 Mushroom cap (35 coins), 🍩 Donut hat (40 coins), 🪐 Little planet (45 coins).
- **Trails:** 🍀 clover and 🐾 paw prints (35 coins), 🌙 moon (40 coins), 🦋 butterfly and 🌈 rainbow (45 coins), 💎 gems (50 coins).
- **Outfit colors:** Peach, Navy, Lime (30 coins), Rose gold (35 coins).
- **Buddy gear:** 🦸 Tiny cape (30 coins), ⭐ Star clip (25 coins).

Third batch:

- **Avatars:** 🦁 Lion (110 coins), 🐶 Puppy (75 stars), 🦉 Owl (90 coins).
- **Jump effects** (new tab): ☁️ Cloud puffs (30 coins), 🌟 Star pop (30 stars), 🫧 Bubble hop (35 coins), 🎶 Music hop (35 stars). Little icons pop out with every jump; tap again to turn it off.
- **Hats:** 🍉 Watermelon (35 stars), 🐣 Chick buddy (40 stars), 🍦 Ice cream (40 coins), 🧸 Teddy (45 coins).
- **Trails:** 🍓 strawberry and 🍭 lollipop (35 coins), 🪐 planet and 🎈 balloon (45 coins).
- **Celebrations:** 🎂 Cake party (40 coins), 💫 Star storm (40 stars).

Fourth batch:

- **Avatars:** 🐨 Koala (85 stars), 🐯 Tiger (120 coins), 🐝 Bee (65 stars), 🐢 Turtle (85 coins).
- **Trails:** 🍪 cookie and 🍒 cherry (35 coins), 🍁 maple leaf and 🐟 fish (40 coins), ⚡ lightning (45 coins), 🦄 unicorn (55 coins).
- **Buddy gear:** 🧚 Fairy wings (40 coins), 😇 Halo (35 coins), 🧣 Bandana (25 coins).

Fifth batch:

- **Avatars:** 🐮 Cow (70 stars), 🐵 Monkey (90 coins), 🦝 Raccoon (100 coins), 🐹 Hamster (60 stars), 🐠 Fish (80 coins).
- **Body gear** (new tab), worn by your character on any avatar: 🦸 Hero cape (45 coins), 🧚 Fairy wings (50 stars), 🪽 Angel wings (60 coins), 🚀 Jetpack with flames while airborne (70 coins), 🏅 Gold medal (35 stars), 🌺 Flower necklace (30 stars).
- **Power-ups:** 🍄 Super jump (14 stars, 20% higher jumps for 20 seconds), ❄️ Freeze (22 stars, grumps and bosses slow down and obstacles switch off for 15 seconds), 🪙 Coin doubler (20 stars, double secret-room coins for the stage), ❤️‍🩹 Second chance (30 stars, hearts refill once instead of running out).
- **Trails:** 🍕 pizza, 🎀 bow, 🌷 tulip (35 coins), 🐝 bee, 🫐 blueberry, 🍄 mushroom (40 coins).
- **Outfit colors:** Bubblegum, Sunset, Grape, Mint chip, Lemon, Cocoa (30 coins each).

An equipped trail replaces the champion rainbow trail while it is on.

Power-ups are kept in a bag (up to 9 of each) and switch on automatically when the next stage or boss battle starts, using one of each kind you own. Restarting a boss battle after running out of hearts uses them again. Purchases save in the browser.

## Rainbow Sky, the secret sixth land

🌈 Rainbow Sky stays locked (shown with a 🔒 on the map and in Settings) until all five original bosses are cheered up. Its 12 stages then unlock one at a time: only stage 1 is open at first, and finishing each stage opens the next. The map, Settings, saved progress, and every shortcut respect the locks. The land has cloud ground, a rainbow sky, storm-cloud grumps that move 25% faster, and lightning-cloud obstacles. Stage 12 ends with **Grumbly Thundercloud** (falling ⚡), who frees **Nimbus ☁️**, a ninth buddy. Beating the fifth original boss shows that the new land appeared and sends the player straight to it. The grand prize still counts only the original 60 stages and 5 bosses.

## Bubble Reef, the secret seventh land

🐠 Bubble Reef stays locked until Grumbly Thundercloud at the top of Rainbow Sky is cheered up; beating that boss announces the new land and sends the player to it. Its 12 stages unlock one at a time, like Rainbow Sky's. It is an underwater world with light rays, seaweed, and rising bubbles; crab grumps that move 35% faster; bobbing jellyfish obstacles; and a **Bubble float** world power that floats like Moon float. Stage 12 ends with **Captain Crabby** (falling 🐚), who frees **Finn 🐠**, a tenth buddy.

Hidden lands are listed in one table (`HIDDEN_LANDS`), each naming what unlocks it, so more secret lands can be chained after Bubble Reef.

## Five more secret lands

After Bubble Reef, five more hidden lands form a chain. Each stays locked until the boss of the land before it is cheered up, then opens one stage at a time like the other secret lands. Grumps get a little faster in each one.

| Land | Unlocks after | Obstacles | World power | Boss (falling) | Buddy |
| --- | --- | --- | --- | --- | --- |
| 💎 Crystal Caves | Captain Crabby | Glowing crystal spikes | Crystal shield | Rocky the Grump Golem (🪨) | Echo 🦇 |
| 🏔️ Frosty Peaks | Rocky the Grump Golem | Icicles | Snow bounce | The Snow Grump (❄️) | Snowy 🦭 |
| 🏜️ Desert Dunes | The Snow Grump | Cactuses | Dune float | Sergeant Scorpio (🌵) | Dune 🐫 |
| 🌋 Lava Peaks | Sergeant Scorpio | Lava geysers | Heat shield | Magma the Grumpy Mole (🔥) | Ember 🦎 |
| 🏰 Dream Castle | Magma the Grumpy Mole | Magic orbs | Dream float | King Grumpus (👑) | Midnight 🐈‍⬛ |

That brings the game to 12 lands, 144 stages, 12 bosses, and 15 buddies. The five newest buddies keep their own colors but can wear buddy gear. The map's land row scrolls sideways to fit every land.

## Grand prize

Finishing all 60 stages and cheering up all 5 bosses, in any order, awards the grand prize once: a "Super Emilia Superstar!" celebration screen, the golden 🌟 Superstar hat (equipped right away and selectable only by champions), a rainbow sparkle trail behind Emilia while she runs, 100 bonus stars, and a 🏆 in Settings and on the map. The map shows progress toward it. The prize is saved in the browser with the rest of the progress.

## Characters

Use **Characters** to build Emilia's look from outfits, hairstyles, skin tones, eye styles, colors, accessories, and unlockable hats. Every buddy has its own color and accessory choices. The live preview shows each selection before **Use this look** saves it. No drawing is required.

Secret entrances blend in with the scenery; there are no secret-trail signs. Three entrances in each stage lead to a rotating selection of four coin games: a coin vault, a falling-coin challenge, a bouncing challenge, and a five-tier mystery-block ladder. Reaching the target earns a hidden gem, extra coins, and wardrobe stars. Every collected coin is kept even if time runs out. Returning restores the level, checkpoint, health, enemies, and active powers.

In the mystery ladder, jump under one of three blocks on each tier. One holds coins; an empty guess closes the other blocks on that tier. Each guess unlocks the next floor. Double jump up to keep trying, then leave through the top pipe after all five tiers. Higher tiers pay more coins. This room has no timer; two winning tiers in Gentle mode or three in Adventure mode earn its hidden gem.

Settings contain sound and difficulty controls. Coins, stars, rescued friends, completed stages, cheered-up bosses, and character choices save in the current browser.

The page includes Open Graph and large Twitter card metadata with original wide and square cover art in `public/assets`. Preview images use absolute HTTPS URLs, descriptive alternative text, and their actual pixel dimensions. The wide cover is the default sharing image. Titles and descriptions cover the 60 levels, five lands, buddies, secret coin games, character choices, and free browser play. Static JSON-LD connects the website, page, game, author credit, and cover image so readers can discover the game's details without executing JavaScript. Existing social posts may retain the preview cached by their platform.

## Make changes

The menu is `public/index.html`; the games are `public/world/index.html`, `public/bakery/index.html`, `public/memory/index.html`, `public/garden/index.html`, `public/studio/index.html`, `public/vet/index.html`, `public/race/index.html`, and `public/fish/index.html`. Neither has dependencies or a build step. Run `python3 -m http.server --directory public` and open http://localhost:8000 to try both; asset links start with `/assets/`, so opening the files directly from disk shows the game without its cover art.

To add another game, put it in its own folder under `public/` (for example `public/new-game/index.html`) and add a card linking to it in `public/index.html`.

Push changes to `main` to publish automatically. The **Deploy game to GitHub Pages** workflow checks every page's script, runs `node tests/game.cjs`, `node tests/bakery.cjs`, `node tests/memory.cjs`, `node tests/garden.cjs`, `node tests/studio.cjs`, `node tests/vet.cjs`, `node tests/race.cjs`, and `node tests/fish.cjs`, uploads only the `public` folder, and deploys to the `github-pages` environment.

## Hosting and domain

Repository: https://github.com/dalton-cole/superemilia

GitHub Pages settings: https://github.com/dalton-cole/superemilia/settings/pages

The publishing source is **GitHub Actions**, with **superemilia.com** as the custom domain and HTTPS enforced once GitHub issues its certificate.

Namecheap BasicDNS should contain these website records:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | dalton-cole.github.io |

Replace the default Namecheap parking/redirect records for `@` and `www`. Preserve unrelated mail, verification, and other DNS records. GitHub redirects `www.superemilia.com` to the apex domain after both resolve correctly. DNS changes and certificate issuance may take time to propagate.

Custom domains for GitHub Actions deployments are configured in Pages settings; a repository `CNAME` file is not needed. See [GitHub's custom domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
