(function (root) {
  "use strict";
  const escape = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

  function safeUrl(value, allowContact) {
    const url = String(value || "").trim();
    if (!url || /[\u0000-\u0020\u007f\\]/.test(url) || url.startsWith("//")) return "";
    if (/^[a-z][a-z\d+.-]*:/i.test(url) && !/^https?:/i.test(url) && !(allowContact && /^(mailto|tel):/i.test(url))) return "";
    return url;
  }

  function render(resume) {
    const list = (items) => `<ul>${(items || []).map((item) => `<li>${escape(item)}</li>`).join("")}</ul>`;
    const section = (title, items) => items && items.length ? `<section><h2>${escape(title)}</h2>${list(items)}</section>` : "";
    const contact = resume.contact || {};
    const links = [
      [contact.email, contact.email ? `mailto:${contact.email}` : "", true],
      [contact.phone, contact.phone ? `tel:${contact.phone.replace(/\s+/g, "")}` : "", true],
      ["LinkedIn", contact.linkedin, false],
      ["Download PDF", contact.resumePdf, false]
    ].map(([label, href, allowContact]) => {
      const url = safeUrl(href, allowContact);
      if (url) return `<a href="${escape(url)}">${escape(label)}</a>`;
      return label === "Download PDF" ? '<span class="disabled-action" role="link" aria-disabled="true">Download PDF</span>' : "";
    }).filter(Boolean);
    const roles = (resume.stages || []).map((stage, index) => `<section class="plain-role" id="plain-role-${index}"><h3>${escape(stage.role)} — ${escape(stage.company)}</h3><p class="plain-dates">${escape(stage.startDate)} — ${escape(stage.endDate)}</p>${list(stage.achievements)}${stage.skills.length ? `<p><strong>Skills:</strong> ${stage.skills.map(escape).join(", ")}</p>` : ""}</section>`).join("\n");
    const present = resume.present || {};
    const projects = (resume.projects || []).map((item) => {
      const url = safeUrl(item.link);
      return `<section><h3>${escape(item.title)}</h3><p>${escape(item.summary)}</p>${item.tags.length ? `<p>${item.tags.map(escape).join(", ")}</p>` : ""}${url ? `<a href="${escape(url)}">View project</a>` : ""}</section>`;
    }).join("");
    const testimonials = (resume.testimonials || []).map((item) => {
      const url = safeUrl(item.sourceUrl);
      return `<figure><blockquote>${escape(item.quote)}</blockquote><figcaption>${escape(item.author)}${item.role ? ` — ${escape(item.role)}` : ""}${url ? ` <a href="${escape(url)}">Source</a>` : ""}</figcaption></figure>`;
    }).join("");
    const updates = (resume.patchNotes || []).map((item) => `<section><h3>${escape(item.version)} — ${escape(item.title)}</h3><p>${escape(item.date)}</p>${list(item.notes)}</section>`).join("");
    return `<header><h1>${escape(resume.name || "Resume")}</h1><p class="plain-title">${escape(resume.title)}</p><p>${escape(resume.tagline)}</p>${links.length ? `<nav class="plain-contact" aria-label="Contact and resume links">${links.join(" ")}</nav>` : ""}</header>
<section><h2>Experience</h2>${roles}</section>
${section("Core Competencies", resume.coreCompetencies)}
${section("Certifications", resume.certifications)}
${section("Education", resume.education)}
${section("Recognition", resume.recognition)}
${projects ? `<section><h2>Projects</h2>${projects}</section>` : ""}
${testimonials ? `<section><h2>References</h2>${testimonials}</section>` : ""}
${updates ? `<section><h2>Game Updates</h2>${updates}</section>` : ""}
${present.headline || present.message ? `<section><h2>Current Focus</h2>${present.headline ? `<p>${escape(present.headline)}</p>` : ""}${present.message ? `<p>${escape(present.message)}</p>` : ""}</section>` : ""}`;
  }

  const api = { render, safeUrl };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ResumeRenderer = api;
})(typeof globalThis !== "undefined" ? globalThis : this);