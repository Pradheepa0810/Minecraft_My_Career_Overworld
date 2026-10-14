(function (root) {
  "use strict";

  const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const isTextArray = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
  const isId = (value) => typeof value === "string" && value.trim().length > 0;
  const hasCoordinates = (value) => isObject(value) && Number.isSafeInteger(value.x) && Number.isSafeInteger(value.y);
  const decorTypes = new Set(["farm", "wheat", "hay", "lantern", "redstone", "cobble", "torch", "rock", "flower", "tallgrass", "mushroom", "bush", "tree-oak", "tree-birch", "campfire"]);

  function validate(resume) {
    const errors = [];
    if (!isObject(resume)) return ["Root: expected a JSON object."];

    const ids = new Set();
    if (!Array.isArray(resume.stages)) errors.push("stages: expected an array.");
    else resume.stages.forEach((stage, index) => {
      const label = `stages[${index}]`;
      if (!isObject(stage)) { errors.push(`${label}: expected an object.`); return; }
      if (!isId(stage.id)) errors.push(`${label}.id: required non-empty text.`);
      else {
        if (ids.has(stage.id)) errors.push(`${label}.id: duplicate id '${stage.id}'.`);
        ids.add(stage.id);
      }
      ["company", "role", "startDate", "endDate"].forEach((field) => {
        if (typeof stage[field] !== "string") errors.push(`${label}.${field}: required text.`);
      });
      ["achievements", "skills"].forEach((field) => {
        if (!isTextArray(stage[field])) errors.push(`${label}.${field}: required array of text (may be empty).`);
      });
      if (stage.icon !== undefined && typeof stage.icon !== "string") errors.push(`${label}.icon: expected text.`);
      if (stage.region !== undefined) {
        const region = stage.region;
        if (!isObject(region)) errors.push(`${label}.region: expected an object.`);
        else {
          if (!Array.isArray(region.decor) || region.decor.some((type) => !decorTypes.has(type))) errors.push(`${label}.region.decor: expected an array of supported decorations.`);
          if (!Number.isFinite(region.density) || region.density < 0 || region.density > 0.5) errors.push(`${label}.region.density: expected a number from 0 to 0.5.`);
          if (!Number.isFinite(region.radius) || region.radius < 1 || region.radius > 20) errors.push(`${label}.region.radius: expected a number from 1 to 20.`);
        }
      }
    });

    const coordinates = new Set();
    const references = new Set();
    if (!Array.isArray(resume.path)) errors.push("path: expected an array.");
    else {
      if (resume.path.length < 2) errors.push("path: needs at least a start node and a present node.");
      resume.path.forEach((node, index) => {
        const label = `path[${index}]`;
        if (!isObject(node)) { errors.push(`${label}: expected an object.`); return; }
        if (!hasCoordinates(node)) errors.push(`${label}: x and y must be safe integers.`);
        else {
          const key = `${node.x},${node.y}`;
          if (coordinates.has(key)) errors.push(`${label}: repeated coordinate (${key}).`);
          coordinates.add(key);
          const previous = resume.path[index - 1];
          if (index > 0 && hasCoordinates(previous) && Math.abs(node.x - previous.x) + Math.abs(node.y - previous.y) !== 1) {
            errors.push(`${label}: must be exactly one orthogonal block from path[${index - 1}] (no diagonal jumps or gaps).`);
          }
        }
        if (!["start", "walk", "stage", "present"].includes(node.type)) errors.push(`${label}.type: unsupported node type.`);
        if ((node.type === "start") !== (index === 0)) errors.push(`${label}: start must appear only at the first node.`);
        if ((node.type === "present") !== (index === resume.path.length - 1)) errors.push(`${label}: present must appear only at the last node.`);
        if (node.icon !== undefined && typeof node.icon !== "string") errors.push(`${label}.icon: expected text.`);
        if (node.type === "stage") {
          if (!isId(node.stageId) || !ids.has(node.stageId)) errors.push(`${label}.stageId: must reference an existing stage id.`);
          if (isId(node.stageId)) {
            if (references.has(node.stageId)) errors.push(`${label}.stageId: stage '${node.stageId}' is referenced more than once.`);
            references.add(node.stageId);
          }
        }
      });
      ids.forEach((id) => { if (!references.has(id)) errors.push(`path: stage '${id}' is missing from the route.`); });
    }

    ["name", "title", "tagline"].forEach((field) => {
      if (resume[field] !== undefined && typeof resume[field] !== "string") errors.push(`${field}: expected text.`);
    });
    ["coreCompetencies", "certifications", "education", "recognition"].forEach((field) => {
      if (resume[field] !== undefined && !isTextArray(resume[field])) errors.push(`${field}: expected an array of text.`);
    });
    ["contact", "present"].forEach((field) => {
      if (resume[field] !== undefined && (!isObject(resume[field]) || Object.values(resume[field]).some((value) => typeof value !== "string"))) errors.push(`${field}: expected an object with text values.`);
    });
    if (resume.site !== undefined) {
      if (!isObject(resume.site)) errors.push("site: expected an object.");
      else ["url", "shareImage", "shareImageAlt"].forEach((field) => {
        const value = resume.site[field];
        if (value !== undefined && typeof value !== "string") errors.push(`site.${field}: expected text.`);
        else if (value && field !== "shareImageAlt") {
          try {
            const url = new URL(value);
            if (!["http:", "https:"].includes(url.protocol)) throw new Error("protocol");
          } catch (_) { errors.push(`site.${field}: expected an absolute HTTP(S) URL or empty text.`); }
        }
      });
    }
    if (resume.easterEggs !== undefined) {
      if (!Array.isArray(resume.easterEggs)) errors.push("easterEggs: expected an array.");
      else resume.easterEggs.forEach((egg, index) => {
        if (!isObject(egg) || typeof egg.name !== "string" || typeof egg.fact !== "string") errors.push(`easterEggs[${index}]: expected name and fact text.`);
        if (isObject(egg) && egg.icon !== undefined && (typeof egg.icon !== "string" || !/^[a-z0-9-]+$/i.test(egg.icon))) errors.push(`easterEggs[${index}].icon: expected an icon basename containing letters, digits or hyphens.`);
      });
    }
    ["patchNotes", "projects", "testimonials"].forEach((field) => {
      if (resume[field] === undefined) return;
      if (!Array.isArray(resume[field])) { errors.push(`${field}: expected an array.`); return; }
      const entryIds = new Set();
      resume[field].forEach((item, index) => {
        const label = `${field}[${index}]`;
        if (!isObject(item)) { errors.push(`${label}: expected an object.`); return; }
        if (!isId(item.id) || entryIds.has(item.id)) errors.push(`${label}.id: required unique non-empty text.`);
        else entryIds.add(item.id);
        const required = field === "patchNotes" ? ["version", "date", "title"] : field === "projects" ? ["title", "summary", "link"] : ["quote", "author"];
        required.forEach((key) => { if (!isId(item[key])) errors.push(`${label}.${key}: required non-empty text.`); });
        const arrayField = field === "patchNotes" ? "notes" : field === "projects" ? "tags" : null;
        if (arrayField && !isTextArray(item[arrayField])) errors.push(`${label}.${arrayField}: required text array.`);
        if (item.stageId !== undefined && !ids.has(item.stageId)) errors.push(`${label}.stageId: must reference an existing stage.`);
        if (item.role !== undefined && typeof item.role !== "string") errors.push(`${label}.role: expected text.`);
        ["link", "sourceUrl"].forEach((key) => {
          if (item[key] === undefined) return;
          try {
            const url = new URL(item[key]);
            if (typeof item[key] !== "string" || /[\s\\]/.test(item[key]) || !["http:", "https:"].includes(url.protocol)) throw new Error("URL");
          } catch (_) { errors.push(`${label}.${key}: expected an absolute HTTP(S) URL.`); }
        });
      });
    });
    return errors;
  }

  const api = { validate };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ResumeValidator = api;
})(typeof globalThis !== "undefined" ? globalThis : this);