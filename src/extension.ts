// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	console.log('Extension is now active!');
	const supportedLanguages = ['css', 'styl', 'scss', 'sass', 'less', 'pcss'];

	const imports: string | string[] | undefined = vscode.workspace.getConfiguration('globalcssvars').get('imports');
console.log(imports)
	let files = [];

	if (typeof imports === 'string' && imports.length) {
		files = [imports];
	}
	else if (Array.isArray(imports) && imports.length){
		files = imports;
	}
	else {
		vscode.window.showWarningMessage('No imports defined for GlobalCssVars.', 'Go to settings')
			.then(selection => {
				if (selection === 'Go to settings') {
					vscode.commands.executeCommand('workbench.action.openSettings', `@ext:mwilen.globalcssvars`);
				}
			});
		return;
	}
	
	let text = '';

	for (const file of files) {
		const textDocument = await vscode.workspace
			.openTextDocument(vscode.Uri.file(file));
		text += textDocument.getText() + '\n';
	}
	
	const variables = parseVariables(text);

	console.log(variables);

	// let provider1 = vscode.languages.registerCompletionItemProvider(supportedLanguages, {

	// 	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {

	// 		// a simple completion item which inserts `Hello World!`
	// 		const variablesCompletions = variables.map(variable => new vscode.CompletionItem(variable));
			
	// 		// return all completion items as array
	// 		return [
	// 			...variablesCompletions
	// 		];
	// 	}
	// });

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

	function parseVariables(str: string): ParsedCSSMap {
		const cssProperties = parseCSS(str);
		cssProperties.forEach((prop, key) => {
			if (key.indexOf('--') === -1) {
				cssProperties.delete(key);
			}
			else if (prop.value && prop.value.indexOf('--') > -1) {
				prop.parsedValue = parseColor(prop.value, cssProperties);
			}
		});

		return cssProperties;
	}

	function parseCSS(str: string): ParsedCSSMap {
		var css_rows = str.split('\n'); 

		css_rows = css_rows
			.filter(x => x !== '')
			.map(x => x.trim().replace(';', ''));

		css_rows = css_rows.splice(1, css_rows.length - 2);
		
		let cssMap: ParsedCSSMap = new Map();

		for (const elem in css_rows)
		{
			var elem_parts = css_rows[elem].split(':');
			if (elem_parts.length <= 1) {
				continue;
			}
			var property_name = elem_parts[0].indexOf('--') > -1
				? elem_parts[0].trim()
				: elem_parts[0].trim().replace('-', '');
			var property_value = elem_parts[1].trim();
			cssMap.set(property_name, {
				value: property_value,
				parsedValue: undefined
			});
		}

		return cssMap;
	}

	function parseColor(str: string, props: ParsedCSSMap): string {
		const m = str.match(/(\(--[^:|)]+)/);
		if (m) {
			return props.get(m[0].replace('(', ''))!.value;
		}

		return str;
	}

	function isColor(str: string): boolean {
		if (typeof str !== 'string') {
			return false;
		}

		if (str.match(/(#|rgb[a]?)/)) {
			return true;
		}

		return false;
	}

	context.subscriptions.push(variableProvider);
}

// this method is called when your extension is deactivated
export function deactivate() { }

type ParsedCSSMap = Map<string, { value: string, parsedValue: string | undefined }>;