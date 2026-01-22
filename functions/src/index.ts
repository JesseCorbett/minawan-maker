import { setGlobalOptions } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";

initializeApp();

setGlobalOptions({maxInstances: 1});

export * from './updateJsonCatalog';
export * from './moderation';
export * from './updateJsonCatalogLegacy';
