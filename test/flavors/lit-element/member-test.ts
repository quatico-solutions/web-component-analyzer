import { SimpleTypeKind } from "ts-simple-type";
import { analyzeTextWithCurrentTsModule } from "../../helpers/analyze-text-with-current-ts-module";
import { tsTest } from "../../helpers/ts-test";
import { assertHasMembers } from "../../helpers/util";

tsTest("LitElement: Discovers properties from 'static get properties'", t => {
	const {
		results: [result],
		checker
	} = analyzeTextWithCurrentTsModule(`
	/**
	 * @element
	 */
	 class MyElement extends HTMLElement { 
	    static get properties () {
	        return {
	            /**
	             * This is a comment
	             * @default hello 123
	             * @type {String}
	             */
	            myProp: {type: String}
	        }
	    }
	 }
	 `);

	const { members } = result.componentDefinitions[0]?.declaration();

	assertHasMembers(
		members,
		[
			{
				kind: "property",
				propName: "myProp",
				attrName: "myProp",
				jsDoc: {
					description: "This is a comment"
				},
				default: "hello 123",
				typeHint: "String",
				type: () => ({ kind: SimpleTypeKind.STRING }),
				visibility: undefined,
				reflect: "to-property",
				deprecated: undefined,
				required: undefined
			}
		],
		t,
		checker
	);
});

tsTest("LitElement: Discovers properties from '@property'", t => {
	const {
		results: [result],
		checker
	} = analyzeTextWithCurrentTsModule(`
	/**
	 * @element
	 */
	 class MyElement extends HTMLElement { 
	    /**
	     * This is a comment
	     */
	    @property({type: String, attribute: "my-prop"}) myProp: string = "hello";
	    
	    @property({attribute: false}) protected myProp2!: number;
	    
	    @property() myProp3;
	 }
	 `);

	const { members } = result.componentDefinitions[0]?.declaration();

	assertHasMembers(
		members,
		[
			{
				kind: "property",
				propName: "myProp",
				attrName: "my-prop",
				jsDoc: {
					description: "This is a comment"
				},
				default: "hello",
				type: () => ({ kind: SimpleTypeKind.STRING }),
				visibility: "public",
				deprecated: undefined,
				required: undefined,
				meta: {
					type: { kind: SimpleTypeKind.STRING },
					attribute: "my-prop"
				}
			},
			{
				kind: "property",
				propName: "myProp2",
				attrName: undefined,
				default: undefined,
				type: () => ({ kind: SimpleTypeKind.NUMBER }),
				visibility: "protected",
				deprecated: undefined,
				required: undefined,
				meta: {
					attribute: false
				}
			},
			{
				kind: "property",
				propName: "myProp3",
				attrName: "myProp3",
				default: undefined,
				type: () => ({ kind: SimpleTypeKind.ANY }),
				visibility: "public",
				deprecated: undefined,
				required: undefined,
				meta: {}
			}
		],
		t,
		checker
	);
});

tsTest("LitElement: Discovers properties from '@internalProperty'", t => {
	const {
		results: [result],
		checker
	} = analyzeTextWithCurrentTsModule(`
	/**
	 * @element
	 */
	 class MyElement extends HTMLElement { 
	    /**
	     * This is a comment
	     */
	    @internalProperty() myProp: string = "hello";
	    
	    @internalProperty() private myProp2: number!;
	 }
	 `);

	const { members } = result.componentDefinitions[0]?.declaration();

	assertHasMembers(
		members,
		[
			{
				kind: "property",
				propName: "myProp",
				attrName: undefined,
				jsDoc: {
					description: "This is a comment"
				},
				default: "hello",
				type: () => ({ kind: SimpleTypeKind.STRING }),
				visibility: "public",
				deprecated: undefined,
				required: undefined,
				meta: {
					attribute: false
				}
			},
			{
				kind: "property",
				propName: "myProp2",
				attrName: undefined,
				default: undefined,
				type: () => ({ kind: SimpleTypeKind.NUMBER }),
				visibility: "private",
				deprecated: undefined,
				required: undefined,
				meta: {
					attribute: false
				}
			}
		],
		t,
		checker
	);
});
