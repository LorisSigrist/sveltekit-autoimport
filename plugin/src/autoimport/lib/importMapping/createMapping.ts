import { normalizePath } from "vite";
import { traverse } from "../moduleResolution/fsTraversal.js";
import { getComponentName } from "../moduleResolution/componentNaming.js";
import path from 'path';
import { ComponentsConfig, ImportMapping, MappingConfig, ModuleConfig, TypeDeclarationMapping } from "../../types.js";

/**
 * Finds all the .svelte files that could be autoimported based on the configuration
 */
export function createMapping(components: ComponentsConfig, module: ModuleConfig, mapping: MappingConfig, filter): [ImportMapping, TypeDeclarationMapping] {

    /* Map keys that may need to be imported to import statements */
    const importMapping: ImportMapping = {};

    let componentTypeDeclarations: TypeDeclarationMapping = {};

    // Read all components from given paths
    // and transform the import names into CamelCase
    components.forEach(component => {

        /*
          This looks through the filesystem to find all .svelte files that could be imported,
          resolves the Names by which they are imported, 
          and returns functions, which generate the necessary import statements to import the components,
          relative to any modules they might be imported from.
        */
        traverse(component.directory, filter, filePath => {
            const {componentName, namespaces} = getComponentName(component.directory, filePath, component.namingStrategy, component.namespace);

            importMapping[componentName] = {
                "namespaces": namespaces,
                "importFactory": (importerPath: string, name: string) : string => {
                    let componentFrom = normalizePath(path.relative(importerPath, filePath));
                    if (!componentFrom.startsWith('.')) {
                        componentFrom = './' + componentFrom;
                    }
                    return `import ${name} from '${componentFrom}'`
                }
            }
            

            componentTypeDeclarations[componentName] = importerPath => {
                let componentFrom = normalizePath(path.relative(importerPath, filePath));
                if (!componentFrom.startsWith('.')) {
                    componentFrom = './' + componentFrom;
                }
                return `declare const ${componentName}: typeof import("${componentFrom}")["default"];`
            }
        });
    });


    Object.entries(module).forEach(([moduleFrom, moduleImports]) => {
        for (const moduleImport of moduleImports) {
            let typeDeclaration: () => string;
            let importStatement: (filePath: string, name:string) => string;

            //If an key is imported with "import x as y", we need to trigger an import on the alias y, not on the originx
            const [origin, alias] = moduleImport.split(/\s+as\s+/);

            //If the origin is "*", we need to import as a namespace.
            if (origin.trim().startsWith("*")) {
                importStatement = (_, importAs) => `import * as ${importAs} from '${moduleFrom}'`;
                typeDeclaration = () => `declare const ${alias ?? origin}: typeof import("${moduleFrom}");`
            }
            else {
                importStatement = (_, importAs) => `import { ${moduleImport} as ${importAs} } from '${moduleFrom}'`;
                typeDeclaration = () => `declare const ${alias ?? origin}: typeof import("${moduleFrom}")["${origin}"];`
            }

            importMapping[alias ?? origin] = {
                "namespaces": [],
                "importFactory": importStatement
            }
            componentTypeDeclarations[alias ?? origin] = typeDeclaration;
        }
    })

    Object.entries(mapping).forEach(([name, value]) => {
        importMapping[name] = {
            "namespaces": [],
            "importFactory": ()=>value
        }
    });

    return [importMapping, componentTypeDeclarations];
}