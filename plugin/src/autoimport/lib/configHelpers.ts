import { normalizePath, Plugin } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url';
import { Config } from '../types.js';
import type {Config as SvelteConfig} from '@sveltejs/kit'

/**
 * Enforces the order in which the plugins are definesd in the user's vite.config.js file
 * Autwoire must be defined before sveltekit (as to be executed before it)
 * 
 * @param plugins - An array of plugins loaded by vite
 * @throws If the plugins are in the wrong order
 */
export function enforcePluginOrdering(plugins: readonly Plugin[]) {
  let indexPluginSvelte = plugins.findIndex(n => n.name === 'vite-plugin-svelte');
  let indexAutoImport = plugins.findIndex(n => n.name === 'sveltekit-autowire');
  if (indexPluginSvelte < indexAutoImport) {
    throw Error("The autowire plugin must come before SvelteKit plugin in your vite config")
  }
}

export async function resolveSvelteConfig(config: Config) : Promise<SvelteConfig> {

  const defaultConfig : SvelteConfig= {
    extensions: [".svelte"]
  }

  try {
    let dirname = path.dirname(fileURLToPath(import.meta.url));
    let relative = path.relative(dirname, config.inlineConfig.root || config.root);
    let configFile = path.join(relative, './svelte.config.js');
    let pkg = await import(normalizePath('./' + configFile));
    const svelteConfig: SvelteConfig = pkg.default ?? defaultConfig
    return svelteConfig;
  } catch (e) {
    console.warn('Error reading svelte.config.js');
    return defaultConfig;
  }
}