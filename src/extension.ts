// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as https from 'https';

// Store the last fetched poem data to be accessible by the command
let lastPoemData: { title: string; author: string; body: string; error?: string } | null = null;
let currentPoemPanel: vscode.WebviewPanel | undefined = undefined;

// Define defaultPoem outside fetchPoem to be accessible in activate
const defaultPoemForFallback = {
	title: "Default: Error is boundless",
	author: "J.V. Cunningham",
	body: "Error is boundless.\nNor hope nor doubt,\nThough both be groundless,\nWill average out." // Use \n for actual newlines
};

// Function to create a seeded pseudo-random number generator (PRNG)
// Uses a simple Linear Congruential Generator (LCG)
function createDeterministicRandom(seed: number) {
	let state = seed;
	return {
		next: () => {
			// LCG parameters (these are common choices)
			const a = 1664525;
			const c = 1013904223;
			const m = Math.pow(2, 32); // 2^32

			state = (a * state + c) % m;
			return state / m; // Return a value between 0 (inclusive) and 1 (exclusive)
		}
	};
}

async function fetchPoem(context: vscode.ExtensionContext, isDevelopmentMode: boolean): Promise<{ title: string; author: string; body: string; error?: string }> {
	const today = new Date();
	const year = today.getFullYear();
	const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed, pad with 0
	const day = today.getDate().toString().padStart(2, '0'); // Pad with 0
	const currentDateString = `${year}${month}${day}`; // YYYYMMDD

	const cacheKey = 'dailyPoemCache';

	if (!isDevelopmentMode) {
		try {
			const cachedItem = context.globalState.get<{ date: string; poem: { title: string; author: string; body: string; error?: undefined } }>(cacheKey);

			if (cachedItem && cachedItem.date === currentDateString && cachedItem.poem && !cachedItem.poem.error) {
				console.log('Poem of the Day: Serving poem from cache for date:', currentDateString);
				return cachedItem.poem;
			}
		} catch (e) {
			console.error('Poem of the Day: Error reading from cache', e);
			// Proceed to fetch if cache read fails
		}
	} else {
		console.log('Poem of the Day: Development mode - Bypassing cache read.');
	}

	console.log('Poem of the Day: Fetching new poem for date:', currentDateString);

	const getJSON = <T>(url: string): Promise<T> => {
		return new Promise((resolve, reject) => {
			https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
				let data = '';
				if (res.statusCode !== 200) {
					res.resume(); // Consume response data
					reject(new Error(`Failed to get JSON: HTTP Status ${res.statusCode} from ${url}`));
					return;
				}
				res.setEncoding('utf8');
				res.on('data', (chunk) => { data += chunk; });
				res.on('end', () => {
					try {
						resolve(JSON.parse(data) as T);
					} catch (e: any) {
						reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
					}
				});
			}).on('error', (e) => {
				reject(new Error(`HTTPS request failed for ${url}: ${e.message}`));
			});
		});
	};

	try {
		// Create a deterministic seed based on the current date (YYYYMMDD)
		// No need to recalculate year, month, day as they are available from above
		const dateSeed = parseInt(currentDateString, 10); // Use the YYYYMMDD string converted to number

		// Initialize our deterministic PRNG
		const prng = createDeterministicRandom(dateSeed);

		// 1. Fetch authors
		const authorsResponse = await getJSON<{ authors: string[] }>('https://poetrydb.org/author');
		if (!authorsResponse || !authorsResponse.authors || authorsResponse.authors.length === 0) {
			return { ...defaultPoemForFallback, error: "No authors found from API." };
		}
		const authors = authorsResponse.authors;

		// 2. Select random author using the deterministic PRNG
		const authorIndex = Math.floor(prng.next() * authors.length);
		const randomAuthorName = authors[authorIndex];
		if (!randomAuthorName) {
			return { ...defaultPoemForFallback, error: "Could not select a random author." };
		}

		// 3. Fetch poems for the selected author
		// Author names can contain spaces, which should be URL encoded.
		const encodedAuthorName = encodeURIComponent(randomAuthorName);
		const poemsResponse = await getJSON<{ title: string; author: string; lines: string[] }[]>(`https://poetrydb.org/author/${encodedAuthorName}`);

		if (!poemsResponse || poemsResponse.length === 0) {
			return { ...defaultPoemForFallback, error: `No poems found for author: ${randomAuthorName}` };
		}

		// 4. Select random poem using the deterministic PRNG
		const poemIndex = Math.floor(prng.next() * poemsResponse.length);
		const randomPoem = poemsResponse[poemIndex];
		if (!randomPoem || !randomPoem.title || !randomPoem.author || !randomPoem.lines) {
			return { ...defaultPoemForFallback, error: `Invalid poem structure for author: ${randomAuthorName}` };
		}

		// 5. Format poem data
		// First, join the lines from the API with a single newline character.
		// Then, replace any literal '\\\\n' sequences (which might be present in the API data itself)
		// with a single newline character to ensure correct rendering in <pre> tags.
		const processedBody = randomPoem.lines.join('\n').replace(/\\\\n/g, '\n').trim();

		const fetchedPoem = {
			title: randomPoem.title,
			author: randomPoem.author,
			body: processedBody // Use the processed body
		};

		// Store successfully fetched poem in cache only if not in development mode
		if (!isDevelopmentMode) {
			try {
				await context.globalState.update(cacheKey, { date: currentDateString, poem: fetchedPoem });
				console.log('Poem of the Day: Successfully cached poem for date:', currentDateString);
			} catch (e) {
				console.error('Poem of the Day: Error writing to cache', e);
			}
		} else {
			console.log('Poem of the Day: Development mode - Bypassing cache write.');
		}
		return fetchedPoem;

	} catch (e: any) {
		console.error(`Poem of the Day: PoetryDB fetch error: ${e.message}`);
		// Do not update lastPoemData here directly, let activate handle it from the return
		return { ...defaultPoemForFallback, error: `Failed to fetch or parse poem from PoetryDB: ${e.message}` };
	}
}


export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "poem-of-the-day" is now active!');

	const isDevelopmentMode = context.extensionMode === vscode.ExtensionMode.Development;
	if (isDevelopmentMode) {
		console.log('Poem of the Day: Running in Development Mode - Caching is disabled for this session.');
	}

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.text = `$(symbol-string) P`;
	// statusBarItem.tooltip will be set after fetching
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// Command to show the poem in a webview
	let showPoemCommand = vscode.commands.registerCommand('poem-of-the-day.showPoemOfTheDay', () => {
		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: vscode.ViewColumn.One;

		if (currentPoemPanel) {
			// If the panel already exists, reveal it in the previously used column or the active one
			currentPoemPanel.reveal(currentPoemPanel.viewColumn || columnToShowIn);
		} else {
			// Otherwise, create a new panel
			currentPoemPanel = vscode.window.createWebviewPanel(
				'poemOfTheDay', // Identifies the type of the webview. Used internally
				'Poem of the Day', // Title of the panel displayed to the user
				columnToShowIn || vscode.ViewColumn.One, // Editor column to show the new webview panel in.
				{} // Webview options. We don't need any special options for now.
			);

			currentPoemPanel.webview.html = getWebviewContent(); // Use a helper function for clarity

			// Reset when the panel is closed
			currentPoemPanel.onDidDispose(
				() => {
					currentPoemPanel = undefined;
				},
				null,
				context.subscriptions
			);
		}
	});

	context.subscriptions.push(showPoemCommand);

	// Fetch initial poem, passing context for caching and development mode status
	lastPoemData = await fetchPoem(context, isDevelopmentMode); // Pass context and dev mode status

	if (lastPoemData.error) {
		statusBarItem.tooltip = `Error: ${lastPoemData.error}\nClick to view default poem.`;
		console.error(`Poem of the Day Extension: ${lastPoemData.error}`);
	} else {
		statusBarItem.tooltip = `${lastPoemData.title}\nBy: ${lastPoemData.author}\n(Click to view full poem)`;
	}
	statusBarItem.command = 'poem-of-the-day.showPoemOfTheDay'; // Set command for status bar click

	// Check user setting for opening webview on startup
	const config = vscode.workspace.getConfiguration('poemOfTheDay');
	const openOnStartup = config.get<boolean>('openOnStartup');

	if (openOnStartup) {
		vscode.commands.executeCommand('poem-of-the-day.showPoemOfTheDay');
	}
}

function getWebviewContent(): string {
	let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Poem of the Day</title>
    <style>
        body {
            font-family: var(--vscode-font-family, sans-serif);
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            color: var(--vscode-editor-foreground); /* Or a more specific heading color if available */
            border-bottom: 1px solid var(--vscode-editorWidget-border, #ccc);
            padding-bottom: 0.3em;
        }
        h2 {
            color: var(--vscode-descriptionForeground, #777);
            font-style: italic;
            margin-top: 0.2em;
            font-weight: normal;
        }
        pre {
            white-space: pre-wrap;
            background-color: var(--vscode-textBlockQuote-background, #f0f0f0);
            padding: 15px;
            border-radius: 5px;
            border: 1px solid var(--vscode-textBlockQuote-border, #ddd);
            font-family: var(--vscode-editor-font-family, monospace); /* Use editor font for poem body */
        }
        .error {
            color: var(--vscode-errorForeground);
        }
        p {
            color: var(--vscode-foreground);
        }
    </style>
</head>
<body>`;

	if (lastPoemData && !lastPoemData.error) {
		htmlContent += `<h1>${lastPoemData.title}</h1>
					   <h2>${lastPoemData.author}</h2>
					   <pre>${lastPoemData.body}</pre>`;
	} else if (lastPoemData && lastPoemData.error) {
		htmlContent += `<h1 class="error">Error Fetching Poem</h1>
					   <p class="error">${lastPoemData.error}</p>
					   <h3>Oh no. Something went wrong. But alas we have a fallback poem.</h3>
					   <h1>${defaultPoemForFallback.title}</h1>
					   <h2>${defaultPoemForFallback.author}</h2>
					   <pre>${defaultPoemForFallback.body}</pre>`;
	} else {
		// This case might occur if the command is somehow called before initial fetch completes
		htmlContent += `<h1>Poem data not yet available</h1><p>Please wait a moment and try clicking the status bar icon again, or reload the window if the problem persists.</p>`;
	}
	// htmlContent += `<hr>`; // Removed this line
	htmlContent += `<p style="text-align:center; font-size: 0.8em; color: var(--vscode-descriptionForeground);">Developed with ❤️ by <a href="https://github.com/darrenjaworski" style="color: var(--vscode-textLink-foreground);">@darrenjaworski</a> and Copilot.</p>`;
	htmlContent += `<p style="text-align:center; font-size: 0.75em; color: var(--vscode-descriptionForeground);">Poetry from <a href="https://poetrydb.org" style="color: var(--vscode-textLink-foreground);">PoetryDB</a>.</p>`;
	htmlContent += '</body></html>';
	return htmlContent;
}

// This method is called when your extension is deactivated
export function deactivate() {
	if (lastPoemData) { // Clear data on deactivation
		lastPoemData = null;
	}
}
