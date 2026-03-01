// Register tsx ESM hook globally (without namespace restriction)
// This allows tsx to resolve .ts files for all imports, including transitive imports
// from within amplify/backend.ts (e.g., ./auth/resource)
import { register } from 'tsx/esm/api';
register();
