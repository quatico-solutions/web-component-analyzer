import { Node, SourceFile } from "typescript";
import { AnalyzerVisitContext } from "../analyzer-visit-context";
import { ComponentDeclaration } from "../types/component-declaration";
import { ComponentDefinition } from "../types/component-definition";
import { lazy } from "../util/lazy";
import { visitDefinitions } from "./flavor/visit-definitions";

/**
 * Visits the source file and finds all component definitions using flavors
 * @param sourceFile
 * @param context
 * @param analyzeDeclaration
 */
export function discoverDefinitions(
	sourceFile: SourceFile,
	context: AnalyzerVisitContext,
	analyzeDeclaration: (definition: ComponentDefinition, declarationNodes: Node[]) => ComponentDeclaration
): ComponentDefinition[] {
	// Find all definitions in the file using flavors
	const definitionResults = analyzeAndDedupeDefinitions(sourceFile, context);

	return Array.from(definitionResults.entries()).map(([definition, declarationSet]) => {
		return {
			...definition,
			declaration: lazy(() => analyzeDeclaration(definition, Array.from(declarationSet)))
		};
	});
}

/**
 * Finds all component definitions in a file and combine multiple declarations with same tag name.
 * @param node
 * @param context
 */
function analyzeAndDedupeDefinitions(node: Node, context: AnalyzerVisitContext): Map<ComponentDefinition, Set<Node>> {
	if (node == null) return new Map();

	// Keep a map of "tag name" ==> "definition"
	const tagNameDefinitionMap: Map<string, ComponentDefinition> = new Map();

	// Keep a map of "definition" ==> "declaration nodes"
	const definitionToDeclarationMap: Map<ComponentDefinition, Set<Node>> = new Map();

	// Discover definitions using flavors
	visitDefinitions(node, context, results => {
		// Definitions are unique by tag name and are merged when pointing to multiple declaration nodes.
		// This is because multiple definitions can exist side by side for the same tag name (think global TagName type definition and customElements.define)
		for (const result of results) {
			// Find existing definition with the result name
			let definition = tagNameDefinitionMap.get(result.tagName);

			if (definition == null) {
				// No existing definition was found, - create one!
				definition = {
					declaration: () => {
						throw new Error("This is a noop function. It's expected that this function is overwritten.");
					},
					tagName: result.tagName,
					tagNameNodes: new Set(),
					identifierNodes: new Set()
				};

				tagNameDefinitionMap.set(result.tagName, definition);
			}

			// Add the discovered identifier node to the definition
			if (result.identifierNode != null) {
				definition.identifierNodes.add(result.identifierNode);
			}

			// Add the discovered tag name node to the definition
			if (result.tagNameNode) {
				definition.tagNameNodes.add(result.tagNameNode);
			}

			// Add the discovered declaration node to the map from "definition" ==> "declaration nodes"
			let declarationNodeSet = definitionToDeclarationMap.get(definition);
			if (declarationNodeSet == null) {
				declarationNodeSet = new Set();
				definitionToDeclarationMap.set(definition, declarationNodeSet);
			}
			declarationNodeSet.add(result.declarationNode);
		}
	});

	// Remove duplicates where "tagName" is equals to "" if the declaration node is not used in any other definition.
	const results = Array.from(definitionToDeclarationMap.entries());
	for (const [definition, declarations] of results) {
		if (definition.tagName === "") {
			for (const [checkDefinition, checkDeclarations] of results) {
				// Find duplicated based on overlapping declarations
				if (definition !== checkDefinition && Array.from(declarations).find(decl => checkDeclarations.has(decl) != null)) {
					definitionToDeclarationMap.delete(definition);
					break;
				}
			}
		}
	}

	return definitionToDeclarationMap;
}
