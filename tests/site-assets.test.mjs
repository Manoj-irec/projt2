import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const indexHtmlPath = path.join(projectRoot, "index.html");
const indexHtml = readFileSync(indexHtmlPath, "utf8");

function resolveLocalAssetPath(assetReference) {
    const cleanReference = assetReference.split(/[?#]/, 1)[0];

    if (
        !cleanReference ||
        cleanReference === "#" ||
        /^(?:https?:|mailto:|tel:|data:)/i.test(cleanReference)
    ) {
        return null;
    }

    if (cleanReference.startsWith("/resources/")) {
        return path.join(projectRoot, "public", cleanReference.slice(1));
    }

    if (cleanReference.startsWith("./resources/")) {
        return path.join(projectRoot, "public", cleanReference.slice(2));
    }

    if (cleanReference.startsWith("resources/")) {
        return path.join(projectRoot, "public", cleanReference);
    }

    return null;
}

test("index.html local assets exist in public/resources", () => {
    const assetReferences = [
        ...indexHtml.matchAll(/\b(?:src|href)=["']([^"']+)["']/g),
    ].map((match) => match[1]);

    const localAssets = assetReferences
        .map((reference) => ({
            reference,
            resolvedPath: resolveLocalAssetPath(reference),
        }))
        .filter((asset) => asset.resolvedPath !== null);

    assert.ok(
        localAssets.length > 0,
        "Expected index.html to reference local assets under public/resources.",
    );

    const missingAssets = localAssets
        .filter((asset) => !existsSync(asset.resolvedPath))
        .map((asset) => asset.reference);

    assert.deepEqual(
        missingAssets,
        [],
        `Missing local assets referenced by index.html: ${missingAssets.join(", ")}`,
    );

    const emptyAssets = localAssets
        .filter((asset) => statSync(asset.resolvedPath).size === 0)
        .map((asset) => asset.reference);

    assert.deepEqual(
        emptyAssets,
        [],
        `Empty local assets referenced by index.html: ${emptyAssets.join(", ")}`,
    );
});
