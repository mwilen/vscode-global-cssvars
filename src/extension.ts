// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	console.log('Extension is now active!');
	const supportedLanguages = ['css', 'styl', 'scss', 'sass', 'less', 'pcss'];

	const c = await vscode.workspace
		.openTextDocument(vscode.Uri.file('C:/Users/Mathias/dev/test/vars.css'));
	
	const variables = parseVariables(c.getText());

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

	const provider2 = vscode.languages.registerCompletionItemProvider(supportedLanguages,
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
					const ci = new vscode.CompletionItem(key, vscode.CompletionItemKind.Color);
					ci.documentation = variable.parsedValue ? variable.parsedValue : variable.value;
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
				prop.parsedValue = parseColor(prop.value, cssProperties)
			}
		});

		return cssProperties;
		// .filter(s => !!s.match(/(--[^:]+)/))
		// 	.map(v => {
		// 		const [variable, value] = v.split(':');
		// 		return {
		// 			key: variable.trim(),
		// 			value: parseColor(v)
		// 		}
		// 	});
	}

	function parseCSS(str: string): ParsedCSSMap {
		var css_rows = str.split('\n'); 

		// filter out empty elements and strip ';'      
		css_rows = css_rows.filter(function(x){ return x != '' }).map(function(x){ return x.trim().replace(';', '') });

		// create object
		// remove first and last element
		css_rows = css_rows.splice(1, css_rows.length - 2)
		
		let cssMap: ParsedCSSMap = new Map();

		for (const elem in css_rows)
		{
			var elem_parts = css_rows[elem].split(':');
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
		// const val = str.split(':').length ? str.split(':')[1] : '';
		// if (val.match(/(#|rgb|hsl)/)) {
		// 	return val.replace(';', '').trim();
		// }

		const m = str.match(/(\(--[^:|)]+)/)
		if (m) {
			return props.get(m[0].replace('(', ''))!.value;
		}

		return str;
		// const m = str.match(/(\(--[^:|)]+)/)
		// return (m
		// 	? m[0].replace('(', '').trim()
		// 	: str.split(':')
		// 		? str.split(':')[1].trim()
		// 		: '').replace(/\;/, '');
	}

	context.subscriptions.push(provider2);
}

// this method is called when your extension is deactivated
export function deactivate() { }

type ParsedCSSMap = Map<string, { value: string, parsedValue: string | undefined }>