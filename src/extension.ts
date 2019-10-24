// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { fetchCssVariables, ParsedCSSMap } from './css-parser';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	console.log('Extension is now active!');
	const supportedLanguages = ['css', 'styl', 'scss', 'sass', 'less', 'pcss'];
	let variables: ParsedCSSMap;

	try {
		variables = await fetchCssVariables();
	}
	catch (e) {
		showWarning(e.message);
	}

	let reloadCommand = vscode.commands.registerCommand('globalcssvars.reloadImports', async () => {
		try {
			variables = await fetchCssVariables();
		}
		catch (e) {
			showWarning('GlobalCSSVars imports could not be reloaded.' + e.message);
			console.error(e);
			return;
		}
		vscode.window.showInformationMessage('GlobalCSSVars imports reloaded.');
	});

	const variableProvider = vscode.languages.registerCompletionItemProvider(supportedLanguages,
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				// get all text until the `position` and check if it reads `console.`
				// and if so then complete if `log`, `warn`, and `error`
				let atCssVariablePrefix = document.lineAt(position).text.substr(position.character - 2, 2)
				if (atCssVariablePrefix.indexOf('-') === -1) {
					return undefined;
				}

				const variablesCompletions: vscode.CompletionItem[] = [];
				variables.forEach((variable, key) => {
					const realValue = variable.parsedValue ? variable.parsedValue : variable.value;
					const ci = new vscode.CompletionItem(key, isColor(realValue)
						? vscode.CompletionItemKind.Color
						: vscode.CompletionItemKind.Variable);
					ci.documentation = realValue;
					if (variable.parsedValue) {
						ci.detail = variable.value;
					}
					variablesCompletions.push(ci);
				});
				
				return [
					...variablesCompletions
				];
			}
		},
		'-' // triggered whenever a '-' is being typed
	);

	function showWarning(message: string): void {
		vscode.window.showWarningMessage(message, 'Go to settings')
			.then(selection => {
				if (selection === 'Go to settings') {
					vscode.commands.executeCommand('workbench.action.openSettings', `@ext:mwilen.globalcssvars`);
				}
			});
	}

	context.subscriptions.push(variableProvider, reloadCommand);
}

// this method is called when your extension is deactivated
export function deactivate() { }

function isColor(str: string): boolean {
    if (typeof str !== 'string') {
        return false;
    }

    if (str.match(/(#|rgb[a]?)/)) {
        return true;
    }

    return false;
}