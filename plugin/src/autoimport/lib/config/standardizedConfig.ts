import { AutoimportConfig, AutoimportUserConfig } from "../../types.js";
import path from 'path'


export function standardizeConfing(userConfig: AutoimportUserConfig): AutoimportConfig {
    const config: AutoimportConfig = {
        include: userConfig.include ?? ['**/*.svelte'],
        exclude: userConfig.exclude ?? [],
        module: {},
        mapping: userConfig.mapping ?? {},
        components: []
    }

    if (userConfig.components) {
        for (const component of userConfig.components) {
            if (typeof component !== "string") config.components.push({
                directory: path.resolve(component.directory),
                namespace: component.namespace ?? "",
                namingStrategy: component.namingStrategy ?? "namespaced"
            });
            else config.components.push({ directory: path.resolve(component), namespace: "", namingStrategy: "namespaced" });
        }
    }

    if (userConfig.module) {
        Object.entries(userConfig.module).forEach(([moduleName, moduleImport]) => {
            if (typeof moduleImport === "string") moduleImport = [moduleImport];
            config.module[moduleName] = moduleImport;
        })
    }

    return config;
}