import * as vscode from 'vscode';

export async function fetchCssVariables(): Promise<ParsedCSSMap> {

    let imports: string | string[] | undefined = vscode.workspace.getConfiguration('globalcssvars').get('imports');
    let paths = [];

    if (typeof imports === 'string' && imports.length) {
        paths = [imports];
    }
    else if (Array.isArray(imports) && imports.length) {
        paths = imports;
    }
    else {
        throw new Error('No imports defined for GlobalCssVars.');
    }

    for (let p in paths) {
        if (paths[p].indexOf('file:///') > -1) {
            paths[p] = paths[p].replace('file:///', '');
        }
    }

    let text = '';

    const isGlob = paths.find(i => i.match(/[*?\[\]\{\}]/));
    const files: vscode.Uri[] = [];

    try {
        if (isGlob) {
            for (const path of paths) {
                const res = await vscode.workspace.findFiles(path);
                if (res.length) {
                    files.push(...res);
                }
            }
        }
        else {
            for (const path of paths) {
                files.push(vscode.Uri.file(path));
            }
        }

        for (const file of files) {
            const textDocument = await vscode.workspace
                .openTextDocument(file);
            text += textDocument.getText() + '\n';
        }

        return parseVariables(text);
    }
    catch (e) {
        console.error('Could not load file(s).', e);
        throw new Error('Could not load file(s). Make sure you have defined path(s) to your css files.');
    }
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

export type ParsedCSSMap = Map<string, { value: string, parsedValue: string | undefined }>;
