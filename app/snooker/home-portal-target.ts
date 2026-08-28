const navLabels = ["首页", "赛事", "球员", "数据"];

function isMainNav(nav: Element) {
  const labels = Array.from(nav.querySelectorAll(":scope > button b"))
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean);
  return navLabels.every((label) => labels.includes(label));
}

export function findMainNav() {
  return Array.from(document.querySelectorAll("nav")).find(isMainNav) ?? null;
}

function activeMainNavLabel(nav: Element) {
  const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>(":scope > button"));
  const activeButton = buttons.find((button) => button.className.trim().length > 0);
  return activeButton?.querySelector("b")?.textContent?.trim() ?? null;
}

export function findHomepagePortalTarget() {
  const nav = findMainNav();
  if (!nav || activeMainNavLabel(nav) !== "首页") return null;
  const content = nav.previousElementSibling;
  return content instanceof HTMLElement ? content : null;
}
